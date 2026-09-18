// The client never asks for, edits, or deletes another player's records,
// regardless of what the server would allow.
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { filter, create, update, del, updateMe } = vi.hoisted(() => ({
  filter: vi.fn(async () => []),
  create: vi.fn(async (r) => ({ id: 'new', ...r })),
  update: vi.fn(async () => ({})),
  del: vi.fn(async () => ({})),
  updateMe: vi.fn(async () => ({})),
}));

vi.mock('@/api/base44Client', () => ({
  base44: {
    entities: {
      SudokuPuzzle: { filter, create, update, delete: del },
      SolveRecord: { filter, create },
    },
    auth: { updateMe },
  },
}));

import {
  listMyPuzzles, listMyNoAssistRecords, bestNoAssistTime, renamePuzzle, deletePuzzle,
  findMySavedPuzzle, createSolveRecord, saveColors,
} from '../playerData';

const me = { email: 'ziv@example.com' };

beforeEach(() => {
  filter.mockClear(); create.mockClear(); update.mockClear(); del.mockClear(); updateMe.mockClear();
});

describe('playerData scoping', () => {
  it('lists are scoped to the signed-in player and empty when signed out', async () => {
    expect(await listMyPuzzles(null)).toEqual([]);
    expect(await listMyNoAssistRecords(null)).toEqual([]);
    expect(filter).not.toHaveBeenCalled();

    await listMyPuzzles(me);
    expect(filter).toHaveBeenLastCalledWith({ created_by: me.email }, '-created_date');
    await listMyNoAssistRecords(me);
    expect(filter).toHaveBeenLastCalledWith({ created_by: me.email, no_assist: true });
  });

  it('best time only considers the player\'s own records', async () => {
    filter.mockResolvedValueOnce([{ time_seconds: 321 }]);
    expect(await bestNoAssistTime(me, 'Tea Time')).toBe(321);
    expect(filter).toHaveBeenLastCalledWith(
      { created_by: me.email, puzzle_name: 'Tea Time', no_assist: true }, 'time_seconds', 1
    );
    expect(await bestNoAssistTime(null, 'Tea Time')).toBeNull();
  });

  it('refuses to rename or delete a puzzle the player did not create', async () => {
    const theirs = { id: 'p1', created_by: 'someone@else.com' };
    await expect(renamePuzzle(me, theirs, 'x')).rejects.toThrow(/own puzzles/);
    await expect(deletePuzzle(me, theirs)).rejects.toThrow(/own puzzles/);
    expect(update).not.toHaveBeenCalled();
    expect(del).not.toHaveBeenCalled();

    const ownRecord = { id: 'p2', created_by: me.email };
    await renamePuzzle(me, ownRecord, 'Mine');
    expect(update).toHaveBeenCalledWith('p2', { name: 'Mine' });
    await deletePuzzle(me, ownRecord);
    expect(del).toHaveBeenCalledWith('p2');
  });

  it('duplicate check only looks at the player\'s own puzzles', async () => {
    const puzzle = Array(81).fill(0);
    filter.mockResolvedValueOnce([{ id: 'dup', puzzle, name: 'Old', difficulty: 'easy', created_by: me.email }]);
    const found = await findMySavedPuzzle(me, puzzle);
    expect(found?.id).toBe('dup');
    expect(filter).toHaveBeenLastCalledWith({ created_by: me.email }, '-created_date');
  });

  it('writes need a signed-in player', async () => {
    await expect(createSolveRecord(null, {})).rejects.toThrow(/Sign in/);
    await saveColors(null, {});
    expect(updateMe).not.toHaveBeenCalled();
    await saveColors(me, { cellBg: '#000' });
    expect(updateMe).toHaveBeenCalledWith({ sudoku_colors: { cellBg: '#000' } });
  });
});
