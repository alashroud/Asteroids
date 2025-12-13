export class DifficultyManager {
    constructor() {
      this.reset();
    }
  
    reset() {
      this.level = 1;
      this.wordsTyped = 0;
      
      // Configurable curves
      this.config = {
        baseSpawnInterval: 2500, // ms
        minSpawnInterval: 600,   // Cap speed
        baseEnemySpeed: 1.0,
        speedIncrement: 0.1,
        intervalDecrement: 50,   // ms faster per level
        wordsPerLevel: 5         // Level up every 5 kills
      };
    }
  
    /**
     * Called whenever a player successfully types a word.
     * Updates internal counters and checks for level up.
     */
    onWordTyped() {
      this.wordsTyped++;
      
      // Check if we should level up
      if (this.wordsTyped % this.config.wordsPerLevel === 0) {
        this.level++;
        return true; // Leveled up
      }
      return false;
    }
  
    /**
     * Get the current spawn interval in milliseconds.
     * Decreases as level increases.
     */
    getSpawnInterval() {
      const reduction = (this.level - 1) * this.config.intervalDecrement;
      const interval = this.config.baseSpawnInterval - reduction;
      return Math.max(interval, this.config.minSpawnInterval);
    }
  
    /**
     * Get the enemy movement speed for the current level.
     * Increases as level increases.
     */
    getEnemySpeed() {
      return this.config.baseEnemySpeed + ((this.level - 1) * this.config.speedIncrement);
    }
  
    /**
     * Get the word difficulty category for the current level.
     * @returns {'easy'|'moderate'|'hard'}
     */
    getWordDifficulty() {
      if (this.level < 5) return 'easy';
      if (this.level < 10) return 'moderate';
      return 'hard';
    }
  
    /**
     * Get current level info for UI.
     */
    getStatus() {
      return {
        level: this.level,
        nextLevelIn: this.config.wordsPerLevel - (this.wordsTyped % this.config.wordsPerLevel)
      };
    }
  }
  
  // Export singleton
  export default new DifficultyManager();