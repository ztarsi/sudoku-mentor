// The worker wrapper's main-thread fallback (no Worker in node) and its
// cancel contract. The worker path itself is exercised in the browser.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { searchWhatIf, isCancelled, isTimedOut } from '../whatIfSearch';
import { SEARCH_TECHNIQUES } from '../techniqueCatalog';
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
  it('resolves with a step the search can find on an ultimate puzzle', async () => {
    const entry = PUZZLES.ultimate[0];
    const grid = toGrid(entry.puzzle);
    const search = searchWhatIf(grid);
    const step = await search.promise;
    expect(step).not.toBeNull();
    // Whatever it is, it is one of the things only the search finds: a
    // forcing proof, or the trial fallback when there is no proof.
    expect(SEARCH_TECHNIQUES).toContain(step.technique);
  });

  it('cancel rejects the pending search with a cancelled marker', async () => {
    const grid = toGrid(PUZZLES.ultimate[0].puzzle);
    const search = searchWhatIf(grid);
    search.cancel();
    await expect(search.promise).rejects.toSatisfy((reason) => isCancelled(reason));
  });

  it('resolves null when nothing is found (a solved grid)', async () => {
    const grid = toGrid(PUZZLES.ultimate[0].puzzle);
    // Fill from the solver so every cell is placed.
    const { solveSudoku } = await import('../solver');
    const solved = solveSudoku(grid);
    const full = grid.map((cell, i) => ({ ...cell, value: solved[i].value, candidates: [] }));
    const step = await searchWhatIf(full).promise;
    expect(step).toBeNull();
  });
});

describe('searchWhatIf (time budget)', () => {
  it('rejects with a timed-out marker when the budget is zero', async () => {
    const grid = toGrid(PUZZLES.ultimate[0].puzzle);
    const search = searchWhatIf(grid, { timeBudgetMs: 0 });
    await expect(search.promise).rejects.toSatisfy((reason) => isTimedOut(reason));
  });
});

// The worker path, driven by a stand-in Worker so the wrapper's message,
// error, cancel and per-search isolation logic runs in node.
describe('searchWhatIf (worker path)', () => {
  const created = [];
  class FakeWorker {
    constructor() {
      this.terminated = false;
      this.onmessage = null;
      this.onerror = null;
      this.replyWith = null;
      this.lastMessage = null;
      created.push(this);
    }
    postMessage(msg) {
      this.lastMessage = msg;
      // Reply on the next tick unless a test decides otherwise.
      setTimeout(() => {
        if (this.terminated || !this.onmessage) return;
        if (this.replyWith) this.onmessage({ data: { id: msg.id, ...this.replyWith } });
      }, 5);
    }
    terminate() { this.terminated = true; }
  }
  const install = () => {
    vi.stubGlobal('Worker', FakeWorker);
    vi.stubGlobal('URL', class { constructor(u) { this.href = String(u); } });
  };
  afterEach(() => { vi.unstubAllGlobals(); created.length = 0; });

  it('posts the grid and the budget, resolves the step and terminates its worker', async () => {
    install();
    const grid = toGrid(PUZZLES.ultimate[0].puzzle);
    const search = searchWhatIf(grid, { timeBudgetMs: 1234 });
    const w = created[0];
    w.replyWith = { step: { technique: 'Hypothesis Mode' } };
    w.postMessage(w.lastMessage); // trigger the scheduled reply with the reply set
    const step = await search.promise;
    expect(step).toEqual({ technique: 'Hypothesis Mode' });
    // No depth crosses the boundary: how deep a net may go is the engine's
    // own stated limit, not something a caller asks for (#75).
    expect(w.lastMessage.depth).toBeUndefined();
    expect(w.lastMessage.timeBudgetMs).toBe(1234);
    expect(w.lastMessage.grid[0]).toEqual({ value: grid[0].value, isFixed: grid[0].isFixed, candidates: grid[0].candidates });
    expect(w.terminated).toBe(true);
  });

  it('cancelling one search terminates only that worker and leaves the other running', async () => {
    install();
    const grid = toGrid(PUZZLES.ultimate[0].puzzle);
    const a = searchWhatIf(grid);
    const b = searchWhatIf(grid);
    const [wa, wb] = created;
    a.cancel();
    await expect(a.promise).rejects.toSatisfy((r) => isCancelled(r));
    expect(wa.terminated).toBe(true);
    expect(wb.terminated).toBe(false);
    wb.replyWith = { step: null };
    wb.postMessage(wb.lastMessage);
    await expect(b.promise).resolves.toBeNull();
    expect(wb.terminated).toBe(true);
  });

  it('a worker error rejects and terminates; a timed-out reply is a timed-out rejection', async () => {
    install();
    const grid = toGrid(PUZZLES.ultimate[0].puzzle);
    const a = searchWhatIf(grid);
    created[0].onerror({ message: 'boom' });
    await expect(a.promise).rejects.toThrow('boom');
    expect(created[0].terminated).toBe(true);

    const b = searchWhatIf(grid);
    created[1].replyWith = { timedOut: true };
    created[1].postMessage(created[1].lastMessage);
    await expect(b.promise).rejects.toSatisfy((r) => isTimedOut(r));
  });
});
