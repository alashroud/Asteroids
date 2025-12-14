import TypingEngine from './TypingEngine.js';
import ScoreManager from './ScoreManager.js';
import WordGenerator from './WordGenerator.js';

export class GameEngine {
  constructor() {
    this.state = 'MENU'; // MENU, PLAYING, PAUSED, GAMEOVER
    this.lastSpawnTime = 0;
    this.spawnInterval = 2000; // ms
    this.difficultyLevel = 1;
    
    // Bind methods to keep 'this' context
    this.handleInput = this.handleInput.bind(this);
    this.gameLoop = this.gameLoop.bind(this);

    // Setup Typing Engine Listeners
    this._setupTypingEvents();
  }

  init(sceneEl) {
    this.scene = sceneEl;
    console.log('GameEngine initialized');
    
    // Global key listener
    window.addEventListener('keydown', this.handleInput);
  }

  startGame() {
    this.state = 'PLAYING';
    ScoreManager.reset();
    TypingEngine.resetState();
    
    this.lastSpawnTime = performance.now();
    this.difficultyLevel = 1;
    this.spawnInterval = 2500;

    // Start the loop
    requestAnimationFrame(this.gameLoop);
    
    // Emit event for UI to hide menu
    this.scene.emit('game-start');
  }

  stopGame() {
    this.state = 'GAMEOVER';
    const stats = ScoreManager.getSessionStats();
    console.log('Game Over Stats:', stats);
    
    // Emit event for UI to show Game Over screen
    this.scene.emit('game-over', stats);
  }

  handleInput(e) {
    if (this.state !== 'PLAYING') return;
    
    // Prevent default browser actions for game keys if needed
    if (e.key.length === 1) {
      TypingEngine.processKey(e.key);
    }
  }

  gameLoop(time) {
    if (this.state !== 'PLAYING') return;

    // 1. Spawn Logic
    if (time - this.lastSpawnTime > this.spawnInterval) {
      this.spawnEnemy();
      this.lastSpawnTime = time;
      
      // Progressive difficulty: Speed up spawns slightly
      if (this.spawnInterval > 800) this.spawnInterval -= 20;
    }

    // 2. Check Game Over (Health)
    // This assumes your Earth component emits 'health-changed' or you check a property
    const earth = document.getElementById('earth');
    if (earth && earth.components['earth-component']) {
      if (earth.components['earth-component'].data.health <= 0) {
        this.stopGame();
        return; 
      }
    }

    requestAnimationFrame(this.gameLoop);
  }

  spawnEnemy() {
    // 1. Get a word based on difficulty
    const word = WordGenerator.getByLevel(this.difficultyLevel);
    
    // 2. Create A-Frame entity
    const enemyEl = document.createElement('a-entity');
    const id = `enemy-${Date.now()}`; // Unique ID
    
    enemyEl.setAttribute('id', id);
    enemyEl.setAttribute('asteroid-component', `word: ${word}; speed: ${1 + (this.difficultyLevel * 0.1)}`);
    
    // Random X/Y start position
    const x = (Math.random() * 10) - 5;
    const y = (Math.random() * 6) + 1;
    enemyEl.setAttribute('position', `${x} ${y} -20`); // Start far back
    
    // 3. Add to Scene
    this.scene.appendChild(enemyEl);

    // 4. Register with TypingEngine
    TypingEngine.addTarget(id, word, enemyEl);
  }

  _setupTypingEvents() {
    // Visual feedback when locking onto a target
    TypingEngine.on('onLock', (targetId) => {
      const el = document.getElementById(targetId);
      if (el) {
        // Example: Change color to indicate locked
        el.setAttribute('material', 'color', '#ff0000'); 
      }
    });

    // Visual feedback for progress (e.g., update text color)
    TypingEngine.on('onProgress', (targetId, index, char) => {
      const el = document.getElementById(targetId);
      if (el) {
        // You could emit an event to the component to update its text color
        el.emit('typing-progress', { index });
      }
    });

    // Handle Mistake
    TypingEngine.on('onMistake', () => {
      ScoreManager.handleMistake();
      // Optional: Play sound or shake screen
      this.scene.emit('sound-mistake');
    });

    // Handle Destruction
    TypingEngine.on('onComplete', (targetId, word) => {
      ScoreManager.handleWordComplete(word, 'easy'); // TODO: Pass actual difficulty
      
      const el = document.getElementById(targetId);
      if (el) {
        // Create explosion effect before removing (optional)
        // el.parentNode.removeChild(el); // Component handles removal usually, or do it here
        el.remove(); 
      }
      
      this.scene.emit('sound-explosion');
      
      // Increase difficulty every 5 kills
      if (ScoreManager.wordsTyped % 5 === 0) {
        this.difficultyLevel++;
      }
    });
  }
}

// Export singleton
export default new GameEngine();