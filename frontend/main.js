import gameEngine from './src/game/GameEngine.js';
import UIManager from './src/ui/UIManager.js';

window.addEventListener('DOMContentLoaded', () => {
  const scene = document.querySelector('a-scene');
  if (!scene) {
    console.error('A-Frame scene not found');
    return;
  }

  // Initialize game engine
  gameEngine.init(scene);
  // Tell legacy GameStateSystem that TypingEngine path is active to avoid duplicate keyboard handling
  window.__USE_TYPING_ENGINE__ = true;

  // Initialize UI manager
  UIManager.init(gameEngine, scene);

  // Activate starfield component on the dedicated entity
  const starfieldEl = document.getElementById('starfield');
  if (starfieldEl) {
    starfieldEl.setAttribute('starfield', 'count: 650; spread: 160; speed: 0.0006');
  }

  // Quick health check on API (non-blocking)
  import('./src/api/ApiClient.js').then(mod => {
    mod.checkHealth().then(ok => {
      if (!ok) console.warn('Backend API seems unreachable. Leaderboard will be offline.');
    });
  });

  // Debug: optional hotkey to jump to menu
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      UIManager.hideAllScreens();
      UIManager.showMenu();
    }
  });
});