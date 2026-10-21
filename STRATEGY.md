# Serangkai Playing Strategy

A concise guide for opening the 3-syllable Indonesian word-guessing game. Based on
an analysis of the 24,134-word bank in `data/words-3syllables.txt` (letter frequencies
and greedy set-cover over game-letter slots).

## Core principle

You don't need 6 dedicated "cover" words. The first 2–3 guesses cover every letter
that matters; spend the remaining guesses adaptively (probing positions and the
`ng` / `n` / `g` split) rather than chasing rare letters.

## Letter tiers

Percentage is how many bank words contain the letter.

| Tier | Letters | Action |
|------|---------|--------|
| Must cover | `a e r i n m t u k s` | Get these in guesses 1–2 |
| Nice to have | `l p b ng o d g h` | Guesses 2–3 |
| Skip | `c j f w y ny` | Only if it happens naturally |
| Ignore | `v sy kh q x z` | Never guess for these |

`ng` (22% of words) is worth more than `d g h c j`, but it's a digraph slot — probe
it after the vowels are settled.

## Opening sets by answer length

The answer's token count is most likely 7, then 8. Match your guess length to the
answer.

### Length 7 (most likely — 9,517 words)

| # | Word | Tokens | Adds |
|---|------|--------|------|
| 1 | `mentari` | `m e n t a r i` | top 7 letters |
| 2 | `glukosa` | `g l u k o s a` | `g l u k o s` |
| 3 | `pengabdi` (optional) | `p e ng a b d i` | `p ng b d` |

`mentari` + `glukosa` covers 13 distinct letters with no overlap.

### Length 8 (7,780 words)

| # | Word | Tokens | Adds |
|---|------|--------|------|
| 1 | `meruntai` | `m e r u n t a i` | `m e r u n t a i` |
| 2 | `psikolog` | `p s i k o l o g` | `p s k o l g` |
| 3 | `bertulang` (optional) | `b e r t u l a ng` | `b ng` |

### Length 6 (3,927 words)

| # | Word | Tokens |
|---|------|--------|
| 1 | `menuai` | `m e n u a i` |
| 2 | `serian` | `s e r i a n` |
| 3 | `cahaya` | `c a h a y a` |

Shorter words cover fewer letters and the 6-letter bank has more obscure entries —
this length matters less.

### Length 9 (1,854 words — only if the answer is 9 tokens)

| # | Word | Tokens | Adds |
|---|------|--------|------|
| 1 | `sempritan` | `s e m p r i t a n` | 9 distinct letters |
| 2 | `mengantuk` | `m e ng a n t u k` | `ng u k` |
| 3 | `berlonggok` | `b e r l o ng g o k` | `b l o g` |

`sempritan` is the single highest-coverage word in the bank (9 distinct letters) —
use it first if the game accepts any length or the answer is 9 tokens.

## How to play it

1. **Guesses 1–2:** fire the coverage pair from the table above — pure letter
   discovery.
2. **Guess 3:** use feedback to lock vowels and test `ng` vs bare `n`/`g`
   (`--has ng` and `--has n` are different).
3. **Guesses 4–6:** switch to pattern search:

   ```sh
   node main.js "me*ta*i" --has ng --not o u
   ```

4. **Digraph trap:** `menggambar` is `m e ng g a m b a r` — a gray "no `ng`" does
   not rule out a bare `n` or `g` elsewhere in the word.

## Caveat

These sets assume a fixed-length grid like Wordle. If the game instead accepts
any-length guesses and only cares about 3 syllables, the best unconstrained 3-word
cover is `sempritan` + `glukosa` + `pengabdi`.
