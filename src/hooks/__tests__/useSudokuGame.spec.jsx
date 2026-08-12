// @vitest-environment jsdom
//
// Regression tests for the shared game hook, covering the state bugs that
// existed when this logic lived (twice) inside the page components:
// duplicate onSolved firing, broken redo, history writes inside setState
// updaters (StrictMode double-commit), and stale-grid validation.
import React, { StrictMode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSudokuGame } from '../useSudokuGame';
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
