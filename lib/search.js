'use strict';

const { wordTokens, patternTokens, globMatch, matchesConstraints } = require('../helpers/tokens');

/**
 * Return the words (in iteration order) that match `pattern` and satisfy the
 * "must have" / "must not have" constraints. `pattern` is split into game-letter
 * slots where `*` is a wildcard; `mustHave` is a Map of slot -> required count
 * and `mustNotHave` is a Set of forbidden slots (see helpers/tokens).
 */
function search(words, pattern, mustHave, mustNotHave) {
  const pat = patternTokens(pattern);
  const matches = [];
  for (const word of words) {
    if (globMatch(pat, wordTokens(word)) && matchesConstraints(word, mustHave, mustNotHave)) {
      matches.push(word);
    }
  }
  return matches;
}

module.exports = { search };
