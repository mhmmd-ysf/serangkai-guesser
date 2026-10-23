'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { loadWordList } = require('../lib/wordList');
const { DataMissingError } = require('../lib/errors');

function withTempDir(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wordlist-test-'));
  try {
    return fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

describe('loadWordList', () => {
  it('throws DataMissingError with the sync hint for a missing words file', () => {
    withTempDir((dir) => {
      const file = path.join(dir, 'words.txt');
      assert.throws(
        () => loadWordList(file),
        (err) => {
          assert.ok(err instanceof DataMissingError);
          assert.equal(err.code, 'DATA_MISSING');
          assert.match(err.message, /words\.txt not found\.$/);
          assert.match(err.hint, /--sync/);
          return true;
        }
      );
    });
  });

  it('throws DataMissingError with the csv hint for a missing bank file', () => {
    withTempDir((dir) => {
      const file = path.join(dir, 'words-3syllables.txt');
      assert.throws(
        () => loadWordList(file),
        (err) => {
          assert.equal(err.code, 'DATA_MISSING');
          assert.match(err.hint, /--csv/);
          return true;
        }
      );
    });
  });

  it('parses words, skipping blank lines and normalizing CRLF', () => {
    withTempDir((dir) => {
      const file = path.join(dir, 'words.txt');
      fs.writeFileSync(file, 'adenda\nmata\r\n\nnyanyi\r\n');
      const words = loadWordList(file);
      assert.deepEqual([...words].sort(), ['adenda', 'mata', 'nyanyi']);
    });
  });
});
