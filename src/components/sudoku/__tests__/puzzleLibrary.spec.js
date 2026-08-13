// Library data integrity: every built-in puzzle must be valid with a
// unique solution, and shelf labels must not lie at the extremes (the
// "ultimate" shelf once carried two singles-solvable puzzles).
import { describe, it, expect } from 'vitest';
import { PUZZLES } from '../puzzles';
import { analyzeDifficulty } from '../difficultyAnalyzer';

const boxOf = (i) => Math.floor(i / 27) * 3 + Math.floor((i % 9) / 3);

// Count solutions up to a cap (2 is enough to detect non-uniqueness)
function countSolutions(puzzle, cap = 2) {
  const values = [...puzzle];
  const rm = Array(9).fill(0);
  const cm = Array(9).fill(0);
  const bm = Array(9).fill(0);
  for (let i = 0; i < 81; i++) {
    if (!values[i]) continue;
    const bit = 1 << values[i];
    const r = Math.floor(i / 9);
    const c = i % 9;
    const b = boxOf(i);
    if ((rm[r] | cm[c] | bm[b]) & bit) return -1; // conflicting givens
    rm[r] |= bit;
    cm[c] |= bit;
    bm[b] |= bit;
  }
  let count = 0;
  const solve = () => {
    if (count >= cap) return;
    let best = -1;
    let bestMask = 0;
    let bestN = 10;
    for (let i = 0; i < 81; i++) {
      if (values[i]) continue;
      const mask = ~(rm[Math.floor(i / 9)] | cm[i % 9] | bm[boxOf(i)]) & 0x3fe;
      let n = 0;
      for (let d = 1; d <= 9; d++) if (mask & (1 << d)) n++;
      if (n === 0) return;
      if (n < bestN) {
        best = i;
        bestMask = mask;
        bestN = n;
        if (n === 1) break;
      }
    }
    if (best === -1) {
      count++;
      return;
    }
    const r = Math.floor(best / 9);
    const c = best % 9;
    const b = boxOf(best);
    for (let d = 1; d <= 9; d++) {
      const bit = 1 << d;
      if (!(bestMask & bit)) continue;
      values[best] = d;
      rm[r] |= bit;
      cm[c] |= bit;
      bm[b] |= bit;
      solve();
      values[best] = 0;
      rm[r] &= ~bit;
      cm[c] &= ~bit;
      bm[b] &= ~bit;
      if (count >= cap) return;
    }
  };
  solve();
  return count;
}

describe('built-in puzzle library', () => {
  const all = Object.entries(PUZZLES).flatMap(([shelf, list]) =>
    list.map((p) => ({ ...p, shelf }))
  );

  it('has no duplicate names (best times are keyed by name)', () => {
    const names = all.map((p) => p.name);
    expect(new Set(names).size).toBe(names.length);
  });

  for (const { name, shelf, puzzle } of all) {
    it(`${shelf}: ${name} is valid with exactly one solution`, () => {
      expect(puzzle).toHaveLength(81);
      expect(countSolutions(puzzle)).toBe(1);
    });
  }

  it('easy-shelf puzzles rate easy', () => {
    for (const p of PUZZLES.easy) {
      expect(analyzeDifficulty(p.puzzle), p.name).toBe('easy');
    }
  });

  it('ultimate-shelf puzzles rate ultimate (no singles-solvable impostors)', () => {
    for (const p of PUZZLES.ultimate) {
      expect(analyzeDifficulty(p.puzzle), p.name).toBe('ultimate');
    }
  });
});
