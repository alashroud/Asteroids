import TypingEngine from './TypingEngine.js';
import ScoreManager from './ScoreManager.js';
import WordGenerator from './WordGenerator.js';
import DifficultyManager from './DifficultyManager.js';
import { submitScore } from '../ApiClient.js';

export class GameEngine {
  constructor() {
    this.state = 'MENU'; // MENU, PLAYING, PAUSED, GAMEOVER
    this.lastSpawnTime = 0;
    
    // Bind methods to keep 'this' context
    this.handleInput = this.handleInput.bind(this);
    this.gameLoop = this.gameLoop.bind(this);

    // Setup Typing Engine Listeners immediately
    this._setupTypingEvents();
  }

  /**
   * Called once when the scene loads.
   * @param {HTMLElement} sceneEl 
   */
  init(sceneEl) {
    this.scene = sceneEl;
    console.log('GameEngine initialized');
    
    // Global key listener
    window.addEventListener('keydown', this.handleInput);
  }

  startGame() {
    if (this.state === 'PLAYING') return;

    console.log('Starting Game...');
    this.state = 'PLAYING';
    
    // 1. Reset all Sub-Systems
    ScoreManager.reset();
    DifficultyManager.reset();
    TypingEngine.resetState();
    
    // 2. Reset Earth Health (Visuals)
    const earth = document.getElementById('earth');
    if (earth) {
      earth.setAttribute('earth-component', 'health', 100);
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
    const stats = ScoreManager.getSessionStats();
    console.log('Game Over Stats:', stats);
    
    // 1. Emit event for UI (Show screen immediately)
    this.scene.emit('game-over', stats);

    // 2. Save to Database (Background operation)
    try {
      // Matches your schema.sql columns (player_name, score, etc.)
      await submitScore({
        player_name: "Player1", // You'll need to get this from a UI input or config
        score: stats.score,
        words_typed: stats.wordsTyped,
        accuracy: stats.accuracy,
        game_duration: (Date.now() - ScoreManager.startTime) / 1000
      });
      console.log("Score saved!");
    } catch (err) {
      console.error("Failed to save score:", err);
    }
  }

  handleInput(e) {
    if (this.state !== 'PLAYING') return;
    
    // Pass single characters to the Typing Engine
    if (e.key.length === 1) {
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

    // Note: We removed the Health Check here because AsteroidComponent 
    // now calls GameEngine.stopGame() directly upon impact.

    requestAnimationFrame(this.gameLoop);
  }

  spawnEnemy() {
    // 1. Get difficulty settings
    const difficulty = DifficultyManager.getWordDifficulty(); // 'easy', 'moderate', 'hard'
    const speed = DifficultyManager.getEnemySpeed();
    
    // 2. Get a word
    const word = WordGenerator.getWord(difficulty);
    
    // 3. Create A-Frame entity
    const enemyEl = document.createElement('a-entity');
    const id = `enemy-${Date.now()}`; // Unique ID
    
    enemyEl.setAttribute('id', id);
    
    // Attach our updated component
    enemyEl.setAttribute('asteroid-component', {
      word: word,
      speed: speed,
      damage: 10,
      useModel: true // Set to false if you don't have the GLTF yet
    });
    
    // 4. Randomize Start Position
    // X: -5 to 5, Y: 1 to 6, Z: -20 (Start far away)
    const x = (Math.random() * 10) - 5;
    const y = (Math.random() * 5) + 1;
    enemyEl.setAttribute('position', `${x} ${y} -20`);
    
    // 5. Add to Scene
    this.scene.appendChild(enemyEl);

    // 6. Register with TypingEngine
    TypingEngine.addTarget(id, word, enemyEl);
  }

  _setupTypingEvents() {
    // Visual feedback when locking onto a target
    TypingEngine.on('onLock', (targetId) => {
      const el = document.getElementById(targetId);
      if (el) {
        // Optional: Visual highlight
        // el.setAttribute('material', 'color', '#ff0000'); 
      }
    });

    // Handle Mistake
    TypingEngine.on('onMistake', () => {
      ScoreManager.handleMistake();
      this.scene.emit('sound-mistake');
    });

    // Handle Destruction (Success)
    TypingEngine.on('onComplete', (targetId, word) => {
      // 1. Update Score
      const difficulty = DifficultyManager.getWordDifficulty();
      ScoreManager.handleWordComplete(word, difficulty);
      
      // 2. Update Difficulty Progress
      DifficultyManager.onWordTyped();

      // 3. Remove Entity
      const el = document.getElementById(targetId);
      if (el) {
        // Optional: Spawn explosion particle effect here before removing
        el.remove(); 
      }
      
      this.scene.emit('sound-explosion');
    });
  }
}

// Export singleton
export default new GameEngine();