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

  /**
   * Starts the game session.
   * @param {string} playerName - Name entered by the user
   */
  startGame(playerName) {
    if (this.state === 'PLAYING') return;

    console.log(`Starting Game for pilot: ${playerName}`);
    this.playerName = playerName || 'Guest';
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

  /**
   * Stops the game, shows Game Over screen, and saves score.
   */
  async stopGame() {
    if (this.state === 'GAMEOVER') return;

    this.state = 'GAMEOVER';
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

  handleInput(e) {
    if (this.state !== 'PLAYING') return;
    
    // Pass single characters to the Typing Engine
    // Ignore special keys like 'Shift', 'Backspace' (unless you want to handle them)
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

    requestAnimationFrame(this.gameLoop);
  }

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
    
    // 3. Create A-Frame entity
    const enemyEl = document.createElement('a-entity');
    const id = `enemy-${Date.now()}`; // Unique ID
    
    enemyEl.setAttribute('id', id);
    
    // Attach our updated component
    // Note: We pass 'useModel: true' to use the GLTF, or false for the geometric shape
    enemyEl.setAttribute('asteroid-component', {
      word: word,
      speed: speed,
      damage: 10,
      useModel: true 
    });
    
    // 4. Randomize Start Position
    // X: -5 to 5 (Spread horizontally)
    // Y: 1 to 6 (Spread vertically)
    // Z: -20 (Start far away)
    const x = (Math.random() * 10) - 5;
    const y = (Math.random() * 5) + 1;
    enemyEl.setAttribute('position', `${x} ${y} -20`);
    
    // 5. Add to Scene
    this.scene.appendChild(enemyEl);

    // 6. Register with TypingEngine so we can type it
    TypingEngine.addTarget(id, word, enemyEl);
  }

  _setupTypingEvents() {
    // Visual feedback when locking onto a target
    TypingEngine.on('onLock', (targetId) => {
      const el = document.getElementById(targetId);
      if (el) {
        // Optional: Visual highlight (e.g., turn text red)
        // el.querySelector('a-text').setAttribute('color', '#ff0000');
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