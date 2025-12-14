export class TypingEngine {
    constructor() {
      // Map of targetId -> { word: string, entity: any }
      this.targets = new Map();
      
      // State
      this.currentTargetId = null;
      this.currentIndex = 0;
  
      // Event listeners storage
      this.listeners = {
        onLock: [],      // (targetId) => {}
        onProgress: [],  // (targetId, progressIndex, char) => {}
        onMistake: [],   // (char) => {}
        onComplete: [],  // (targetId, word) => {}
        onReset: []      // () => {}
      };
    }
  
    /**
     * Register a new target word (e.g., an asteroid).
     * @param {string} id - Unique identifier for the target (e.g., entity ID).
     * @param {string} word - The word to type.
     * @param {any} [userData] - Optional extra data (e.g., reference to A-Frame entity).
     */
    addTarget(id, word, userData = null) {
      if (!word) return;
      this.targets.set(id, {
        word: word.toLowerCase(), // Case insensitive matching
        originalWord: word,
        userData
      });
    }
  
    /**
     * Remove a target (e.g., destroyed or out of bounds).
     * @param {string} id 
     */
    removeTarget(id) {
      if (this.currentTargetId === id) {
        this.resetState();
      }
      this.targets.delete(id);
    }
  
    /**
     * Process a keystroke from the user.
     * @param {string} key 
     */
    processKey(key) {
      // Ignore non-character keys or modifiers if passed raw
      if (!key || key.length !== 1) return;
      
      const char = key.toLowerCase();
  
      // Case 1: Already locked onto a target
      if (this.currentTargetId) {
        this._handleLockedInput(char);
      } 
      // Case 2: Searching for a new target
      else {
        this._handleNewTargetInput(char);
      }
    }
  
    _handleLockedInput(char) {
      const target = this.targets.get(this.currentTargetId);
      
      // Safety check: if target vanished but state wasn't cleared
      if (!target) {
        this.resetState();
        return;
      }
  
      const expectedChar = target.word[this.currentIndex];
  
      if (char === expectedChar) {
        this.currentIndex++;
        this._emit('onProgress', this.currentTargetId, this.currentIndex, char);
  
        // Check completion
        if (this.currentIndex >= target.word.length) {
          this._emit('onComplete', this.currentTargetId, target.originalWord);
          this.removeTarget(this.currentTargetId); // Auto-remove on complete
          this.resetState();
        }
      } else {
        this._emit('onMistake', char);
      }
    }
  
    _handleNewTargetInput(char) {
      // Find a target starting with this char
      // Note: You could enhance this to prioritize closest targets if userData has position
      let foundId = null;
  
      for (const [id, data] of this.targets.entries()) {
        if (data.word.startsWith(char)) {
          foundId = id;
          break;
        }
      }
  
      if (foundId) {
        this.currentTargetId = foundId;
        this.currentIndex = 1; // First char matched
        this._emit('onLock', foundId);
        this._emit('onProgress', foundId, 1, char);
        
        // Edge case: 1-letter words
        const target = this.targets.get(foundId);
        if (target.word.length === 1) {
          this._emit('onComplete', foundId, target.originalWord);
          this.removeTarget(foundId);
          this.resetState();
        }
      } else {
        this._emit('onMistake', char);
      }
    }
  
    /**
     * Reset the typing state (e.g., if player presses Esc or target is lost).
     */
    resetState() {
      this.currentTargetId = null;
      this.currentIndex = 0;
      this._emit('onReset');
    }
  
    /**
     * Subscribe to events.
     * @param {'onLock'|'onProgress'|'onMistake'|'onComplete'|'onReset'} event 
     * @param {Function} callback 
     */
    on(event, callback) {
      if (this.listeners[event]) {
        this.listeners[event].push(callback);
      }
    }
  
    _emit(event, ...args) {
      if (this.listeners[event]) {
        this.listeners[event].forEach(cb => cb(...args));
      }
    }
  }
  
  // Export a singleton instance by default, or the class if you need multiple engines
  export default new TypingEngine();