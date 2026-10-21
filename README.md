# Serangkai Guesser

A command-line helper for an Indonesian word-guessing game. It downloads a
dictionary once, narrows it to a bank of words that could be **three
syllables** long, and searches that bank with `*` wildcard patterns — where the
digraphs `ng`, `ny`, `sy`, and `kh` each count as a single "letter".

## Concepts

### Game letters

Words are treated as a sequence of *game letters*:

- `ng`, `ny`, `sy`, and `kh` are single letters. For example `nyanyi` is
  `ny a ny i` — 4 letters, not 6.
- Hyphens are ignored: `mat-matan` is `m a t m a t a n` — 8 letters.
- Words containing spaces (multi-word dictionary entries like `mata air`) are
  excluded entirely.

The same rule applies when you type a pattern, so `ny*nyian` matches
`nyanyian`.

### Syllables

The syllable count is estimated with a vowel heuristic: each of `a i u e o` is
one syllable, and the diphthongs `ai au oi` count as one. Because `ai au oi`
can also be two separate vowels (e.g. `kain` = `ka-in`), words containing them
are flagged as **ambiguous** and listed with every possible count (e.g. `2 3`).

## Requirements

- Node.js (16 or newer)
- A dictionary source that can produce a list of words. The default source
  (`url-entries`) expects a JSON URL shaped like `{ "entries": [...] }` (or a
  bare array). Each entry is a URL such as `https://host/entri/adenda`, and the
  word is the final path segment. The API is expected to return the whole list
  at once — it is fetched once and cached, never queried per search. See
  [Dictionary sources](#dictionary-sources) to plug in other APIs.

## Environment variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `DICTIONARY_API_URL` | *(none)* | URL of the dictionary API used by the default `url-entries` source. It is expected to return `{ "entries": [...] }` (or a bare array) of entry URLs. |
| `DICTIONARY_SOURCE` | `url-entries` | Which dictionary source adapter to use. See [Dictionary sources](#dictionary-sources). |

Both can be set directly in your shell or in a `.env` file (loaded via `dotenv`).

## Setup

```sh
npm install
```

Create a `.env` file (or set the variables in your environment) — see
[Environment variables](#environment-variables) above. For the default source:

```sh
DICTIONARY_API_URL=https://your-dictionary.example.com/entries
```

## Testing

Unit tests for the pure logic in `helpers/` live in `test/` and use Node's
built-in test runner (no extra dependencies):

```sh
npm test          # or: node --test
```

`node --test` requires Node.js 18.11 or newer.

## Dictionary sources

The app is API-agnostic: `main.js` never talks to a dictionary API directly.
Instead it calls `fetchWords()` from `sources/index.js`, which delegates to the
active *source* — a small adapter that knows how to fetch and parse one
specific API.

To add a new API server, drop a new `.js` file into `sources/` that exports:

```js
module.exports = {
  name: 'my-api',        // short identifier, used with DICTIONARY_SOURCE
  description: '...',    // shown in error messages
  async fetchWords() {   // must resolve to a sorted array of unique words
    // fetch + parse here
    return ['adenda', 'mata'];
  },
};
```

No other changes are required — sources are auto-discovered at startup. Choose
which source to use with the `DICTIONARY_SOURCE` environment variable (defaults
to `url-entries`):

```sh
DICTIONARY_SOURCE=my-api node main.js --sync
```

### Built-in sources

| Source | Description |
|--------|-------------|
| `url-entries` | Fetches a JSON list of entry URLs from `DICTIONARY_API_URL` and uses the final path segment of each entry as the word. |

## Usage

```sh
# 1. Fetch the dictionary and cache the raw word list
node main.js --sync            # or: npm run sync

# 2. Build the three-syllable word bank
node main.js --csv

# 3. Search
node main.js "ba*a*a"
node main.js "ny*nyian" --has ng --not z
node main.js "*a*a*a" --all
```

### Commands

| Command | Description |
|---------|-------------|
| `node main.js --sync` | Download the dictionary and write `data/words.txt`. |
| `node main.js --csv` | Build the word bank (`data/word-bank.csv` + `data/words-3syllables.txt`). |
| `node main.js "pattern"` | Search the bank for words matching the pattern. |
| `node main.js --help` | Print usage. |

### Pattern syntax

- `*` matches any number of game letters, including none.
- Every other character is a literal game letter. Type `ng`, `ny`, `sy`, `kh`
  as two characters; they are matched as a single letter.

### Options

- `--has <letters>` — letters known to be in the word, position unknown.
  `ng/ny/sy/kh` count as one letter; repeat a letter to require multiple
  occurrences (e.g. `--has aa` = at least two `a`s).
- `--not <letters>` — letters known to be absent from the word (digraph-aware).
- `--all` — print every match instead of capping at 100.

Options can also be written as `--has=...` and `--not=...`.

## Workflow

1. `node main.js --sync` — one-time download of the raw dictionary.
2. `node main.js --csv` — produce the word bank and the review list.
3. (Optional) review `data/word-bank.csv`. Rows with `needs_review=true` have more
   than one possible syllable count (`2 3`, `3 4`, `2 3 4`, `3 4 5`); resolve
   each to a single number by hand if you need exactness.
4. Search with `node main.js "pattern"`.

## Files

| File | Purpose |
|------|---------|
| `sources/` | Dictionary source adapters (one file per API server). |
| `helpers/` | Pure logic used by `main.js`: tokenization/matching, syllable analysis, usage. |
| `test/` | Unit tests for `helpers/` (run with `npm test`). |
| `data/` | Generated artifacts (`--sync` / `--csv` output). |
| `data/words.txt` | Raw dictionary, one word per line (from `--sync`). |
| `data/word-bank.csv` | Filtered words (≤9 game letters, no spaces, 3 is a possible syllable count) with `letters`, `syllables`, and `needs_review`. |
| `data/words-3syllables.txt` | Plain list of the same words, used by the search command. |

## CSV columns

| Column | Meaning |
|--------|---------|
| `word` | The word. |
| `letters` | Game letter count (digraphs as one, hyphens ignored). |
| `syllables` | One digit, or several space-separated digits when the count is uncertain. |
| `needs_review` | `true` when `syllables` has more than one possible value. |

## Examples

```sh
node main.js "menggambar"      # exact: m e ng g a m b a r
node main.js "ny*nyian"        # wildcard over letters
node main.js "kharisma" --not g
node main.js "matmatan"        # matches "mat-matan" (hyphen ignored)
node main.js "menggambar" --has ng   # requires the "ng" letter
node main.js "menggambar" --has n    # requires a bare "n" (no match: n is part of ng)
```

## Notes and limitations

- Syllable counting is a heuristic and is only approximate for words containing
  `ai/au/oi`; those are flagged for manual review rather than guessed.
- The search command reads `data/words-3syllables.txt`, so run `node main.js --csv`
  before searching.
- The word bank currently keeps any word where **3 is a possible** syllable
  count, including ambiguous candidates (e.g. `2 3`, `3 4`) that still need
  review.
