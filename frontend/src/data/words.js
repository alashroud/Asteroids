export const words = {
    easy: [
      'cat','dog','sun','map','book','tree','star','ball','fish','bird',
      'ship','rock','milk','cake','light','rain','wind','fire','snow','sand'
    ],
    moderate: [
      'planet','rocket','asteroid','galaxy','orbit','launch','shield','target','thrust','module',
      'oxygen','comet','signal','impact','vector','system','engine','radar','syntax','cursor'
    ],
    hard: [
      'gravitational','constellation','telemetry','trajectory','synchronous',
      'nanotechnology','spectroscopy','hypertension','photosynthesis','electromagnetism',
      'cryptography','reciprocity','transcendent','infrastructure','interstellar'
    ]
  };
  
  export function validateWords(dataset = words) {
    const levels = ['easy', 'moderate', 'hard'];
    for (const lvl of levels) {
      if (!Array.isArray(dataset[lvl])) {
        throw new Error(`words.${lvl} must be an array`);
      }
      for (const w of dataset[lvl]) {
        if (typeof w !== 'string' || !w.trim()) {
          throw new Error(`Invalid word in ${lvl}: "${w}"`);
        }
      }
    }
    return true;
  }
  

  export function mergeWords(extra = {}) {
    const out = {
      easy: [...words.easy],
      moderate: [...words.moderate],
      hard: [...words.hard]
    };
    for (const key of Object.keys(extra)) {
      if (!out[key]) continue;
      const add = Array.isArray(extra[key]) ? extra[key].filter(Boolean) : [];
      out[key].push(...add);
    }
    validateWords(out);
    return out;
  }
  

  export function normalizeWords(dataset = words) {
    const uniq = arr => Array.from(new Set(arr.map(w => w.toLowerCase().trim()).filter(Boolean)));
    const normalized = {
      easy: uniq(dataset.easy || []),
      moderate: uniq(dataset.moderate || []),
      hard: uniq(dataset.hard || [])
    };
    validateWords(normalized);
    return normalized;
  }
  
  // Run a validation in dev to catch issues early.
  try { validateWords(words); } catch (e) { console.error(e); }
  
  export default words;