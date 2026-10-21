'use strict';

// Game "letters": these digraphs each count as a single letter/slot.
const GAME_DIGRAPHS = new Set(['ng', 'ny', 'sy', 'kh']);

// Length filter for the word bank: hyphenated words stay, but hyphens are
// ignored and the digraphs above count as a single letter.
const MAX_GAME_LETTERS = 9;

// Maximum number of results printed unless --all is passed.
const DEFAULT_RESULT_LIMIT = 100;

module.exports = { GAME_DIGRAPHS, MAX_GAME_LETTERS, DEFAULT_RESULT_LIMIT };
