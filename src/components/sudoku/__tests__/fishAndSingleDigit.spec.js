// The fish-and-single-digit batch: Jellyfish, Empty Rectangle, Finned
// Swordfish, Finned Jellyfish, Sashimi Fish, Franken Fish, Mutant Fish and
// 3D Medusa.
//
// Each technique is pinned on a hand-built board: the exact eliminations
// and the exact cells the hint card will highlight. oracleAll.spec.js
// checks every one of them against the true solution on every intermediate
// grid of every library puzzle; these tests cover the shapes the library
// happens not to show, the three detection notes the spec calls out, the
// teaching ladder, the teaching content, and what the detectors cost.
//
// The three notes, each a known source of wrong hints:
//   a fish is only a fish when the cover lines are exactly covered, and a
//   pattern that degenerates into a smaller fish is that smaller fish;
//   a finned fish eliminates only in cells that see every fin;
//   3D Medusa has two conclusions and both have to be implemented.
import { describe, it, expect } from 'vitest';
import {
  findAllTechniqueInstances,
  findNextLogicStep,
  generateCandidates,
  applyLogicStep,
  eliminateCandidatesFromPeers,
} from '../logicEngine';
import { buildHighlightSets } from '../stepHighlights';
import { explainStep } from '../explainStep';
import {
  TECHNIQUE_INFO,
  TECHNIQUE_TIERS,
  TECHNIQUE_DETAILS,
  LIVE_COUNT_TECHNIQUES,
  teachingRank,
} from '../techniqueCatalog';
import { PUZZLES } from '../puzzles';
import { cellName } from '../gridUnits';

const NEW_TECHNIQUES = [
  'Jellyfish',
  'Empty Rectangle',
  '3D Medusa',
  'Finned Swordfish',
  'Finned Jellyfish',
  'Sashimi Fish',
  'Franken Fish',
  'Mutant Fish',
];

const ALL_DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

/** R,C in the 1-based names the product uses, as a 0..80 index. */
const at = (row, col) => (row - 1) * 9 + (col - 1);

const emptyCell = (i) => ({
  cellIndex: i,
  value: null,
  isFixed: false,
  candidates: [...ALL_DIGITS],
  isHighlighted: false,
  highlightColor: null,
  isBaseCell: false,
  isTargetCell: false,
});

/**
 * A board where `digit` is a pencil mark in exactly the cells listed, and
 * every other cell carries the other eight. Nothing but the pattern under
 * test can be found for that digit, and no other digit is confined
 * anywhere, so a single-digit pattern can be pinned exactly.
 */
const digitGrid = (digit, cells) => {
  const wanted = new Set(cells);
  return Array.from({ length: 81 }, (_, i) => ({
    ...emptyCell(i),
    candidates: wanted.has(i) ? [...ALL_DIGITS] : ALL_DIGITS.filter((d) => d !== digit),
  }));
};

/**
 * A board of cells carrying all nine marks, with `marks` setting the cells
 * that matter and `without` taking one digit off a list of cells (which is
 * how a strong link is made: a digit left with exactly two homes in a unit).
 */
const gridWith = (marks = {}, without = []) => {
  const grid = Array.from({ length: 81 }, (_, i) => emptyCell(i));
  for (const [digit, cells] of without) {
    for (const cell of cells) {
      grid[cell] = { ...grid[cell], candidates: grid[cell].candidates.filter((d) => d !== digit) };
    }
  }
  for (const [cell, candidates] of Object.entries(marks)) {
    grid[Number(cell)] = { ...grid[Number(cell)], candidates: [...candidates] };
  }
  return grid;
};

/** Every cell of a row, column or box except the ones listed. */
const rowExcept = (row, keep) =>
  ALL_DIGITS.map((_, c) => at(row, c + 1)).filter((i) => !keep.includes(i));
const colExcept = (col, keep) =>
  ALL_DIGITS.map((_, r) => at(r + 1, col)).filter((i) => !keep.includes(i));

/** Eliminations as a sorted, readable list: "R1C1:7". */
const elims = (step) =>
  step.eliminations.map((e) => `${cellName(e.cell)}:${e.digit}`).sort();

const highlights = (step) => {
  const { baseCells, targetCells } = buildHighlightSets([step]);
  return {
    base: [...baseCells].sort((a, b) => a - b),
    targets: [...targetCells].sort((a, b) => a - b),
  };
};

const names = (cells) => [...cells].sort((a, b) => a - b).map(cellName);

const buildGrid = (puzzle) =>
  generateCandidates(
    puzzle.map((value, index) => ({ ...emptyCell(index), value: value || null, isFixed: value !== 0, candidates: [] }))
  );

// ---------------------------------------------------------------------------
// The basic fish at size four
// ---------------------------------------------------------------------------

describe('Jellyfish', () => {
  // Rows 1, 3, 6 and 8 hold the 7s only in columns 2, 4, 5 and 9, and no
  // two of those rows fit into fewer columns than they have, so the
  // pattern is a Jellyfish and not a smaller fish wearing one.
  const grid = digitGrid(7, [
    at(1, 2), at(1, 4),
    at(3, 4), at(3, 5),
    at(6, 5), at(6, 9),
    at(8, 9), at(8, 2),
    at(2, 5), at(5, 4), // the two 7s the pattern rules out
  ]);

  it('erases the digit from the four cover columns outside the pattern', () => {
    const found = findAllTechniqueInstances(grid, 'Jellyfish');
    expect(found).toHaveLength(1);
    const [step] = found;
    expect(step.digit).toBe(7);
    expect(step.orientation).toBe('row');
    expect(elims(step)).toEqual(['R2C5:7', 'R5C4:7']);
  });

  it('highlights the eight pattern cells and the two losing cells', () => {
    const [step] = findAllTechniqueInstances(grid, 'Jellyfish');
    expect(highlights(step)).toEqual({
      base: [at(1, 2), at(1, 4), at(3, 4), at(3, 5), at(6, 5), at(6, 9), at(8, 2), at(8, 9)].sort((a, b) => a - b),
      targets: [at(2, 5), at(5, 4)].sort((a, b) => a - b),
    });
  });

  it('works the other way round, with columns as the base lines', () => {
    const transposed = digitGrid(7, [
      at(2, 1), at(4, 1),
      at(4, 3), at(5, 3),
      at(5, 6), at(9, 6),
      at(9, 8), at(2, 8),
      at(5, 2), at(4, 5),
    ]);
    const found = findAllTechniqueInstances(transposed, 'Jellyfish');
    expect(found).toHaveLength(1);
    expect(found[0].orientation).toBe('column');
    expect(elims(found[0])).toEqual(['R4C5:7', 'R5C2:7']);
  });

  it('is not reported when it is really an X-Wing', () => {
    // Four rows that fit four columns, but rows 1 and 3 already fit two of
    // them: the position is two X-Wings, and the ladder says X-Wing.
    const degenerate = digitGrid(7, [
      at(1, 2), at(1, 4),
      at(3, 2), at(3, 4),
      at(6, 5), at(6, 9),
      at(8, 5), at(8, 9),
      at(5, 4), at(5, 9),
    ]);
    expect(findAllTechniqueInstances(degenerate, 'Jellyfish')).toEqual([]);
    const xWings = findAllTechniqueInstances(degenerate, 'X-Wing');
    expect(xWings.length).toBeGreaterThan(0);
    // The smaller fish is the one that explains the position, and it is
    // the earlier rung, so it is the one the hint reaches for.
    expect(teachingRank('X-Wing')).toBeLessThan(teachingRank('Jellyfish'));
    expect(elims(xWings[0])).toContain('R5C4:7');
  });

  it('is not reported when there is nothing to erase', () => {
    const nothingToErase = digitGrid(7, [
      at(1, 2), at(1, 4),
      at(3, 4), at(3, 5),
      at(6, 5), at(6, 9),
      at(8, 9), at(8, 2),
    ]);
    expect(findAllTechniqueInstances(nothingToErase, 'Jellyfish')).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Empty Rectangle
// ---------------------------------------------------------------------------

describe('Empty Rectangle', () => {
  // Box 5's 4s lie on row 4 and column 4, crossing at R4C4. Row 8 has only
  // two 4s, one of them in column 4. So R4C9 cannot be 4. R1C9 keeps the
  // 4s in column 9 above two, so the mirror of the rule does not also fire
  // and the instance under test is the only one.
  const grid = digitGrid(4, [
    at(4, 4), at(4, 6), at(6, 4), // the box
    at(8, 4), at(8, 9),           // the two-place row
    at(4, 9),                     // the cell it rules out
    at(1, 9),
  ]);

  it('eliminates at the far end of the strong link', () => {
    const found = findAllTechniqueInstances(grid, 'Empty Rectangle');
    expect(found).toHaveLength(1);
    const [step] = found;
    expect(step.digit).toBe(4);
    expect(step.unit).toEqual({ type: 'box', index: 4, name: 'box 5' });
    expect(step.crossing).toEqual({ row: 3, col: 3, cell: at(4, 4) });
    expect(elims(step)).toEqual(['R4C9:4']);
  });

  it('highlights the box pattern and the strong link, and the cell it kills', () => {
    const [step] = findAllTechniqueInstances(grid, 'Empty Rectangle');
    expect(highlights(step)).toEqual({
      base: [at(4, 4), at(4, 6), at(6, 4), at(8, 4), at(8, 9)].sort((a, b) => a - b),
      targets: [at(4, 9)],
    });
  });

  it('needs a candidate off the crossing row and off the crossing column', () => {
    // Everything in the box on one line is a Pointing Pair, which the
    // ladder explains four rungs earlier; it is not an empty rectangle.
    const oneLine = digitGrid(4, [at(4, 4), at(4, 6), at(8, 4), at(8, 9), at(4, 9)]);
    expect(findAllTechniqueInstances(oneLine, 'Empty Rectangle')).toEqual([]);
    expect(findAllTechniqueInstances(oneLine, 'Pointing Pair').length).toBeGreaterThan(0);
  });

  it('needs the strong link to leave the box behind', () => {
    // The two-place line runs through the box's own rows, so the argument
    // never gets outside the box and there is nothing to conclude.
    const insideTheBox = digitGrid(4, [at(4, 4), at(4, 6), at(6, 4), at(5, 4), at(5, 9), at(4, 9)]);
    expect(findAllTechniqueInstances(insideTheBox, 'Empty Rectangle')).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// The finned fish, and the fin rule
// ---------------------------------------------------------------------------

describe('Finned Swordfish', () => {
  // Rows 2, 5 and 7 nearly hold the 3s in columns 1, 4 and 8; R2C3 is the
  // fin. R3C1 sees the fin (same box) and is erased; R1C4 lies in a cover
  // column but sees no fin, so it survives.
  const grid = digitGrid(3, [
    at(2, 1), at(2, 4), at(2, 3),
    at(5, 4), at(5, 8),
    at(7, 1), at(7, 8),
    at(3, 1), at(1, 4),
  ]);

  it('erases only in the cells that see the fin', () => {
    const found = findAllTechniqueInstances(grid, 'Finned Swordfish').filter((s) => s.orientation === 'row');
    expect(found).toHaveLength(1);
    const [step] = found;
    expect(step.digit).toBe(3);
    expect(names(step.finCells)).toEqual(['R2C3']);
    expect(elims(step)).toEqual(['R3C1:3']);
    // The fin rule, stated the other way round: a cover-column candidate
    // that sees no fin is not touched.
    expect(step.eliminations.map((e) => e.cell)).not.toContain(at(1, 4));
  });

  it('highlights the pattern with its fin, and the cell it kills', () => {
    const [step] = findAllTechniqueInstances(grid, 'Finned Swordfish').filter((s) => s.orientation === 'row');
    expect(highlights(step)).toEqual({
      base: [at(2, 1), at(2, 3), at(2, 4), at(5, 4), at(5, 8), at(7, 1), at(7, 8)].sort((a, b) => a - b),
      targets: [at(3, 1)],
    });
  });

  it('erases nothing when one of two fins is unseen', () => {
    // Two fins in different boxes: only a cell seeing both would be
    // eliminated, and there is none, so the step is not reported at all.
    const twoFins = digitGrid(3, [
      at(2, 1), at(2, 4), at(2, 3), at(2, 6),
      at(5, 4), at(5, 8),
      at(7, 1), at(7, 8),
      at(3, 1), at(1, 4),
    ]);
    const rowBased = findAllTechniqueInstances(twoFins, 'Finned Swordfish').filter((s) => s.orientation === 'row');
    for (const step of rowBased) {
      for (const e of step.eliminations) {
        for (const fin of step.finCells) {
          const sees =
            Math.floor(e.cell / 9) === Math.floor(fin / 9) ||
            e.cell % 9 === fin % 9 ||
            (Math.floor(Math.floor(e.cell / 9) / 3) * 3 + Math.floor((e.cell % 9) / 3)) ===
              (Math.floor(Math.floor(fin / 9) / 3) * 3 + Math.floor((fin % 9) / 3));
          expect(sees, `${cellName(e.cell)} must see the fin ${cellName(fin)}`).toBe(true);
        }
      }
    }
    expect(rowBased.every((s) => s.eliminations.length > 0)).toBe(true);
  });
});

describe('Finned Jellyfish', () => {
  // Rows 1, 4, 5 and 9 nearly hold the 6s in columns 2, 3, 7 and 8, with
  // the fin at R1C1. R2C2 sees it; R6C7 is in a cover column and does not.
  const grid = digitGrid(6, [
    at(1, 2), at(1, 3), at(1, 1),
    at(4, 3), at(4, 7),
    at(5, 7), at(5, 8),
    at(9, 8), at(9, 2),
    at(2, 2), at(6, 7),
  ]);

  it('erases only in the cells that see the fin', () => {
    const found = findAllTechniqueInstances(grid, 'Finned Jellyfish').filter((s) => s.orientation === 'row');
    expect(found.length).toBeGreaterThan(0);
    const step = found[0];
    expect(names(step.finCells)).toEqual(['R1C1']);
    expect(elims(step)).toEqual(['R2C2:6']);
  });
});

describe('Sashimi Fish', () => {
  // The X-Wing shape on 5 in rows 3 and 7 against columns 2 and 6, except
  // that R3C2 - the corner - holds no 5 at all, and row 3 has a stray 5 at
  // R3C1 instead. Same proof, different shape to spot.
  const grid = digitGrid(5, [
    at(3, 6), at(3, 1),
    at(7, 2), at(7, 6),
    at(1, 2),
  ]);

  it('reports the empty-corner form, with the stray spot as the fin', () => {
    const found = findAllTechniqueInstances(grid, 'Sashimi Fish').filter((s) => s.orientation === 'row');
    expect(found).toHaveLength(1);
    const [step] = found;
    expect(step.sashimi).toBe(true);
    expect(step.fishSize).toBe(2);
    expect(names(step.finCells)).toEqual(['R3C1']);
    expect(elims(step)).toEqual(['R1C2:5']);
  });

  it('is not reported as a Finned X-Wing, so one pattern never has two names', () => {
    expect(findAllTechniqueInstances(grid, 'Finned X-Wing')).toEqual([]);
  });

  it('leaves the occupied-corner form to the finned rungs', () => {
    // The same shape with the corner filled in is a Finned X-Wing.
    const occupied = digitGrid(5, [
      at(3, 2), at(3, 6), at(3, 1),
      at(7, 2), at(7, 6),
      at(1, 2),
    ]);
    expect(findAllTechniqueInstances(occupied, 'Finned X-Wing').length).toBeGreaterThan(0);
    expect(findAllTechniqueInstances(occupied, 'Sashimi Fish').filter((s) => s.orientation === 'row')).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// The fish with boxes among their lines
// ---------------------------------------------------------------------------

describe('Franken Fish', () => {
  // Boxes 1 and 4 each hold a 9, in four cells spread over columns 1 and
  // 2. Two boxes, two columns: the columns are used up, so every other 9
  // in them is out. Neither box fits into one line, so the position is not
  // locked candidates wearing a fish's name.
  const grid = digitGrid(9, [
    at(1, 1), at(2, 2),
    at(4, 2), at(5, 1),
    at(7, 1), at(8, 2),
  ]);

  it('names its base and cover groups, and erases inside the covers', () => {
    const found = findAllTechniqueInstances(grid, 'Franken Fish');
    expect(found.length).toBeGreaterThan(0);
    const step = found[0];
    expect(step.digit).toBe(9);
    expect(step.baseUnits.map((u) => u.name)).toEqual(['box 1', 'box 4']);
    expect(step.coverUnits.map((u) => u.name)).toEqual(['column 1', 'column 2']);
    expect(elims(step)).toEqual(['R7C1:9', 'R8C2:9']);
    expect(highlights(step)).toEqual({
      base: [at(1, 1), at(2, 2), at(4, 2), at(5, 1)],
      targets: [at(7, 1), at(8, 2)],
    });
  });

  it('is not reported when a base group is really locked candidates', () => {
    // Box 1's 9s all sit in column 1: that is a Pointing Pair, five rungs
    // earlier on the ladder.
    const locked = digitGrid(9, [at(1, 1), at(2, 1), at(4, 2), at(5, 2), at(7, 1)]);
    expect(findAllTechniqueInstances(locked, 'Franken Fish')).toEqual([]);
    expect(findAllTechniqueInstances(locked, 'Mutant Fish')).toEqual([]);
    expect(findAllTechniqueInstances(locked, 'Pointing Pair').length).toBeGreaterThan(0);
  });

  it('is not reported for a plain row-against-column fish', () => {
    // A straight X-Wing is the X-Wing rung's, not a Franken fish.
    const plain = digitGrid(9, [at(1, 1), at(1, 5), at(6, 1), at(6, 5), at(3, 5)]);
    expect(findAllTechniqueInstances(plain, 'Franken Fish')).toEqual([]);
    expect(findAllTechniqueInstances(plain, 'Mutant Fish')).toEqual([]);
    expect(findAllTechniqueInstances(plain, 'X-Wing').length).toBeGreaterThan(0);
  });
});

describe('Mutant Fish', () => {
  // The layout of the 1s from a real position in the library (Coffee
  // Break, mid-solve): row 8, column 2 and box 6 each hold a 1 and share
  // no cell; box 7, column 7 and row 5 cover all three. So R7C7, the only
  // other 1 inside those three groups, is out.
  const grid = digitGrid(1, [
    at(2, 6), at(5, 2), at(5, 8), at(6, 3), at(6, 7), at(7, 2), at(7, 7), at(8, 3), at(8, 7),
  ]);

  it('mixes rows, columns and boxes on both sides, and erases inside the covers', () => {
    const found = findAllTechniqueInstances(grid, 'Mutant Fish');
    expect(found.length).toBeGreaterThan(0);
    const step = found[0];
    expect(step.digit).toBe(1);
    expect(step.fishSize).toBe(3);
    expect(step.baseUnits.map((u) => u.name)).toEqual(['row 8', 'column 2', 'box 6']);
    expect(step.coverUnits.map((u) => u.name).sort()).toEqual(['box 7', 'column 7', 'row 5']);
    expect(elims(step)).toEqual(['R7C7:1']);
  });

  it('is sound: the base groups share no cell and the covers hold them all', () => {
    const [step] = findAllTechniqueInstances(grid, 'Mutant Fish');
    const baseCells = new Set(step.baseCells);
    expect(baseCells.size).toBe(step.baseCells.length);
    expect(step.baseUnits).toHaveLength(step.coverUnits.length);
    for (const e of step.eliminations) expect(baseCells.has(e.cell)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 3D Medusa: both conclusions
// ---------------------------------------------------------------------------

describe('3D Medusa', () => {
  // A chain across three digits: R1C1's 1 and 2, R5C1's 2 and 3, R5C9's 3
  // and 1, and R1C9's 1. Colour it and one colour puts a 1 in R1C1 and in
  // R1C9 - the same digit twice in row 1.
  const unitClash = gridWith(
    {
      [at(1, 1)]: [1, 2],
      [at(5, 1)]: [2, 3],
      [at(5, 9)]: [3, 1],
      [at(1, 9)]: [1, 4, 7],
    },
    [
      [2, colExcept(1, [at(1, 1), at(5, 1)])],
      [3, rowExcept(5, [at(5, 1), at(5, 9)])],
      [1, colExcept(9, [at(5, 9), at(1, 9)])],
    ]
  );

  // A chain that comes back to the cell it started from: R5C5's 1 and its
  // 2 end up the same colour, so that colour would make one cell two
  // digits at once.
  const cellClash = gridWith(
    {
      [at(5, 5)]: [1, 2, 7],
      [at(5, 9)]: [1, 3],
      [at(1, 9)]: [3, 2],
      [at(1, 5)]: [2, 8],
    },
    [
      [1, rowExcept(5, [at(5, 5), at(5, 9)])],
      [3, colExcept(9, [at(5, 9), at(1, 9)])],
      [2, rowExcept(1, [at(1, 9), at(1, 5)])],
      [2, colExcept(5, [at(1, 5), at(5, 5)])],
    ]
  );

  it('kills the colour a unit meets twice, and says so', () => {
    const found = findAllTechniqueInstances(unitClash, '3D Medusa');
    expect(found).toHaveLength(1);
    const [step] = found;
    expect(step.medusaRule).toBe('unit');
    expect(elims(step)).toEqual(['R1C1:1', 'R1C9:1', 'R5C1:2', 'R5C9:3']);
    // The witness is the clash the card describes: one digit, two cells of
    // one unit.
    expect(step.medusaWitness.map((w) => w.digit)).toEqual([1, 1]);
    expect(names(step.medusaWitness.map((w) => w.cell))).toEqual(['R1C1', 'R1C9']);
    expect(step.medusaRule).toBe('unit');
  });

  it('kills the colour a cell meets twice, and says so', () => {
    const found = findAllTechniqueInstances(cellClash, '3D Medusa');
    expect(found).toHaveLength(1);
    const [step] = found;
    expect(step.medusaRule).toBe('cell');
    expect(step.medusaWitness.map((w) => w.cell)).toEqual([at(5, 5), at(5, 5)]);
    expect(step.medusaWitness.map((w) => w.digit).sort()).toEqual([1, 2]);
    expect(elims(step)).toContain('R5C5:1');
    expect(elims(step)).toContain('R5C5:2');
  });

  it('shows the two colours on the board, the surviving one first', () => {
    const [step] = findAllTechniqueInstances(unitClash, '3D Medusa');
    expect(step.colorGroups).toHaveLength(2);
    const [surviving, falseColour] = step.colorGroups;
    // Every cell the step erases from wears the second colour, unless it
    // carries both, and no cell wears two colours at once.
    expect(surviving.some((c) => falseColour.includes(c))).toBe(false);
    for (const cell of falseColour) {
      expect(step.eliminations.some((e) => e.cell === cell)).toBe(true);
    }
  });

  it('says nothing when no colour contradicts itself', () => {
    // One strong link on its own cannot clash with anything.
    const quiet = gridWith({ [at(1, 1)]: [1, 2] }, [[1, colExcept(1, [at(1, 1), at(5, 1)])]]);
    expect(findAllTechniqueInstances(quiet, '3D Medusa')).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// The teaching ladder
// ---------------------------------------------------------------------------

describe('the teaching ladder', () => {
  // The rungs, easiest first; one entry per detector, so the pointing pair
  // and triple share theirs. The hint path must never reach for one of
  // these while anything above it is still on the board.
  const RUNGS = [
    ['Naked Single'], ['Hidden Single'],
    ['Pointing Pair', 'Pointing Triple'], ['Claiming'],
    ['Naked Pair'], ['Hidden Pair'], ['Naked Triple'],
    ['Hidden Triple'], ['Naked Quad'], ['Hidden Quad'],
    ['X-Wing'], ['Swordfish'], ['Jellyfish'], ['Empty Rectangle'],
    ['XY-Wing'], ['XYZ-Wing'], ['WXYZ-Wing'],
    ['X-Cycle'], ['3D Medusa'],
    ['Finned X-Wing'], ['Finned Swordfish'], ['Finned Jellyfish'], ['Sashimi Fish'],
    ['ALS-XZ'], ['Unique Rectangle Type 1'], ['BUG+1'],
    ['Franken Fish'], ['Mutant Fish'],
  ];

  it('never offers a new rung while an easier one is on the board', () => {
    const reached = new Set();
    for (const { name, puzzle } of Object.values(PUZZLES).flat()) {
      let grid = buildGrid(puzzle);
      for (let n = 0; n < 300; n++) {
        const step = findNextLogicStep(grid, null);
        if (!step) break;
        const rung = RUNGS.findIndex((rungNames) => rungNames.includes(step.technique));
        if (rung > 0) {
          for (const easier of RUNGS.slice(0, rung).flat()) {
            expect(
              findAllTechniqueInstances(grid, easier),
              `${name}: the hint was ${step.technique} while a ${easier} was on the board`
            ).toEqual([]);
          }
          reached.add(step.technique);
        }
        grid = applyLogicStep(grid, step);
        if (step.placement) grid = eliminateCandidatesFromPeers(grid, step.placement.cell, step.placement.digit);
      }
    }
    // The walk really reached this batch's rungs on the library.
    expect([...reached]).toContain('Empty Rectangle');
    expect([...reached]).toContain('3D Medusa');
    expect([...reached]).toContain('Finned Swordfish');
  });

  it('prefers a single to a Jellyfish on a board that holds both', () => {
    const both = digitGrid(7, [
      at(1, 2), at(1, 4),
      at(3, 4), at(3, 5),
      at(6, 5), at(6, 9),
      at(8, 9), at(8, 2),
      at(2, 5), at(5, 4),
    ]);
    both[at(9, 9)] = { ...both[at(9, 9)], candidates: [4] };
    expect(findAllTechniqueInstances(both, 'Jellyfish')).toHaveLength(1);
    const step = findNextLogicStep(both, null);
    expect(step.technique).toBe('Naked Single');
    expect(step.placement).toEqual({ cell: at(9, 9), digit: 4 });
  });

  it('puts the Empty Rectangle before the fish that need boxes', () => {
    // Empty Rectangle sits in the Expert tier, well before the Ultimate
    // fish, so a position both can explain is explained by the simpler
    // idea - which is the point of putting it where the spec puts it.
    const grid = digitGrid(4, [
      at(4, 4), at(4, 6), at(6, 4),
      at(8, 4), at(8, 9),
      at(4, 9), at(1, 9),
    ]);
    expect(findAllTechniqueInstances(grid, 'Empty Rectangle')).toHaveLength(1);
    expect(teachingRank('Empty Rectangle')).toBeLessThan(teachingRank('Franken Fish'));
    expect(teachingRank('Empty Rectangle')).toBeLessThan(teachingRank('Mutant Fish'));
    expect(teachingRank('Jellyfish')).toBeLessThan(teachingRank('Empty Rectangle'));
    expect(teachingRank('Swordfish')).toBeLessThan(teachingRank('Jellyfish'));
  });
});

// ---------------------------------------------------------------------------
// Teaching: wording, tiers, the reference dialog
// ---------------------------------------------------------------------------

describe('every new technique ships with its teaching content', () => {
  for (const technique of NEW_TECHNIQUES) {
    it(`${technique}: tier, panel entry and reference dialog`, () => {
      const info = TECHNIQUE_INFO[technique];
      expect(info).toBeTruthy();
      expect(['Expert', 'Ultimate']).toContain(info.level);
      expect(info.description.length).toBeGreaterThan(20);

      const tier = TECHNIQUE_TIERS.find((t) => t.techniques.some((x) => x.full === technique));
      expect(tier, 'the Techniques list must place it').toBeTruthy();
      expect(tier.level).toBe(info.level);

      const details = TECHNIQUE_DETAILS[technique];
      expect(details).toBeTruthy();
      for (const part of ['plain', 'description', 'example', 'strategy']) {
        expect(details[part]?.length, `${technique} is missing its ${part}`).toBeGreaterThan(30);
      }
      // Plain words stay plain: no vocabulary to learn first.
      expect(details.plain).not.toMatch(/\b(candidate|unit|bi-value|peer|ALS|conjugate)\b/i);
    });
  }

  it('puts the two learnable patterns in Expert and the rest in Ultimate', () => {
    expect(TECHNIQUE_INFO['Jellyfish'].level).toBe('Expert');
    expect(TECHNIQUE_INFO['Empty Rectangle'].level).toBe('Expert');
    for (const technique of ['3D Medusa', 'Finned Swordfish', 'Finned Jellyfish', 'Sashimi Fish', 'Franken Fish', 'Mutant Fish']) {
      expect(TECHNIQUE_INFO[technique].level, technique).toBe('Ultimate');
    }
  });

  it('says in the reference text why fish above size four are not built', () => {
    const text = `${TECHNIQUE_DETAILS['Jellyfish'].plain} ${TECHNIQUE_DETAILS['Jellyfish'].description}`;
    expect(text).toMatch(/nothing new to find|redundant/i);
    expect(text).toMatch(/five/i);
  });

  it('is honest that nobody spots a Franken or Mutant fish by eye', () => {
    for (const technique of ['Franken Fish', 'Mutant Fish']) {
      const details = TECHNIQUE_DETAILS[technique];
      expect(`${details.plain} ${details.strategy}`, technique).toMatch(/by eye/i);
      expect(details.plain, technique).toMatch(/mentor/i);
    }
  });

  it('teaches the Empty Rectangle as its own idea, not as a fish', () => {
    const details = TECHNIQUE_DETAILS['Empty Rectangle'];
    expect(`${details.plain} ${details.description} ${details.strategy}`).not.toMatch(/fish/i);
    // And as something a player can learn to spot, unlike the tier above it.
    expect(details.strategy).toMatch(/Pick a digit/i);
  });

  it('counts the two Expert patterns live and leaves the rest to Scan', () => {
    expect(LIVE_COUNT_TECHNIQUES).toContain('Jellyfish');
    expect(LIVE_COUNT_TECHNIQUES).toContain('Empty Rectangle');
    for (const technique of ['3D Medusa', 'Franken Fish', 'Mutant Fish', 'Sashimi Fish']) {
      expect(LIVE_COUNT_TECHNIQUES, technique).not.toContain(technique);
    }
  });
});

describe('the plain words and the Expert words', () => {
  const JARGON = /\b(candidate|unit|conjugate|strong link|ALS|peer|bivalue|bi-value|cover set|base set)\b/i;

  const plainFor = (grid, technique, pick = () => true) => {
    const step = findAllTechniqueInstances(grid, technique).filter(pick)[0];
    expect(step, `no ${technique} on the test grid`).toBeTruthy();
    return { out: explainStep(step, grid, 'simple'), step };
  };

  const jellyfishGrid = digitGrid(7, [
    at(1, 2), at(1, 4), at(3, 4), at(3, 5), at(6, 5), at(6, 9), at(8, 9), at(8, 2), at(2, 5), at(5, 4),
  ]);
  const swordfishGrid = digitGrid(7, [
    at(1, 2), at(1, 4), at(3, 4), at(3, 5), at(6, 5), at(6, 2), at(2, 5), at(5, 4),
  ]);

  it('reads a Jellyfish as the Swordfish one size up', () => {
    const LOOK = /^Look at rows .+\. In each of them, the number 7 can only go in columns .+\.$/;
    const sword = plainFor(swordfishGrid, 'Swordfish').out;
    const jelly = plainFor(jellyfishGrid, 'Jellyfish').out;
    for (const out of [sword, jelly]) expect(out.look).toMatch(LOOK);
    expect(sword.why).toContain('Each of those three rows needs exactly one 7');
    expect(jelly.why).toContain('Each of those four rows needs exactly one 7');
    expect(jelly.action).toBe('Erase the pencil mark 7 from R5C4 and R2C5.');
    expect(`${jelly.look} ${jelly.why}`).not.toMatch(JARGON);
  });

  it('reads a finned fish as the X-Wing case one size up, and names the fin', () => {
    const finnedGrid = digitGrid(3, [
      at(2, 1), at(2, 4), at(2, 3), at(5, 4), at(5, 8), at(7, 1), at(7, 8), at(3, 1), at(1, 4),
    ]);
    const { out } = plainFor(finnedGrid, 'Finned Swordfish', (s) => s.orientation === 'row');
    expect(out.look.startsWith('Look at rows')).toBe(true);
    expect(out.look).toContain('(the "fin")');
    expect(out.why).toContain('erased from the rest of columns');
    expect(`${out.look} ${out.why}`).not.toMatch(JARGON);
  });

  it('says where the sashimi corner went', () => {
    const sashimiGrid = digitGrid(5, [at(3, 6), at(3, 1), at(7, 2), at(7, 6), at(1, 2)]);
    const { out } = plainFor(sashimiGrid, 'Sashimi Fish', (s) => s.orientation === 'row');
    expect(out.look).toContain('One corner of the pattern has no 5 left in it at all');
    expect(`${out.look} ${out.why}`).not.toMatch(JARGON);
  });

  it('names which of 3D Medusa\'s two conclusions fired', () => {
    const unitClash = gridWith(
      {
        [at(1, 1)]: [1, 2], [at(5, 1)]: [2, 3], [at(5, 9)]: [3, 1], [at(1, 9)]: [1, 4, 7],
      },
      [
        [2, colExcept(1, [at(1, 1), at(5, 1)])],
        [3, rowExcept(5, [at(5, 1), at(5, 9)])],
        [1, colExcept(9, [at(5, 9), at(1, 9)])],
      ]
    );
    const { out } = plainFor(unitClash, '3D Medusa');
    expect(out.look).toContain('one whole colour is right while the other is wrong');
    expect(out.why).toContain('One colour lands twice in row 1');
    expect(out.why).toMatch(/R1C(1|9) and R1C(1|9) would both be 1/);
    expect(`${out.look} ${out.why}`).not.toMatch(JARGON);
  });

  it('explains an Empty Rectangle on the cells in front of the player', () => {
    const grid = digitGrid(4, [at(4, 4), at(4, 6), at(6, 4), at(8, 4), at(8, 9), at(4, 9), at(1, 9)]);
    const { out } = plainFor(grid, 'Empty Rectangle');
    expect(out.look).toContain('Look at box 5');
    expect(out.look).toContain('row 4 or on column 4');
    expect(out.why).toContain('Row 8 has only two places left for a 4');
    expect(out.action).toBe('Erase the pencil mark 4 from R4C9.');
    expect(`${out.look} ${out.why}`).not.toMatch(JARGON);
  });

  it('says outright that a Franken fish is the mentor\'s to find', () => {
    const grid = digitGrid(9, [at(1, 1), at(2, 2), at(4, 2), at(5, 1), at(7, 1), at(8, 2)]);
    const { out } = plainFor(grid, 'Franken Fish');
    expect(out.look).toContain('box 1');
    expect(out.why).toContain('Nobody is expected to spot this shape by eye');
    expect(`${out.look} ${out.why}`).not.toMatch(JARGON);
  });

  it('keeps the engine text and a glossary in Expert mode', () => {
    const grid = digitGrid(7, [
      at(1, 2), at(1, 4), at(3, 4), at(3, 5), at(6, 5), at(6, 9), at(8, 9), at(8, 2), at(2, 5), at(5, 4),
    ]);
    const [step] = findAllTechniqueInstances(grid, 'Jellyfish');
    const out = explainStep(step, grid, 'detailed');
    expect(out.why).toBe(step.explanation);
    expect(out.terms.length).toBeGreaterThan(0);
    expect(out.action).toBe('Erase the pencil mark 7 from R5C4 and R2C5.');
  });
});

// ---------------------------------------------------------------------------
// What it costs
// ---------------------------------------------------------------------------

describe('what the new detectors cost', () => {
  // The numbers are output, not an assertion: vitest keeps console.log to
  // itself, so write straight to stdout where there is one.
  const out = (text) => {
    const stdout = /** @type {any} */ (globalThis).process?.stdout;
    if (stdout && typeof stdout.write === 'function') stdout.write(`${text}\n`);
    else console.log(text);
  };

  /** A board played forward until `filled` cells carry a digit. */
  const playTo = (puzzle, filled) => {
    let grid = buildGrid(puzzle);
    for (let i = 0; i < 400; i++) {
      if (grid.filter((c) => c.value !== null).length >= filled) break;
      const step = findNextLogicStep(grid, null);
      if (!step) break;
      grid = applyLogicStep(grid, step);
      if (step.placement) grid = eliminateCandidatesFromPeers(grid, step.placement.cell, step.placement.digit);
    }
    return grid;
  };

  const boards = [
    playTo(PUZZLES.ultimate[1].puzzle, 30),
    playTo(PUZZLES.ultimate[3].puzzle, 30),
    playTo(PUZZLES.diabolical[0].puzzle, 30),
  ];

  const worst = (name) => {
    let max = 0;
    for (const grid of boards) {
      const started = performance.now();
      findAllTechniqueInstances(grid, name);
      max = Math.max(max, performance.now() - started);
    }
    return max;
  };

  it('keeps every live count affordable', () => {
    const costs = LIVE_COUNT_TECHNIQUES.map((name) => ({ name, ms: worst(name) }));
    const total = costs.reduce((sum, cost) => sum + cost.ms, 0);
    out(`  live counts, mid-game board: ${costs.length} detectors, ${total.toFixed(1)} ms in all`);
    for (const { name, ms } of costs.filter((cost) => cost.ms > 1)) out(`    ${name.padEnd(20)} ${ms.toFixed(1)} ms`);
    // The panel-at-scale budget: a whole live pass is one frame's work.
    expect(total).toBeLessThan(150);
  });

  it('keeps the named ladder well inside the hint budget', () => {
    let worstHint = 0;
    for (const grid of boards) {
      const started = performance.now();
      findNextLogicStep(grid, null);
      worstHint = Math.max(worstHint, performance.now() - started);
    }
    // And the worst case of all: a board where nothing named applies, so
    // every rung including the two unit fish runs to the end.
    let stalled = buildGrid(PUZZLES.ultimate[3].puzzle);
    for (let i = 0; i < 400; i++) {
      const step = findNextLogicStep(stalled, null);
      if (!step) break;
      stalled = applyLogicStep(stalled, step);
      if (step.placement) stalled = eliminateCandidatesFromPeers(stalled, step.placement.cell, step.placement.digit);
    }
    const started = performance.now();
    findNextLogicStep(stalled, null);
    const whenNothingApplies = performance.now() - started;
    out(`  hint path: worst ${worstHint.toFixed(0)} ms mid-game, ${whenNothingApplies.toFixed(0)} ms on a board where nothing named applies`);
    // The programme's budget for the named ladder, with the what-if
    // fallback still inside the 5 s hint path after it.
    expect(worstHint).toBeLessThan(1000);
    expect(whenNothingApplies).toBeLessThan(1000);
  });
});
