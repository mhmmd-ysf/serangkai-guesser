'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { search } = require('../lib/search');
const { countLetters, bannedLetters } = require('../helpers/tokens');

const WORDS = new Set(['nyanyian', 'menggambar', 'kharisma', 'abadi', 'kain', 'mat-matan']);

describe('search', () => {
  it('matches a wildcard pattern over game-letter slots', () => {
    assert.deepEqual(search(WORDS, 'ny*nyian', new Map(), new Set()), ['nyanyian']);
  });

  it('matches an exact pattern', () => {
    assert.deepEqual(search(WORDS, 'menggambar', new Map(), new Set()), ['menggambar']);
  });

  it('treats digraphs as single slots in the pattern', () => {
    assert.deepEqual(search(WORDS, 'kh*', new Map(), new Set()), ['kharisma']);
  });

  it('applies the must-have constraint', () => {
    assert.deepEqual(search(WORDS, '*', countLetters('ng'), new Set()), ['menggambar']);
  });

  it('applies the must-not-have constraint', () => {
    assert.deepEqual(search(WORDS, '*', new Map(), bannedLetters('m')), [
      'nyanyian',
      'abadi',
      'kain',
    ]);
  });

  it('combines pattern, has, and not constraints', () => {
    assert.deepEqual(search(WORDS, '*', countLetters('a'), bannedLetters('ng')), [
      'nyanyian',
      'kharisma',
      'abadi',
      'kain',
      'mat-matan',
    ]);
  });

  it('returns an empty array when nothing matches', () => {
    assert.deepEqual(search(WORDS, 'zzzz', new Map(), new Set()), []);
  });
});
