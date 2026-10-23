'use strict';

const fs = require('fs');
const path = require('path');
const { UnknownSourceError } = require('../lib/errors');

// ---------------------------------------------------------------------------
// Dictionary sources
// ---------------------------------------------------------------------------
//
// Every *.js file in this directory (except this one) is treated as a
// dictionary source. A source must export:
//
//   name         - short string identifier (used with DICTIONARY_SOURCE)
//   description  - human-readable explanation (shown in help/errors)
//   fetchWords   - async function resolving to a sorted array of unique words
//
// A source owns its own configuration (usually an environment variable) and is
// responsible for fetching, parsing, and returning words. Adding a new API
// server is therefore as simple as dropping a new *.js file here — no changes
// to main.js are required.

const sources = {};

for (const file of fs.readdirSync(__dirname)) {
  if (file === path.basename(__filename) || !file.endsWith('.js')) continue;
  const mod = require(path.join(__dirname, file));
  if (mod && typeof mod.name === 'string' && typeof mod.fetchWords === 'function') {
    sources[mod.name] = mod;
  }
}

const DEFAULT_SOURCE = 'url-entries';

/**
 * Resolve the source to use: an explicit `name` argument wins, then the
 * DICTIONARY_SOURCE environment variable, then the default.
 */
function getSource(name) {
  const key = name || process.env.DICTIONARY_SOURCE || DEFAULT_SOURCE;
  const source = sources[key];
  if (!source) {
    const available = Object.keys(sources).sort().join(', ') || '(none)';
    throw new UnknownSourceError(
      `unknown dictionary source "${key}".`,
      `Available sources: ${available}`
    );
  }
  return source;
}

/** Sorted list of available source names. */
function listSources() {
  return Object.keys(sources).sort();
}

/**
 * Fetch words from the active source. Accepts an optional source name override.
 */
async function fetchWords(name) {
  return getSource(name).fetchWords();
}

module.exports = { fetchWords, getSource, listSources, sources };
