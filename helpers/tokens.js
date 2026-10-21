'use strict';

const { GAME_DIGRAPHS } = require('./constants');

/**
 * Split a word into "slots": hyphens/spaces are ignored, and the digraphs
 * ng/ny/sy/kh count as a single slot (everything else is one letter).
 */
function wordTokens(word) {
  const s = word.toLowerCase();
  const tokens = [];
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '-' || ch === ' ') continue;
    const pair = s.slice(i, i + 2);
    if (GAME_DIGRAPHS.has(pair)) {
      tokens.push(pair);
      i++;
    } else {
      tokens.push(ch);
    }
  }
  return tokens;
}

/**
 * Split a pattern into slots, where * is a wildcard matching any run of slots
 * (including none). Digraphs and hyphens are treated as in wordTokens.
 */
function patternTokens(pattern) {
  const s = pattern.toLowerCase();
  const tokens = [];
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '*') {
      tokens.push('*');
      continue;
    }
    if (ch === '-' || ch === ' ') continue;
    const pair = s.slice(i, i + 2);
    if (GAME_DIGRAPHS.has(pair)) {
      tokens.push(pair);
      i++;
    } else {
      tokens.push(ch);
    }
  }
  return tokens;
}

/**
 * Classic wildcard match over token arrays: * matches any sequence of tokens.
 */
function globMatch(pattern, text) {
  let pi = 0;
  let si = 0;
  let star = -1;
  let mark = 0;

  while (si < text.length) {
    if (pi < pattern.length && pattern[pi] === text[si]) {
      pi++;
      si++;
    } else if (pi < pattern.length && pattern[pi] === '*') {
      star = pi;
      mark = si;
      pi++;
    } else if (star !== -1) {
      pi = star + 1;
      mark++;
      si = mark;
    } else {
      return false;
    }
  }

  while (pi < pattern.length && pattern[pi] === '*') {
    pi++;
  }
  return pi === pattern.length;
}

/**
 * Count the game "letters" of a word: hyphens are ignored, and the digraphs
 * ng/ny/sy/kh each count as a single letter.
 */
function gameLetterCount(word) {
  const s = word.toLowerCase();
  let count = 0;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '-') continue;
    if (GAME_DIGRAPHS.has(s.slice(i, i + 2))) {
      i++; // consume both characters of the digraph
    }
    count++;
  }
  return count;
}

/**
 * Count how many times each game-letter slot appears in `letters`
 * (case-insensitive). Digraphs ng/ny/sy/kh count as a single slot. Repeating a
 * slot requires multiple occurrences of it.
 */
function countLetters(letters) {
  const counts = new Map();
  for (const slot of wordTokens(letters)) {
    counts.set(slot, (counts.get(slot) || 0) + 1);
  }
  return counts;
}

/**
 * The set of game-letter slots that must NOT appear (case-insensitive).
 */
function bannedLetters(letters) {
  return new Set(wordTokens(letters));
}

/**
 * Check a word against the "must contain" and "must not contain" constraints,
 * treating digraphs ng/ny/sy/kh as single slots.
 */
function matchesConstraints(word, mustHave, mustNotHave) {
  if (mustHave.size === 0 && mustNotHave.size === 0) return true;

  const present = new Map();
  for (const slot of wordTokens(word)) {
    if (mustNotHave.has(slot)) return false;
    present.set(slot, (present.get(slot) || 0) + 1);
  }
  for (const [slot, need] of mustHave) {
    if ((present.get(slot) || 0) < need) return false;
  }
  return true;
}

module.exports = {
  wordTokens,
  patternTokens,
  globMatch,
  gameLetterCount,
  countLetters,
  bannedLetters,
  matchesConstraints,
};
