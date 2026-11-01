// The library's precomputed labels (#95) can never go stale quietly.
//
// The library shows what each built-in puzzle teaches from
// libraryTeaching.js instead of re-walking twenty solve paths on every
// visit. That file is a cache of the analyser's answers, and this test is
// what keeps it one: every built-in puzzle is re-measured with the live
// analyser and must match its entry exactly, every puzzle must have an
// entry, and there must be no entry for a puzzle the library no longer has.
// A measured label that nothing re-measures is a hand-written label again,
// which is the thing #71 removed.
import { describe, it, expect } from 'vitest';
import { PUZZLES } from '../puzzles';
import { analyzePuzzle, teachingLabel } from '../difficultyAnalyzer';
import { LIBRARY_TEACHING } from '../libraryTeaching';

const library = Object.entries(PUZZLES).flatMap(([shelf, list]) => list.map((p) => ({ shelf, ...p })));
const live = (puzzle) => {
  const a = analyzePuzzle(puzzle);
  return { complete: a.complete, namedOnly: a.namedOnly, hardestTechnique: a.hardestTechnique, hardestTier: a.hardestTier };
};
const asEntry = (key, entry) =>
  `'${key}': { complete: ${entry.complete}, namedOnly: ${entry.namedOnly}, hardestTechnique: ${JSON.stringify(entry.hardestTechnique)}, hardestTier: ${JSON.stringify(entry.hardestTier)} },`;

describe('the library labels are the live analyser\'s', () => {
  it('has an entry for every built-in puzzle, and none for a puzzle it no longer has', () => {
    const keys = new Set(library.map((p) => p.puzzle.join('')));
    for (const p of library) expect(LIBRARY_TEACHING[p.puzzle.join('')], `${p.shelf}: ${p.name} has no entry`).toBeDefined();
    for (const key of Object.keys(LIBRARY_TEACHING)) expect(keys.has(key), `an entry for a puzzle not in the library: ${key}`).toBe(true);
  });

  for (const { shelf, name, puzzle } of library) {
    it(`${shelf}: ${name} says what the analyser measures`, () => {
      const key = puzzle.join('');
      const measured = live(puzzle);
      expect(
        LIBRARY_TEACHING[key],
        `${name}: the precomputed entry is stale. Replace it in libraryTeaching.js with:\n  ${asEntry(key, measured)}`
      ).toEqual(measured);
      // And so the row reads exactly what a live measurement would print.
      expect(teachingLabel(LIBRARY_TEACHING[key])).toBe(teachingLabel(analyzePuzzle(puzzle)));
    });
  }
});
