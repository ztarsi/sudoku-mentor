// Almost locked sets, and the restricted-common check they are joined by.
//
// This module is shared: the chain engine passes a chain through an almost
// locked set (#67), and the almost-locked-set techniques (#73) are built on
// the same two ideas. A restricted common is where wrong hints in this
// family come from - one cell of a set that the other set's digit does not
// see is enough to make a hint false - so it lives here, on its own, with
// its own tests, rather than inside any one technique.
//
// An almost locked set is N cells inside one row, column or box holding
// N + 1 different candidates. Lose any one of those digits and the rest are
// forced, which is why the set behaves like a single node in a chain:
// either it holds digit X, or it is locked and holds digit Z.
//
// A set of N cells with N digits is already locked and belongs to the subset
// techniques, so it is never reported here.
import { arePeers, getRowIndices, getColIndices, getBoxIndices, unitOf } from './gridUnits';

/** The 27 units, each as { type: 'row'|'column'|'box', index, name, indices }. */
const UNITS = [
  ...Array.from({ length: 9 }, (_, i) => ({ ...unitOf('row', i), indices: getRowIndices(i) })),
  ...Array.from({ length: 9 }, (_, i) => ({ ...unitOf('column', i), indices: getColIndices(i) })),
  ...Array.from({ length: 9 }, (_, i) => ({ ...unitOf('box', i), indices: getBoxIndices(i) })),
];

/** The cells of `cells` that still offer `digit`. */
export const digitCells = (grid, cells, digit) =>
  cells.filter((c) => grid[c].value === null && grid[c].candidates.includes(digit));

/**
 * True when every cell of `a` sees every cell of `b`.
 *
 * This is the whole of the restricted-common check, and the reason it is one
 * function: a digit is a restricted common of two sets when every copy of it
 * in one set sees every copy in the other, so at most one set can hold it.
 * Missing a single pair makes the deduction false.
 *
 * Empty on either side is not "all of them see all of them" in any useful
 * sense - there is nothing to restrict - so it is false.
 */
export const everyCellSeesEvery = (a, b) => {
  if (!a.length || !b.length) return false;
  for (const c1 of a) {
    for (const c2 of b) {
      if (c1 === c2) return false; // a shared cell is not two separate places
      if (!arePeers(c1, c2)) return false;
    }
  }
  return true;
};

/**
 * True when `digit` is a restricted common of the two cell sets: both offer
 * it, and every cell offering it in one set sees every cell offering it in
 * the other.
 */
export const isRestrictedCommon = (grid, cellsA, cellsB, digit) =>
  everyCellSeesEvery(digitCells(grid, cellsA, digit), digitCells(grid, cellsB, digit));

/** Every subset of `items` of exactly `size` members, in index order. */
const subsetsOfSize = (items, size) => {
  const out = [];
  const pick = (start, chosen) => {
    if (chosen.length === size) {
      out.push([...chosen]);
      return;
    }
    for (let i = start; i < items.length; i++) {
      chosen.push(items[i]);
      pick(i + 1, chosen);
      chosen.pop();
    }
  };
  pick(0, []);
  return out;
};

/**
 * Every almost locked set on the board: N cells in one unit with N + 1
 * candidates between them.
 *
 * @param {Array} grid
 * @param {{ minCells?: number, maxCells?: number }} [options]
 *   minCells  the smallest set to report. 1 is a bi-value cell, which is a
 *             real almost locked set but also the plainest strong link there
 *             is, so a caller that already has bi-value cells asks for 2.
 *   maxCells  the largest set to report.
 * @returns {{ cells: number[], digits: number[], unit: { type: string, index: number, name: string } }[]}
 *   one entry per distinct cell set, with its digits sorted.
 */
export const findAlmostLockedSets = (grid, options = {}) => {
  const { minCells = 1, maxCells = 4 } = options;
  const sets = [];
  const seen = new Set();

  for (const unit of UNITS) {
    const empty = unit.indices.filter((i) => grid[i].value === null && grid[i].candidates.length > 0);
    for (let size = minCells; size <= Math.min(maxCells, empty.length); size++) {
      for (const cells of subsetsOfSize(empty, size)) {
        const digits = new Set();
        for (const cell of cells) {
          for (const d of grid[cell].candidates) digits.add(d);
        }
        if (digits.size !== size + 1) continue;
        // The same cells can qualify inside more than one unit (any single
        // cell lies in three); one copy is enough.
        const key = cells.join(',');
        if (seen.has(key)) continue;
        seen.add(key);
        sets.push({
          cells,
          digits: [...digits].sort((a, b) => a - b),
          unit: { type: unit.type, index: unit.index, name: unit.name },
        });
      }
    }
  }

  return sets;
};
