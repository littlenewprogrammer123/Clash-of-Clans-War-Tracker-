let players = [];
let currentEditingWar = { playerId: null, warIndex: null };

// Load data from server
async function loadPlayers() {
    const res = await fetch('/api/players');
    players = await res.json();

    // Migrate old "missed" data to missed1 & missed2 if needed
    players.forEach(p => {
        p.wars.forEach(w => {
            if (w.missed && (w.missed1 === undefined && w.missed2 === undefined)) {
                w.missed1 = true;
                w.missed2 = true;
                delete w.missed;
            }
        });
    });

    displayPlayers();
}

// Save data to server
async function savePlayers() {
    await fetch('/api/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(players)
    });
}

function showAddPlayerForm() {
    document.getElementById('playerForm').reset();
    document.getElementById('playerId').value = '';
    const modal = new bootstrap.Modal(document.getElementById('playerModal'));
    modal.show();
}

document.getElementById('playerForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    const id = document.getElementById('playerId').value || Date.now();
    const name = document.getElementById('playerName').value.trim();
    const th = parseInt(document.getElementById('playerTH').value);
    const base = document.getElementById('baseStrength').value;

    let existing = players.find(p => p.id == id);
    if (existing) {
        existing.name = name;
        existing.th = th;
        existing.baseStrength = base;
    } else {
        players.push({
            id,
            name,
            th,
            baseStrength: base,
            wars: []
        });
    }

    await savePlayers();
    bootstrap.Modal.getInstance(document.getElementById('playerModal')).hide();
    displayPlayers();
});

function showWarForm(playerId, warIndex = null) {
    currentEditingWar = { playerId, warIndex };
    let player = players.find(p => p.id === playerId);
    let war = warIndex !== null ? player.wars[warIndex] : null;

    document.getElementById('stars1').value = war ? war.attack1.stars : '';
    document.getElementById('percent1').value = war ? war.attack1.percent : '';
    document.getElementById('stars2').value = war ? war.attack2.stars : '';
    document.getElementById('percent2').value = war ? war.attack2.percent : '';
    document.getElementById('missed1').checked = war ? war.missed1 : false;
    document.getElementById('missed2').checked = war ? war.missed2 : false;

    const modal = new bootstrap.Modal(document.getElementById('warModal'));
    modal.show();
}

document.getElementById('warForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    const { playerId, warIndex } = currentEditingWar;

    const stars1 = parseInt(document.getElementById('stars1').value) || 0;
    const percent1 = parseFloat(document.getElementById('percent1').value) || 0;
    const stars2 = parseInt(document.getElementById('stars2').value) || 0;
    const percent2 = parseFloat(document.getElementById('percent2').value) || 0;
    const missed1 = document.getElementById('missed1').checked;
    const missed2 = document.getElementById('missed2').checked;

    let player = players.find(p => p.id === playerId);
    const warData = {
        attack1: {
            stars: missed1 ? 0 : stars1,
            percent: missed1 ? 0 : percent1
        },
        attack2: {
            stars: missed2 ? 0 : stars2,
            percent: missed2 ? 0 : percent2
        },
        missed1,
        missed2
    };

    if (warIndex === null) {
        player.wars.push(warData);
        if (player.wars.length > 3) player.wars.shift(); // keep only last 3
    } else {
        player.wars[warIndex] = warData;
    }

    await savePlayers();
    bootstrap.Modal.getInstance(document.getElementById('warModal')).hide();
    displayPlayers();
});

function displayPlayers() {
    players.sort((a, b) => calculateScore(b) - calculateScore(a));
    let html = `<table class="table table-hover table-bordered align-middle">
        <thead class="table-dark">
            <tr>
                <th></th>
                <th>Name</th>
                <th>TH</th>
                <th>Base</th>
                <th>Wars</th>
                <th>Avg ⭐</th>
                <th>Avg %</th>
                <th>Missed</th>
                <th>Score</th>
                <th>Status</th>
                <th>Actions</th>
            </tr>
        </thead><tbody>`;

    players.forEach(player => {
        let score = calculateScore(player);
        let status = getStatus(score);
        let rowClass = status === "Core" ? "table-success" : (status === "Rotate" ? "table-warning" : "table-danger");

        html += `
        <tr class="${rowClass}">
            <td class="collapse-btn" onclick="toggleWarDetails(${player.id})">▶</td>
            <td>${player.name}</td>
            <td>${player.th}</td>
            <td>${player.baseStrength}</td>
            <td>${player.wars.length}</td>
            <td>${getAvgStars(player)}</td>
            <td>${getAvgPercent(player)}%</td>
            <td>${getMissed(player)}</td>
            <td>${score}</td>
            <td>${status}</td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="showWarForm(${player.id})">Add War</button>
                <button class="btn btn-sm btn-warning" onclick="editPlayer(${player.id})">Edit</button>
                <button class="btn btn-sm btn-danger" onclick="deletePlayer(${player.id})">Delete</button>
            </td>
        </tr>
        <tr id="warDetails-${player.id}" style="display:none;">
            <td colspan="11" class="war-rows">
                <table class="table table-sm">
                    <thead>
                        <tr class="table-light">
                            <th>War #</th>
                            <th>Attack 1 ⭐</th>
                            <th>Attack 1 %</th>
                            <th>Attack 2 ⭐</th>
                            <th>Attack 2 %</th>
                            <th>Missed 1</th>
                            <th>Missed 2</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${player.wars.map((war, index) => `
                            <tr>
                                <td>War ${index + 1}</td>
                                <td>${war.attack1.stars}</td>
                                <td>${war.attack1.percent}%</td>
                                <td>${war.attack2.stars}</td>
                                <td>${war.attack2.percent}%</td>
                                <td>${war.missed1 ? "Yes" : "No"}</td>
                                <td>${war.missed2 ? "Yes" : "No"}</td>
                                <td>
                                    <button class="btn btn-sm btn-secondary" onclick="showWarForm(${player.id}, ${index})">Edit</button>
                                </td>
                            </tr>`).join('')}
                    </tbody>
                </table>
            </td>
        </tr>`;
    });
    html += `</tbody></table>`;
    document.getElementById('playerTableContainer').innerHTML = html;
}

function toggleWarDetails(playerId) {
    const row = document.getElementById(`warDetails-${playerId}`);
    row.style.display = row.style.display === 'none' ? '' : 'none';
}

function getAvgStars(player) {
    let total = player.wars.reduce((sum, war) => sum + war.attack1.stars + war.attack2.stars, 0);
    let count = player.wars.reduce((sum, war) => sum + (!war.missed1 ? 1 : 0) + (!war.missed2 ? 1 : 0), 0);
    return count ? (total / count).toFixed(2) : "0.00";
}

function getAvgPercent(player) {
    let total = player.wars.reduce((sum, war) => sum + war.attack1.percent + war.attack2.percent, 0);
    let count = player.wars.reduce((sum, war) => sum + (!war.missed1 ? 1 : 0) + (!war.missed2 ? 1 : 0), 0);
    return count ? (total / count).toFixed(2) : "0.00";
}

function getMissed(player) {
    return player.wars.reduce((missed, war) => missed + (war.missed1 ? 1 : 0) + (war.missed2 ? 1 : 0), 0);
}

function calculateScore(player) {
    let totalStars = 0, totalPercent = 0, totalAttacks = 0, missedAttacks = 0;

    player.wars.forEach(war => {
        if (!war.missed1) {
            totalStars += war.attack1.stars;
            totalPercent += war.attack1.percent;
            totalAttacks++;
        } else {
            missedAttacks++;
        }

        if (!war.missed2) {
            totalStars += war.attack2.stars;
            totalPercent += war.attack2.percent;
            totalAttacks++;
        } else {
            missedAttacks++;
        }
    });

    let avgStars = totalAttacks ? totalStars / totalAttacks : 0;
    let avgPercent = totalAttacks ? totalPercent / totalAttacks : 0;

    let score = (avgStars * 2) + (avgPercent / 10);

    if (player.baseStrength === "Max") score += 1.5;
    else if (player.baseStrength === "Semi-Max") score += 1;
    else if (player.baseStrength === "Rushed") score -= 1.5;

    score -= missedAttacks * 2.5;

    return Math.round(score * 100) / 100;
}

function getStatus(score) {
    return score >= 14.5 ? "Core" : score >= 13 ? "Rotate" : "Bench";
}

function editPlayer(playerId) {
    let player = players.find(p => p.id === playerId);
    if (!player) return;
    document.getElementById('playerName').value = player.name;
    document.getElementById('playerTH').value = player.th;
    document.getElementById('baseStrength').value = player.baseStrength;
    document.getElementById('playerId').value = player.id;
    const modal = new bootstrap.Modal(document.getElementById('playerModal'));
    modal.show();
}

async function deletePlayer(playerId) {
    if (confirm("Delete this player?")) {
        players = players.filter(p => p.id !== playerId);
        await savePlayers();
        displayPlayers();
    }
}

window.onload = loadPlayers;
