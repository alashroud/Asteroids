/**
 * LeaderboardUI.js
 * Small helper to render leaderboard entries into a container element
 */

const LeaderboardUI = {
  /**
   * Render a leaderboard list into container
   * @param {HTMLElement} container - Element where the list will be placed
   * @param {Array} entries - Array of { player_name, score }
   */
  renderLeaderboard(container, entries = []) {
    if (!container) return;

    container.innerHTML = '';

    if (!entries || entries.length === 0) {
      container.innerHTML = '<p class="muted">No scores yet. Be the first!</p>';
      return;
    }

    const ol = document.createElement('ol');
    ol.className = 'leaderboard';

    entries.forEach((e, idx) => {
      const li = document.createElement('li');
      li.className = 'leaderboard-item';

      // Add rank-based class for top 3 styling
      const rankClass = `rank-${Math.min(idx + 1, 3)}`;
      li.classList.add(rankClass);

      // Stagger animation
      li.style.animationDelay = `${idx * 70}ms`;

      const left = document.createElement('div');
      left.className = 'leader-left';

      const rankBadge = document.createElement('span');
      rankBadge.className = 'rank-badge';
      rankBadge.textContent = (idx === 0) ? '🏆' : `${idx + 1}`;

      const name = document.createElement('span');
      name.className = 'name';
      name.textContent = e.player_name || `Player ${idx + 1}`;

      left.appendChild(rankBadge);
      left.appendChild(name);

      const score = document.createElement('div');
      score.className = 'score';
      score.textContent = e.score != null ? e.score : '0';

      li.appendChild(left);
      li.appendChild(score);
      ol.appendChild(li);
    });

    container.appendChild(ol);

    // Add reveal class for a container-level effect and remove after animations finish
    container.classList.add('leaderboard-revealed');
    setTimeout(() => container.classList.remove('leaderboard-revealed'), Math.min(entries.length * 70 + 600, 3000));
  }
};

export default LeaderboardUI;
