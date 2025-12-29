import TypingEngine from './TypingEngine.js';
import ScoreManager from './ScoreManager.js';
import WordGenerator from './WordGenerator.js';
import DifficultyManager from './DifficultyManager.js';
import { submitScore } from '../api/ApiClient.js';

export class GameEngine {
  constructor() {
    this.state = 'MENU'; // MENU, PLAYING, PAUSED, GAMEOVER
    this.lastSpawnTime = 0;
    this.playerName = 'Guest'; // Default name
    
    // Bind methods to keep 'this' context
    this.handleInput = this.handleInput.bind(this);
    this.gameLoop = this.gameLoop.bind(this);
    
    // Object Pooling
    this.asteroidPool = [];

    // Setup Typing Engine Listeners immediately
    this._setupTypingEvents();
  }


  init(sceneEl) {
    this.scene = sceneEl;
    console.log('GameEngine initialized');
    
    // Cache overlay elements if needed later
    this.pauseShown = false;
    
    // Global key listener
    window.addEventListener('keydown', this.handleInput);

    // Listen for asteroid destruction (handled by projectile collision)
    this.scene.addEventListener('asteroid-destroyed', (e) => {
      if (e.detail && e.detail.typed && e.detail.asteroid) {
        const asteroid = e.detail.asteroid;
        const component = asteroid.components['asteroid-component'];
        if (component) {
          const word = component.data.word;
          
          // Update Score & Difficulty
          const difficulty = DifficultyManager.getWordDifficulty();
          ScoreManager.handleWordComplete(word, difficulty);
          DifficultyManager.onWordTyped();
          
          this.scene.emit('sound-explosion');
        }
      }
    });
    
    // Game Over when Earth health reaches 0
    this.scene.addEventListener('earth-destroyed', () => {
      this.stopGame();
    });
  }


  pauseGame() {
    if (this.state !== 'PLAYING') return;
    this.state = 'PAUSED';
    window.__GAME_PAUSED__ = true;
    this.scene && this.scene.emit('game-paused');
  }


  resumeGame() {
    if (this.state !== 'PAUSED') return;
    this.state = 'PLAYING';
    window.__GAME_PAUSED__ = false;
    this.scene && this.scene.emit('game-resumed');
    requestAnimationFrame(this.gameLoop);
  }


  startGame(playerName) {
    if (this.state === 'PLAYING') return;

    console.log(`Starting Game for pilot: ${playerName}`);
    this.playerName = playerName || 'Guest';
    this.state = 'PLAYING';
    window.__GAME_PAUSED__ = false;
    
    // 1. Reset all Sub-Systems
    ScoreManager.reset();
    DifficultyManager.reset();
    TypingEngine.resetState();
    
    // 2. Reset Earth Health (Visuals)
    const earth = document.getElementById('earth');
    if (earth) {
      earth.setAttribute('earth', 'health', 100);
      const earthComp = earth.components && earth.components.earth;
      if (earthComp) {
        if (earthComp.healthBarBg) earthComp.healthBarBg.setAttribute('visible', 'false');
        if (earthComp.healthBar) earthComp.healthBar.setAttribute('visible', 'false');
        if (earthComp.healthText) earthComp.healthText.setAttribute('visible', 'false');
      }
    }

    // 2b. Restore Shield to full strength (reuse if exists, else create)
    const existingShield = document.getElementById('shield');
    if (existingShield && existingShield.components && existingShield.components.shield) {
      const comp = existingShield.components.shield;
      comp.destroyed = false;
      existingShield.object3D.visible = true;
      comp.data.strength = comp.data.maxStrength;
      const mesh = existingShield.getObject3D('mesh');
      if (mesh && mesh.material) {
        mesh.material.color.setHex(0x00FFFF);
        mesh.material.opacity = 0.3;
        mesh.scale.set(1, 1, 1);
      }
      existingShield.object3D.rotation.set(0, 0, 0);
      if (comp.healthBarBg) comp.healthBarBg.setAttribute('visible', 'true');
      if (comp.healthBar) comp.healthBar.setAttribute('visible', 'true');
      if (comp.healthText) comp.healthText.setAttribute('visible', 'true');
      comp.updateHealthBar && comp.updateHealthBar();
      if (this.scene && this.scene.systems && this.scene.systems.collision) {
        try {
          this.scene.systems.collision.shieldDestroyed = false;
          this.scene.systems.collision.shield = existingShield;
        } catch (e) {}
      }
    } else {
      const shieldEl = document.createElement('a-entity');
      shieldEl.setAttribute('id', 'shield');
      shieldEl.setAttribute('shield', 'radius: 7; strength: 50; maxStrength: 50');
      shieldEl.setAttribute('position', '0 0 0');
      this.scene.appendChild(shieldEl);
      if (this.scene && this.scene.systems && this.scene.systems.collision) {
        try {
          this.scene.systems.collision.shieldDestroyed = false;
          this.scene.systems.collision.shield = shieldEl;
        } catch (e) {}
      }
    }

    // 3. Start Loop
    this.lastSpawnTime = performance.now();
    requestAnimationFrame(this.gameLoop);
    
    // 4. Notify UI
    this.scene.emit('game-start');
  }


  async stopGame() {
    if (this.state === 'GAMEOVER') return;

    this.state = 'GAMEOVER';
    window.__GAME_PAUSED__ = true;
    // Clear active entities immediately
    if (this.scene) {
      const asteroids = this.scene.querySelectorAll('[asteroid-component]');
      asteroids.forEach(el => {
        try {
          TypingEngine.removeTarget(el.id);
        } catch (e) {}
        try {
          // Remove asteroid from DOM completely
          if (el.parentNode) {
            el.parentNode.removeChild(el);
          }
        } catch (e) {}
      });
      const ship = document.querySelector('#spaceship');
      if (ship && ship.components['projectile-system'] && typeof ship.components['projectile-system'].clearAll === 'function') {
        ship.components['projectile-system'].clearAll();
      }
    }
    const stats = ScoreManager.getSessionStats();
    console.log('Game Over Stats:', stats);
    
    // 1. Emit event for UI (Show screen immediately)
    this.scene.emit('game-over', stats);

    // 2. Save to Database (Background operation)
    try {
      await submitScore({
        player_name: this.playerName,
        score: stats.score,
        words_typed: stats.wordsTyped,
        accuracy: stats.accuracy,
        game_duration: stats.durationSeconds, // Ensure this matches your API expectation
        difficulty: DifficultyManager.getWordDifficulty() // Optional: track final difficulty
      });
      console.log("Score submitted successfully!");
    } catch (err) {
      console.error("Failed to submit score:", err);
    }
  }


  cleanupGame() {
    this.state = 'MENU';
    window.__GAME_PAUSED__ = false;

    // Clear all asteroids and projectiles
    if (this.scene) {
      const asteroids = this.scene.querySelectorAll('[asteroid-component]');
      asteroids.forEach(el => {
        try {
          TypingEngine.removeTarget(el.id);
        } catch (e) {}
        try {
          // Remove asteroid from DOM completely
          if (el.parentNode) {
            el.parentNode.removeChild(el);
          }
        } catch (e) {}
      });
      const ship = document.querySelector('#spaceship');
      if (ship && ship.components['projectile-system'] && typeof ship.components['projectile-system'].clearAll === 'function') {
        ship.components['projectile-system'].clearAll();
      }
      // Ensure shield exists and reset to full, but hide bars in menu
      let shield = document.getElementById('shield');
      if (shield && shield.components && shield.components.shield) {
        const comp = shield.components.shield;
        comp.destroyed = false;
        shield.object3D.visible = true;
        comp.data.strength = comp.data.maxStrength;
        const mesh = shield.getObject3D('mesh');
        if (mesh && mesh.material) {
          mesh.material.color.setHex(0x00FFFF);
          mesh.material.opacity = 0.3;
          mesh.scale.set(1, 1, 1);
        }
        shield.object3D.rotation.set(0, 0, 0);
        if (comp.healthBarBg) comp.healthBarBg.setAttribute('visible', 'true');
        if (comp.healthBar) comp.healthBar.setAttribute('visible', 'true');
        if (comp.healthText) comp.healthText.setAttribute('visible', 'true');
        comp.updateHealthBar && comp.updateHealthBar();
      } else {
        shield = document.createElement('a-entity');
        shield.setAttribute('id', 'shield');
        shield.setAttribute('shield', 'radius: 7; strength: 50; maxStrength: 50');
        shield.setAttribute('position', '0 0 0');
        this.scene.appendChild(shield);
        // Bars will be created by component; immediately hide them for menu
        setTimeout(() => {
          const comp = shield.components && shield.components.shield;
          if (comp) {
            if (comp.healthBarBg) comp.healthBarBg.setAttribute('visible', 'true');
            if (comp.healthBar) comp.healthBar.setAttribute('visible', 'true');
            if (comp.healthText) comp.healthText.setAttribute('visible', 'true');
          }
        }, 0);
      }
      // Hide Earth health bar in menu and reset HP
      const earth = document.getElementById('earth');
      if (earth && earth.components && earth.components.earth) {
        earth.setAttribute('earth', 'health', 100);
        const eco = earth.components.earth;
        if (eco.healthBarBg) eco.healthBarBg.setAttribute('visible', 'false');
        if (eco.healthBar) eco.healthBar.setAttribute('visible', 'false');
        if (eco.healthText) eco.healthText.setAttribute('visible', 'false');
      }
    }

    // Reset all sub-systems
    ScoreManager.reset();
    DifficultyManager.reset();
    TypingEngine.resetState();

    console.log('Game cleaned up for menu return');
  }


  resetGame() {
    console.log('Resetting game for play again...');
    
    // First cleanup
    this.cleanupGame();
    
    // Force UI to refresh by triggering a score update with reset values
    const state = {
      score: 0,
      multiplier: 1
    };
    // Emit a custom event to notify UIManager to update display
    if (this.scene) {
      this.scene.emit('game-reset', state);
    }
    
    // Then immediately start a new game
    this.startGame(this.playerName);
  }

  handleInput(e) {
    // Handle global pause/resume on Escape
    if (e.key === 'Escape') {
      if (this.state === 'PLAYING') {
        this.pauseGame();
        return;
      } else if (this.state === 'PAUSED') {
        // Toggle resume on Escape
        this.resumeGame();
        return;
      }
      // In MENU/GAMEOVER, ignore Escape here (UIManager handles menu)
    }
    
    if (this.state !== 'PLAYING') return;
    
    // Pass single characters to the Typing Engine
    if (e.key === 'Backspace') {
      e.preventDefault();
      TypingEngine.backspace();
    } else if (e.key.length === 1) {
      TypingEngine.processKey(e.key);
    }
  }

  gameLoop(time) {
    if (this.state !== 'PLAYING') return;

    // 1. Calculate Dynamic Spawn Interval
    const currentInterval = DifficultyManager.getSpawnInterval();

    // 2. Spawn Logic
    if (time - this.lastSpawnTime > currentInterval) {
      this.spawnEnemy();
      this.lastSpawnTime = time;
    }

    requestAnimationFrame(this.gameLoop);
  }

  // Object Pooling disabled for asteroids per gameplay request
 
  spawnEnemy() {
    // 1. Get difficulty settings
    const difficulty = DifficultyManager.getWordDifficulty(); // 'easy', 'moderate', 'hard'
    const speed = DifficultyManager.getEnemySpeed();
    
    // 2. Get a word
    const word = WordGenerator.getWord(difficulty);
    
    if (!word) {
      console.warn("WordGenerator returned no word!");
      return;
    }
    
    // 3. Generate ID
    const id = `enemy-${Date.now()}`; // Unique ID
    
    // 4. Create new entity
    const enemyEl = document.createElement('a-entity');
    enemyEl.setAttribute('id', id);

    // 5. Randomize Start Position (spawn farther away)
    // X: -12 to 12 (wider horizontal spread)
    // Y: 2 to 8 (wider vertical spread)
    // Z: -60 (farther from Earth/camera)
    const x = (Math.random() * 24) - 12;
    const y = (Math.random() * 8) - 1;
    const z = -50;
    enemyEl.setAttribute('position', `${x} ${y} ${z}`);
    
    // 6. Attach/Update asteroid component
    enemyEl.setAttribute('asteroid-component', {
      word: word,
      speed: speed,
      damage: 10,
      useModel: true
    });
    
    // 7. Add to Scene if not already
    if (!enemyEl.parentNode) {
      this.scene.appendChild(enemyEl);
    }

    // 8. Register with TypingEngine so we can type it
    TypingEngine.addTarget(id, word, enemyEl);
    this.scene.emit('asteroid-spawned', { asteroid: enemyEl });
  }

  _setupTypingEvents() {
    TypingEngine.on('onCandidates', (ids) => {
      if (!Array.isArray(ids)) return;
      const all = document.querySelectorAll('[asteroid-component]');
      all.forEach(el => {
        if (el && el.components['asteroid-component']) {
          el.components['asteroid-component'].highlight(false);
        }
      });
      ids.forEach(id => {
        const el = document.getElementById(id);
        if (el && el.components['asteroid-component']) {
          el.components['asteroid-component'].highlight(true);
        }
      });
    });
    TypingEngine.on('onLock', (targetId) => {
      const el = document.getElementById(targetId);
      if (el && el.components['asteroid-component']) el.components['asteroid-component'].highlight(true);
    });
    TypingEngine.on('onReset', () => {
      // Unhighlight all asteroids when user resets typing
      const all = document.querySelectorAll('[asteroid-component]');
      all.forEach(el => {
        if (el && el.components['asteroid-component']) {
          el.components['asteroid-component'].highlight(false);
        }
      });
    });
    TypingEngine.on('onMistake', () => {
      // Unhighlight all asteroids when user makes a mistake
      const all = document.querySelectorAll('[asteroid-component]');
      all.forEach(el => {
        if (el && el.components['asteroid-component']) {
          el.components['asteroid-component'].highlight(false);
        }
      });
    });
    TypingEngine.on('onComplete', (targetId) => {
      const el = document.getElementById(targetId);
      if (!el) return;
      const ship = document.querySelector('#spaceship');
      if (ship && ship.components['projectile-system']) {
        ship.components['projectile-system'].fireAtTarget(el);
      } else {
        if (el.components['asteroid-component']) el.components['asteroid-component'].destroy(true);
      }
    });
  }
}

// Export singleton
export default new GameEngine();
