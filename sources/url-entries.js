'use strict';

const axios = require('axios');
const { ConfigError, SourceResponseError } = require('../lib/errors');

/**
 * Entries look like "https://host/entri/adenda" (or "url/entry/word").
 * The word is the final non-empty path segment, URL-decoded.
 */
function extractWords(entries) {
  const words = new Set();
  for (const entry of entries) {
    const segments = String(entry).split('/').filter(Boolean);
    const last = segments[segments.length - 1];
    if (!last) continue;

    let word;
    try {
      word = decodeURIComponent(last);
    } catch {
      word = last; // fall back to the raw segment if decoding fails
    }

    if (word) words.add(word);
  }
  return [...words].sort();
}

/**
 * Fetch the dictionary from DICTIONARY_API_URL and return a sorted list of
 * unique words. The API is expected to return the whole list at once, as either
 * a bare array or { "entries": [...] }, where each entry is a URL whose final
 * path segment is the word.
 */
async function fetchWords() {
  const apiUrl = process.env.DICTIONARY_API_URL || '';

  if (!apiUrl) {
    throw new ConfigError(
      'no API URL configured.',
      'Set the DICTIONARY_API_URL environment variable, or choose another ' +
        'source via the DICTIONARY_SOURCE environment variable.'
    );
  }

  console.log(`Fetching ${apiUrl} ...`);
  const res = await axios.get(apiUrl, { timeout: 120000, maxContentLength: Infinity });

  const data = res.data;
  const entries = Array.isArray(data) ? data : data && data.entries;
  if (!Array.isArray(entries)) {
    throw new SourceResponseError(
      'unexpected response shape. Expected { "entries": [...] } or an array.'
    );
  }

  return extractWords(entries);
}

module.exports = {
  name: 'url-entries',
  description:
    'Fetch a JSON list of entry URLs from DICTIONARY_API_URL and use the ' +
    'final path segment of each entry as the word.',
  fetchWords,
};
