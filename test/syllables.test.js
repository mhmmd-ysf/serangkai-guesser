'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { runSyllableOptions, syllablePossibilities } = require('../helpers/syllables');

describe('runSyllableOptions', () => {
  it('counts a diphthong as one or two syllables', () => {
    assert.deepEqual(runSyllableOptions('ai'), [1, 2]);
    assert.deepEqual(runSyllableOptions('au'), [1, 2]);
    assert.deepEqual(runSyllableOptions('oi'), [1, 2]);
  });

  it('counts non-diphthong runs as separate syllables', () => {
    assert.deepEqual(runSyllableOptions('a'), [1]);
    assert.deepEqual(runSyllableOptions('aa'), [2]);
  });
});

describe('syllablePossibilities', () => {
  it('returns a single value when the count is certain', () => {
    assert.deepEqual(syllablePossibilities('abadi'), [3]);
    assert.deepEqual(syllablePossibilities('aaji'), [3]);
  });

  it('returns every possible count for ambiguous diphthongs', () => {
    assert.deepEqual(syllablePossibilities('kain'), [1, 2]);
    assert.deepEqual(syllablePossibilities('abai'), [2, 3]);
  });
});
