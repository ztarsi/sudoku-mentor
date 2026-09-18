// @vitest-environment jsdom
// The random pick on mount must never overwrite a puzzle the player chose
// while it was still loading.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePuzzleBootstrap } from '../usePuzzleBootstrap';

const entry = (name) => ({ puzzle: Array(81).fill(0), name, difficulty: 'easy' });

const deferred = () => {
  /** @type {(value: any) => void} */
  let resolve = () => {};
  const promise = new Promise((r) => { resolve = r; });
  return { promise, resolve };
};

beforeEach(() => {
  window.localStorage.setItem('sudoku-mentor:onboarded', '1');
});

describe('usePuzzleBootstrap', () => {
  it('resumes a saved game first and loads nothing else', () => {
    const loadPuzzle = vi.fn();
    const onResumed = vi.fn();
    renderHook(() => usePuzzleBootstrap({ restoreSavedGame: () => true, loadPuzzle, onResumed, fetchEntries: vi.fn() }));
    expect(onResumed).toHaveBeenCalledTimes(1);
    expect(loadPuzzle).not.toHaveBeenCalled();
  });

  it('gives a first-time visitor a starter puzzle and the tour', () => {
    window.localStorage.removeItem('sudoku-mentor:onboarded');
    const loadPuzzle = vi.fn();
    const onFirstVisit = vi.fn();
    renderHook(() => usePuzzleBootstrap({ restoreSavedGame: () => false, loadPuzzle, onFirstVisit, fetchEntries: vi.fn() }));
    expect(loadPuzzle).toHaveBeenCalledTimes(1);
    expect(['easy', 'medium']).toContain(loadPuzzle.mock.calls[0][1].difficulty);
    expect(onFirstVisit).toHaveBeenCalledTimes(1);
  });

  it('loads a random puzzle when nothing else applies', async () => {
    const loadPuzzle = vi.fn();
    const d = deferred();
    renderHook(() => usePuzzleBootstrap({ restoreSavedGame: () => false, loadPuzzle, fetchEntries: () => d.promise }));
    expect(loadPuzzle).not.toHaveBeenCalled();
    await act(async () => {
      d.resolve([entry('Random')]);
      await d.promise;
    });
    expect(loadPuzzle).toHaveBeenCalledWith(expect.any(Array), { name: 'Random', difficulty: 'easy' });
  });

  it('drops the random pick if the player loaded a puzzle first', async () => {
    const loadPuzzle = vi.fn();
    const d = deferred();
    const { result } = renderHook(() =>
      usePuzzleBootstrap({ restoreSavedGame: () => false, loadPuzzle, fetchEntries: () => d.promise })
    );
    act(() => {
      result.current.markUserLoad(); // the player picked from the library meanwhile
    });
    await act(async () => {
      d.resolve([entry('Random')]);
      await d.promise;
    });
    expect(loadPuzzle).not.toHaveBeenCalled();
  });

  it('does nothing while disabled (desktop page about to redirect to mobile)', () => {
    const loadPuzzle = vi.fn();
    const restore = vi.fn(() => true);
    renderHook(() => usePuzzleBootstrap({ restoreSavedGame: restore, loadPuzzle, enabled: false, fetchEntries: vi.fn() }));
    expect(restore).not.toHaveBeenCalled();
    expect(loadPuzzle).not.toHaveBeenCalled();
  });
});
