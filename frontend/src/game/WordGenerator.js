import { words } from '../data/words.js';

const DIFFICULTIES = ['easy', 'moderate', 'hard'];
const DIFFICULTY_THRESHOLDS = {
  easy: 0,        // Levels 1-3: easy
  moderate: 4,    // Levels 4-6: moderate  
  hard: 7         // Levels 7+: hard
};

function pickRandom(arr) {
  if (!arr || arr.length === 0) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export class WordGenerator {
  constructor(seed = null) {
    this.seed = seed;
    
    // Initialize word pools with shuffling for variety
    this.pools = {
      easy: words.easy ? shuffleArray([...words.easy]) : [],
      moderate: words.moderate ? shuffleArray([...words.moderate]) : [],
      hard: words.hard ? shuffleArray([...words.hard]) : []
    };
    
    // Track used words to avoid repetition in same session
    this.usedWords = {
      easy: new Set(),
      moderate: new Set(),
      hard: new Set()
    };
    
    // Current index for each pool (for non-repeating sequential access)
    this.currentIndices = { easy: 0, moderate: 0, hard: 0 };
  }
  
  // Get difficulty key from level number
  getDifficultyFromLevel(level = 1) {
    if (level >= DIFFICULTY_THRESHOLDS.hard) return 'hard';
    if (level >= DIFFICULTY_THRESHOLDS.moderate) return 'moderate';
    return 'easy';
  }
  
  // Get a single word
  getWord(difficulty = 'easy') {
    const key = DIFFICULTIES.includes(difficulty) ? difficulty : 'easy';
    const pool = this.pools[key];
    
    if (!pool || pool.length === 0) {
      console.warn(`No words available for difficulty: ${key}, using fallback`);
      return this.getFallbackWord();
    }
    
    // Try to get a word not recently used
    let word = pool[this.currentIndices[key]];
    this.currentIndices[key] = (this.currentIndices[key] + 1) % pool.length;
    
    // If we've gone through all words, reshuffle for next cycle
    if (this.currentIndices[key] === 0) {
      this.pools[key] = shuffleArray([...this.pools[key]]);
    }
    
    return word;
  }
  
  // Get batch of words without repeats in same batch
  getBatch({ difficulty = 'easy', count = 10 } = {}) {
    const key = DIFFICULTIES.includes(difficulty) ? difficulty : 'easy';
    const pool = this.pools[key];
    
    if (!pool || pool.length === 0) {
      console.warn(`No words available for difficulty: ${key}, using fallback`);
      return Array(count).fill('word');
    }
    
    const batch = [];
    const usedInBatch = new Set();
    
    for (let i = 0; i < count; i++) {
      let word;
      let attempts = 0;
      
      // Try to avoid repeats within the same batch
      do {
        const randomIndex = Math.floor(Math.random() * pool.length);
        word = pool[randomIndex];
        attempts++;
        
        // After 5 attempts, just use any word to avoid infinite loop
        if (attempts > 5) break;
      } while (usedInBatch.has(word) && usedInBatch.size < pool.length);
      
      usedInBatch.add(word);
      batch.push(word);
    }
    
    return batch;
  }
  
  // Progressive difficulty based on level
  getByLevel(level = 1) {
    const difficulty = this.getDifficultyFromLevel(level);
    return this.getWord(difficulty);
  }
  
  // Get words for a game wave (mix of difficulties based on level)
  getWaveWords(level = 1, count = 8) {
    const difficulty = this.getDifficultyFromLevel(level);
    const words = [];
    
    // Mix in some easier words for variety
    const easyRatio = Math.max(0.3, 1 - (level * 0.1));
    const moderateRatio = 0.4;
    const hardRatio = Math.min(0.5, (level - 1) * 0.1);
    
    const easyCount = Math.floor(count * easyRatio);
    const moderateCount = Math.floor(count * moderateRatio);
    const hardCount = count - easyCount - moderateCount;
    
    // Get words for each difficulty
    for (let i = 0; i < easyCount; i++) {
      words.push(this.getWord('easy'));
    }
    for (let i = 0; i < moderateCount; i++) {
      words.push(this.getWord('moderate'));
    }
    for (let i = 0; i < hardCount; i++) {
      words.push(this.getWord('hard'));
    }
    
    // Shuffle the final list
    return shuffleArray(words);
  }
  
  // Fallback word if pool is empty
  getFallbackWord() {
    const fallbacks = ['word', 'type', 'game', 'play', 'test'];
    return pickRandom(fallbacks);
  }
  
  // Reset used words (for new game session)
  resetUsedWords() {
    this.usedWords = { easy: new Set(), moderate: new Set(), hard: new Set() };
    this.currentIndices = { easy: 0, moderate: 0, hard: 0 };
    
    // Reshuffle pools for fresh session
    this.pools.easy = shuffleArray([...this.pools.easy]);
    this.pools.moderate = shuffleArray([...this.pools.moderate]);
    this.pools.hard = shuffleArray([...this.pools.hard]);
  }
  
  // Get statistics about word pools
  getStats() {
    return {
      easy: { count: this.pools.easy.length },
      moderate: { count: this.pools.moderate.length },
      hard: { count: this.pools.hard.length },
      total: this.pools.easy.length + this.pools.moderate.length + this.pools.hard.length
    };
  }
}

// Default instance for easy import
const wordGenerator = new WordGenerator();
export default wordGenerator;