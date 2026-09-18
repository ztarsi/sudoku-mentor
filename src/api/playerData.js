// Every read and write of a player's own data goes through here, and every
// query is scoped to the signed-in player with `created_by`. Base44 enforces
// access rules server-side (configured in the dashboard, not in this repo);
// this module is the client-side half: nothing here ever asks for, edits,
// or deletes a record that another player created, whatever the server
// would allow.
import { base44 } from '@/api/base44Client';

const mine = (user, extra = {}) => ({ ...extra, created_by: user.email });

const ownedBy = (user, record) => !!user && !!record && record.created_by === user.email;

/** The player's uploaded puzzles, newest first. Signed out: none. */
export const listMyPuzzles = async (user) => {
  if (!user?.email) return [];
  return base44.entities.SudokuPuzzle.filter(mine(user), '-created_date');
};

/** The player's clean (no-assist) solve records. Signed out: none. */
export const listMyNoAssistRecords = async (user) => {
  if (!user?.email) return [];
  return base44.entities.SolveRecord.filter(mine(user, { no_assist: true }));
};

/** The player's best clean time for a puzzle, in seconds, or null. */
export const bestNoAssistTime = async (user, puzzleName) => {
  if (!user?.email || !puzzleName) return null;
  const records = await base44.entities.SolveRecord.filter(
    mine(user, { puzzle_name: puzzleName, no_assist: true }),
    'time_seconds',
    1
  );
  return records.length > 0 ? records[0].time_seconds : null;
};

export const createSolveRecord = async (user, record) => {
  if (!user?.email) throw new Error('Sign in to record solves');
  return base44.entities.SolveRecord.create(record);
};

export const savePuzzle = async (user, { name, difficulty, puzzle, source }) => {
  if (!user?.email) throw new Error('Sign in to save puzzles');
  return base44.entities.SudokuPuzzle.create({ name, difficulty, puzzle, source });
};

/** Rename one of the player's own puzzles. Refuses anyone else's. */
export const renamePuzzle = async (user, puzzleRecord, name) => {
  if (!ownedBy(user, puzzleRecord)) throw new Error('You can only rename your own puzzles');
  return base44.entities.SudokuPuzzle.update(puzzleRecord.id, { name });
};

/** Delete one of the player's own puzzles. Refuses anyone else's. */
export const deletePuzzle = async (user, puzzleRecord) => {
  if (!ownedBy(user, puzzleRecord)) throw new Error('You can only delete your own puzzles');
  return base44.entities.SudokuPuzzle.delete(puzzleRecord.id);
};

/** Find the player's saved copy of a puzzle (same 81 digits), if any. */
export const findMySavedPuzzle = async (user, puzzle) => {
  const key = JSON.stringify(puzzle);
  const existing = await listMyPuzzles(user);
  return existing.find((p) => JSON.stringify(p.puzzle) === key) || null;
};

export const saveColors = async (user, colors) => {
  if (!user?.email) return;
  return base44.auth.updateMe({ sudoku_colors: colors });
};
