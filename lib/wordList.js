'use strict';

const fs = require('fs');
const path = require('path');
const { DataMissingError } = require('./errors');

// The 3-syllable bank file is the only artifact whose rebuild hint points at
// --csv; every other word list is produced by --sync.
const BANK_BASENAME = 'words-3syllables.txt';

/**
 * Load a newline-separated word list into a Set. Missing or unreadable files
 * throw a `DataMissingError` (with a hint naming the command that rebuilds the
 * artifact) instead of terminating the process, so this is safe to reuse from a
 * server.
 */
function loadWordList(file) {
  if (!fs.existsSync(file)) {
    const hint =
      path.basename(file) === BANK_BASENAME
        ? 'Run "node main.js --csv" first to build the word bank.'
        : 'Run "node main.js --sync" first to fetch and cache the dictionary.';
    throw new DataMissingError(`${file} not found.`, hint);
  }

  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch (err) {
    const hint =
      err.code === 'ENOENT'
        ? 'It may have been removed; run "node main.js --sync" to rebuild it.'
        : undefined;
    throw new DataMissingError(`could not read ${file}: ${err.message}`, hint);
  }

  return new Set(text.split(/\r?\n/).filter(Boolean));
}

module.exports = { loadWordList };
