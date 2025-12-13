export class ScoreManager {
    constructor() {
      this.reset();
      this.listeners = []; // Functions to call on score change
    }
  
    reset() {
      this.score = 0;
      this.streak = 0;
      this.multiplier = 1;
      
      // Stats for end-game report
      this.wordsTyped = 0;
      this.charsTyped = 0; // Total valid characters
      this.mistakes = 0;
      this.startTime = Date.now();
      this.endTime = null;
      
      this._notify();
    }
  
    /**
     * Called when a word is successfully typed.
     * @param {string} word - The word completed.
     * @param {string} difficulty - 'easy', 'moderate', 'hard'.
     */
    handleWordComplete(word, difficulty = 'easy') {
      const basePoints = word.length * 10;
      const difficultyBonus = this._getDifficultyMultiplier(difficulty);
      
      // Formula: (Base + Difficulty) * StreakMultiplier
      const points = Math.floor((basePoints * difficultyBonus) * this.multiplier);
      
      this.score += points;
      this.wordsTyped++;
      this.charsTyped += word.length;
      
      this._increaseStreak();
      this._notify();
      
      return points; // Return points in case we want to show a floating text popup
    }
  
    /**
     * Called when the user types a wrong key.
     */
    handleMistake() {
      this.mistakes++;
      this.streak = 0;
      this.multiplier = 1;
      this._notify();
    }
  
    _increaseStreak() {
      this.streak++;
      // Logic: Increase multiplier every 5 words, max 5x
      this.multiplier = 1 + Math.floor(this.streak / 5);
      if (this.multiplier > 5) this.multiplier = 5;
    }
  
    _getDifficultyMultiplier(difficulty) {
      switch (difficulty) {
        case 'hard': return 2.0;
        case 'moderate': return 1.5;
        case 'easy': 
        default: return 1.0;
      }
    }
  
    /**
     * Calculate Words Per Minute (standard: 5 chars = 1 word).
     */
    getWPM() {
      const timeNow = this.endTime || Date.now();
      const minutes = (timeNow - this.startTime) / 60000;
      if (minutes <= 0) return 0;
      
      // Standard WPM formula: (All typed entries / 5) / Time in minutes
      // We use charsTyped (valid chars) for a "Net WPM" feel
      return Math.round((this.charsTyped / 5) / minutes);
    }
  
    /**
     * Calculate accuracy percentage.
     */
    getAccuracy() {
      const totalKeystrokes = this.charsTyped + this.mistakes;
      if (totalKeystrokes === 0) return 100;
      
      const acc = (this.charsTyped / totalKeystrokes) * 100;
      return Math.round(acc * 100) / 100; // Round to 2 decimals
    }
  
    /**
     * Returns a full stats object for the Game Over screen or Database.
     */
    getSessionStats() {
      return {
        score: this.score,
        maxStreak: this.streak, // Note: You might want to track 'highestStreak' separately if needed
        wpm: this.getWPM(),
        accuracy: this.getAccuracy(),
        wordsTyped: this.wordsTyped,
        mistakes: this.mistakes,
        durationSeconds: ((Date.now() - this.startTime) / 1000).toFixed(1)
      };
    }
  
    /**
     * Subscribe to score updates (for UI).
     * @param {Function} callback - (state) => {}
     */
    onUpdate(callback) {
      this.listeners.push(callback);
    }
  
    _notify() {
      const state = {
        score: this.score,
        streak: this.streak,
        multiplier: this.multiplier
      };
      this.listeners.forEach(cb => cb(state));
    }
  }
  
  // Export singleton
  export default new ScoreManager();