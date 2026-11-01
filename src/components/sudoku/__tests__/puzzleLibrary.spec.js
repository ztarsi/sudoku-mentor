// Library data integrity: every built-in puzzle must be valid with a
// unique solution, and shelf labels must not lie at the extremes (the
// "ultimate" shelf once carried two singles-solvable puzzles).
import { describe, it, expect } from 'vitest';
import { PUZZLES, FORMER_PUZZLE_NAMES, currentPuzzleName, puzzleNamesOverTime } from '../puzzles';
import { analyzeDifficulty, analyzePuzzle, analyzeSolvePath, teachingLabel } from '../difficultyAnalyzer';
import { TECHNIQUES } from '../techniqueCatalog';

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

  // Every shelf must agree with the app's own difficulty analyzer, so the
  // badge a player picks a puzzle by is the difficulty they actually get.
  for (const [shelf, list] of Object.entries(PUZZLES)) {
    it(`${shelf}-shelf puzzles rate ${shelf}`, () => {
      for (const p of list) {
        expect(analyzeDifficulty(p.puzzle), p.name).toBe(shelf);
      }
    });
  }

  // The shelf note is written from the analysis, so the claim "these run
  // past the mentor's named techniques" has to be true of exactly the
  // shelves it appears on. A mismatch here is a bug in the label.
  //
  // Since the forcing batch (#75) that is no shelf at all: every puzzle in
  // the library is explained end to end by named techniques, the forcing
  // proofs included, and the library prints no what-if note anywhere. A
  // puzzle that needed trial and error again would show up here.
  it('no shelf runs past the named techniques any more', () => {
    for (const [shelf, list] of Object.entries(PUZZLES)) {
      for (const p of list) {
        const analysis = analyzePuzzle(p.puzzle);
        expect(analysis.complete, p.name).toBe(true);
        expect(analysis.namedOnly, `${shelf}: ${p.name}`).toBe(true);
        expect(analysis.whatIfSteps, `${shelf}: ${p.name}`).toBe(0);
      }
    }
  });

  it('every puzzle can say what it teaches', () => {
    for (const list of Object.values(PUZZLES)) {
      for (const p of list) {
        const label = teachingLabel(analyzePuzzle(p.puzzle));
        expect(label, p.name).toBeTruthy();
        // Short enough for the library row, which wraps. The longest names
        // on the ladder are in the uniqueness family ("Avoidable Rectangle
        // Type 1"), and a row says the whole name rather than an initial.
        expect(label.length, p.name).toBeLessThan(70);
      }
    }
  });
});

describe('puzzle names keep their promises (#79)', () => {
  const all = Object.values(PUZZLES).flat();

  // The rule: a puzzle's name may not name a technique unless the analyser
  // says solving it needs that technique. Everything else about naming is
  // free. "X-Wing Territory" and "Swordfish Hunt" broke it.
  it('names a technique only when the puzzle needs it', () => {
    const named = (puzzleName, techName) =>
      new RegExp(`(^|[^A-Za-z])${techName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^A-Za-z])`, 'i').test(puzzleName);
    for (const { name, puzzle } of all) {
      const used = new Set(analyzeSolvePath(puzzle).steps.map((step) => step.technique));
      for (const tech of TECHNIQUES) {
        for (const word of [tech.name, tech.short].filter(Boolean)) {
          if (named(name, word)) expect(used.has(tech.name), `${name} names ${word} but never needs it`).toBe(true);
        }
      }
    }
  });

  it('maps every former name to a puzzle the library still has, and only those', () => {
    const names = new Set(all.map((p) => p.name));
    for (const [former, now] of Object.entries(FORMER_PUZZLE_NAMES)) {
      expect(names.has(now), now).toBe(true);
      expect(names.has(former), `${former} is a former name and must not be reused`).toBe(false);
      expect(currentPuzzleName(former)).toBe(now);
      expect(puzzleNamesOverTime(now)).toEqual([now, former]);
    }
    expect(currentPuzzleName('Gentle Start')).toBe('Gentle Start');
    expect(currentPuzzleName('My own puzzle')).toBe('My own puzzle');
    expect(currentPuzzleName(null)).toBeNull();
    expect(puzzleNamesOverTime('Gentle Start')).toEqual(['Gentle Start']);
    // Inherited object keys are not former names.
    expect(currentPuzzleName('toString')).toBe('toString');
  });
});

