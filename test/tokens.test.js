'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  wordTokens,
  patternTokens,
  globMatch,
  gameLetterCount,
  countLetters,
  bannedLetters,
  matchesConstraints,
} = require('../helpers/tokens');

describe('wordTokens', () => {
  it('treats ng/ny/sy/kh digraphs as a single slot', () => {
    assert.deepEqual(wordTokens('nyanyi'), ['ny', 'a', 'ny', 'i']);
    assert.deepEqual(wordTokens('menggambar'), ['m', 'e', 'ng', 'g', 'a', 'm', 'b', 'a', 'r']);
    assert.deepEqual(wordTokens('kharisma'), ['kh', 'a', 'r', 'i', 's', 'm', 'a']);
  });

  it('ignores hyphens', () => {
    assert.deepEqual(wordTokens('mat-matan'), ['m', 'a', 't', 'm', 'a', 't', 'a', 'n']);
  });

  it('skips spaces', () => {
    assert.deepEqual(wordTokens('mata air'), ['m', 'a', 't', 'a', 'a', 'i', 'r']);
  });

  it('lowercases input', () => {
    assert.deepEqual(wordTokens('NYANYI'), ['ny', 'a', 'ny', 'i']);
  });
});

describe('patternTokens', () => {
  it('turns * into a wildcard slot and keeps digraphs whole', () => {
    assert.deepEqual(patternTokens('ny*nyian'), ['ny', '*', 'ny', 'i', 'a', 'n']);
  });
});

describe('globMatch', () => {
  it('matches an exact pattern', () => {
    assert.ok(globMatch(patternTokens('menggambar'), wordTokens('menggambar')));
  });

  it('matches * over any run of slots', () => {
    assert.ok(globMatch(patternTokens('ny*nyian'), wordTokens('nyanyian')));
  });

  it('does not match when letters differ', () => {
    assert.equal(globMatch(patternTokens('mentari'), wordTokens('meranti')), false);
  });
});

describe('gameLetterCount', () => {
  it('counts digraphs as one letter and ignores hyphens', () => {
    assert.equal(gameLetterCount('nyanyi'), 4);
    assert.equal(gameLetterCount('menggambar'), 9);
    assert.equal(gameLetterCount('mat-matan'), 8);
    assert.equal(gameLetterCount('kharisma'), 7);
  });
});

describe('countLetters', () => {
  it('repeats require multiple occurrences', () => {
    assert.equal(countLetters('aa').get('a'), 2);
    assert.equal(countLetters('ngng').get('ng'), 2);
  });

  it('keeps digraphs and bare letters distinct', () => {
    const counts = countLetters('nang');
    assert.equal(counts.get('n'), 1);
    assert.equal(counts.get('a'), 1);
    assert.equal(counts.get('ng'), 1);
  });
});

describe('bannedLetters', () => {
  it('treats digraphs as single slots', () => {
    assert.deepEqual(bannedLetters('xz'), new Set(['x', 'z']));
    assert.deepEqual(bannedLetters('ng'), new Set(['ng']));
  });
});

describe('matchesConstraints', () => {
  it('requires the ng digraph', () => {
    assert.ok(matchesConstraints('menggambar', countLetters('ng'), new Set()));
  });

  it('does not count n inside ng as a bare n', () => {
    assert.equal(matchesConstraints('menggambar', countLetters('n'), new Set()), false);
  });

  it('rejects words containing banned letters', () => {
    assert.equal(matchesConstraints('kharisma', new Map(), bannedLetters('g')), true);
    assert.equal(matchesConstraints('menggambar', new Map(), bannedLetters('z')), true);
    assert.equal(matchesConstraints('menggambar', new Map(), bannedLetters('ng')), false);
  });
});
