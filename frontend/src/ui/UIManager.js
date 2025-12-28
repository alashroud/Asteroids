import ScoreManager from '../game/ScoreManager.js';
import DifficultyManager from '../game/DifficultyManager.js';
import LeaderboardUI from './LeaderboardUI.js';
import GameStates from './GameStates.js';
import { getLeaderboard, submitScore } from '../api/ApiClient.js';

class UIManager {
  constructor() {
    this.gameEngine = null;
    this.lastGameStats = null;
    this.soundManager = null;
  }

  init(gameEngine, sceneEl, soundManager) {
    this.gameEngine = gameEngine;
    this.scene = sceneEl;
    this.soundManager = soundManager;

    // Query elements
    this.startBtn = document.getElementById('start-btn');
    this.leaderboardBtn = document.getElementById('leaderboard-btn');
    this.restartBtn = document.getElementById('restart-btn');
    this.menuBtn = document.getElementById('menu-btn');
    this.backBtn = document.getElementById('back-btn');
    this.submitBtn = document.getElementById('submit-score-btn');

    this.menuScreen = document.getElementById('menu-screen');
    this.gameoverScreen = document.getElementById('gameover-screen');
    this.leaderboardScreen = document.getElementById('leaderboard-screen');
    this.scorePanel = document.getElementById('score-panel');
    this.pauseScreen = document.getElementById('pause-screen');

    this.scoreValue = document.getElementById('score-value');
    this.waveValue = document.getElementById('wave-value');
    this.comboValue = document.getElementById('combo-value');

    this.finalScore = document.getElementById('final-score');
    this.finalWave = document.getElementById('final-wave');
    this.finalAsteroids = document.getElementById('final-asteroids');
    this.finalAccuracy = document.getElementById('final-accuracy');

    this.playerNameInput = document.getElementById('player-name-input');
    this.leaderboardList = document.getElementById('leaderboard-list');
    this.continueBtn = document.getElementById('continue-btn');
    this.pauseRestartBtn = document.getElementById('pause-restart-btn');
    this.pauseQuitBtn = document.getElementById('pause-quit-btn');
    this.musicToggle = document.getElementById('music-toggle');
    this.sfxToggle = document.getElementById('sfx-toggle');
    this.pauseMusicToggle = document.getElementById('pause-music-toggle');
    this.pauseSfxToggle = document.getElementById('pause-sfx-toggle');

    this.bindEvents();
    this.syncAudioToggles();

    // Subscribe to score updates
    ScoreManager.onUpdate((state) => {
      this.scoreValue.textContent = state.score;
      this.comboValue.textContent = `x${state.multiplier}`;

      // Pulse animation to draw attention to score changes
      try {
        if (this.scoreValue) {
          this.scoreValue.classList.add('pulse');
          setTimeout(() => this.scoreValue.classList.remove('pulse'), 380);
        }
        if (this.comboValue) {
          this.comboValue.classList.add('pulse');
          setTimeout(() => this.comboValue.classList.remove('pulse'), 380);
        }
      } catch (e) {}

      // Update wave/level from DifficultyManager
      if (this.waveValue) {
        try {
          this.waveValue.textContent = DifficultyManager.getStatus().level || 1;
        } catch (e) {}
      }
    });

    // Scene events
    if (this.scene) {
      this.scene.addEventListener('game-start', () => this.onGameStart());
      this.scene.addEventListener('game-reset', (e) => this.onGameReset(e.detail || {}));
      this.scene.addEventListener('game-over', (e) => this.onGameOver(e.detail || {}));
      this.scene.addEventListener('game-paused', () => this.onGamePaused());
      this.scene.addEventListener('game-resumed', () => this.onGameResumed());
    }
  }

  bindEvents() {
    if (this.startBtn) this.startBtn.addEventListener('click', (e) => {
      this.hideAllScreens();
      this.showScorePanel();
      this.soundManager?.stopMenuMusic();
      this.gameEngine.startGame();
    });

    if (this.leaderboardBtn) this.leaderboardBtn.addEventListener('click', (e) => {
      this.showLeaderboard();
    });

    if (this.restartBtn) this.restartBtn.addEventListener('click', (e) => {
      this.hideAllScreens();
      this.showScorePanel();
      this.gameEngine.resetGame();
    });

    if (this.menuBtn) this.menuBtn.addEventListener('click', (e) => {
      this.gameEngine.cleanupGame();
      this.hideAllScreens();
      this.showMenu();
    });

    if (this.backBtn) this.backBtn.addEventListener('click', (e) => {
      this.hideAllScreens();
      this.showMenu();
    });

    if (this.submitBtn) this.submitBtn.addEventListener('click', async (e) => {
      const name = (this.playerNameInput.value || 'Anonymous').trim().slice(0, 50);
      if (!this.lastGameStats) return;

      // Disable UI while submitting
      this.submitBtn.disabled = true;
      if (this.playerNameInput) this.playerNameInput.disabled = true;

      try {
        await submitScore({
          player_name: name,
          score: this.lastGameStats.score,
          words_typed: this.lastGameStats.wordsTyped || 0,
          accuracy: this.lastGameStats.accuracy || 0,
          game_duration: this.lastGameStats.durationSeconds || 0
        });
        GameStates.showTemporary('Score submitted!', 1800);
        // On success, show leaderboard
        this.showLeaderboard();
      } catch (err) {
        console.error('Failed to submit score', err);
        GameStates.showTemporary('Failed to submit score', 1800);
      } finally {
        // Re-enable UI
        if (this.playerNameInput) this.playerNameInput.disabled = false;
        this.submitBtn.disabled = false;
      }
    });

    // Allow Enter key in name input to submit
    if (this.playerNameInput) {
      this.playerNameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.submitBtn && this.submitBtn.click();
        }
      });
    }
    
    // Pause screen buttons
    if (this.continueBtn) this.continueBtn.addEventListener('click', () => {
      this.hidePause();
      this.gameEngine.resumeGame();
    });
    if (this.pauseRestartBtn) this.pauseRestartBtn.addEventListener('click', () => {
      this.hidePause();
      this.hideAllScreens();
      this.showScorePanel();
      this.gameEngine.resetGame();
    });
    if (this.pauseQuitBtn) this.pauseQuitBtn.addEventListener('click', () => {
      this.hidePause();
      this.gameEngine.cleanupGame();
      this.hideAllScreens();
      this.showMenu();
    });

    const setMusic = (enabled) => {
      this.soundManager?.setMusicEnabled(enabled);
      this.syncAudioToggles();
    };
    const setSfx = (enabled) => {
      this.soundManager?.setSfxEnabled(enabled);
      this.syncAudioToggles();
    };

    this.musicToggle?.addEventListener('change', (e) => setMusic(e.target.checked));
    this.pauseMusicToggle?.addEventListener('change', (e) => setMusic(e.target.checked));
    this.sfxToggle?.addEventListener('change', (e) => setSfx(e.target.checked));
    this.pauseSfxToggle?.addEventListener('change', (e) => setSfx(e.target.checked));
  }

  onGameStart() {
    this.soundManager?.stopMenuMusic();
    this.hideAllScreens();
    this.showScorePanel();
  }

  onGameReset() {
    // Reset all UI displays to initial state
    this.scoreValue.textContent = '0';
    this.waveValue.textContent = '1';
    this.comboValue.textContent = 'x1';
    this.hideAllScreens();
    this.showScorePanel();
  }

  onGameOver(stats) {
    this.lastGameStats = stats;

    this.finalScore.textContent = stats.score || 0;
    this.finalWave.textContent = stats.wave || 1;
    this.finalAsteroids.textContent = stats.wordsTyped || 0;
    this.finalAccuracy.textContent = (stats.accuracy || 0) + '%';

    this.hideAllScreens();
    this.showGameOver();

    // Focus name input for quick submission
    try {
      if (this.playerNameInput) {
        this.playerNameInput.focus();
        // Mobile-friendly: select text if prefilled
        if (typeof this.playerNameInput.select === 'function') this.playerNameInput.select();
      }
    } catch (e) { /* ignore */ }

    // Friendly message using GameStates helper
    try {
      GameStates.showTemporary('Game Over — well played!', 2500);
    } catch (e) { /* ignore */ }
  }

  onGamePaused() {
    // Hide score panel while paused and show pause overlay
    this.scorePanel?.classList?.add('hidden');
    this.showPause();
  }

  onGameResumed() {
    this.hidePause();
    this.showScorePanel();
  }

  hideAllScreens() {
    this.menuScreen?.classList?.add('hidden');
    this.gameoverScreen?.classList?.add('hidden');
    this.leaderboardScreen?.classList?.add('hidden');
    this.scorePanel?.classList?.add('hidden');
    this.pauseScreen?.classList?.add('hidden');
  }

  showGameOver() {
    this.gameoverScreen?.classList?.remove('hidden');
    this.scorePanel?.classList?.add('hidden');
  }

  showScorePanel() {
    this.scorePanel?.classList?.remove('hidden');
  }

  showMenu() {
    this.hideAllScreens();
    this.menuScreen?.classList?.remove('hidden');
    this.scorePanel?.classList?.add('hidden');
    this.syncAudioToggles();
    this.soundManager?.playMenuMusic();
  }

  async showLeaderboard(highlightScore) {
    this.hideAllScreens();
    this.leaderboardScreen?.classList?.remove('hidden');
    this.scorePanel?.classList?.add('hidden');

    try {
      const list = await getLeaderboard(10) || [];
      this.renderLeaderboard(list);

      // Optionally highlight newly submitted score
      if (highlightScore !== undefined && this.leaderboardList) {
        const items = this.leaderboardList.querySelectorAll('.leaderboard-item');
        items.forEach(li => {
          const scoreEl = li.querySelector('.score');
          if (scoreEl && parseInt(scoreEl.textContent, 10) === highlightScore) {
            li.classList.add('highlight-new');
            setTimeout(() => li.classList.remove('highlight-new'), 1600);
          }
        });
      }
    } catch (err) {
      console.error('Failed to load leaderboard', err);
      this.leaderboardList.innerHTML = '<p class="muted">Failed to load leaderboard</p>';
    }
  }

  renderLeaderboard(entries) {
    // Delegate rendering to LeaderboardUI helper
    LeaderboardUI.renderLeaderboard(this.leaderboardList, entries || []);
  }
  
  showPause() {
    this.syncAudioToggles();
    this.pauseScreen?.classList?.remove('hidden');
  }
  
  hidePause() {
    this.pauseScreen?.classList?.add('hidden');
  }

  syncAudioToggles() {
    const settings = (this.soundManager?.getSettings?.()) || { musicEnabled: true, sfxEnabled: true };
    [this.musicToggle, this.pauseMusicToggle].forEach(el => { if (el) el.checked = settings.musicEnabled; });
    [this.sfxToggle, this.pauseSfxToggle].forEach(el => { if (el) el.checked = settings.sfxEnabled; });
  }
}

export default new UIManager();
