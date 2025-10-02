let players = [];

window.onload = async () => {
  try {
    const res = await fetch('/api/players');
    players = await res.json();
    displayLeaderboard();
  } catch (err) {
    console.error("Failed to load players:", err);
    document.getElementById('leaderboardContainer').innerHTML = `
      <div class="alert alert-danger">Failed to load leaderboard data.</div>`;
  }
};

document.getElementById('categorySelect').addEventListener('change', displayLeaderboard);

function displayLeaderboard() {
  const category = document.getElementById('categorySelect').value;

  players.sort((a, b) => {
    switch (category) {
      case 'avgPercent':
        return getAvgPercent(b) - getAvgPercent(a);
      case 'avgStars':
        return getAvgStars(b) - getAvgStars(a);
      case 'score':
      default:
        return calculateScore(b) - calculateScore(a);
    }
  });

  let html = `<table class="table table-bordered table-striped align-middle">
    <thead class="table-dark">
      <tr>
        <th>#</th>
        <th>Name</th>
        <th>TH</th>
        <th>Base</th>
        <th>${getCategoryLabel(category)}</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>`;

  players.forEach((player, index) => {
    let value = getCategoryValue(player, category);
    let status = getStatus(calculateScore(player));
    let badge = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';

    html += `
      <tr>
        <td>${index + 1} ${badge}</td>
        <td>${player.name}</td>
        <td>${player.th}</td>
        <td>${player.baseStrength}</td>
        <td>${value}</td>
        <td>${status}</td>
      </tr>`;
  });

  html += `</tbody></table>`;
  document.getElementById('leaderboardContainer').innerHTML = html;
}

function calculateScore(player) {
  if (!player.wars || player.wars.length === 0) return 0;

  let totalStars = 0, totalPercent = 0, totalAttacks = 0, missedAttacks = 0;

  player.wars.forEach(war => {
    if (!war.missed) {
      totalStars += war.attack1.stars + war.attack2.stars;
      totalPercent += war.attack1.percent + war.attack2.percent;
      totalAttacks += 2;
    } else {
      missedAttacks += 2;
    }
  });

  if (totalAttacks === 0) return 0;

  let avgStars = totalStars / totalAttacks;
  let avgPercent = totalPercent / totalAttacks;

  let score = (avgStars * 2) + (avgPercent / 10);

  if (player.baseStrength === "Max") score += 1.5;
  else if (player.baseStrength === "Semi-Max") score += 1;
  else if (player.baseStrength === "Rushed") score -= 1.5;

  score -= missedAttacks * 2.5;

  return Math.round(score * 100) / 100;
}

function getAvgStars(player) {
  let totalStars = 0, totalAttacks = 0;
  player.wars.forEach(war => {
    if (!war.missed) {
      totalStars += war.attack1.stars + war.attack2.stars;
      totalAttacks += 2;
    }
  });
  return totalAttacks ? parseFloat((totalStars / totalAttacks).toFixed(2)) : 0;
}

function getAvgPercent(player) {
  let totalPercent = 0, totalAttacks = 0;
  player.wars.forEach(war => {
    if (!war.missed) {
      totalPercent += war.attack1.percent + war.attack2.percent;
      totalAttacks += 2;
    }
  });
  return totalAttacks ? parseFloat((totalPercent / totalAttacks).toFixed(2)) : 0;
}

function getCategoryValue(player, category) {
  switch (category) {
    case 'avgPercent': return getAvgPercent(player) + "%";
    case 'avgStars': return getAvgStars(player) + "⭐";
    case 'score':
    default: return calculateScore(player);
  }
}

function getCategoryLabel(category) {
  switch (category) {
    case 'avgPercent': return "Avg % Destruction";
    case 'avgStars': return "Avg Stars";
    case 'score':
    default: return "Score";
  }
}

function getStatus(score) {
  if (score >= 14.5) return "Core";
  if (score >= 13) return "Rotate";
  return "Bench";
}


