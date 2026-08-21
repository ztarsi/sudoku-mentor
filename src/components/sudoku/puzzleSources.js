import { base44 } from '@/api/base44Client';
import { PUZZLES } from './puzzles';

/** Built-in library flattened to { puzzle, name, difficulty } entries. */
export const getBuiltInPuzzleEntries = () =>
  Object.entries(PUZZLES).flatMap(([difficulty, list]) =>
    list.map((p) => ({ puzzle: p.puzzle, name: p.name, difficulty }))
  );

/**
 * All available puzzles: built-ins plus the user's uploaded ones. A failed
 * (e.g. unauthenticated) fetch of user puzzles must not block the
 * built-ins, so it degrades to the library alone.
 */
export const fetchAllPuzzleEntries = async () => {
  const entries = getBuiltInPuzzleEntries();
  try {
    const userPuzzles = await base44.entities.SudokuPuzzle.list();
    userPuzzles.forEach((p) =>
      entries.push({ puzzle: p.puzzle, name: p.name, difficulty: p.difficulty })
    );
  } catch {
    // Anonymous visitors can't list user puzzles - built-ins are enough.
  }
  return entries;
};

export const pickRandomPuzzleEntry = (entries) =>
  entries.length > 0 ? entries[Math.floor(Math.random() * entries.length)] : null;
