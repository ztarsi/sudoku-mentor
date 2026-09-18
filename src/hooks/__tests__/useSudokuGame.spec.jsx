// @vitest-environment jsdom
//
// Regression tests for the shared game hook, covering the state bugs that
// existed when this logic lived (twice) inside the page components:
// duplicate onSolved firing, broken redo, history writes inside setState
// updaters (StrictMode double-commit), and stale-grid validation.
import React, { StrictMode } from 'react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { useSudokuGame, REJECTED_INPUT_TTL_MS } from '../useSudokuGame';
import { PUZZLES } from '@/components/sudoku/puzzles';
import { solveSudoku } from '@/components/sudoku/solver';

const PUZZLE = PUZZLES.easy[0].puzzle; // Gentle Start

// All tests render under StrictMode: double-invoked renders/updaters must
// not corrupt history or double-fire callbacks.
const strictWrapper = ({ children }) => <StrictMode>{children}</StrictMode>;

const setup = (callbacks = {}) =>
  renderHook(() => useSudokuGame(callbacks), { wrapper: strictWrapper });

const firstEmptyCell = (grid) => grid.findIndex((c) => c.value === null);

describe('useSudokuGame', () => {
  it('loads a puzzle and exposes solution-checked input', () => {
    const onWrongInput = vi.fn();
    const { result } = setup({ onWrongInput });

    act(() => {
      result.current.loadPuzzle(PUZZLE, { name: 'Test', difficulty: 'easy' });
    });

    expect(result.current.puzzleName).toBe('Test');
    expect(result.current.solvedCount).toBe(PUZZLE.filter(Boolean).length);

    const solved = solveSudoku(
      PUZZLE.map((v) => ({ value: v || null, candidates: [] }))
    );
    const idx = firstEmptyCell(result.current.grid);
    const right = solved[idx].value;
    const wrong = (right % 9) + 1;

    // Wrong input: rejected, counted, callback fired, grid unchanged
    act(() => {
      result.current.handleCellInput(idx, wrong);
    });
    expect(result.current.grid[idx].value).toBeNull();
    expect(result.current.errorCount).toBe(1);
    expect(onWrongInput).toHaveBeenCalledTimes(1);

    // Right input: placed and removed from peers' candidates
    act(() => {
      result.current.handleCellInput(idx, right);
    });
    expect(result.current.grid[idx].value).toBe(right);
  });

  it('undo/redo walk real snapshots (redo used to be a stub)', () => {
    const { result } = setup();

    act(() => {
      result.current.loadPuzzle(PUZZLE);
    });
    const solved = solveSudoku(
      PUZZLE.map((v) => ({ value: v || null, candidates: [] }))
    );
    const idx = firstEmptyCell(result.current.grid);
    const digit = solved[idx].value;

    expect(result.current.canUndo).toBe(false);

    act(() => {
      result.current.handleCellInput(idx, digit);
    });
    expect(result.current.grid[idx].value).toBe(digit);
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);

    act(() => {
      result.current.undo();
    });
    expect(result.current.grid[idx].value).toBeNull();
    expect(result.current.canRedo).toBe(true);

    act(() => {
      result.current.redo();
    });
    expect(result.current.grid[idx].value).toBe(digit);

    // undo -> new move truncates the redo tail
    act(() => {
      result.current.undo();
    });
    act(() => {
      result.current.handleToggleCandidate(idx, digit);
    });
    expect(result.current.canRedo).toBe(false);
  });

  it('exactly one history entry per move under StrictMode', () => {
    const { result } = setup();
    act(() => {
      result.current.loadPuzzle(PUZZLE);
    });
    const solved = solveSudoku(
      PUZZLE.map((v) => ({ value: v || null, candidates: [] }))
    );
    const idx = firstEmptyCell(result.current.grid);

    act(() => {
      result.current.handleCellInput(idx, solved[idx].value);
    });

    // One undo must fully revert the single move (double-pushed history
    // used to make a single undo skip a move).
    act(() => {
      result.current.undo();
    });
    expect(result.current.grid[idx].value).toBeNull();
    expect(result.current.canUndo).toBe(false);
  });

  it('fires onSolved exactly once, even when the grid keeps changing after', () => {
    const onSolved = vi.fn();
    const { result } = setup({ onSolved });

    act(() => {
      result.current.loadPuzzle(PUZZLE);
    });
    const solved = solveSudoku(
      PUZZLE.map((v) => ({ value: v || null, candidates: [] }))
    );

    // Fill in the whole solution
    for (let i = 0; i < 81; i++) {
      if (result.current.grid[i].value === null) {
        act(() => {
          result.current.handleCellInput(i, solved[i].value);
        });
      }
    }
    expect(result.current.completed).toBe(true);
    expect(onSolved).toHaveBeenCalledTimes(1);
    expect(onSolved.mock.calls[0][0]).toMatchObject({ errorCount: 0 });

    // Post-solve grid identity churn (e.g. highlight stamping) must not
    // re-fire the callback.
    act(() => {
      result.current.setGrid((g) => g.map((c) => ({ ...c })));
    });
    expect(onSolved).toHaveBeenCalledTimes(1);

    // A fresh load re-arms the latch
    act(() => {
      result.current.loadPuzzle(PUZZLE);
    });
    expect(result.current.completed).toBe(false);
  });

  it('validationErrors always reflect the current grid (no one-move lag)', () => {
    const { result } = setup();

    // No solution loaded: conflicting inputs are accepted but flagged
    const grid0 = result.current.grid;
    expect(grid0[0].value).toBeNull();

    act(() => {
      result.current.handleCellInput(0, 5);
    });
    expect(result.current.validationErrors).toEqual([]);

    act(() => {
      result.current.handleCellInput(1, 5); // same row: conflict NOW
    });
    expect(result.current.validationErrors).toContain(0);
    expect(result.current.validationErrors).toContain(1);

    act(() => {
      result.current.handleCellInput(1, null); // erase: conflict gone NOW
    });
    expect(result.current.validationErrors).toEqual([]);
  });

  it('rejects an unsolvable puzzle without touching state', () => {
    const { result } = setup();
    act(() => {
      result.current.loadPuzzle(PUZZLE, { name: 'Good' });
    });

    const invalid = [...PUZZLE];
    // Force two identical givens in row 1
    invalid[0] = 5;
    invalid[1] = 5;

    let outcome = { ok: true };
    act(() => {
      outcome = result.current.loadPuzzle(invalid, { name: 'Bad' });
    });
    expect(outcome.ok).toBe(false);
    expect(result.current.puzzleName).toBe('Good'); // previous puzzle intact
  });
});

describe('useSudokuGame rejected-input feedback', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('flags a wrong entry on its cell, then clears it after the TTL', () => {
    vi.useFakeTimers();
    const { result } = setup();
    act(() => {
      result.current.loadPuzzle(PUZZLE);
    });
    const solved = solveSudoku(PUZZLE.map((v) => ({ value: v || null, candidates: [] })));
    const idx = firstEmptyCell(result.current.grid);
    const wrong = (solved[idx].value % 9) + 1;

    expect(result.current.rejectedInput).toBeNull();
    act(() => {
      result.current.handleCellInput(idx, wrong);
    });
    expect(result.current.rejectedInput).toMatchObject({ cellIndex: idx, digit: wrong });
    expect(result.current.grid[idx].value).toBeNull(); // still not placed

    // A second wrong entry gets a new id so the animation replays
    const firstId = result.current.rejectedInput.id;
    act(() => {
      result.current.handleCellInput(idx, wrong);
    });
    expect(result.current.rejectedInput.id).not.toBe(firstId);

    act(() => {
      vi.advanceTimersByTime(REJECTED_INPUT_TTL_MS + 10);
    });
    expect(result.current.rejectedInput).toBeNull();
  });

  it('a correct entry never sets the flag, and loading clears a pending one', () => {
    vi.useFakeTimers();
    const { result } = setup();
    act(() => {
      result.current.loadPuzzle(PUZZLE);
    });
    const solved = solveSudoku(PUZZLE.map((v) => ({ value: v || null, candidates: [] })));
    const idx = firstEmptyCell(result.current.grid);

    act(() => {
      result.current.handleCellInput(idx, (solved[idx].value % 9) + 1);
    });
    expect(result.current.rejectedInput).not.toBeNull();
    act(() => {
      result.current.loadPuzzle(PUZZLE);
    });
    expect(result.current.rejectedInput).toBeNull();

    act(() => {
      result.current.handleCellInput(idx, solved[idx].value);
    });
    expect(result.current.rejectedInput).toBeNull();
  });
});

describe('useSudokuGame persistence', () => {
  const KEY = 'test:sudoku-game';

  it('saves progress and restores it into a fresh hook instance', () => {
    window.localStorage.removeItem(KEY);
    const first = renderHook(() => useSudokuGame({ persistKey: KEY }), { wrapper: strictWrapper });
    act(() => {
      first.result.current.loadPuzzle(PUZZLE, { name: 'Gentle Start', difficulty: 'easy' });
    });
    const solved = solveSudoku(PUZZLE.map((v) => ({ value: v || null, candidates: [] })));
    const idx = firstEmptyCell(first.result.current.grid);
    act(() => {
      first.result.current.handleCellInput(idx, solved[idx].value);
    });
    act(() => {
      first.result.current.handleToggleCandidate(idx + 1, 9);
    });
    first.unmount();

    const second = renderHook(() => useSudokuGame({ persistKey: KEY }), { wrapper: strictWrapper });
    let restored = false;
    act(() => {
      restored = second.result.current.restoreSavedGame();
    });
    expect(restored).toBe(true);
    expect(second.result.current.puzzleName).toBe('Gentle Start');
    expect(second.result.current.puzzleDifficulty).toBe('easy');
    expect(second.result.current.grid[idx].value).toBe(solved[idx].value);
    expect(second.result.current.grid[idx + 1].candidates).toContain(9);
    // Givens are restored as fixed cells, solution is recomputed
    expect(second.result.current.grid.filter((c) => c.isFixed).length).toBe(PUZZLE.filter(Boolean).length);
    expect(second.result.current.solution).not.toBeNull();
  });

  it('does not restore a completed game, and clearGrid drops the save', () => {
    window.localStorage.removeItem(KEY);
    const hook = renderHook(() => useSudokuGame({ persistKey: KEY }), { wrapper: strictWrapper });
    act(() => {
      hook.result.current.loadPuzzle(PUZZLE, { name: 'Done' });
    });
    const solved = solveSudoku(PUZZLE.map((v) => ({ value: v || null, candidates: [] })));
    for (let i = 0; i < 81; i++) {
      if (hook.result.current.grid[i].value === null) {
        act(() => {
          hook.result.current.handleCellInput(i, solved[i].value);
        });
      }
    }
    expect(hook.result.current.completed).toBe(true);

    const again = renderHook(() => useSudokuGame({ persistKey: KEY }), { wrapper: strictWrapper });
    let restored = true;
    act(() => {
      restored = again.result.current.restoreSavedGame();
    });
    expect(restored).toBe(false);

    act(() => {
      hook.result.current.clearGrid();
    });
    expect(window.localStorage.getItem(KEY)).toBeNull();
  });

  it('ignores corrupt saved data', () => {
    window.localStorage.setItem(KEY, '{"v":1,"givens":[1,2,3]}');
    const hook = renderHook(() => useSudokuGame({ persistKey: KEY }), { wrapper: strictWrapper });
    let restored = true;
    act(() => {
      restored = hook.result.current.restoreSavedGame();
    });
    expect(restored).toBe(false);
  });
});

describe('useSudokuGame assistance and play clock', () => {
  const KEY = 'test:sudoku-clock';

  beforeEach(() => {
    cleanup();
  });

  const setHidden = (hidden) => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
    document.dispatchEvent(new Event('visibilitychange'));
  };

  afterEach(() => {
    cleanup(); // unmount hooks from earlier tests so their listeners are gone
    vi.useRealTimers();
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
  });

  it('counts hints shown and steps applied, and reports them on solve', () => {
    const onSolved = vi.fn();
    const { result } = setup({ onSolved });
    act(() => {
      result.current.loadPuzzle(PUZZLE);
    });
    expect(result.current.hintsUsed).toBe(0);
    act(() => {
      result.current.noteHintUsed();
    });
    expect(result.current.hintsUsed).toBe(1);

    const solved = solveSudoku(PUZZLE.map((v) => ({ value: v || null, candidates: [] })));
    const idx = firstEmptyCell(result.current.grid);
    act(() => {
      result.current.applyStep({ placement: { cell: idx, digit: solved[idx].value }, eliminations: [] });
    });
    expect(result.current.hintsUsed).toBe(2);

    for (let i = 0; i < 81; i++) {
      if (result.current.grid[i].value === null) {
        act(() => {
          result.current.handleCellInput(i, solved[i].value);
        });
      }
    }
    expect(onSolved).toHaveBeenCalledTimes(1);
    expect(onSolved.mock.calls[0][0].hintsUsed).toBe(2);

    // A new puzzle starts clean
    act(() => {
      result.current.loadPuzzle(PUZZLE);
    });
    expect(result.current.hintsUsed).toBe(0);
  });

  it('play time excludes time while the tab is hidden and survives a reload', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T10:00:00Z'));
    window.localStorage.removeItem(KEY);
    const first = renderHook(() => useSudokuGame({ persistKey: KEY }), { wrapper: strictWrapper });
    act(() => {
      first.result.current.loadPuzzle(PUZZLE, { name: 'Clock' });
    });
    act(() => {
      vi.advanceTimersByTime(30_000); // 30s of play
    });
    expect(first.result.current.getElapsedSeconds()).toBe(30);

    act(() => {
      setHidden(true);
    });
    act(() => {
      vi.advanceTimersByTime(3_600_000); // an hour away
    });
    expect(first.result.current.getElapsedSeconds()).toBe(30);
    act(() => {
      setHidden(false);
    });
    act(() => {
      vi.advanceTimersByTime(15_000); // 15s more play
    });
    expect(first.result.current.getElapsedSeconds()).toBe(45);
    first.unmount();

    // "Days later": the resumed game continues from 45s, not from wall time
    vi.setSystemTime(new Date('2026-01-05T10:00:00Z'));
    const second = renderHook(() => useSudokuGame({ persistKey: KEY }), { wrapper: strictWrapper });
    act(() => {
      second.result.current.restoreSavedGame();
    });
    expect(second.result.current.getElapsedSeconds()).toBe(45);
    act(() => {
      vi.advanceTimersByTime(5_000);
    });
    expect(second.result.current.getElapsedSeconds()).toBe(50);
  });

  it('solve time reported to onSolved is play time', () => {
    vi.useFakeTimers();
    const onSolved = vi.fn();
    const { result } = setup({ onSolved });
    act(() => {
      result.current.loadPuzzle(PUZZLE);
    });
    act(() => {
      vi.advanceTimersByTime(12_000);
    });
    const solved = solveSudoku(PUZZLE.map((v) => ({ value: v || null, candidates: [] })));
    for (let i = 0; i < 81; i++) {
      if (result.current.grid[i].value === null) {
        act(() => {
          result.current.handleCellInput(i, solved[i].value);
        });
      }
    }
    expect(onSolved.mock.calls[0][0].timeInSeconds).toBe(12);
  });
});
