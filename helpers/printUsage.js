'use strict';

const { DEFAULT_RESULT_LIMIT } = require('./constants');

function printUsage() {
  console.log(`Usage:
  node main.js --sync                    Fetch the dictionary and cache words locally
  node main.js --csv                     Build the 3-syllable word bank (data/word-bank.csv + data/words-3syllables.txt)
  node main.js "ba*a*a"                  Find 3-syllable words matching the pattern
  node main.js "ba*a*a" --has ai --not xz
  node main.js "ba*a*a" --all            Show every match (no ${DEFAULT_RESULT_LIMIT}-result cap)

  * is a wildcard that matches any number of game letters (including none).

Options:
  --has <letters>   Letters known to be in the word, position unknown.
                    ng/ny/sy/kh count as one letter; repeat a letter to
                    require multiple occurrences.
  --not <letters>   Letters known to be absent from the word (digraph-aware).
  --all             Print all matches instead of capping at ${DEFAULT_RESULT_LIMIT}.
  --csv             Write data/word-bank.csv (word,letters,syllables,needs_review)
                    and data/words-3syllables.txt. letters is the game letter count:
                    hyphens are ignored and ng/ny/sy/kh count as one letter.
                    Only words where 3 is a possible syllable count are kept.`);
}
module.exports = { printUsage };
