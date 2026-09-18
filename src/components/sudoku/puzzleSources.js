import { listMyPuzzles } from '@/api/playerData';
import { PUZZLES } from './puzzles';

/** Built-in library flattened to { puzzle, name, difficulty } entries. */
export const getBuiltInPuzzleEntries = () =>
  Object.entries(PUZZLES).flatMap(([difficulty, list]) =>
    list.map((p) => ({ puzzle: p.puzzle, name: p.name, difficulty }))
  );

/**
 * All available puzzles: built-ins plus the signed-in player's own uploads.
 * A failed fetch of the player's puzzles must not block the built-ins, so
 * it degrades to the library alone. Signed out: built-ins only.
 */
export const fetchAllPuzzleEntries = async (user = null) => {
  const entries = getBuiltInPuzzleEntries();
  try {
    const userPuzzles = await listMyPuzzles(user);
    userPuzzles.forEach((p) =>
      entries.push({ puzzle: p.puzzle, name: p.name, difficulty: p.difficulty })
    );
  } catch {
    // Offline or a transient failure - built-ins are enough.
  }
  return entries;
};

export const pickRandomPuzzleEntry = (entries) =>
  entries.length > 0 ? entries[Math.floor(Math.random() * entries.length)] : null;

const STARTER_DIFFICULTIES = new Set(['easy', 'medium']);

/**
 * A gentle first puzzle for a new visitor: built-ins from the easy/medium
 * shelves only. Landing a newcomer on an "ultimate" puzzle - whose first
 * hint is a what-if search - is the worst possible introduction to a
 * technique tutor.
 */
export const pickStarterPuzzleEntry = () => {
  const pool = getBuiltInPuzzleEntries().filter((e) => STARTER_DIFFICULTIES.has(e.difficulty));
  return pickRandomPuzzleEntry(pool);
};

const ONBOARDED_KEY = 'sudoku-mentor:onboarded';

export const hasOnboarded = () => {
  try {
    return window.localStorage.getItem(ONBOARDED_KEY) === '1';
  } catch {
    return true; // no storage: don't nag every load
  }
};

export const markOnboarded = () => {
  try {
    window.localStorage.setItem(ONBOARDED_KEY, '1');
  } catch {
    // ignore
  }
};
