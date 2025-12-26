export class DifficultyManager {
  constructor() {
    this.reset();
  }

  reset() {
    this.level = 1;
    this.wordsTyped = 0;
    
    // Configurable curves
    this.config = {
      baseSpawnInterval: 3500, // Slower start (was 2500)
      minSpawnInterval: 400,   // Faster end (was 600)
      baseEnemySpeed: 1.0,     // Starting enemy speed (wave 1)
      speedIncrement: 0.25,    // Increase speed by 0.25 per wave (was 0.15 - now more noticeable)
      intervalDecrement: 80,   // Faster drop in spawn time (was 50)
      wordsPerLevel: 5         // Words needed to level up
    };
  }

  /**
   * Called whenever a player successfully types a word.
   * Updates internal counters and checks for level up.
   * @returns {boolean} True if the player leveled up.
   */
  onWordTyped() {
    this.wordsTyped++;
    
    // Check if we should level up
    if (this.wordsTyped % this.config.wordsPerLevel === 0) {
      this.level++;
      console.log(`Level Up! Now Level ${this.level}`);
      return true; // Leveled up
    }
    return false;
  }

  /**
   * Get the current spawn interval in milliseconds.
   * Decreases as level increases (enemies spawn faster).
   */
  getSpawnInterval() {
    const reduction = (this.level - 1) * this.config.intervalDecrement;
    const interval = this.config.baseSpawnInterval - reduction;
    // Ensure we don't go below the minimum limit
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
      wordsTyped: this.wordsTyped,
      nextLevelIn: this.config.wordsPerLevel - (this.wordsTyped % this.config.wordsPerLevel)
    };
  }
}

// Export singleton so the state is shared across the app
export default new DifficultyManager();