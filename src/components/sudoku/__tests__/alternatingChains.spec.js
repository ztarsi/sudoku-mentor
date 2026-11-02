// The alternating-inference-chain batch (#67): the eleven names a player
// can now meet, each pinned on a hand-built grid.
//
// Each grid is built so that the pattern under test is the only way to the
// elimination, and the counts of the digit in every unit are checked by the
// construction notes above each grid. The solution oracle in
// oracleAll.spec.js runs every one of these detectors against every
// intermediate grid of every library puzzle; what is here are the shapes the
// library happens not to show, plus the four things the spec says this batch
// gets wrong most easily: a grouped elimination must see EVERY cell of an
// endpoint group, a continuous loop must report EVERY elimination it
// licenses, an odd loop must be rejected, and a plain chain must win over a
// richer one.
import { describe, it, expect } from 'vitest';
import {
  findAllTechniqueInstances,
  findNextLogicStep,
  generateCandidates,
  applyLogicStep,
  eliminateCandidatesFromPeers,
} from '../logicEngine';
import { CHAIN_TECHNIQUES, HINT_CHAIN_NODES, SCAN_CHAIN_NODES, findChain } from '../aicEngine';
import { solveSudoku } from '../solver';
import { findWhatIfStep } from '../forcingChainEngine';
import { explainStep, chainWalk } from '../explainStep';
import { buildHighlightSets, buildChainOverlay } from '../stepHighlights';
import { TECHNIQUE_INFO, TECHNIQUE_TIERS, TECHNIQUE_DETAILS, techniqueTier, matchTechniques } from '../techniqueCatalog';
import { arePeers, cellName } from '../gridUnits';
import { PUZZLES } from '../puzzles';

/** R,C in the 1-based names the product uses, as a 0..80 index. */
const at = (row, col) => (row - 1) * 9 + (col - 1);

/**
 * A board whose cells hold only the pencil marks given. Every other cell is
 * empty of marks, so no unit outside the pattern can hold a strong link and
 * nothing competes with the chain under test.
 */
const marksOnly = (marks) =>
  Array.from({ length: 81 }, (_, i) => ({
    cellIndex: i,
    value: null,
    isFixed: false,
    candidates: marks[i] ? [...marks[i]].sort((a, b) => a - b) : [],
    isHighlighted: false,
    highlightColor: null,
    isBaseCell: false,
    isTargetCell: false,
  }));

/** Eliminations as a sorted, readable list: "R1C1:7". */
const elims = (step) =>
  step.eliminations.map((e) => `${cellName(e.cell)}:${e.digit}`).sort();

/**
 * The instance whose chain is the one the construction notes describe.
 *
 * A hand-built grid is sparse, so the engine honestly finds other chains on
 * it too; naming the one under test keeps each assertion about that chain
 * rather than about whatever sorted first.
 */
const pick = (steps, notation) => {
  const found = steps.find((s) => s.chainNotation === notation);
  expect(
    found,
    `no instance with the chain ${notation}; found ${steps.map((s) => s.chainNotation).join(' | ') || 'none'}`
  ).toBeTruthy();
  return found;
};

/** The chain as "digit@cells -link-> ..." so a test reads like the card. */
const shape = (step) =>
  step.chainNodes.map((n) => ({
    cells: n.cells.map(cellName).join('/'),
    digit: n.digit,
    linkToNext: n.linkToNext,
    linkVia: n.linkVia,
  }));

const buildGrid = (puzzle) =>
  generateCandidates(
    puzzle.map((value, index) => ({
      cellIndex: index, value: value || null, isFixed: value !== 0, candidates: [],
      isHighlighted: false, highlightColor: null, isBaseCell: false, isTargetCell: false,
    }))
  );

const library = Object.entries(PUZZLES).flatMap(([shelf, list]) =>
  list.map((p) => ({ ...p, shelf }))
);

// ---------------------------------------------------------------------------
// Skyscraper
// ---------------------------------------------------------------------------
describe('Skyscraper', () => {
  // Digit 5 only. Row 1 has it in C1 and C5; row 7 in C1 and C6. The two
  // C1 cells share column 1, so one of the roofs, R1C5 or R7C6, is the 5.
  // Every cell that sees both roofs loses its 5: the box-2 part of column 6
  // and the box-8 part of column 5.
  const grid = marksOnly({
    [at(1, 1)]: [5, 8, 9],
    [at(1, 5)]: [5, 8, 9],
    [at(7, 1)]: [5, 8, 9],
    [at(7, 6)]: [5, 8, 9],
    [at(2, 6)]: [5, 1, 2],
    [at(3, 6)]: [5, 1, 2],
    [at(8, 5)]: [5, 1, 2],
    [at(9, 5)]: [5, 1, 2],
  });

  const found = () => findAllTechniqueInstances(grid, 'Skyscraper').filter((s) => s.digit === 5);

  it('erases the digit from every cell that sees both free ends', () => {
    const [step] = found();
    expect(step, 'no Skyscraper on the test grid').toBeTruthy();
    expect(elims(step)).toEqual(['R2C6:5', 'R3C6:5', 'R8C5:5', 'R9C5:5']);
  });

  it('is a four-node chain: strong, weak, strong', () => {
    const [step] = found();
    expect(shape(step)).toEqual([
      { cells: 'R1C5', digit: 5, linkToNext: 'strong', linkVia: 'unit' },
      { cells: 'R1C1', digit: 5, linkToNext: 'weak', linkVia: 'unit' },
      { cells: 'R7C1', digit: 5, linkToNext: 'strong', linkVia: 'unit' },
      { cells: 'R7C6', digit: 5, linkToNext: null, linkVia: null },
    ]);
  });

  it('highlights the chain as the pattern and the erased cells as targets', () => {
    const [step] = found();
    const { baseCells, targetCells } = buildHighlightSets([step]);
    expect([...baseCells].sort((a, b) => a - b)).toEqual(
      [at(1, 1), at(1, 5), at(7, 1), at(7, 6)].sort((a, b) => a - b)
    );
    expect([...targetCells].sort((a, b) => a - b)).toEqual(
      [at(2, 6), at(3, 6), at(8, 5), at(9, 5)].sort((a, b) => a - b)
    );
  });

  it('reads as its own lesson, with no jargon', () => {
    const [step] = found();
    const out = explainStep(step, grid, 'simple');
    expect(out.look).toContain('Look at the number 5');
    expect(out.look).toContain('R1C1 and R7C1 are both in column 1');
    expect(out.why).toContain('must be 5');
    expect(`${out.look} ${out.why}`).not.toMatch(/\b(candidate|unit|strong link|weak link|conjugate|node)\b/i);
  });

  it('gives the chain in the standard notation behind the Expert toggle', () => {
    const [step] = found();
    expect(step.chainNotation).toBe('(5)R1C5 = (5)R1C1 - (5)R7C1 = (5)R7C6');
    expect(explainStep(step, grid, 'detailed').why).toContain('(5)R1C5 = (5)R1C1 - (5)R7C1 = (5)R7C6');
  });
});

// ---------------------------------------------------------------------------
// Two-String Kite
// ---------------------------------------------------------------------------
describe('Two-String Kite', () => {
  // Digit 7 only. Row 7 has it in C2 and C8; column 3 in R5 and R9. R7C2 and
  // R9C3 are both in box 7, so one of the far ends, R7C8 or R5C3, is the 7,
  // and R5C8, which sees both, cannot be.
  const grid = marksOnly({
    [at(7, 2)]: [7, 8, 9],
    [at(7, 8)]: [7, 8, 9],
    [at(5, 3)]: [7, 8, 9],
    [at(9, 3)]: [7, 8, 9],
    [at(5, 8)]: [7, 1, 2],
    [at(1, 8)]: [7, 1, 2],
    [at(5, 5)]: [7, 1, 2],
  });

  const found = () => findAllTechniqueInstances(grid, 'Two-String Kite').filter((s) => s.digit === 7);

  it('erases the digit from the one cell that sees both far ends', () => {
    const [step] = found();
    expect(step, 'no Two-String Kite on the test grid').toBeTruthy();
    expect(elims(step)).toEqual(['R5C8:7']);
  });

  it('joins a row pair and a column pair through a box', () => {
    const [step] = found();
    const vias = step.chainNodes.slice(0, 3).map((n) => `${n.linkToNext}:${n.linkUnit?.type}`);
    expect(vias).toEqual(['strong:column', 'weak:box', 'strong:row']);
    expect(step.chainNodes.map((n) => n.cells.map(cellName).join('/'))).toEqual([
      'R5C3', 'R9C3', 'R7C2', 'R7C8',
    ]);
  });

  it('says in plain words that the near ends share a box', () => {
    const [step] = found();
    const out = explainStep(step, grid, 'simple');
    expect(out.look).toContain('R9C3 and R7C2 are both in box 7');
    expect(out.why).toContain('R5C8 sees both of them');
  });
});

// ---------------------------------------------------------------------------
// W-Wing
// ---------------------------------------------------------------------------
describe('W-Wing', () => {
  // R1C1 and R7C9 both hold only {3, 8} and do not see each other. In row 4
  // the only 3s are R4C1 and R4C9, one seeing each. Either way one of the
  // matching cells is 8, so R1C9 and R7C1 lose their 8.
  const grid = marksOnly({
    [at(1, 1)]: [3, 8],
    [at(7, 9)]: [3, 8],
    [at(4, 1)]: [3, 1, 2],
    [at(4, 9)]: [3, 1, 2],
    [at(4, 5)]: [1, 2, 6],
    [at(1, 9)]: [8, 6, 9],
    [at(7, 1)]: [8, 6, 9],
  });

  const found = () => findAllTechniqueInstances(grid, 'W-Wing');

  it('erases the other digit of the pair from cells seeing both pair cells', () => {
    const [step] = found();
    expect(step, 'no W-Wing on the test grid').toBeTruthy();
    expect(elims(step)).toEqual(['R1C9:8', 'R7C1:8']);
  });

  it('is six nodes: bare pair, bridge, bare pair', () => {
    const [step] = found();
    expect(shape(step)).toEqual([
      { cells: 'R1C1', digit: 8, linkToNext: 'strong', linkVia: 'bivalue' },
      { cells: 'R1C1', digit: 3, linkToNext: 'weak', linkVia: 'unit' },
      { cells: 'R4C1', digit: 3, linkToNext: 'strong', linkVia: 'unit' },
      { cells: 'R4C9', digit: 3, linkToNext: 'weak', linkVia: 'unit' },
      { cells: 'R7C9', digit: 3, linkToNext: 'strong', linkVia: 'bivalue' },
      { cells: 'R7C9', digit: 8, linkToNext: null, linkVia: null },
    ]);
  });

  it('explains the bridge in plain words', () => {
    const [step] = found();
    const out = explainStep(step, grid, 'simple');
    expect(out.look).toContain('Both hold exactly the same two pencil marks, 3 and 8');
    expect(out.why).toContain('it has to be 8');
  });
});

// ---------------------------------------------------------------------------
// Remote Pairs
// ---------------------------------------------------------------------------
describe('Remote Pairs', () => {
  // Four cells all holding only {2, 7}: R1C1 - R5C1 (column 1) - R6C2
  // (box 4) - R6C8 (row 6). Every other 2 and 7 on the board is placed so
  // that no unit holds exactly two of them, which leaves the four bare pairs
  // as the only strong links: the chain has to run the whole way round.
  const grid = marksOnly({
    [at(1, 1)]: [2, 7],
    [at(5, 1)]: [2, 7],
    [at(6, 2)]: [2, 7],
    [at(6, 8)]: [2, 7],
    [at(1, 8)]: [2, 7, 9],
    [at(6, 1)]: [2, 7, 9],
    [at(1, 5)]: [2, 7, 9],
    [at(3, 8)]: [2, 7, 9],
    [at(2, 7)]: [2, 7, 9],
  });

  const found = () => findAllTechniqueInstances(grid, 'Remote Pairs');

  it('erases a digit from the cells that see both ends of the line', () => {
    const steps = found();
    expect(steps.length).toBeGreaterThan(0);
    const all = steps.flatMap(elims).sort();
    expect(all).toContain('R1C8:2');
    expect(all).toContain('R1C8:7');
  });

  it('is eight nodes long: four cells, each entered and left', () => {
    const [step] = found();
    expect(step.chainNodes).toHaveLength(8);
    expect(step.chainNodes.map((n) => n.cells.map(cellName).join('/'))).toEqual([
      'R1C1', 'R1C1', 'R5C1', 'R5C1', 'R6C2', 'R6C2', 'R6C8', 'R6C8',
    ]);
    // Inside a cell the link is strong; between cells it is weak.
    expect(step.chainNodes.slice(0, 7).map((n) => n.linkToNext)).toEqual([
      'strong', 'weak', 'strong', 'weak', 'strong', 'weak', 'strong',
    ]);
  });

  it('explains the flipping in plain words', () => {
    const [step] = found();
    const out = explainStep(step, grid, 'simple');
    expect(out.look).toContain('four cells that all hold exactly the same two pencil marks, 2 and 7');
    expect(out.why).toContain('the line flips between them');
  });
});

// ---------------------------------------------------------------------------
// X-Chain
// ---------------------------------------------------------------------------
describe('X-Chain', () => {
  // Digit 5, three conjugate pairs: row 1 (C1, C4), row 5 (C4, C7) and
  // row 9 (C7, C2). The ends are R1C1 and R9C2, and the box-1 part of
  // column 2 sees both.
  const grid = marksOnly({
    [at(1, 1)]: [5, 8, 9],
    [at(1, 4)]: [5, 8, 9],
    [at(5, 4)]: [5, 8, 9],
    [at(5, 7)]: [5, 8, 9],
    [at(9, 7)]: [5, 8, 9],
    [at(9, 2)]: [5, 8, 9],
    [at(2, 2)]: [5, 1, 2],
    [at(3, 2)]: [5, 1, 2],
  });

  const found = () =>
    findAllTechniqueInstances(grid, 'X-Chain')
      .filter((s) => s.digit === 5 && s.chainNodes.length === 6);

  it('erases the digit from the cells that see both ends', () => {
    const [step] = found();
    expect(step, 'no six-node X-Chain on the test grid').toBeTruthy();
    expect(elims(step)).toEqual(['R2C2:5', 'R3C2:5']);
  });

  it('alternates strong and weak links on one digit', () => {
    const [step] = found();
    expect(step.chainNodes.every((n) => n.digit === 5)).toBe(true);
    expect(step.chainNodes.slice(0, 5).map((n) => n.linkToNext)).toEqual([
      'strong', 'weak', 'strong', 'weak', 'strong',
    ]);
    expect(step.chainNodes.map((n) => cellName(n.cell))).toEqual([
      'R1C1', 'R1C4', 'R5C4', 'R5C7', 'R9C7', 'R9C2',
    ]);
  });

  it('is walkable: one sentence per link, in order', () => {
    const [step] = found();
    const walk = chainWalk(step);
    expect(walk).toHaveLength(5);
    expect(walk.map((w) => w.strong)).toEqual([true, false, true, false, true]);
    expect(walk[0].text).toBe('In row 1, the only two places for 5 are R1C1 and R1C4. So if R1C1 is not 5, R1C4 is.');
    expect(walk[1].text).toBe('R1C4 and R5C4 are both in column 4, so they cannot both be 5. So if R1C4 is 5, R5C4 is not.');
    expect(explainStep(step, grid, 'simple').why).toContain('Either R1C1 or R9C2 is 5');
  });
});

// ---------------------------------------------------------------------------
// XY-Chain
// ---------------------------------------------------------------------------
describe('XY-Chain', () => {
  // Four cells with two marks each, passing the baton: R1C1 {1,2},
  // R1C5 {2,3}, R5C5 {3,4}, R5C9 {4,1}. Both ends offer 1, so the cells
  // that see both ends lose theirs. The extra 1s elsewhere stop any unit
  // from holding exactly two of them, so no shorter route exists.
  const grid = marksOnly({
    [at(1, 1)]: [1, 2],
    [at(1, 5)]: [2, 3],
    [at(5, 5)]: [3, 4],
    [at(5, 9)]: [4, 1],
    [at(1, 9)]: [1, 7, 8],
    [at(5, 1)]: [1, 7, 8],
    [at(1, 3)]: [1, 7, 8],
    [at(5, 3)]: [1, 7, 8],
    [at(8, 1)]: [1, 7, 8],
    [at(8, 9)]: [1, 7, 8],
    [at(8, 5)]: [1, 7, 8],
    [at(8, 3)]: [1, 7, 8],
    [at(3, 2)]: [1, 7, 8],
    [at(6, 2)]: [1, 7, 8],
    [at(9, 2)]: [1, 7, 8],
  });

  const found = () => findAllTechniqueInstances(grid, 'XY-Chain');

  it('erases the shared end digit from cells seeing both ends', () => {
    const [step] = found();
    expect(step, 'no XY-Chain on the test grid').toBeTruthy();
    expect(elims(step)).toEqual(['R1C9:1', 'R5C1:1']);
  });

  it('is a chain of bi-value cells whose ends share a digit', () => {
    const [step] = found();
    expect(step.chainNodes).toHaveLength(8);
    expect(step.chainNodes[0].digit).toBe(step.chainNodes[7].digit);
    expect(step.chainNodes.map((n) => n.linkVia).slice(0, 7)).toEqual([
      'bivalue', 'unit', 'bivalue', 'unit', 'bivalue', 'unit', 'bivalue',
    ]);
  });
});

// ---------------------------------------------------------------------------
// Alternating Chain
// ---------------------------------------------------------------------------
describe('Alternating Chain', () => {
  // Mixed digits 3 and 8. R1C1 is the bare pair {3,8}; column 7 holds the
  // only two 3s; R5C7 carries both digits; row 5 holds the only two 8s.
  // The ends are both about 8, so the box-1 part of column 3 loses its 8.
  const grid = marksOnly({
    [at(1, 1)]: [3, 8],
    [at(1, 7)]: [3, 7, 9],
    [at(5, 7)]: [3, 8, 9],
    [at(5, 3)]: [8, 7, 9],
    [at(2, 3)]: [8, 7, 9],
    [at(3, 3)]: [8, 7, 9],
  });

  const found = () =>
    findAllTechniqueInstances(grid, 'Alternating Chain').filter((s) => s.chainNodes.length === 6);

  it('erases the end digit from cells that see both ends', () => {
    const [step] = found();
    expect(step, 'no six-node Alternating Chain on the test grid').toBeTruthy();
    expect(elims(step)).toEqual(['R2C3:8', 'R3C3:8']);
  });

  it('mixes digits and starts and ends with a strong link', () => {
    const [step] = found();
    expect([...new Set(step.chainNodes.map((n) => n.digit))].sort()).toEqual([3, 8]);
    expect(step.chainNodes[0].linkToNext).toBe('strong');
    expect(step.chainNodes[4].linkToNext).toBe('strong');
    expect(step.chainNodes.slice(0, 5).map((n) => n.linkToNext)).toEqual([
      'strong', 'weak', 'strong', 'weak', 'strong',
    ]);
  });

  it('is presented as a deduction, with the two ends marked', () => {
    const [step] = found();
    expect(step.chainNodes.filter((n) => n.endpoint).map((n) => cellName(n.cell))).toEqual(['R1C1', 'R5C3']);
    expect(step.chainClosed).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Grouped chains
// ---------------------------------------------------------------------------
describe('Grouped X-Chain', () => {
  // Column 2's only 5s are R1C2 and the box-4 pair R4C2 / R6C2, so the
  // digit is in R1C2 or somewhere in that pair: one grouped node. R5C1 sees
  // both cells of the group, and row 5's only other 5 is R5C8. R4C8 is the
  // trap: it sees R4C2 but not R6C2, so it must NOT be erased.
  const grid = marksOnly({
    [at(1, 2)]: [5, 8, 9],
    [at(4, 2)]: [5, 8, 9],
    [at(6, 2)]: [5, 8, 9],
    [at(5, 1)]: [5, 8, 9],
    [at(5, 8)]: [5, 8, 9],
    [at(1, 8)]: [5, 1, 2],
    [at(4, 8)]: [5, 1, 2],
  });

  const CHAIN = '(5)R5C8 = (5)R5C1 - (5)R4C2/R6C2 = (5)R1C2';
  const found = () => pick(findAllTechniqueInstances(grid, 'Grouped X-Chain'), CHAIN);

  it('treats the box/line overlap as one node', () => {
    const step = found();
    expect(shape(step)).toEqual([
      { cells: 'R5C8', digit: 5, linkToNext: 'strong', linkVia: 'unit' },
      { cells: 'R5C1', digit: 5, linkToNext: 'weak', linkVia: 'unit' },
      { cells: 'R4C2/R6C2', digit: 5, linkToNext: 'strong', linkVia: 'unit' },
      { cells: 'R1C2', digit: 5, linkToNext: null, linkVia: null },
    ]);
    expect(step.chainNodes[2].kind).toBe('group');
    expect(step.chainNodes[2].linkUnit.name).toBe('column 2');
  });

  it('erases only where the cell sees EVERY cell of the group', () => {
    const step = found();
    expect(elims(step)).toEqual(['R1C8:5']);
    // The trap, stated rather than implied: R4C8 still offers a 5 and sees
    // one cell of the group but not the other, so it survives. One cell of
    // a group missed is a wrong hint, and this is where it would happen.
    expect(grid[at(4, 8)].candidates).toContain(5);
    expect(arePeers(at(4, 8), at(4, 2))).toBe(true);
    expect(arePeers(at(4, 8), at(6, 2))).toBe(false);
    expect(elims(step)).not.toContain('R4C8:5');
  });

  it('names the group as one place in the plain wording', () => {
    const step = found();
    const out = explainStep(step, grid, 'simple');
    expect(out.look).toContain('count as one place');
    expect(out.why).toContain('Either R5C8 or R1C2 is 5');
    expect(chainWalk(step)[2].text).toContain(
      'In column 2, 5 has only two possible places left, R4C2/R6C2 and R1C2'
    );
  });
});

describe('Grouped Alternating Chain', () => {
  // The same grouped node on 5 in column 2, but the chain leaves it on a
  // different digit: R5C3 is {5,7} and R9C3 is {7,5}, so the chain runs
  // 5 - 7 - 5 and both ends are about 5.
  const grid = marksOnly({
    [at(1, 2)]: [5, 8, 9],
    [at(4, 2)]: [5, 8, 9],
    [at(6, 2)]: [5, 8, 9],
    [at(5, 3)]: [5, 7],
    [at(9, 3)]: [7, 5],
    [at(2, 3)]: [5, 1, 2],
    [at(3, 3)]: [5, 1, 2],
  });

  const CHAIN = '(5)R1C2 = (5)R4C2/R6C2 - (5)R5C3 = (7)R5C3 - (7)R9C3 = (5)R9C3';
  const found = () => pick(findAllTechniqueInstances(grid, 'Grouped Alternating Chain'), CHAIN);

  it('passes through the group on one digit and leaves on another', () => {
    const step = found();
    expect(shape(step)).toEqual([
      { cells: 'R1C2', digit: 5, linkToNext: 'strong', linkVia: 'unit' },
      { cells: 'R4C2/R6C2', digit: 5, linkToNext: 'weak', linkVia: 'unit' },
      { cells: 'R5C3', digit: 5, linkToNext: 'strong', linkVia: 'bivalue' },
      { cells: 'R5C3', digit: 7, linkToNext: 'weak', linkVia: 'unit' },
      { cells: 'R9C3', digit: 7, linkToNext: 'strong', linkVia: 'bivalue' },
      { cells: 'R9C3', digit: 5, linkToNext: null, linkVia: null },
    ]);
    expect(elims(step)).toEqual(['R2C3:5', 'R3C3:5']);
  });
});

// ---------------------------------------------------------------------------
// Continuous loop
// ---------------------------------------------------------------------------
describe('Continuous Loop', () => {
  // Row 1's only 5s are R1C1 and R1C5; R4C5 is the bare pair {5,7}; row 4
  // holds three 7s so the 7 link out of it is weak; column 1's only 7s are
  // R4C1 and R1C1, which closes the loop back onto R1C1 on its other mark.
  // Six links, alternating all the way round.
  const grid = marksOnly({
    [at(1, 1)]: [1, 5, 7],
    [at(1, 5)]: [5, 2, 3],
    [at(4, 5)]: [5, 7],
    [at(4, 1)]: [7, 2, 3],
    [at(8, 5)]: [5, 2, 3],
    [at(4, 9)]: [7, 2, 3],
  });

  const found = () => findAllTechniqueInstances(grid, 'Continuous Loop');

  it('closes on itself with an even number of alternating links', () => {
    const [step] = found();
    expect(step, 'no Continuous Loop on the test grid').toBeTruthy();
    expect(step.chainClosed).toBe(true);
    const walk = chainWalk(step);
    expect(walk).toHaveLength(6);
    expect(walk.length % 2).toBe(0);
    expect(walk.map((w) => w.strong)).toEqual([true, false, true, false, true, false]);
  });

  it('reports EVERY elimination the loop licenses, not the first', () => {
    const [step] = found();
    // One elimination per weak link in the loop, and all three kinds:
    // the digit out of a column, the digit out of a row, and the other
    // marks out of the cell the loop passes through twice.
    expect(elims(step)).toEqual(['R1C1:1', 'R4C9:7', 'R8C5:5']);
    expect(step.chainLoopEliminations).toHaveLength(3);
    expect(step.chainLoopEliminations.flatMap((l) => l.eliminations.map((e) => e.cell)).sort())
      .toEqual([at(1, 1), at(4, 9), at(8, 5)].sort((a, b) => a - b));
  });

  it('says in one sentence why a closed chain proves more', () => {
    const [step] = found();
    const out = explainStep(step, grid, 'simple');
    expect(out.look).toContain('round the loop');
    expect(out.why).toContain('exact either-or');
    expect(out.why).toContain('every one of them');
  });
});

describe('a loop that cannot alternate is rejected', () => {
  it('every loop the engine reports has an even number of links, all the way round', () => {
    // An odd number of links cannot alternate round a loop. Rather than
    // trusting one hand-built case, this walks the whole library and checks
    // the invariant on every loop the engine finds anywhere.
    let checked = 0;
    for (const { name, puzzle } of library) {
      let grid = buildGrid(puzzle);
      for (let i = 0; i < 120; i++) {
        for (const step of findAllTechniqueInstances(grid, 'Continuous Loop')) {
          const walk = chainWalk(step);
          expect(walk.length % 2, `${name}: loop with ${walk.length} links`).toBe(0);
          // Strong and weak really do alternate, including the link that
          // closes the loop back onto the first node.
          walk.forEach((link, index) => {
            expect(link.strong, `${name}: link ${index}`).toBe(index % 2 === 0);
          });
          checked++;
        }
        const step = findNextLogicStep(grid, null);
        if (!step) break;
        grid = applyLogicStep(grid, step);
        if (step.placement) grid = eliminateCandidatesFromPeers(grid, step.placement.cell, step.placement.digit);
      }
    }
    expect(checked, 'the library should show the engine some loops').toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// ALS nodes
// ---------------------------------------------------------------------------
describe('ALS Chain', () => {
  // Row 4 holds {1,2}, {2,3,4} and {3,4} across three cells: three cells,
  // four digits, one number short of locked. Lose the 1 and the set is
  // forced, so one of R4C2 and R4C3 must be the 4 - a single node of two
  // cells. R6C2 sees both of them and is {4,1}, which carries the chain
  // back to 1. Nothing in the plain graph joins these two ends.
  const grid = marksOnly({
    [at(4, 1)]: [1, 2],
    [at(4, 2)]: [2, 3, 4],
    [at(4, 3)]: [3, 4],
    [at(6, 2)]: [4, 1],
    [at(6, 1)]: [1, 8, 9],
    [at(5, 3)]: [1, 8, 9],
    [at(6, 8)]: [1, 8, 9],
    [at(8, 1)]: [1, 8, 9],
  });

  const CHAIN = '(1)R4C1 = (4)R4C2/R4C3 - (4)R6C2 = (1)R6C2';
  const found = () => pick(findAllTechniqueInstances(grid, 'ALS Chain'), CHAIN);

  it('uses the set as one node and names its cells and digits', () => {
    const step = found();
    expect(step.chainNodes.some((n) => n.linkVia === 'als')).toBe(true);
    const setNode = step.chainNodes.find((n) => n.linkSet);
    expect(setNode.linkSet.cells.map(cellName)).toEqual(['R4C1', 'R4C2', 'R4C3']);
    expect(setNode.linkSet.digits).toEqual([1, 2, 3, 4]);
    expect(step.chainSets).toEqual([
      { cells: [at(4, 1), at(4, 2), at(4, 3)], digits: [1, 2, 3, 4] },
    ]);
  });

  it('erases the end digit from cells seeing both ends', () => {
    const step = found();
    expect(elims(step)).toEqual(['R5C3:1', 'R6C1:1']);
  });

  it('starts from the phrase the ALS-XZ lesson already uses', () => {
    const step = found();
    const walk = chainWalk(step);
    const alsLine = walk.find((w) => w.from.linkVia === 'als');
    expect(alsLine.text).toContain('one number more than there are cells');
    expect(TECHNIQUE_DETAILS['ALS Chain'].plain).toContain('one number short of locked');
  });
});

// ---------------------------------------------------------------------------
// Which chain the player is shown
// ---------------------------------------------------------------------------
describe('choosing the chain to show', () => {
  // The ladder is walked once, exactly as the hint path walks it (the
  // what-if search where the named ladder stops), and every rule about
  // which chain a player is shown is checked against that one walk.
  const PLAIN = ['Skyscraper', 'Two-String Kite', 'W-Wing', 'Remote Pairs', 'X-Chain', 'XY-Chain', 'Alternating Chain'];
  const RICH = ['Grouped X-Chain', 'Grouped Alternating Chain', 'Continuous Loop', 'ALS Chain'];
  const EARLIER = [
    'Naked Single', 'Hidden Single', 'Pointing Pair', 'Pointing Triple', 'Claiming',
    'Naked Pair', 'Hidden Pair', 'Naked Triple', 'Hidden Triple', 'Naked Quad', 'Hidden Quad',
    'X-Wing', 'Swordfish', 'XY-Wing', 'XYZ-Wing', 'WXYZ-Wing',
  ];

  /** Every board the hint path shows a chain on, with the chain it showed. */
  const chainHints = () => {
    const seen = [];
    for (const { name, puzzle } of library) {
      let grid = buildGrid(puzzle);
      for (let i = 0; i < 250; i++) {
        let step = findNextLogicStep(grid, null);
        if (!step) step = findWhatIfStep(grid);
        if (!step) break;
        if (CHAIN_TECHNIQUES.includes(step.technique)) seen.push({ name, grid, step });
        grid = applyLogicStep(grid, step);
        if (step.placement) grid = eliminateCandidatesFromPeers(grid, step.placement.cell, step.placement.digit);
      }
    }
    return seen;
  };

  const hints = chainHints();

  it('reaches the new rungs on real boards, plain ones and rich ones', () => {
    const names = new Set(hints.map((h) => h.step.technique));
    expect(hints.length, 'the library should show the player some chains').toBeGreaterThan(0);
    expect([...names].filter((n) => PLAIN.includes(n)).length).toBeGreaterThan(0);
    expect([...names].filter((n) => RICH.includes(n)).length).toBeGreaterThan(0);
  });

  it('prefers a plain chain over a grouped, looped or set-based one', () => {
    // Wherever the hint is one of the richer forms, no plain chain was
    // available at the hint's own cap: the player meets the simpler form of
    // an idea first.
    for (const { name, grid, step } of hints) {
      if (!RICH.includes(step.technique)) continue;
      for (const plain of PLAIN) {
        expect(
          findChain(grid, null, false, plain),
          `${name}: the hint was ${step.technique} while a ${plain} was on the board`
        ).toBeNull();
      }
    }
  });

  it('no new chain rung ever pre-empts an easier technique', () => {
    for (const { name, grid, step } of hints) {
      for (const easier of EARLIER) {
        expect(
          findAllTechniqueInstances(grid, easier),
          `${name}: the hint was ${step.technique} while a ${easier} was on the board`
        ).toEqual([]);
      }
    }
  });

  it('shows the shortest chain, and the same one every time', () => {
    const grid = marksOnly({
      [at(1, 1)]: [5, 8, 9],
      [at(1, 5)]: [5, 8, 9],
      [at(7, 1)]: [5, 8, 9],
      [at(7, 6)]: [5, 8, 9],
      [at(2, 6)]: [5, 1, 2],
      [at(3, 6)]: [5, 1, 2],
      [at(8, 5)]: [5, 1, 2],
      [at(9, 5)]: [5, 1, 2],
    });
    const first = findChain(grid, null, false, 'Skyscraper');
    const again = findChain(grid, null, false, 'Skyscraper');
    expect(first.chainNotation).toBe(again.chainNotation);
    const all = findAllTechniqueInstances(grid, 'Skyscraper').filter((s) => s.digit === 5);
    const lengths = all.map((s) => s.chainNodes.length);
    expect(lengths).toEqual([...lengths].sort((a, b) => a - b));
  });

  it('a hint never shows more nodes than the cap, and Scan may go further', () => {
    expect(HINT_CHAIN_NODES).toBe(10);
    expect(SCAN_CHAIN_NODES).toBe(16);
    for (const { puzzle } of library) {
      let grid = buildGrid(puzzle);
      for (let i = 0; i < 60; i++) {
        const step = findNextLogicStep(grid, null);
        if (!step) break;
        if (Array.isArray(step.chainNodes)) {
          expect(step.chainNodes.length).toBeLessThanOrEqual(HINT_CHAIN_NODES);
        }
        grid = applyLogicStep(grid, step);
        if (step.placement) grid = eliminateCandidatesFromPeers(grid, step.placement.cell, step.placement.digit);
      }
    }
  });

  it('a chain never pre-empts a single', () => {
    // The Skyscraper grid with one cell left holding a single mark.
    const grid = marksOnly({
      [at(1, 1)]: [5, 8, 9],
      [at(1, 5)]: [5, 8, 9],
      [at(7, 1)]: [5, 8, 9],
      [at(7, 6)]: [5, 8, 9],
      [at(2, 6)]: [5, 1, 2],
      [at(3, 6)]: [5, 1, 2],
      [at(8, 5)]: [5, 1, 2],
      [at(9, 5)]: [5, 1, 2],
      [at(2, 2)]: [4],
    });
    expect(findAllTechniqueInstances(grid, 'Skyscraper').length).toBeGreaterThan(0);
    const step = findNextLogicStep(grid, null);
    expect(step.technique).toBe('Naked Single');
    expect(step.placement).toEqual({ cell: at(2, 2), digit: 4 });
  });

  it('never reports a chain that is only a long way of saying Naked Pair or XY-Wing', () => {
    // Two bi-value cells holding the same pair in one row: a Naked Pair.
    // No chain name may report that shape - two cells and four nodes - back
    // to the player under a harder name.
    const nakedPair = marksOnly({
      [at(1, 1)]: [2, 7],
      [at(1, 5)]: [2, 7],
      [at(1, 9)]: [2, 7, 9],
    });
    const cellsOf = (step) => new Set(step.chainNodes.flatMap((n) => n.cells));
    for (const technique of CHAIN_TECHNIQUES) {
      for (const step of findAllTechniqueInstances(nakedPair, technique)) {
        expect(cellsOf(step).size, `${technique}: ${step.chainNotation}`).toBeGreaterThan(2);
      }
    }
    // Pivot {2,5} seeing wings {2,8} and {5,8}: an XY-Wing, which is a
    // six-node chain over three bi-value cells and is taught under its own
    // name, five rungs earlier.
    const xyWing = marksOnly({
      [at(5, 5)]: [2, 5],
      [at(5, 1)]: [2, 8],
      [at(1, 5)]: [5, 8],
      [at(1, 1)]: [8, 3, 4],
    });
    expect(findAllTechniqueInstances(xyWing, 'XY-Wing').length).toBeGreaterThan(0);
    for (const technique of CHAIN_TECHNIQUES) {
      for (const step of findAllTechniqueInstances(xyWing, technique)) {
        const isXYWingShape =
          step.chainNodes.length === 6 &&
          cellsOf(step).size === 3 &&
          step.chainNodes.every((n) => n.cells.length === 1) &&
          step.chainNodes.slice(0, 5).every((n, i) => (i % 2 === 0 ? n.linkVia === 'bivalue' : n.linkVia === 'unit'));
        expect(isXYWingShape, `${technique}: ${step.chainNotation}`).toBe(false);
      }
    }
  });

  it('every chain it reports spans at least three cells', () => {
    // A chain over two cells is a pair or a hidden pair whichever way its
    // links fall, and both are taught long before any chain.
    for (const { name, puzzle } of library) {
      let grid = buildGrid(puzzle);
      for (let i = 0; i < 60; i++) {
        for (const technique of CHAIN_TECHNIQUES) {
          for (const step of findAllTechniqueInstances(grid, technique)) {
            const cells = new Set(step.chainNodes.flatMap((n) => n.cells));
            expect(cells.size, `${name}: ${technique} ${step.chainNotation}`).toBeGreaterThan(2);
          }
        }
        const step = findNextLogicStep(grid, null);
        if (!step) break;
        grid = applyLogicStep(grid, step);
        if (step.placement) grid = eliminateCandidatesFromPeers(grid, step.placement.cell, step.placement.digit);
      }
    }
  }, 300000);
});

// ---------------------------------------------------------------------------
// Soundness on the library, with the group rule stated explicitly
// ---------------------------------------------------------------------------
describe('chains agree with the solution on every library puzzle', () => {
  it('and a grouped elimination always sees every cell of both endpoint groups', () => {
    let groupedChecked = 0;
    let elimsChecked = 0;
    for (const { name, puzzle } of library) {
      let grid = buildGrid(puzzle);
      const solution = solveSudoku(grid).map((c) => c.value);
      for (let i = 0; i < 80; i++) {
        for (const technique of CHAIN_TECHNIQUES) {
          for (const step of findAllTechniqueInstances(grid, technique)) {
            if (step.placement) {
              expect(
                step.placement.digit,
                `${name}: ${technique} places ${step.placement.digit} at ${cellName(step.placement.cell)}`
              ).toBe(solution[step.placement.cell]);
            }
            const ends = step.chainClosed
              ? []
              : [step.chainNodes[0], step.chainNodes[step.chainNodes.length - 1]];
            const grouped = ends.filter((n) => n.cells.length > 1);
            for (const e of step.eliminations) {
              expect(
                e.digit,
                `${name}: ${technique} erases ${e.digit} from ${cellName(e.cell)}, the solution digit`
              ).not.toBe(solution[e.cell]);
              elimsChecked++;
              for (const group of grouped) {
                for (const cell of group.cells) {
                  expect(
                    arePeers(e.cell, cell),
                    `${name}: ${technique} erases ${cellName(e.cell)} without seeing ${cellName(cell)} of its endpoint group`
                  ).toBe(true);
                }
                groupedChecked++;
              }
            }
          }
        }
        const step = findNextLogicStep(grid, null);
        if (!step) break;
        grid = applyLogicStep(grid, step);
        if (step.placement) grid = eliminateCandidatesFromPeers(grid, step.placement.cell, step.placement.digit);
      }
    }
    expect(elimsChecked).toBeGreaterThan(0);
    expect(groupedChecked, 'the library should show the engine some grouped endpoints').toBeGreaterThan(0);
  }, 300000);
});

// ---------------------------------------------------------------------------
// Teaching content
// ---------------------------------------------------------------------------
describe('every new chain name ships with its teaching content', () => {
  for (const technique of CHAIN_TECHNIQUES) {
    it(`${technique}: tier, panel entry and reference dialog`, () => {
      const info = TECHNIQUE_INFO[technique];
      expect(info, 'the hint card must know its tier').toBeTruthy();
      expect(['Expert', 'Ultimate']).toContain(info.level);
      expect(info.description.length).toBeGreaterThan(20);

      const tier = TECHNIQUE_TIERS.find((t) => t.techniques.some((x) => x.full === technique));
      expect(tier, 'the Techniques list must place it').toBeTruthy();
      expect(tier.level).toBe(info.level);
      expect(techniqueTier(technique)).toBe(info.level);

      const details = TECHNIQUE_DETAILS[technique];
      expect(details, 'no reference entry').toBeTruthy();
      for (const part of ['plain', 'description', 'example', 'strategy']) {
        expect(details[part]?.length, `${technique} is missing its ${part}`).toBeGreaterThan(30);
      }
      // Plain words stay plain: no vocabulary to learn first.
      expect(details.plain).not.toMatch(/\b(candidate|unit|bi-value|peer|ALS|node|conjugate)\b/i);
    });
  }

  it('puts the four short names in Expert and the rest in Ultimate', () => {
    for (const name of ['Skyscraper', 'Two-String Kite', 'W-Wing', 'Remote Pairs']) {
      expect(TECHNIQUE_INFO[name].level, name).toBe('Expert');
    }
    for (const name of ['X-Chain', 'XY-Chain', 'Alternating Chain', 'Grouped X-Chain',
      'Grouped Alternating Chain', 'Continuous Loop', 'ALS Chain']) {
      expect(TECHNIQUE_INFO[name].level, name).toBe('Ultimate');
    }
  });

  it('is findable by the names a guide would use', () => {
    const named = (query) => matchTechniques(query).map((t) => t.name);
    expect(named('chain')).toEqual(expect.arrayContaining(CHAIN_TECHNIQUES));
    expect(named('aic')).toContain('Alternating Chain');
    expect(named('nice loop')).toContain('Continuous Loop');
    expect(named('turbot')).toEqual(expect.arrayContaining(['Skyscraper', 'Two-String Kite']));
    expect(named('kite')).toContain('Two-String Kite');
    expect(named('grouped')).toEqual(
      expect.arrayContaining(['Grouped X-Chain', 'Grouped Alternating Chain'])
    );
    expect(named('remote pair')).toContain('Remote Pairs');
  });

  it('speaks the Expert vocabulary in the formal half of each entry', () => {
    expect(TECHNIQUE_DETAILS['Continuous Loop'].description).toContain('nice loop');
    expect(TECHNIQUE_DETAILS['Alternating Chain'].description).toContain('alternating inference chain');
    expect(TECHNIQUE_DETAILS['ALS Chain'].description).toContain('Almost Locked Set');
    expect(TECHNIQUE_DETAILS['ALS Chain'].description).toContain('restricted common');
  });
});

// ---------------------------------------------------------------------------
// What the board draws
// ---------------------------------------------------------------------------
describe('the board draws the chain', () => {
  const grid = marksOnly({
    [at(1, 2)]: [5, 8, 9],
    [at(4, 2)]: [5, 8, 9],
    [at(6, 2)]: [5, 8, 9],
    [at(5, 1)]: [5, 8, 9],
    [at(5, 8)]: [5, 8, 9],
    [at(1, 8)]: [5, 1, 2],
  });
  const grouped = () =>
    pick(
      findAllTechniqueInstances(grid, 'Grouped X-Chain'),
      '(5)R1C2 = (5)R4C2/R6C2 - (5)R5C1 = (5)R5C8'
    );

  it('draws one line per link, solid for strong and dashed for weak', () => {
    const overlay = buildChainOverlay(grouped(), 60);
    expect(overlay.links.map((l) => l.strong)).toEqual([true, false, true]);
    expect(overlay.closed).toBe(false);
  });

  it('draws a group as one region, joined up and never over the gap', () => {
    const overlay = buildChainOverlay(grouped(), 60);
    expect(overlay.groups).toHaveLength(1);
    const [region] = overlay.groups;
    // R4C2 and R6C2: the node's extent is one column wide and three rows
    // tall, but R5C2 is not in the group, so the outline is drawn cell by
    // cell and joined, never as one box over the cell between them.
    expect(Math.round(region.width)).toBe(48);
    expect(Math.round(region.height)).toBe(168);
    expect(region.parts).toHaveLength(2);
    for (const part of region.parts) {
      expect(Math.round(part.width)).toBe(48);
      expect(Math.round(part.height)).toBe(48);
    }
    expect(region.joins).toHaveLength(1);
    // The node's own anchor is the middle of the region, so the links meet
    // the group once rather than once per cell.
    expect(overlay.links[0].to).toEqual(overlay.links[1].from);
  });

  it('marks both endpoints as the pair that one of is true', () => {
    const overlay = buildChainOverlay(grouped(), 60);
    // Two single-cell ends: one ring each. A group at an end is ringed cell
    // by cell, so no ring ever lands on a cell outside the group.
    expect(overlay.endpoints).toHaveLength(2);
    const step = grouped();
    const ends = [step.chainNodes[0], step.chainNodes[step.chainNodes.length - 1]];
    expect(ends.every((n) => n.cells.length === 1)).toBe(true);
  });

  it('draws a continuous loop closed, with no loose ends', () => {
    const loopGrid = marksOnly({
      [at(1, 1)]: [1, 5, 7],
      [at(1, 5)]: [5, 2, 3],
      [at(4, 5)]: [5, 7],
      [at(4, 1)]: [7, 2, 3],
      [at(8, 5)]: [5, 2, 3],
      [at(4, 9)]: [7, 2, 3],
    });
    const [loop] = findAllTechniqueInstances(loopGrid, 'Continuous Loop');
    const overlay = buildChainOverlay(loop, 60);
    expect(overlay.closed).toBe(true);
    expect(overlay.endpoints).toEqual([]);
    // As many lines as nodes: the last one comes back to the first node.
    expect(overlay.links).toHaveLength(loop.chainNodes.length);
    expect(overlay.links[overlay.links.length - 1].to).toEqual(overlay.links[0].from);
  });

  it('draws an almost locked set as its own region, with its digits', () => {
    const alsGrid = marksOnly({
      [at(4, 1)]: [1, 2],
      [at(4, 2)]: [2, 3, 4],
      [at(4, 3)]: [3, 4],
      [at(6, 2)]: [4, 1],
      [at(6, 1)]: [1, 8, 9],
      [at(5, 3)]: [1, 8, 9],
      [at(6, 8)]: [1, 8, 9],
      [at(8, 1)]: [1, 8, 9],
    });
    const step = pick(
      findAllTechniqueInstances(alsGrid, 'ALS Chain'),
      '(1)R4C1 = (4)R4C2/R4C3 - (4)R6C2 = (1)R6C2'
    );
    const overlay = buildChainOverlay(step, 60);
    expect(overlay.sets).toHaveLength(1);
    // The set is R4C1 to R4C3: three cells wide, one row tall, and the
    // region is labelled with the digits it is one short of locking.
    expect(Math.round(overlay.sets[0].width)).toBe(168);
    expect(Math.round(overlay.sets[0].height)).toBe(48);
    expect(overlay.sets[0].digits).toEqual([1, 2, 3, 4]);
    // The group node inside it is drawn too, so the player can tell the
    // set apart from the node the chain actually hangs on.
    expect(overlay.groups).toHaveLength(1);
  });

  it('nothing to draw for a step that is not a chain', () => {
    expect(buildChainOverlay(null, 60)).toBeNull();
    expect(buildChainOverlay({ technique: 'Naked Pair' }, 60)).toBeNull();
    expect(buildChainOverlay(grouped(), null)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Performance: the ladder runs on every hint, and the panel counts live
// ---------------------------------------------------------------------------
describe('what the chain detectors cost', () => {
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

  const out = (text) => {
    const stdout = /** @type {any} */ (globalThis).process?.stdout;
    if (stdout && typeof stdout.write === 'function') stdout.write(`${text}\n`);
    else console.log(text);
  };

  it('each detector stays well inside the 150 ms a live count may cost', () => {
    // Mid-game on the hardest shelf: the most pencil marks and the most
    // patterns to find. Every chain detector reads the same graph, so the
    // first one of a family pays for it and the rest are free.
    const board = playTo(PUZZLES.ultimate[1].puzzle, 40);
    const costs = [];
    for (const technique of CHAIN_TECHNIQUES) {
      const started = performance.now();
      findAllTechniqueInstances(board, technique);
      costs.push({ technique, ms: performance.now() - started });
    }
    out('  chain detectors on a mid-game Ultimate board:');
    for (const { technique, ms } of costs) out(`    ${technique.padEnd(26)} ${ms.toFixed(1).padStart(7)} ms`);
    for (const { technique, ms } of costs) {
      expect(ms, `${technique} cost ${ms.toFixed(1)} ms`).toBeLessThan(150);
    }
  });

  it('the whole named ladder stays under a second on a mid-game grid', () => {
    for (const shelf of ['diabolical', 'ultimate']) {
      for (const { name, puzzle } of PUZZLES[shelf]) {
        const board = playTo(puzzle, 40);
        const started = performance.now();
        findNextLogicStep(board, null);
        const ms = performance.now() - started;
        out(`  ladder on ${shelf}/${name}: ${ms.toFixed(1)} ms`);
        expect(ms, `${name}: the ladder took ${ms.toFixed(1)} ms`).toBeLessThan(1000);
      }
    }
  });
});
