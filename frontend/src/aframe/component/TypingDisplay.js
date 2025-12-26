/**
 * TypingDisplay.js - HUD overlay for showing current typing input
 * 
 * This A-Frame component manages:
 * - Visual display of user's typed input at bottom of screen
 * - Target word display showing which asteroid is being typed
 * - Color feedback (green for correct, red for incorrect input)
 * - Visibility control based on game state
 * - Instruction text for player guidance
 * 
 * The HUD is positioned at the bottom center of the screen and overlays
 * the 3D scene without interfering with gameplay.
 * 
 * @component typing-display
 */
import TypingEngine from '../../game/TypingEngine.js';

AFRAME.registerComponent('typing-display', {
  schema: {},

  /**
   * Initialize the typing display component
   * Creates the HUD elements and sets up event listeners
   */
  init: function() {
    this.currentInput = '';  // Currently typed characters
    this.targetWord = '';    // The word being targeted (from asteroid)
    
    this.createHUD();
    this.setupKeyboardListeners();
  },

  /**
   * Create the HUD overlay elements and add to DOM
   * Creates:
   * - Main container (centered at bottom of screen)
   * - Target word display (shows which asteroid is targeted)
   * - Input text display (shows current typed characters)
   * - Instruction text (gameplay hint)
   * 
   * Also sets up game state event listeners to show/hide HUD
   */
  createHUD: function() {
    // Main HUD container
    const hudContainer = document.createElement('div');
    hudContainer.id = 'typing-hud';
    hudContainer.style.cssText = `
      position: fixed;
      bottom: 80px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 1000;
      pointer-events: auto;
      text-align: center;
      display: none;
    `;
    
    // Target word display (shows asteroid word above input)
    const targetDisplay = document.createElement('div');
    targetDisplay.id = 'target-word';
    targetDisplay.style.cssText = `
      font-family: 'Orbitron', monospace;
      font-size: 18px;
      color: #888888;
      margin-bottom: 10px;
      letter-spacing: 2px;
    `;
    hudContainer.appendChild(targetDisplay);
    this.targetDisplay = targetDisplay;
    
    // Input background box
    const inputBg = document.createElement('div');
    inputBg.style.cssText = `
      background: rgba(0, 0, 0, 0.85);
      border: 2px solid #00FFFF;
      border-radius: 10px;
      padding: 15px 36px;
      min-width: 320px;
      box-shadow: 0 0 20px rgba(0, 255, 255, 0.5);
      position: relative;
    `;
    
    // Current input text display
    const inputText = document.createElement('div');
    inputText.id = 'current-input';
    inputText.style.cssText = `
      font-family: 'Orbitron', monospace;
      font-size: 32px;
      color: #00FF00;
      font-weight: bold;
      letter-spacing: 4px;
      min-height: 40px;
      text-shadow: 0 0 10px currentColor;
      pointer-events: none;
    `;
    inputText.textContent = '_';
    inputBg.appendChild(inputText);
    this.inputText = inputText;

    // Create an invisible, focusable input to open virtual keyboards on mobile
    const hiddenInput = document.createElement('input');
    hiddenInput.type = 'text';
    hiddenInput.id = 'typing-input';
    hiddenInput.autocomplete = 'off';
    hiddenInput.autocapitalize = 'off';
    hiddenInput.autocorrect = 'off';
    hiddenInput.spellcheck = false;
    hiddenInput.style.cssText = `
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      opacity: 0;
      border: none;
      background: transparent;
      caret-color: transparent;
      pointer-events: auto;
    `;

    // When focused, stop propagation so global key handlers don't double-process
    hiddenInput.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace') {
        e.preventDefault();
        e.stopPropagation();
        TypingEngine.backspace();
        return;
      }
      if (e.key.length === 1) {
        e.preventDefault();
        e.stopPropagation();
        TypingEngine.processKey(e.key);
      }
    });

    // When touching/clicking the input area, ensure the element receives focus (mobile)
    inputBg.addEventListener('click', () => {
      hiddenInput.focus();
    });

    // Add input to background
    inputBg.appendChild(hiddenInput);
    this.hiddenInput = hiddenInput;
    
    hudContainer.appendChild(inputBg);
    
    // Instruction text
    const instruction = document.createElement('div');
    instruction.id = 'typing-instruction';
    instruction.style.cssText = `
      font-family: 'Orbitron', monospace;
      font-size: 14px;
      color: #00FFFF;
      margin-top: 10px;
      letter-spacing: 1px;
    `;
    instruction.textContent = 'Tap the HUD and type to destroy asteroids!';
    hudContainer.appendChild(instruction);
    this.instruction = instruction;
    
    // Add HUD to DOM
    document.body.appendChild(hudContainer);
    this.hudContainer = hudContainer;
    
    // Listen for game state changes to show/hide HUD
    this.el.sceneEl.addEventListener('game-start', () => {
      this.show();
      try { this.hiddenInput.focus(); } catch (e) {}
    });
    
    this.el.sceneEl.addEventListener('game-over', () => {
      this.hide();
      try { this.hiddenInput.blur(); } catch (e) {}
    });
    
    this.el.sceneEl.addEventListener('game-paused', () => {
      this.hide();
    });
    
    this.el.sceneEl.addEventListener('game-resumed', () => {
      this.show();
      try { this.hiddenInput.focus(); } catch (e) {}
    });
  },

  /**
   * Set up keyboard event listeners
   * Note: Actual keyboard handling is done by GameStateSystem
   * This component only displays the results
   */
  setupKeyboardListeners: function() {
    // Connect TypingEngine events to update the HUD
    TypingEngine.on('onLock', (targetId) => {
      const t = TypingEngine.targets.get(targetId);
      const word = t ? t.originalWord : '';
      this.setTargetWord(word);
      this.currentInput = t ? t.word.substring(0, 1) : '';
      this.updateDisplay();

      // Focus input so the user can continue typing (mobile-friendly)
      try { this.hiddenInput && this.hiddenInput.focus(); } catch (e) {}
    });

    TypingEngine.on('onProgress', (targetId, index, char) => {
      const t = TypingEngine.targets.get(targetId);
      if (t) {
        this.targetWord = t.originalWord;
        // index is 1-based progress (number of chars matched)
        this.currentInput = t.word.substring(0, index);
      }
      this.updateDisplay();
    });

    TypingEngine.on('onMistake', (char) => {
      // Quick red flash
      if (this.inputText) {
        const old = this.inputText.style.color;
        this.inputText.style.color = '#FF0000';
        setTimeout(() => { this.updateDisplay(); }, 220);
      }
    });

    TypingEngine.on('onComplete', (targetId, word) => {
      // Success flash
      if (this.inputText) {
        this.inputText.style.color = '#FFFFFF';
        setTimeout(() => { this.clearInput(); }, 220);
      } else {
        this.clearInput();
      }
    });

    TypingEngine.on('onReset', () => {
      this.clearInput();
    });
    TypingEngine.on('onCandidates', (_ids, buffer) => {
      this.targetWord = '';
      this.currentInput = buffer || '';
      this.updateDisplay();
    });
  },

  /**
   * Show the HUD overlay
   * Called when game starts or resumes
   */
  show: function() {
    if (this.hudContainer) {
      this.hudContainer.style.display = 'block';
    }
  },

  /**
   * Hide the HUD overlay
   * Called when game pauses or ends
   */
  hide: function() {
    if (this.hudContainer) {
      this.hudContainer.style.display = 'none';
    }
  },

  /**
   * Update the input display with current text and color
   * Color changes based on correctness:
   * - Green: Input matches target word so far
   * - Red: Input does not match target word
   * - Green (default): No target selected yet
   */
  updateDisplay: function() {
    if (this.inputText) {
      // Blinking caret
      const caret = (Date.now() % 800) < 400 ? '_' : '';
      const base = this.currentInput || '';
      const display = base ? (base + caret) : '_';
      this.inputText.textContent = display;

      // Color feedback based on correctness
      if (this.targetWord && this.currentInput) {
        const isCorrect = this.targetWord.toLowerCase().startsWith(this.currentInput);
        this.inputText.style.color = isCorrect ? '#00FF00' : '#FF0000';
      } else {
        this.inputText.style.color = '#00FF00';
      }
    }
  },

  /**
   * Set the target word to display
   * Shows which asteroid word is currently being typed
   * 
   * @param {string} word - The asteroid word being targeted
   */
  setTargetWord: function(word) {
    this.targetWord = word;
    if (this.targetDisplay) {
      this.targetDisplay.textContent = word ? `Target: ${word.toUpperCase()}` : '';
    }
  },

  /**
   * Clear the input and target word displays
   * Called when word is completed or input is cancelled
   */
  clearInput: function() {
    this.currentInput = '';
    this.targetWord = '';
    this.updateDisplay();
    if (this.targetDisplay) {
      this.targetDisplay.textContent = '';
    }
  },

  /**
   * Hide the instruction text
   * Can be called after player has learned the controls
   */
  hideInstructions: function() {
    if (this.instruction) {
      this.instruction.style.display = 'none';
    }
  },

  /**
   * Show the instruction text
   * Can be called to remind player of controls
   */
  showInstructions: function() {
    if (this.instruction) {
      this.instruction.style.display = 'block';
    }
  },

  /**
   * Clean up and remove HUD from DOM
   * Called when component is removed
   */
  remove: function() {
    if (this.hudContainer && this.hudContainer.parentNode) {
      this.hudContainer.parentNode.removeChild(this.hudContainer);
    }
  }
});
