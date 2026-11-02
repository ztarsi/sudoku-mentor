// The fish family, and the single-digit patterns that live beside it.
//
// A fish is one digit and two sets of units of the same size N: the BASE
// sets, each of which must hold the digit somewhere, and the COVER sets,
// which between them hold every candidate of the base sets. The base sets
// are pairwise disjoint, so they hold N true copies of the digit; the N
// cover sets can hold one each; so every cover set's copy of the digit is
// one of the base candidates, and any candidate in a cover set outside the
// base sets is false. That one argument proves every fish here:
//
//   X-Wing (N=2), Swordfish (N=3) and Jellyfish (N=4), where the base sets
//   are rows and the covers columns, or the other way round. N=5 and above
//   are redundant on a 9x9 grid: the rows a size-five fish leaves out form
//   a size-four fish on the complementary columns, so there is nothing to
//   find that a Jellyfish does not already find.
//
//   Franken fish, where one or more of the lines is a box, and Mutant
//   fish, where the base or the cover sets mix rows and columns freely.
//
//   The finned forms, where one base line spills a candidate or two
//   outside the cover sets. Either the spilled candidates (the fin) are
//   false, and the plain fish eliminates; or one of them is true, and its
//   peers lose the digit. So only cover candidates that see EVERY fin are
//   false either way, and a single fin left out of that test is a wrong
//   hint. "Sashimi" is the same pattern with the spoiled corner empty:
//   the base line has a single candidate left inside the cover sets.
//
// Empty Rectangle is not a fish at all; it is here because it is the other
// common single-digit pattern on a hard board, and it is far easier to see
// than the tier around it. 3D Medusa is colouring, so it sits beside
// X-Cycle in chainEngine.
//
// Every detector reports nothing when the pattern degenerates into a
// smaller fish: a Jellyfish that is really an X-Wing is the X-Wing's to
// report, and the teaching ladder reaches the X-Wing first.

import {
  getRow,
  getCol,
  getBox,
  getRowIndices,
  getColIndices,
  getBoxIndices,
  arePeers,
  cellName,
} from './gridUnits';

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

const digitsToCheck = (focusedDigit) => (focusedDigit ? [focusedDigit] : DIGITS);

/** True when `digit` is still a pencil mark in cell `i`. */
const isCandidate = (grid, i, digit) =>
  grid[i].value === null && grid[i].candidates.includes(digit);

const popcount = (bits) => {
  let n = bits;
  let count = 0;
  while (n) {
    n &= n - 1;
    count++;
  }
  return count;
};

const bitsToList = (bits) => {
  const list = [];
  for (let i = 0; i < 27; i++) if (bits & (1 << i)) list.push(i);
  return list;
};

/** Every combination of `k` entries of `list`, in order. */
const combinations = (list, k) => {
  const out = [];
  const pick = [];
  const walk = (start) => {
    if (pick.length === k) {
      out.push([...pick]);
      return;
    }
    for (let i = start; i <= list.length - (k - pick.length); i++) {
      pick.push(list[i]);
      walk(i + 1);
      pick.pop();
    }
  };
  walk(0);
  return out;
};

const listNumbers = (items) => {
  const arr = items.map(String);
  if (arr.length <= 1) return arr.join('');
  if (arr.length === 2) return `${arr[0]} and ${arr[1]}`;
  return `${arr.slice(0, -1).join(', ')} and ${arr[arr.length - 1]}`;
};

const cellList = (cells) => cells.map(cellName).join(', ');

// The two ways a basic or finned fish can lie: base rows covered by
// columns, or base columns covered by rows.
const ORIENTATIONS = [
  {
    name: 'row',
    baseIndices: getRowIndices,
    baseOf: getRow,
    coverIndices: getColIndices,
    coverOf: getCol,
    baseWord: 'rows',
    coverWord: 'columns',
  },
  {
    name: 'column',
    baseIndices: getColIndices,
    baseOf: getCol,
    coverIndices: getRowIndices,
    coverOf: getRow,
    baseWord: 'columns',
    coverWord: 'rows',
  },
];

/**
 * True when some proper part of these base lines is already covered by as
 * few cover lines as it has members - that part is a smaller fish, and the
 * ladder reports it instead.
 *
 * @param {{ mask: number }[]} lines base lines, each carrying the bitmask
 *   of the cover lines its candidates fall in
 */
const containsSmallerFish = (lines) => {
  const n = lines.length;
  for (let subset = 1; subset < (1 << n) - 1; subset++) {
    let cover = 0;
    let members = 0;
    for (let i = 0; i < n; i++) {
      if (subset & (1 << i)) {
        cover |= lines[i].mask;
        members++;
      }
    }
    if (popcount(cover) <= members) return true;
  }
  return false;
};

/** The base lines of one orientation that could take part in a fish. */
const baseLinesFor = (grid, digit, o, maxPositions) => {
  const lines = [];
  for (let line = 0; line < 9; line++) {
    const positions = o.baseIndices(line).filter((i) => isCandidate(grid, i, digit));
    // One position is a Hidden Single, and none means the digit is placed.
    if (positions.length < 2 || positions.length > maxPositions) continue;
    let mask = 0;
    for (const p of positions) mask |= 1 << o.coverOf(p);
    lines.push({ line, positions, mask });
  }
  return lines;
};

// ---------------------------------------------------------------------------
// The basic fish, at any size. X-Wing (2) and Swordfish (3) have their own
// finders in logicEngine; this one is what Jellyfish (4) uses.
// ---------------------------------------------------------------------------

const SIZE_WORDS = ['', 'one', 'two', 'three', 'four'];

const findBasicFish = (grid, size, technique, focusedDigit, returnAll) => {
  const allInstances = [];

  for (const digit of digitsToCheck(focusedDigit)) {
    for (const o of ORIENTATIONS) {
      const lines = baseLinesFor(grid, digit, o, size);
      if (lines.length < size) continue;

      for (const combo of combinations(lines, size)) {
        let coverMask = 0;
        for (const line of combo) coverMask |= line.mask;
        // Exactly covered, or it is not a fish of this size.
        if (popcount(coverMask) !== size) continue;
        if (containsSmallerFish(combo)) continue;

        const covers = bitsToList(coverMask);
        const baseLines = new Set(combo.map((l) => l.line));
        const baseCells = combo.flatMap((l) => l.positions);

        const eliminations = [];
        for (const cover of covers) {
          for (const idx of o.coverIndices(cover)) {
            if (!isCandidate(grid, idx, digit)) continue;
            if (baseLines.has(o.baseOf(idx))) continue;
            eliminations.push({ cell: idx, digit });
          }
        }
        if (eliminations.length === 0) continue;

        const word = SIZE_WORDS[size] || String(size);
        const step = {
          technique,
          digit,
          orientation: o.name,
          baseCells,
          targetCells: eliminations.map((e) => e.cell),
          eliminations,
          explanation:
            `A ${technique} on digit ${digit}: ${o.baseWord} ${listNumbers(combo.map((l) => l.line + 1))} ` +
            `hold the digit only in ${o.coverWord} ${listNumbers(covers.map((c) => c + 1))}. ` +
            `Those ${word} ${o.baseWord} need ${word} copies of ${digit} and only those ${word} ${o.coverWord} ` +
            `can supply them, so every other ${digit} in ${o.coverWord} ${listNumbers(covers.map((c) => c + 1))} is eliminated.`,
        };

        if (returnAll) allInstances.push(step);
        else return step;
      }
    }
  }

  return returnAll ? allInstances : null;
};

/** Jellyfish: the basic fish at size four. */
export const findJellyfish = (grid, focusedDigit = null, returnAll = false) =>
  findBasicFish(grid, 4, 'Jellyfish', focusedDigit, returnAll);

// ---------------------------------------------------------------------------
// The finned fish at sizes three and four, and the sashimi form at every
// size from two to four. The occupied-corner size-two case is Finned
// X-Wing, in chainEngine, which has shipped for longer; the sashimi form
// of every size is one rung here, because the shape a player looks for -
// a corner with nothing in it - is the same whatever the size.
// ---------------------------------------------------------------------------

// A fin of more than three cells is not something anyone would call a fin,
// and the eliminations it allows (cells that see every one of them) are
// almost always none.
const MAX_FINS = 3;

/**
 * @param {any[]} grid
 * @param {{ sizes: number[], name: (size: number) => string|null, sashimi: boolean }} shape
 *   name     the technique name for a fish of that size, or null to skip
 *   sashimi  true to report the empty-corner form, false the occupied one
 */
const findFinnedFish = (grid, shape, focusedDigit, returnAll) => {
  const allInstances = [];

  for (const digit of digitsToCheck(focusedDigit)) {
    for (const size of shape.sizes) {
      const technique = shape.name(size);
      if (!technique) continue;

      for (const o of ORIENTATIONS) {
        // A base line may spill the digit outside the cover lines; it may
        // not spill more than a fin's worth.
        const lines = baseLinesFor(grid, digit, o, size + MAX_FINS);
        if (lines.length < size) continue;

        for (const combo of combinations(lines, size)) {
          let touched = 0;
          for (const line of combo) touched |= line.mask;
          const touchedCount = popcount(touched);
          // Exactly covered means a plain fish, which is not this step's
          // to report; too many lines touched means no fin, just a mess.
          if (touchedCount <= size || touchedCount > size + MAX_FINS) continue;
          // Any part of this that is already a plain fish belongs to the
          // smaller rung, so the bigger finned pattern is not reported.
          if (containsSmallerFish(combo)) continue;

          const baseLines = new Set(combo.map((l) => l.line));

          for (const covers of combinations(bitsToList(touched), size)) {
            let coverMask = 0;
            for (const c of covers) coverMask |= 1 << c;

            const fins = [];
            let coreCells = [];
            let shortestCore = Infinity;
            let emptyCore = false;
            for (const line of combo) {
              const core = line.positions.filter((p) => coverMask & (1 << o.coverOf(p)));
              const spill = line.positions.filter((p) => !(coverMask & (1 << o.coverOf(p))));
              if (core.length === 0) {
                // A base line entirely outside the covers is not a fin, it
                // is a different fish.
                emptyCore = true;
                break;
              }
              coreCells = coreCells.concat(core);
              fins.push(...spill);
              shortestCore = Math.min(shortestCore, core.length);
            }
            if (emptyCore) continue;
            if (fins.length === 0 || fins.length > MAX_FINS) continue;

            // Sashimi is the case where one base line keeps a single
            // candidate inside the covers: the corner of the pattern is
            // empty rather than occupied.
            const isSashimi = shortestCore === 1;
            if (isSashimi !== shape.sashimi) continue;

            // A cover line with no candidate of the pattern in it is a
            // free line: the rest is a smaller fish.
            const coreCovers = new Set(coreCells.map((c) => o.coverOf(c)));
            if (covers.some((c) => !coreCovers.has(c))) continue;

            const eliminations = [];
            for (const cover of covers) {
              for (const idx of o.coverIndices(cover)) {
                if (!isCandidate(grid, idx, digit)) continue;
                if (baseLines.has(o.baseOf(idx))) continue;
                // Ruled out whether the fin is true or false: this is the
                // whole of the finned fish's claim.
                if (!fins.every((fin) => arePeers(idx, fin))) continue;
                eliminations.push({ cell: idx, digit });
              }
            }
            if (eliminations.length === 0) continue;

            const baseCells = [...coreCells, ...fins];
            const finWord = fins.length === 1 ? 'fin' : 'fins';
            const step = {
              technique,
              digit,
              orientation: o.name,
              fishSize: size,
              sashimi: isSashimi,
              baseCells,
              targetCells: eliminations.map((e) => e.cell),
              finCells: fins,
              eliminations,
              explanation:
                `${technique} on digit ${digit}: ${o.baseWord} ${listNumbers(combo.map((l) => l.line + 1))} ` +
                `against ${o.coverWord} ${listNumbers(covers.map((c) => c + 1))}, with ${finWord} at ${cellList(fins)}` +
                `${isSashimi ? ' and the corner of the pattern empty' : ''}. ` +
                `If the ${finWord} ${fins.length === 1 ? 'is' : 'are'} false the pattern is a plain fish and eliminates in the cover ${o.coverWord}; ` +
                `if one of them is true, its peers lose the digit. Only ${digit} candidates in the cover ${o.coverWord} ` +
                `that see every fin are eliminated, because only they are false in both cases.`,
            };

            if (returnAll) allInstances.push(step);
            else return step;
          }
        }
      }
    }
  }

  return returnAll ? allInstances : null;
};

const FINNED_NAMES = { 3: 'Finned Swordfish', 4: 'Finned Jellyfish' };

/** Finned Swordfish: a Swordfish with a fin in one of its base lines. */
export const findFinnedSwordfish = (grid, focusedDigit = null, returnAll = false) =>
  findFinnedFish(grid, { sizes: [3], name: () => FINNED_NAMES[3], sashimi: false }, focusedDigit, returnAll);

/** Finned Jellyfish: the same at size four. */
export const findFinnedJellyfish = (grid, focusedDigit = null, returnAll = false) =>
  findFinnedFish(grid, { sizes: [4], name: () => FINNED_NAMES[4], sashimi: false }, focusedDigit, returnAll);

/**
 * Sashimi Fish: a finned fish whose spoiled corner is empty, at any size
 * from two to four. One name, because the shape the player looks for is
 * the same every time and the step says which lines it sits on.
 */
export const findSashimiFish = (grid, focusedDigit = null, returnAll = false) =>
  findFinnedFish(
    grid,
    { sizes: [2, 3, 4], name: () => 'Sashimi Fish', sashimi: true },
    focusedDigit,
    returnAll
  );

// ---------------------------------------------------------------------------
// Franken and Mutant fish: the same proof, with boxes among the lines.
//
// Base and cover sets are drawn from all 27 units. A Franken fish keeps
// the basic fish's shape - the base lines are all rows or all columns, the
// cover lines the other kind - and adds boxes. A Mutant fish gives that up
// and mixes rows and columns freely on either side. Nobody is expected to
// spot either by eye; the mentor finds them and explains them.
// ---------------------------------------------------------------------------

/** The 27 units as { kind, index, name, cells }, rows then columns then boxes. */
const ALL_UNIT_SHAPES = [
  ...Array.from({ length: 9 }, (_, i) => ({ kind: 'row', index: i, name: `row ${i + 1}`, cells: getRowIndices(i) })),
  ...Array.from({ length: 9 }, (_, i) => ({ kind: 'column', index: i, name: `column ${i + 1}`, cells: getColIndices(i) })),
  ...Array.from({ length: 9 }, (_, i) => ({ kind: 'box', index: i, name: `box ${i + 1}`, cells: getBoxIndices(i) })),
];

/** The three units a cell belongs to, as indices into ALL_UNIT_SHAPES. */
const UNITS_OF_CELL = Array.from({ length: 81 }, (_, i) => [
  getRow(i),
  9 + getCol(i),
  18 + getBox(i),
]);

/** A set of cells as three 27-bit words, so overlap is three AND tests. */
const cellBits = (cells) => {
  const bits = [0, 0, 0];
  for (const c of cells) bits[Math.floor(c / 27)] |= 1 << c % 27;
  return bits;
};

const bitsOverlap = (a, b) => (a[0] & b[0]) !== 0 || (a[1] & b[1]) !== 0 || (a[2] & b[2]) !== 0;

/**
 * The fewest units outside `exclude` needed to cover `cells`, capped at
 * `limit`; Infinity when `limit` units are not enough. Each cell lies in
 * exactly three units, so this is a depth-`limit` search over at most
 * three branches. `exclude` holds the base sets: a base set covers its own
 * cells, which would make every pattern look degenerate.
 */
const minCoverCount = (cells, limit, exclude) => {
  const search = (left, depth) => {
    if (left.length === 0) return depth;
    if (depth >= limit) return Infinity;
    let best = Infinity;
    for (const unitIdx of UNITS_OF_CELL[left[0]]) {
      if (exclude.has(unitIdx)) continue;
      const unit = ALL_UNIT_SHAPES[unitIdx];
      const next = left.filter((c) => !unit.cells.includes(c));
      best = Math.min(best, search(next, depth + 1));
      if (best <= depth + 1) break;
    }
    return best;
  };
  return search([...cells], 0);
};

/** Franken, Mutant, or null when the shape is a basic row/column fish. */
const classifyFish = (baseUnits, coverUnits) => {
  const baseKinds = new Set(baseUnits.map((u) => u.kind));
  const coverKinds = new Set(coverUnits.map((u) => u.kind));
  const usesBox = baseKinds.has('box') || coverKinds.has('box');
  const baseLines = [...baseKinds].filter((k) => k !== 'box');
  const coverLines = [...coverKinds].filter((k) => k !== 'box');
  // Rows against columns with no box anywhere is X-Wing / Swordfish /
  // Jellyfish, which the ladder reaches first.
  if (!usesBox) {
    return baseLines.length === 1 && coverLines.length === 1 && baseLines[0] !== coverLines[0]
      ? null
      : 'Mutant Fish';
  }
  // Franken keeps the basic shape and adds boxes: one kind of line in the
  // base, the other kind in the cover.
  const franken =
    baseLines.length <= 1 &&
    coverLines.length <= 1 &&
    (baseLines.length === 0 || coverLines.length === 0 || baseLines[0] !== coverLines[0]);
  return franken ? 'Franken Fish' : 'Mutant Fish';
};

/**
 * Franken and Mutant fish of sizes two to four, in one sweep.
 *
 * @param {any[]} grid
 * @param {'Franken Fish'|'Mutant Fish'} wanted which family to report
 */
const findUnitFish = (grid, wanted, focusedDigit, returnAll) => {
  const allInstances = [];

  for (const digit of digitsToCheck(focusedDigit)) {
    // Units that could be a base set: the digit is not placed there and
    // has more than one home left (one home is a Hidden Single).
    const candidateUnits = [];
    for (let u = 0; u < ALL_UNIT_SHAPES.length; u++) {
      const unit = ALL_UNIT_SHAPES[u];
      const cells = unit.cells.filter((i) => isCandidate(grid, i, digit));
      if (cells.length < 2) continue;
      candidateUnits.push({ ...unit, unitIndex: u, cells, bits: cellBits(cells) });
    }

    for (let size = 2; size <= 4; size++) {
      // Base sets must be pairwise disjoint: that is what makes them hold
      // `size` distinct copies of the digit.
      const combo = [];
      const walk = (start) => {
        if (combo.length === size) {
          const steps = unitFishSteps(grid, digit, combo, wanted);
          if (steps.length === 0) return null;
          if (!returnAll) return steps[0];
          allInstances.push(...steps);
          return null;
        }
        for (let i = start; i <= candidateUnits.length - (size - combo.length); i++) {
          const unit = candidateUnits[i];
          if (combo.some((u) => bitsOverlap(u.bits, unit.bits))) continue;
          combo.push(unit);
          const found = walk(i + 1);
          combo.pop();
          if (found) return found;
        }
        return null;
      };
      const found = walk(0);
      if (found && !returnAll) return found;
    }
  }

  return returnAll ? allInstances : null;
};

/**
 * Every way to cover `cells` with exactly `size` units that are not base
 * sets themselves. A cover is always picked for the first cell still
 * uncovered, so no cover is a free line, and a cell lies in three units,
 * so the search is small.
 */
const coverSelections = (cells, size, exclude) => {
  const selections = [];
  const seen = new Set();
  const chosen = [];
  const walk = (left) => {
    if (left.length === 0) {
      if (chosen.length !== size) return;
      const key = [...chosen].sort((a, b) => a - b).join(',');
      if (seen.has(key)) return;
      seen.add(key);
      selections.push([...chosen]);
      return;
    }
    if (chosen.length === size) return;
    for (const unitIdx of UNITS_OF_CELL[left[0]]) {
      if (chosen.includes(unitIdx) || exclude.has(unitIdx)) continue;
      const unit = ALL_UNIT_SHAPES[unitIdx];
      chosen.push(unitIdx);
      walk(left.filter((c) => !unit.cells.includes(c)));
      chosen.pop();
    }
  };
  walk(cells);
  return selections;
};

/**
 * True when some proper part of these base sets is already covered by as
 * few units as it has members: that part is a smaller fish the ladder
 * reaches first, and locked candidates (one box covered by one line) are
 * the size-one case of exactly that.
 */
const containsSmallerUnitFish = (baseUnits, exclude) => {
  const size = baseUnits.length;
  for (let subset = 1; subset < (1 << size) - 1; subset++) {
    const part = [];
    let members = 0;
    for (let i = 0; i < size; i++) {
      if (subset & (1 << i)) {
        part.push(...baseUnits[i].cells);
        members++;
      }
    }
    if (minCoverCount(part, members + 1, exclude) <= members) return true;
  }
  return false;
};

/** Every step one set of base units yields, for the family asked for. */
const unitFishSteps = (grid, digit, baseUnits, wanted) => {
  const size = baseUnits.length;
  const baseCells = baseUnits.flatMap((u) => u.cells);

  // Base and cover sets are different units: a unit that covered its own
  // cells would make the pattern trivial on that line.
  const baseIndices = new Set(baseUnits.map((u) => u.unitIndex));

  const matching = coverSelections(baseCells, size, baseIndices)
    .map((selection) => selection.map((i) => ALL_UNIT_SHAPES[i]))
    .filter((coverUnits) => classifyFish(baseUnits, coverUnits) === wanted);
  if (matching.length === 0) return [];
  if (containsSmallerUnitFish(baseUnits, baseIndices)) return [];

  const baseSet = new Set(baseCells);
  const word = SIZE_WORDS[size] || String(size);
  const steps = [];

  for (const coverUnits of matching) {
    const eliminations = [];
    const seen = new Set();
    for (const unit of coverUnits) {
      for (const idx of unit.cells) {
        if (baseSet.has(idx) || seen.has(idx)) continue;
        if (!isCandidate(grid, idx, digit)) continue;
        seen.add(idx);
        eliminations.push({ cell: idx, digit });
      }
    }
    if (eliminations.length === 0) continue;

    steps.push({
      technique: wanted,
      digit,
      fishSize: size,
      baseCells,
      targetCells: eliminations.map((e) => e.cell),
      baseUnits: baseUnits.map((u) => ({ type: u.kind, index: u.index, name: u.name })),
      coverUnits: coverUnits.map((u) => ({ type: u.kind, index: u.index, name: u.name })),
      eliminations,
      explanation:
        `${wanted} of size ${word} on digit ${digit}. Base sets: ${baseUnits.map((u) => u.name).join(', ')}; ` +
        `cover sets: ${coverUnits.map((u) => u.name).join(', ')}. The base sets share no candidate cell, so they hold ` +
        `${word} different copies of ${digit}, and every one of those copies lies in a cover set. ${word.charAt(0).toUpperCase()}${word.slice(1)} ` +
        `cover sets can hold ${word} copies between them, so each cover set's ${digit} is one of the base candidates, ` +
        `and every other ${digit} in a cover set is eliminated.`,
    });
  }

  return steps;
};

/** Franken Fish: a fish with a box among its lines. */
export const findFrankenFish = (grid, focusedDigit = null, returnAll = false) =>
  findUnitFish(grid, 'Franken Fish', focusedDigit, returnAll);

/** Mutant Fish: a fish whose lines mix rows, columns and boxes freely. */
export const findMutantFish = (grid, focusedDigit = null, returnAll = false) =>
  findUnitFish(grid, 'Mutant Fish', focusedDigit, returnAll);

// ---------------------------------------------------------------------------
// Empty Rectangle.
//
// In one box, every candidate of a digit lies on one row and one column of
// that box, crossing at a cell that may itself be empty of the digit - the
// four cells off those two lines are the "empty rectangle". So the box's
// copy of the digit is on the crossing row or on the crossing column.
//
// Pair that with a conjugate pair on the same digit: say the digit has
// exactly two homes in row r1 (outside the box), at the crossing column
// and at some other column c1. If R(r)C(c1) held the digit, the crossing
// row would be used up outside the box, so the box's digit would be on the
// crossing column, which would empty the crossing column elsewhere - and
// the conjugate pair would then force the digit at R(r1)C(c1), two copies
// in column c1. So R(r)C(c1) cannot be the digit. The mirror of that
// argument runs down the columns.
// ---------------------------------------------------------------------------

export const findEmptyRectangle = (grid, focusedDigit = null, returnAll = false) => {
  const allInstances = [];

  for (const digit of digitsToCheck(focusedDigit)) {
    for (let box = 0; box < 9; box++) {
      const boxCells = getBoxIndices(box).filter((i) => isCandidate(grid, i, digit));
      // Two cells on one line is a Pointing Pair, not an empty rectangle;
      // the pattern needs a candidate off the crossing row and off the
      // crossing column, which takes at least three cells in two rows and
      // two columns.
      if (boxCells.length < 3) continue;
      const boxRows = [...new Set(boxCells.map(getRow))];
      const boxCols = [...new Set(boxCells.map(getCol))];
      if (boxRows.length < 2 || boxCols.length < 2) continue;

      for (const row of boxRows) {
        for (const col of boxCols) {
          // Every candidate in the box on the crossing lines, with one off
          // each of them, so neither line alone holds the pattern.
          if (!boxCells.every((c) => getRow(c) === row || getCol(c) === col)) continue;
          if (!boxCells.some((c) => getRow(c) === row && getCol(c) !== col)) continue;
          if (!boxCells.some((c) => getCol(c) === col && getRow(c) !== row)) continue;

          const rowsOfBox = new Set(getBoxIndices(box).map(getRow));
          const colsOfBox = new Set(getBoxIndices(box).map(getCol));

          const found = [];

          // A conjugate pair along a row outside the box, one end in the
          // crossing column: the other end's column loses the digit where
          // it meets the crossing row.
          for (let line = 0; line < 9; line++) {
            if (rowsOfBox.has(line)) continue;
            const spots = getRowIndices(line).filter((i) => isCandidate(grid, i, digit));
            if (spots.length !== 2) continue;
            const inColumn = spots.find((i) => getCol(i) === col);
            const other = spots.find((i) => getCol(i) !== col);
            if (inColumn === undefined || other === undefined) continue;
            if (colsOfBox.has(getCol(other))) continue;
            const target = row * 9 + getCol(other);
            if (!isCandidate(grid, target, digit)) continue;
            found.push({ link: [inColumn, other], target, along: 'row', line });
          }

          // And the mirror: a conjugate pair down a column outside the box
          // with one end on the crossing row.
          for (let line = 0; line < 9; line++) {
            if (colsOfBox.has(line)) continue;
            const spots = getColIndices(line).filter((i) => isCandidate(grid, i, digit));
            if (spots.length !== 2) continue;
            const inRow = spots.find((i) => getRow(i) === row);
            const other = spots.find((i) => getRow(i) !== row);
            if (inRow === undefined || other === undefined) continue;
            if (rowsOfBox.has(getRow(other))) continue;
            const target = getRow(other) * 9 + col;
            if (!isCandidate(grid, target, digit)) continue;
            found.push({ link: [inRow, other], target, along: 'column', line });
          }

          for (const hit of found) {
            const step = {
              technique: 'Empty Rectangle',
              digit,
              baseCells: [...boxCells, ...hit.link],
              targetCells: [hit.target],
              unit: { type: 'box', index: box, name: `box ${box + 1}` },
              crossing: { row, col, cell: row * 9 + col },
              linkUnit: { type: hit.along, index: hit.line, name: `${hit.along} ${hit.line + 1}` },
              strongLinks: [
                { from: { cell: hit.link[0], digit }, to: { cell: hit.link[1], digit } },
              ],
              eliminations: [{ cell: hit.target, digit }],
              explanation:
                `Empty Rectangle on digit ${digit} in box ${box + 1}: every ${digit} there lies on row ${row + 1} ` +
                `or column ${col + 1}, so the box takes its ${digit} from one of those two lines. ` +
                `${digit} has only two homes in ${hit.along} ${hit.line + 1} (${cellList(hit.link)}), ` +
                `which forms a strong link. If ${cellName(hit.target)} were ${digit}, that would use up ` +
                `${hit.along === 'row' ? `row ${row + 1}` : `column ${col + 1}`} outside the box, forcing the box's ${digit} onto ` +
                `${hit.along === 'row' ? `column ${col + 1}` : `row ${row + 1}`} and the strong link onto ${cellName(hit.link[1])}, ` +
                `which clashes. So ${digit} is eliminated from ${cellName(hit.target)}.`,
            };

            if (returnAll) allInstances.push(step);
            else return step;
          }
        }
      }
    }
  }

  return returnAll ? allInstances : null;
};
