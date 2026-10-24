// The almost-locked-set machinery, on its own.
//
// The restricted-common check is where wrong hints in this family come
// from: one cell of a set that the other side's digit does not see is
// enough to make a deduction false, and the mistake is invisible in the
// technique that uses it. So it is tested here, separately from the chain
// engine (#67) and from the almost-locked-set techniques (#73) that share
// it, on grids built to put the boundary cases one cell apart.
import { describe, it, expect } from 'vitest';
import {
  digitCells,
  eliminationTargets,
  everyCellSeesEvery,
  findAlmostLockedSets,
  isRestrictedCommon,
  restrictedCommons,
} from '../restrictedCommon';
import { arePeers } from '../gridUnits';

/** R,C in the 1-based names the product uses, as a 0..80 index. */
const at = (row, col) => (row - 1) * 9 + (col - 1);

/** A board of empty cells; `marks` sets the pencil marks that matter. */
const gridWith = (marks, values = {}) => {
  const grid = Array.from({ length: 81 }, (_, i) => ({
    cellIndex: i,
    value: null,
    isFixed: false,
    candidates: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    isHighlighted: false,
    highlightColor: null,
    isBaseCell: false,
    isTargetCell: false,
  }));
  for (const [cell, candidates] of Object.entries(marks)) {
    grid[Number(cell)] = { ...grid[Number(cell)], candidates: [...candidates] };
  }
  for (const [cell, value] of Object.entries(values)) {
    grid[Number(cell)] = { ...grid[Number(cell)], value, isFixed: true, candidates: [] };
  }
  return grid;
};

describe('every cell sees every cell', () => {
  it('is true for two cells that share a row, a column or a box', () => {
    expect(everyCellSeesEvery([at(1, 1)], [at(1, 9)])).toBe(true);
    expect(everyCellSeesEvery([at(1, 1)], [at(9, 1)])).toBe(true);
    expect(everyCellSeesEvery([at(1, 1)], [at(3, 3)])).toBe(true);
  });

  it('is false for two cells that share nothing', () => {
    expect(everyCellSeesEvery([at(1, 1)], [at(5, 5)])).toBe(false);
  });

  it('needs EVERY pair, not just one: one cell short is false', () => {
    // R1C1 and R1C2 both see R1C9. Add R5C2, which R1C9 does not see, and
    // the whole thing has to collapse. This single case is the bug that
    // makes a grouped or set-based hint erase a true digit.
    expect(everyCellSeesEvery([at(1, 1), at(1, 2)], [at(1, 9)])).toBe(true);
    expect(everyCellSeesEvery([at(1, 1), at(5, 2)], [at(1, 9)])).toBe(false);
  });

  it('is false when the two sides share a cell, which is not two places', () => {
    expect(everyCellSeesEvery([at(1, 1)], [at(1, 1)])).toBe(false);
    expect(everyCellSeesEvery([at(1, 1), at(1, 2)], [at(1, 2)])).toBe(false);
  });

  it('is false when either side is empty: there is nothing to restrict', () => {
    expect(everyCellSeesEvery([], [at(1, 1)])).toBe(false);
    expect(everyCellSeesEvery([at(1, 1)], [])).toBe(false);
  });
});

describe('the cells of a set that still offer a digit', () => {
  it('skips cells without the digit, and cells already filled', () => {
    const grid = gridWith(
      { [at(1, 1)]: [2, 5], [at(1, 2)]: [5, 7] },
      { [at(1, 3)]: 5 }
    );
    const cells = [at(1, 1), at(1, 2), at(1, 3)];
    expect(digitCells(grid, cells, 5)).toEqual([at(1, 1), at(1, 2)]);
    expect(digitCells(grid, cells, 2)).toEqual([at(1, 1)]);
    expect(digitCells(grid, cells, 9)).toEqual([]);
  });
});

describe('a restricted common digit', () => {
  // Two pairs in row 1 and row 2. Both hold 5. In the restricted case the
  // 5s of each pair sit inside one box, so they all see each other.
  it('holds when every copy in one set sees every copy in the other', () => {
    const grid = gridWith({
      [at(1, 1)]: [2, 5],
      [at(1, 2)]: [2, 3],
      [at(2, 1)]: [5, 7],
      [at(2, 2)]: [7, 9],
    });
    expect(isRestrictedCommon(grid, [at(1, 1), at(1, 2)], [at(2, 1), at(2, 2)], 5)).toBe(true);
  });

  it('fails when one copy is out of sight of the other set', () => {
    const grid = gridWith({
      [at(1, 1)]: [2, 5],
      [at(1, 2)]: [2, 3],
      [at(2, 1)]: [5, 7],
      [at(5, 8)]: [5, 9],
    });
    // R5C8 holds a 5 and does not see R1C1, so 5 is not restricted.
    expect(isRestrictedCommon(grid, [at(1, 1), at(1, 2)], [at(2, 1), at(5, 8)], 5)).toBe(false);
  });

  it('fails when one side does not hold the digit at all', () => {
    const grid = gridWith({
      [at(1, 1)]: [2, 5],
      [at(2, 1)]: [3, 7],
    });
    expect(isRestrictedCommon(grid, [at(1, 1)], [at(2, 1)], 5)).toBe(false);
  });
});

describe('finding almost locked sets', () => {
  it('reports N cells holding N + 1 digits, with its unit and its digits', () => {
    const grid = gridWith(
      {
        [at(1, 1)]: [2, 3],
        [at(1, 2)]: [3, 5],
      },
      // Fill the rest of row 1 so nothing else in it qualifies.
      { [at(1, 3)]: 1, [at(1, 4)]: 4, [at(1, 5)]: 6, [at(1, 6)]: 7, [at(1, 7)]: 8, [at(1, 8)]: 9, [at(1, 9)]: 2 }
    );
    const sets = findAlmostLockedSets(grid, { minCells: 2, maxCells: 2 });
    const pair = sets.find((s) => s.cells.join(',') === `${at(1, 1)},${at(1, 2)}`);
    expect(pair).toBeTruthy();
    expect(pair.digits).toEqual([2, 3, 5]);
    expect(pair.unit.type).toBe('row');
    expect(pair.unit.index).toBe(0);
  });

  it('never reports a locked set: N cells with N digits belong to the subsets', () => {
    const grid = gridWith({
      [at(1, 1)]: [2, 3],
      [at(1, 2)]: [2, 3],
    });
    const sets = findAlmostLockedSets(grid, { minCells: 2, maxCells: 2 });
    expect(sets.some((s) => s.cells.join(',') === `${at(1, 1)},${at(1, 2)}`)).toBe(false);
  });

  it('counts a bi-value cell as a set only when asked for size one', () => {
    const grid = gridWith({ [at(4, 4)]: [6, 9] });
    const withSingles = findAlmostLockedSets(grid, { minCells: 1, maxCells: 1 });
    expect(withSingles.some((s) => s.cells.join(',') === String(at(4, 4)))).toBe(true);
    const fromTwo = findAlmostLockedSets(grid, { minCells: 2, maxCells: 3 });
    expect(fromTwo.every((s) => s.cells.length >= 2)).toBe(true);
  });

  it('reports one copy of a cell set that qualifies in more than one unit', () => {
    // R1C1 and R1C2 share a row and a box, so the same pair qualifies twice.
    const grid = gridWith({
      [at(1, 1)]: [2, 3],
      [at(1, 2)]: [3, 5],
    });
    const sets = findAlmostLockedSets(grid, { minCells: 2, maxCells: 2 });
    const key = `${at(1, 1)},${at(1, 2)}`;
    expect(sets.filter((s) => s.cells.join(',') === key)).toHaveLength(1);
  });

  it('honours the size bounds it is given', () => {
    const grid = gridWith({
      [at(1, 1)]: [2, 3],
      [at(1, 2)]: [3, 5],
      [at(1, 3)]: [5, 2],
      [at(1, 4)]: [2, 7],
    });
    const sets = findAlmostLockedSets(grid, { minCells: 2, maxCells: 3 });
    expect(sets.length).toBeGreaterThan(0);
    for (const set of sets) {
      expect(set.cells.length).toBeGreaterThanOrEqual(2);
      expect(set.cells.length).toBeLessThanOrEqual(3);
      expect(set.digits.length).toBe(set.cells.length + 1);
    }
  });
});

describe('the restricted commons of two sets', () => {
  // Two pairs in the same box, so everything in one sees everything in the
  // other: both of their shared digits are restricted.
  const bothRestricted = gridWith({
    [at(1, 1)]: [2, 5],
    [at(1, 2)]: [5, 7],
    [at(2, 1)]: [2, 7],
    [at(2, 2)]: [7, 9],
  });

  it('lists every shared digit whose copies all see each other', () => {
    expect(
      restrictedCommons(
        bothRestricted,
        [at(1, 1), at(1, 2)],
        [at(2, 1), at(2, 2)],
        [2, 5, 7],
        [2, 7, 9]
      )
    ).toEqual([2, 7]);
  });

  it('leaves out a shared digit with a copy out of sight, and the unshared ones', () => {
    // The 7 gains a home in R5C8, which R1C2 does not see, so 7 stops
    // being restricted. 2 still is, and 5 and 9 are not shared at all.
    const loose = gridWith({
      [at(1, 1)]: [2, 5],
      [at(1, 2)]: [5, 7],
      [at(2, 1)]: [2, 7],
      [at(5, 8)]: [7, 9],
    });
    expect(
      restrictedCommons(loose, [at(1, 1), at(1, 2)], [at(2, 1), at(5, 8)], [2, 5, 7], [2, 7, 9])
    ).toEqual([2]);
  });
});

describe('where a digit may be erased once it is cornered in some groups', () => {
  // Two groups holding a 5: R1C1/R1C2 in row 1 and R3C1/R3C2 in row 3. All
  // four sit in box 1, so a cell of that box sees every one of them - and
  // only such a cell may lose the 5. The rest of the box is filled in, so
  // what comes back is exact rather than whatever the empty cells allow.
  const grid = gridWith(
    {
      [at(1, 1)]: [5, 2],
      [at(1, 2)]: [5, 3],
      [at(3, 1)]: [5, 4],
      [at(3, 2)]: [5, 6],
      [at(2, 1)]: [5, 8],
      [at(2, 3)]: [5, 8],
      [at(9, 9)]: [5, 8],
    },
    { [at(1, 3)]: 1, [at(2, 2)]: 9, [at(3, 3)]: 7 }
  );

  it('erases only where every cell of every group is in sight', () => {
    expect(eliminationTargets(grid, [[at(1, 1), at(1, 2)], [at(3, 1), at(3, 2)]], 5)).toEqual([
      at(2, 1),
      at(2, 3),
    ]);
  });

  it('leaves out a cell that sees all but one of them - the family\'s own bug', () => {
    // The second group's 5 moves to R3C8. R2C1 still sees three of the four
    // 5s, and erasing on that would take the digit the answer needs; the
    // cells that see the fourth as well are the only ones left.
    const stretched = gridWith(
      {
        [at(1, 1)]: [5, 2],
        [at(1, 2)]: [5, 3],
        [at(3, 1)]: [5, 4],
        [at(3, 8)]: [5, 6],
        [at(2, 1)]: [5, 8],
      },
      { [at(1, 3)]: 1, [at(2, 2)]: 9, [at(2, 3)]: 7 }
    );
    const targets = eliminationTargets(stretched, [[at(1, 1), at(1, 2)], [at(3, 1), at(3, 8)]], 5);
    expect(targets).not.toContain(at(2, 1));
    expect(targets).toEqual([at(3, 2), at(3, 3)]);
  });

  it('never erases from inside the groups themselves', () => {
    const targets = eliminationTargets(grid, [[at(1, 1), at(1, 2)], [at(3, 1), at(3, 2)]], 5);
    for (const cell of [at(1, 1), at(1, 2), at(3, 1), at(3, 2)]) expect(targets).not.toContain(cell);
  });

  it('reports nothing when a group cannot hold the digit at all', () => {
    // "The digit is in one of these groups" is not true of a group with no
    // room for it, so the deduction the caller is making does not hold.
    expect(eliminationTargets(grid, [[at(1, 1), at(1, 2)], [at(9, 9)]], 7)).toEqual([]);
    expect(eliminationTargets(grid, [], 5)).toEqual([]);
  });

  it('takes any number of groups, not just two', () => {
    const three = gridWith({
      [at(1, 1)]: [5, 2],
      [at(1, 2)]: [5, 3],
      [at(1, 3)]: [5, 4],
      [at(1, 9)]: [5, 8],
    });
    const groups = [[at(1, 1)], [at(1, 2)], [at(1, 3)]];
    const targets = eliminationTargets(three, groups, 5);
    expect(targets).toContain(at(1, 9));
    expect(targets).not.toContain(at(5, 5));
    // Whatever comes back, every one of them could be a 5 and sees all
    // three places the 5 is cornered in.
    for (const target of targets) {
      expect(three[target].candidates).toContain(5);
      for (const [cell] of groups) expect(arePeers(target, cell)).toBe(true);
    }
  });
});
