export class TypingEngine {
  constructor() {
      // Map of targetId -> { word: string, entity: any }
      this.targets = new Map();
      
      // State
    this.currentTargetId = null;
    this.currentIndex = 0;
    this.buffer = '';
  
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
      if (!key || key.length !== 1) return;
      const char = key.toLowerCase();
      if (!/^[a-z]$/.test(char)) return;
      this.buffer += char;
      const candidates = [];
      for (const [id, data] of this.targets.entries()) {
        if (data.word.startsWith(this.buffer)) candidates.push(id);
      }
      if (candidates.length === 0) {
        this._emit('onMistake', char);
        this.resetState();
        return;
      }
      if (candidates.length === 1) {
        const id = candidates[0];
        const target = this.targets.get(id);
        this.currentTargetId = id;
        this.currentIndex = this.buffer.length;
        this._emit('onLock', id);
        this._emit('onProgress', id, this.currentIndex, char);
        if (this.currentIndex >= target.word.length) {
          this._emit('onComplete', id, target.originalWord);
          this.removeTarget(id);
          this.resetState();
        }
      } else {
        this._emit('onCandidates', candidates, this.buffer);
      }
    }
  
    backspace() {
      if (!this.buffer) return;
      this.buffer = this.buffer.slice(0, -1);
      const candidates = [];
      for (const [id, data] of this.targets.entries()) {
        if (data.word.startsWith(this.buffer)) candidates.push(id);
      }
      if (candidates.length === 1) {
        const id = candidates[0];
        const target = this.targets.get(id);
        this.currentTargetId = id;
        this.currentIndex = this.buffer.length;
        this._emit('onLock', id);
        this._emit('onProgress', id, this.currentIndex, null);
        if (this.currentIndex >= target.word.length) {
          this._emit('onComplete', id, target.originalWord);
          this.removeTarget(id);
          this.resetState();
        }
      } else if (candidates.length > 1) {
        this.currentTargetId = null;
        this.currentIndex = 0;
        this._emit('onCandidates', candidates, this.buffer);
      } else {
        this.resetState();
      }
    }
  
    /**
     * Reset the typing state (e.g., if player presses Esc or target is lost).
     */
    resetState() {
      this.currentTargetId = null;
      this.currentIndex = 0;
      this.buffer = '';
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
