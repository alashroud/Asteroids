/**
 * GameStateSystem.js - Handles typing input and game state management
 * 
 * This A-Frame system manages:
 * - User keyboard input for typing asteroid words
 * - Matching typed input with asteroids on screen
 * - Game state (active, paused, game over)
 * - Coordination between typing display, asteroids, and projectile firing
 * 
 * @system game-state
 */
AFRAME.registerSystem('game-state', {
  
  /**
   * Initialize the game state system
   * Sets up keyboard listeners and game event listeners
   */
  init: function() {
    this.currentInput = '';        // Currently typed characters
    this.targetAsteroid = null;    // The asteroid being targeted
    this.isGameActive = false;     // Whether game is currently active
    
    this.setupKeyboardListeners();
    this.setupGameListeners();
  },

  /**
   * Set up event listeners for game state changes
   * Listens for: game-start, game-over, game-paused, game-resumed
   */
  setupGameListeners: function() {
    // Start game - enable input
    this.el.addEventListener('game-start', () => {
      this.isGameActive = true;
      this.clearInput();
    });

    // End game - disable input and clear
    this.el.addEventListener('game-over', () => {
      this.isGameActive = false;
      this.clearInput();
    });

    // Pause game - disable input temporarily
    this.el.addEventListener('game-paused', () => {
      this.isGameActive = false;
    });

    // Resume game - re-enable input
    this.el.addEventListener('game-resumed', () => {
      this.isGameActive = true;
    });
  },

  /**
   * Set up keyboard event listeners for typing mechanics
   * Handles: letter keys, backspace, enter, escape
   * Only processes input when game is active
   */
  setupKeyboardListeners: function() {
    // If the TypingEngine path is active, avoid double-handling keyboard input
    if (window.__USE_TYPING_ENGINE__ === true) {
      console.info('GameStateSystem: TypingEngine active, keyboard listeners disabled');
      return;
    }

    document.addEventListener('keydown', (e) => {
      // If TypingEngine was activated later, ignore this handler
      if (window.__USE_TYPING_ENGINE__ === true) return;

      // Ignore if typing in input fields
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      // Ignore if game not active
      if (!this.isGameActive) return;

      // Handle letter keys (A-Z, case insensitive)
      if (e.key.length === 1 && /^[a-zA-Z]$/.test(e.key)) {
        e.preventDefault();
        this.handleCharacter(e.key.toLowerCase());
      }
      
      // Handle backspace - remove last character
      else if (e.key === 'Backspace') {
        e.preventDefault();
        this.handleBackspace();
      }
      
      // Handle Enter - submit word if complete
      else if (e.key === 'Enter') {
        e.preventDefault();
        this.handleEnter();
      }

      // Handle Escape - clear current input
      else if (e.key === 'Escape') {
        e.preventDefault();
        this.clearInput();
      }
    });
  },

  /**
   * Handle a typed character
   * Adds character to input, finds matching asteroid, highlights it
   * If word is complete, triggers projectile firing
   * 
   * @param {string} char - The lowercase character that was typed
   */
  handleCharacter: function(char) {
    this.currentInput += char;
    
    // Find matching asteroid
    const matched = this.findMatchingAsteroid();
    
    if (matched) {
      // Unhighlight previous target if different
      if (this.targetAsteroid && this.targetAsteroid !== matched) {
        this.targetAsteroid.components.asteroid.highlight(false);
      }
      
      // Set new target and highlight
      this.targetAsteroid = matched;
      this.targetAsteroid.components.asteroid.highlight(true);
      
      // Update typing display UI
      this.updateTypingDisplay();
      
      // Check if word is complete
      const targetWord = this.targetAsteroid.components.asteroid.data.word;
      if (this.currentInput === targetWord.toLowerCase()) {
        this.completeWord();
      }
    } else {
      // No matching asteroid - clear input
      this.clearInput();
      console.log('No matching asteroid');
    }
  },

  /**
   * Handle backspace key press
   * Removes last character from input
   * Re-matches asteroids or clears if no matches
   */
  handleBackspace: function() {
    if (this.currentInput.length > 0) {
      this.currentInput = this.currentInput.slice(0, -1);
      
      if (this.currentInput.length === 0) {
        this.clearInput();
      } else {
        // Try to find matching asteroid with reduced input
        const matched = this.findMatchingAsteroid();
        if (matched) {
          if (this.targetAsteroid && this.targetAsteroid !== matched) {
            this.targetAsteroid.components.asteroid.highlight(false);
          }
          this.targetAsteroid = matched;
          this.targetAsteroid.components.asteroid.highlight(true);
          this.updateTypingDisplay();
        } else {
          this.clearInput();
        }
      }
    }
  },

  /**
   * Handle Enter key press
   * Submits current input if word is complete and matches target
   */
  handleEnter: function() {
    if (this.targetAsteroid && this.currentInput) {
      const targetWord = this.targetAsteroid.components.asteroid.data.word;
      
      if (this.currentInput === targetWord.toLowerCase()) {
        this.completeWord();
      } else {
        console.log('Word not complete yet');
      }
    }
  },

  /**
   * Find an asteroid whose word starts with the current input
   * Returns the first matching asteroid found
   * 
   * @returns {Element|null} The matching asteroid entity or null if none found
   */
  findMatchingAsteroid: function() {
    if (!this.currentInput) return null;

    const asteroids = document.querySelectorAll('[asteroid]');
    
    for (const asteroid of asteroids) {
      if (!asteroid.components.asteroid) continue;
      
      const word = asteroid.components.asteroid.data.word;
      if (word && word.toLowerCase().startsWith(this.currentInput)) {
        return asteroid;
      }
    }
    
    return null;
  },

  /**
   * Handle completed word input
   * Fires projectile at target asteroid
   * Emits word-completed event for scoring/tracking
   * Clears input for next word
   */
  completeWord: function() {
    if (!this.targetAsteroid) return;
    
    console.log('Word completed:', this.currentInput);
    const word = this.targetAsteroid.components.asteroid.data.word;
    
    // Emit word completed event for other systems (scoring, etc.)
    this.el.emit('word-completed', {
      word: word,
      asteroid: this.targetAsteroid
    });
    
    // Fire projectile at target asteroid
    // Projectile will trigger destruction on collision
    const ship = document.querySelector('#spaceship');
    if (ship && ship.components['projectile-system']) {
      ship.components['projectile-system'].fireAtTarget(this.targetAsteroid);
    }
    
    // Clear input for next word immediately
    this.clearInput();
  },

  /**
   * Update the typing display UI with current input and target word
   * Communicates with the typing-display component
   */
  updateTypingDisplay: function() {
    const typingDisplay = document.querySelector('[typing-display]');
    if (typingDisplay && typingDisplay.components['typing-display']) {
      const display = typingDisplay.components['typing-display'];
      display.currentInput = this.currentInput;
      
      if (this.targetAsteroid) {
        const word = this.targetAsteroid.components.asteroid.data.word;
        display.setTargetWord(word);
      }
      
      display.updateDisplay();
    }
  },

  /**
   * Clear the current input and unhighlight target asteroid
   * Also clears the typing display UI
   */
  clearInput: function() {
    this.currentInput = '';
    
    // Unhighlight current target
    if (this.targetAsteroid) {
      this.targetAsteroid.components.asteroid.highlight(false);
      this.targetAsteroid = null;
    }
    
    // Clear typing display UI
    const typingDisplay = document.querySelector('[typing-display]');
    if (typingDisplay && typingDisplay.components['typing-display']) {
      typingDisplay.components['typing-display'].clearInput();
    }
  }
});
