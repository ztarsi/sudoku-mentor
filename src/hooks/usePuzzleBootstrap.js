import { useCallback, useEffect, useRef } from 'react';
import {
  fetchAllPuzzleEntries,
  pickRandomPuzzleEntry,
  pickStarterPuzzleEntry,
  hasOnboarded,
} from '@/components/sudoku/puzzleSources';

/**
 * What to show when a page mounts, in order:
 *   1. the saved game, if there is an unfinished one;
 *   2. a gentle starter puzzle for a first-time visitor (caller shows the tour);
 *   3. otherwise a random puzzle from the library plus the player's uploads.
 *
 * The random pick is asynchronous. If the player loads a puzzle themselves
 * before it resolves, the pick is dropped rather than overwriting their
 * choice: pages call `markUserLoad()` from their load handler.
 *
 * @param {{
 *   restoreSavedGame: () => boolean,
 *   loadPuzzle: (puzzle: number[], meta: {name: string, difficulty: string}) => void,
 *   user?: object|null,
 *   enabled?: boolean,
 *   onResumed?: () => void,
 *   onFirstVisit?: () => void,
 *   fetchEntries?: (user: object|null) => Promise<Array<{puzzle:number[], name:string, difficulty:string}>>,
 * }} options
 */
export function usePuzzleBootstrap({
  restoreSavedGame,
  loadPuzzle,
  user = null,
  enabled = true,
  onResumed,
  onFirstVisit,
  fetchEntries = fetchAllPuzzleEntries,
}) {
  const userActedRef = useRef(false);
  const markUserLoad = useCallback(() => {
    userActedRef.current = true;
  }, []);

  // Latest callbacks without re-running the mount effect
  const refs = useRef({ restoreSavedGame, loadPuzzle, onResumed, onFirstVisit, fetchEntries, user });
  refs.current = { restoreSavedGame, loadPuzzle, onResumed, onFirstVisit, fetchEntries, user };

  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    const r = refs.current;

    if (r.restoreSavedGame()) {
      r.onResumed?.();
      return undefined;
    }

    if (!hasOnboarded()) {
      const starter = pickStarterPuzzleEntry();
      if (starter) r.loadPuzzle(starter.puzzle, { name: starter.name, difficulty: starter.difficulty });
      r.onFirstVisit?.();
      return undefined;
    }

    (async () => {
      try {
        const entries = await r.fetchEntries(r.user);
        const entry = pickRandomPuzzleEntry(entries);
        if (entry && !cancelled && !userActedRef.current) {
          refs.current.loadPuzzle(entry.puzzle, { name: entry.name, difficulty: entry.difficulty });
        }
      } catch (error) {
        console.error('Failed to load random puzzle:', error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return { markUserLoad };
}
