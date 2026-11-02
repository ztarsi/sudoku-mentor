// The rules of practice mode (#139).
import { describe, it, expect } from 'vitest';
import { drillFound, practiceLine, foundLine, practiceCount, loadDrills } from '../practice';

const open = (candidates) => ({ value: null, candidates, isFixed: false });
const placed = (value) => ({ value, candidates: [], isFixed: false });

describe('when a drill is found', () => {
  const erase = { eliminations: [{ cell: 0, digit: 4 }, { cell: 1, digit: 4 }] };
  const place = { placement: { cell: 2, digit: 7 }, eliminations: [] };

  it('needs every mark the instance rules out to be gone', () => {
    expect(drillFound([erase], [open([1, 4]), open([4, 9])])).toBe(false);
    expect(drillFound([erase], [open([1]), open([4, 9])])).toBe(false);
    expect(drillFound([erase], [open([1]), open([9])])).toBe(true);
  });

  it('counts a cell since filled with another digit as having lost the mark', () => {
    expect(drillFound([erase], [placed(1), open([9])])).toBe(true);
    expect(drillFound([erase], [placed(4), open([9])])).toBe(false);
  });

  it('needs the placement for a technique that places', () => {
    expect(drillFound([place], [open([1]), open([2]), open([7, 8])])).toBe(false);
    expect(drillFound([place], [open([1]), open([2]), placed(7)])).toBe(true);
  });

  it('is found by any one instance', () => {
    expect(drillFound([erase, place], [open([1, 4]), open([4]), placed(7)])).toBe(true);
    expect(drillFound([], [open([1])])).toBe(false);
  });
});

describe('what the line above the board says', () => {
  it('is the task, and owns up when an easier move is also there', () => {
    expect(practiceLine('Swordfish', { next: true })).toBe('Find the Swordfish on this board.');
    // "the" reads right for a plural name and one that wants "an".
    expect(practiceLine('Remote Pairs', { next: true })).toBe('Find the Remote Pairs on this board.');
    expect(foundLine('XY-Wing')).toBe('Found it: you carried out the XY-Wing.');
    expect(practiceLine('Swordfish', { next: false })).toMatch(/An easier move is also here; this drill is about the Swordfish\.$/);
  });
});

describe('which techniques can be practised', () => {
  it('counts positions from the index, and loads the same number', async () => {
    expect(practiceCount('X-Wing')).toBeGreaterThan(0);
    expect(practiceCount('Forcing Net')).toBe(0);
    expect((await loadDrills('X-Wing')).length).toBe(practiceCount('X-Wing'));
    expect(await loadDrills('No such technique')).toEqual([]);
  });
});
