// The worker wrapper's main-thread fallback (no Worker in node) and its
// cancel contract. The worker path itself is exercised in the browser.
import { describe, it, expect } from 'vitest';
import { searchWhatIf, isCancelled, HINT_SEARCH_DEPTH } from '../whatIfSearch';
import { generateCandidates } from '../logicEngine';
import { PUZZLES } from '../puzzles';

const toGrid = (puzzle) =>
  generateCandidates(
    puzzle.map((value, cellIndex) => ({
      cellIndex,
      value: value || null,
      isFixed: value !== 0,
      candidates: [],
    }))
  );

describe('searchWhatIf (main-thread fallback)', () => {
  it('resolves with a what-if step on an ultimate puzzle', async () => {
    const entry = PUZZLES.ultimate[0];
    const grid = toGrid(entry.puzzle);
    const search = searchWhatIf(grid, HINT_SEARCH_DEPTH);
    const step = await search.promise;
    expect(step).not.toBeNull();
    expect(['Cell Forcing Chain', 'Hypothesis Mode']).toContain(step.technique);
  });

  it('cancel rejects the pending search with a cancelled marker', async () => {
    const grid = toGrid(PUZZLES.ultimate[0].puzzle);
    const search = searchWhatIf(grid, 5);
    search.cancel();
    await expect(search.promise).rejects.toSatisfy((reason) => isCancelled(reason));
  });

  it('resolves null when nothing is found (a solved grid)', async () => {
    const grid = toGrid(PUZZLES.ultimate[0].puzzle);
    // Fill from the solver so every cell is placed.
    const { solveSudoku } = await import('../solver');
    const solved = solveSudoku(grid);
    const full = grid.map((cell, i) => ({ ...cell, value: solved[i].value, candidates: [] }));
    const step = await searchWhatIf(full, 5).promise;
    expect(step).toBeNull();
  });
});
