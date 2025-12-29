export class ScoreManager {
  constructor() {
    this.listeners = [];

    this.reset();
  }

  reset() {
    this.score = 0;
    this.streak = 0;
    this.multiplier = 1;

    // Stats for end-game report
    this.wordsTyped = 0;
    this.charsTyped = 0;
    this.mistakes = 0;
    this.startTime = Date.now();
    this.endTime = null;

    this._notify();
  }

  handleWordComplete(word, difficulty = 'easy') {
    const basePoints = word.length * 10;
    const difficultyBonus = this._getDifficultyMultiplier(difficulty);

    const points = Math.floor(
      (basePoints * difficultyBonus) * this.multiplier
    );

    this.score += points;
    this.wordsTyped++;
    this.charsTyped += word.length;

    this._increaseStreak();
    this._notify();

    return points;
  }

  handleMistake() {
    this.mistakes++;
    this.streak = 0;
    this.multiplier = 1;
    this._notify();
  }

  _increaseStreak() {
    this.streak++;
    this.multiplier = 1 + Math.floor(this.streak / 5);
    if (this.multiplier > 5) this.multiplier = 5;
  }

  _getDifficultyMultiplier(difficulty) {
    switch (difficulty) {
      case 'hard': return 2.0;
      case 'moderate': return 1.5;
      default: return 1.0;
    }
  }

  getWPM() {
    const timeNow = this.endTime || Date.now();
    const minutes = (timeNow - this.startTime) / 60000;
    if (minutes <= 0) return 0;
    return Math.round((this.charsTyped / 5) / minutes);
  }

  getAccuracy() {
    const totalKeystrokes = this.charsTyped + this.mistakes;
    if (totalKeystrokes === 0) return 100;
    return Math.round((this.charsTyped / totalKeystrokes) * 10000) / 100;
  }

  getSessionStats() {
    return {
      score: this.score,
      maxStreak: this.streak,
      wpm: this.getWPM(),
      accuracy: this.getAccuracy(),
      wordsTyped: this.wordsTyped,
      mistakes: this.mistakes,
      durationSeconds: ((Date.now() - this.startTime) / 1000).toFixed(1)
    };
  }

  onUpdate(callback) {
    if (typeof callback === 'function') {
      this.listeners.push(callback);
    }
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

// Singleton export
export default new ScoreManager();
