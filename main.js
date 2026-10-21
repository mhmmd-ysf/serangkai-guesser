#!/usr/bin/env node
'use strict';
require('dotenv').config({});
const fs = require('fs');
const path = require('path');
const { fetchWords } = require('./sources');
const { printUsage } = require('./helpers/printUsage');
const {
  wordTokens,
  patternTokens,
  globMatch,
  gameLetterCount,
  countLetters,
  bannedLetters,
  matchesConstraints,
} = require('./helpers/tokens');
const { syllablePossibilities } = require('./helpers/syllables');
const { DEFAULT_RESULT_LIMIT, MAX_GAME_LETTERS } = require('./helpers/constants');

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

// Generated artifacts live under data/ to keep the project root tidy.

// Where the extracted word list is cached locally.
const WORDS_FILE = path.join(__dirname, 'data', 'words.txt');

// CSV export of every word with its possible syllable count(s).
const CSV_FILE = path.join(__dirname, 'data', 'word-bank.csv');

// Plain word list (one per line) used by the search command: only words that
// could have exactly 3 syllables.
const BANK_FILE = path.join(__dirname, 'data', 'words-3syllables.txt');

// ---------------------------------------------------------------------------
// Filesystem safety net
// ---------------------------------------------------------------------------

/**
 * Write a generated artifact, creating its parent directory first if it is
 * missing. data/ is gitignored, so a fresh checkout does not have it yet; this
 * keeps --sync and --csv working instead of failing with ENOENT.
 */
function writeArtifact(file, contents) {
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, contents);
  } catch (err) {
    console.error(`Error: could not write ${file}: ${err.message}`);
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Fetch + cache, and load
// ---------------------------------------------------------------------------

async function syncWords() {
  // fetchWords() is provided by the active dictionary source (see ./sources).
  // This keeps main.js API-agnostic: adding a new API server means dropping a
  // source file into ./sources rather than editing this file.
  const words = await fetchWords();
  writeArtifact(WORDS_FILE, words.join('\n') + '\n');
  console.log(`Saved ${words.length} words to ${WORDS_FILE}`);
}

function loadWords(file = WORDS_FILE) {
  if (!fs.existsSync(file)) {
    console.error(`Error: ${file} not found.`);
    if (file === BANK_FILE) {
      console.error('Run "node main.js --csv" first to build the word bank.');
    } else {
      console.error('Run "node main.js --sync" first to fetch and cache the dictionary.');
    }
    process.exit(1);
  }

  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch (err) {
    console.error(`Error: could not read ${file}: ${err.message}`);
    if (err.code === 'ENOENT') {
      console.error('It may have been removed; run "node main.js --sync" to rebuild it.');
    }
    process.exit(1);
  }

  return new Set(text.split(/\r?\n/).filter(Boolean));
}

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

// ---------------------------------------------------------------------------
// CSV export
// ---------------------------------------------------------------------------

function csvCell(value) {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * Write data/word-bank.csv and data/words-3syllables.txt: words with no spaces,
 * at most MAX_GAME_LETTERS game letters, and 3 among their possible syllable
 * counts.
 */
function buildCsv() {
  const words = loadWords();
  const rows = [];
  let written = 0;
  let withSpaces = 0;
  let tooLong = 0;
  let notThree = 0;
  let ambiguous = 0;

  for (const word of words) {
    if (word.includes(' ')) {
      withSpaces++;
      continue;
    }
    const letters = gameLetterCount(word);
    if (letters > MAX_GAME_LETTERS) {
      tooLong++;
      continue;
    }

    const counts = syllablePossibilities(word);
    if (!counts.includes(3)) {
      notThree++;
      continue;
    }

    written++;
    const needsReview = counts.length > 1;
    if (needsReview) ambiguous++;

    rows.push([word, letters, counts.join(' '), needsReview ? 'true' : 'false']);
  }

  rows.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));

  const lines = ['word,letters,syllables,needs_review'];
  for (const row of rows) {
    lines.push(row.map(csvCell).join(','));
  }
  writeArtifact(CSV_FILE, lines.join('\n') + '\n');

  const bankWords = rows.map((row) => row[0]);
  writeArtifact(BANK_FILE, bankWords.join('\n') + '\n');

  console.log(`Wrote ${written} words to ${CSV_FILE} and ${BANK_FILE}`);
  console.log(`  excluded for spaces: ${withSpaces}`);
  console.log(`  excluded for >${MAX_GAME_LETTERS} letters: ${tooLong}`);
  console.log(`  excluded for not-3 syllables: ${notThree}`);
  console.log(`  ambiguous (needs_review=true): ${ambiguous}`);
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs(args) {
  const opts = {
    pattern: null,
    has: '',
    not: '',
    all: false,
    sync: false,
    csv: false,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--sync') {
      opts.sync = true;
    } else if (arg === '--all') {
      opts.all = true;
    } else if (arg === '--csv') {
      opts.csv = true;
    } else if (arg === '--help' || arg === '-h') {
      opts.help = true;
    } else if (arg === '--has') {
      opts.has += args[++i] || '';
    } else if (arg.startsWith('--has=')) {
      opts.has += arg.slice('--has='.length);
    } else if (arg === '--not') {
      opts.not += args[++i] || '';
    } else if (arg.startsWith('--not=')) {
      opts.not += arg.slice('--not='.length);
    } else if (arg.startsWith('-') && arg !== '-') {
      console.warn(`Warning: unknown option "${arg}" ignored.`);
    } else if (opts.pattern === null) {
      opts.pattern = arg;
    }
  }

  return opts;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  if (opts.help || (opts.pattern === null && !opts.sync && !opts.csv)) {
    printUsage();
    return;
  }

  if (opts.sync) {
    await syncWords();
    return;
  }

  if (opts.csv) {
    buildCsv();
    return;
  }

  const mustHave = countLetters(opts.has);
  const mustNotHave = bannedLetters(opts.not);

  const words = loadWords(BANK_FILE);
  const matches = search(words, opts.pattern, mustHave, mustNotHave);

  const parts = [`"${opts.pattern}"`];
  if (opts.has) parts.push(`has "${opts.has}"`);
  if (opts.not) parts.push(`not "${opts.not}"`);

  const plural = matches.length === 1 ? '' : 'es';
  console.log(`${matches.length} match${plural} for ${parts.join(' ')}:`);

  const limit = opts.all ? matches.length : DEFAULT_RESULT_LIMIT;
  for (const word of matches.slice(0, limit)) {
    console.log(word);
  }
  if (!opts.all && matches.length > limit) {
    console.log(`... and ${matches.length - limit} more (use --all to show all)`);
  }
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
