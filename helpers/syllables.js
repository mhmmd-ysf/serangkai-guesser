'use strict';

const VOWELS = new Set(['a', 'i', 'u', 'e', 'o']);
const DIPHTHONGS = new Set(['ai', 'au', 'oi']);

/**
 * For a run of consecutive vowel letters, enumerate every possible syllable
 * count: each vowel is one syllable, but an ai/au/oi pair may be either a
 * diphthong (one syllable) or a hiatus (two syllables). Returns sorted counts.
 */
function runSyllableOptions(run) {
  const counts = new Set();
  (function step(pos, syllables) {
    if (pos === run.length) {
      counts.add(syllables);
      return;
    }
    step(pos + 1, syllables + 1); // single vowel
    if (pos + 1 < run.length && DIPHTHONGS.has(run.slice(pos, pos + 2))) {
      step(pos + 2, syllables + 1); // diphthong
    }
  })(0, 0);
  return [...counts].sort((a, b) => a - b);
}

/**
 * All possible syllable counts for a word (sorted, unique). A single value
 * means the count is certain; multiple values mean it needs manual review.
 */
function syllablePossibilities(word) {
  const runs = [];
  let current = '';
  for (const ch of word.toLowerCase()) {
    if (VOWELS.has(ch)) {
      current += ch;
    } else if (current) {
      runs.push(current);
      current = '';
    }
  }
  if (current) runs.push(current);

  let totals = [0];
  for (const run of runs) {
    const options = runSyllableOptions(run);
    const next = [];
    for (const t of totals) {
      for (const o of options) next.push(t + o);
    }
    totals = next;
  }
  return [...new Set(totals)].sort((a, b) => a - b);
}

module.exports = { runSyllableOptions, syllablePossibilities };
