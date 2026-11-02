// The subsets-and-wings batch: Hidden Triple, Naked Quad, Hidden Quad,
// XYZ-Wing and WXYZ-Wing.
//
// Each technique is pinned on a hand-built grid: the exact eliminations and
// the exact cells the hint card will highlight. The solution-oracle run in
// oracleAll.spec.js covers them against every library puzzle; these tests
// cover the shapes the library happens not to show, the two detection notes
// the spec calls out (a subset that erases nothing is not a step, and an
// XYZ-Wing only eliminates where a cell sees all three), the teaching
// ladder, and the teaching content every technique ships with.
import { describe, it, expect } from 'vitest';
import { findAllTechniqueInstances, findNextLogicStep, generateCandidates, applyLogicStep, eliminateCandidatesFromPeers } from '../logicEngine';
import { buildHighlightSets } from '../stepHighlights';
import { explainStep } from '../explainStep';
import { TECHNIQUE_INFO, TECHNIQUE_TIERS, TECHNIQUE_DETAILS } from '../techniqueCatalog';
import { PUZZLES } from '../puzzles';

const NEW_TECHNIQUES = ['Hidden Triple', 'Naked Quad', 'Hidden Quad', 'XYZ-Wing', 'WXYZ-Wing'];

/** R,C in the 1-based names the product uses, as a 0..80 index. */
const at = (row, col) => (row - 1) * 9 + (col - 1);

/**
 * A board of empty cells. `marks` sets the pencil marks that matter; every
 * other cell gets all nine, so no unit outside the pattern can hold a
 * subset and nothing else competes with the technique under test.
 */
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

/** Eliminations as a sorted, readable list: "R1C1:7". */
const elims = (step) =>
  step.eliminations.map((e) => `R${Math.floor(e.cell / 9) + 1}C${(e.cell % 9) + 1}:${e.digit}`).sort();

const highlights = (step) => {
  const { baseCells, targetCells } = buildHighlightSets([step]);
  return { base: [...baseCells].sort((a, b) => a - b), targets: [...targetCells].sort((a, b) => a - b) };
};

describe('Hidden Triple', () => {
  // Row 1: the digits 1, 2 and 3 fit nowhere in the row but R1C1, R1C2 and
  // R1C3, so those three cells lose 7, 8 and 9.
  const grid = gridWith({
    [at(1, 1)]: [1, 2, 7],
    [at(1, 2)]: [2, 3, 8],
    [at(1, 3)]: [1, 3, 9],
    [at(1, 4)]: [4, 5, 6, 7, 8, 9],
    [at(1, 5)]: [4, 5, 6, 7, 8, 9],
    [at(1, 6)]: [4, 5, 6, 7, 8, 9],
    [at(1, 7)]: [4, 5, 6, 7, 8, 9],
    [at(1, 8)]: [4, 5, 6, 7, 8, 9],
    [at(1, 9)]: [4, 5, 6, 7, 8, 9],
  });

  it('erases the other marks from the three reserved cells', () => {
    const found = findAllTechniqueInstances(grid, 'Hidden Triple');
    expect(found).toHaveLength(1);
    const [step] = found;
    expect(step.unit).toEqual({ type: 'row', index: 0, name: 'row 1' });
    expect(step.subsetDigits).toEqual([1, 2, 3]);
    expect(elims(step)).toEqual(['R1C1:7', 'R1C2:8', 'R1C3:9']);
  });

  it('highlights the three cells as the pattern and as the targets', () => {
    const [step] = findAllTechniqueInstances(grid, 'Hidden Triple');
    expect(highlights(step)).toEqual({
      base: [at(1, 1), at(1, 2), at(1, 3)],
      targets: [at(1, 1), at(1, 2), at(1, 3)],
    });
  });

  it('is not reported when the three cells hold nothing else', () => {
    const nothingToErase = gridWith({
      [at(1, 1)]: [1, 2],
      [at(1, 2)]: [2, 3],
      [at(1, 3)]: [1, 3],
      [at(1, 4)]: [4, 5, 6, 7, 8, 9],
      [at(1, 5)]: [4, 5, 6, 7, 8, 9],
      [at(1, 6)]: [4, 5, 6, 7, 8, 9],
      [at(1, 7)]: [4, 5, 6, 7, 8, 9],
      [at(1, 8)]: [4, 5, 6, 7, 8, 9],
      [at(1, 9)]: [4, 5, 6, 7, 8, 9],
    });
    expect(findAllTechniqueInstances(nothingToErase, 'Hidden Triple')).toEqual([]);
  });
});

describe('Naked Quad', () => {
  // Row 3: four cells share only 1, 2, 3 and 4, so those digits go from the
  // two cells in the row that still offer them.
  const marks = {
    [at(3, 1)]: [1, 2],
    [at(3, 2)]: [2, 3],
    [at(3, 3)]: [3, 4],
    [at(3, 4)]: [1, 4],
    [at(3, 5)]: [1, 5],
    [at(3, 6)]: [2, 6],
    [at(3, 7)]: [5, 6, 7, 8, 9],
    [at(3, 8)]: [5, 6, 7, 8, 9],
    [at(3, 9)]: [5, 6, 7, 8, 9],
  };
  const grid = gridWith(marks);

  it('erases the four digits from the rest of the unit', () => {
    const found = findAllTechniqueInstances(grid, 'Naked Quad');
    expect(found).toHaveLength(1);
    const [step] = found;
    expect(step.unit).toEqual({ type: 'row', index: 2, name: 'row 3' });
    expect(step.subsetDigits).toEqual([1, 2, 3, 4]);
    expect(elims(step)).toEqual(['R3C5:1', 'R3C6:2']);
  });

  it('highlights the four cells as the pattern and the losing cells as targets', () => {
    const [step] = findAllTechniqueInstances(grid, 'Naked Quad');
    expect(highlights(step)).toEqual({
      base: [at(3, 1), at(3, 2), at(3, 3), at(3, 4)],
      targets: [at(3, 5), at(3, 6)],
    });
  });

  it('is not reported when its digits appear nowhere else in the unit', () => {
    const useless = gridWith({
      ...marks,
      [at(3, 5)]: [5, 6, 7, 8, 9],
      [at(3, 6)]: [5, 6, 7, 8, 9],
    });
    expect(findAllTechniqueInstances(useless, 'Naked Quad')).toEqual([]);
  });
});

describe('Hidden Quad', () => {
  // Row 5: the digits 1, 2, 3 and 4 fit only in the first four cells.
  const grid = gridWith({
    [at(5, 1)]: [1, 2, 7],
    [at(5, 2)]: [2, 3, 8],
    [at(5, 3)]: [3, 4, 9],
    [at(5, 4)]: [1, 4, 7],
    [at(5, 5)]: [5, 6, 7, 8, 9],
    [at(5, 6)]: [5, 6, 7, 8, 9],
    [at(5, 7)]: [5, 6, 7, 8, 9],
    [at(5, 8)]: [5, 6, 7, 8, 9],
    [at(5, 9)]: [5, 6, 7, 8, 9],
  });

  it('erases the other marks from the four reserved cells', () => {
    const found = findAllTechniqueInstances(grid, 'Hidden Quad');
    expect(found).toHaveLength(1);
    const [step] = found;
    expect(step.unit).toEqual({ type: 'row', index: 4, name: 'row 5' });
    expect(step.subsetDigits).toEqual([1, 2, 3, 4]);
    expect(elims(step)).toEqual(['R5C1:7', 'R5C2:8', 'R5C3:9', 'R5C4:7']);
  });

  it('highlights the four cells as the pattern and as the targets', () => {
    const [step] = findAllTechniqueInstances(grid, 'Hidden Quad');
    expect(highlights(step)).toEqual({
      base: [at(5, 1), at(5, 2), at(5, 3), at(5, 4)],
      targets: [at(5, 1), at(5, 2), at(5, 3), at(5, 4)],
    });
  });
});

describe('XYZ-Wing', () => {
  // Pivot R5C5 = {2,5,8} with wings R5C2 = {2,8} (same row) and R4C4 =
  // {5,8} (same box). R5C4 sees all three and loses 8. R4C2 sees both
  // wings but NOT the pivot, which is the whole difference from XY-Wing:
  // the pivot can be 8 itself, so R4C2 keeps its 8.
  const pivot = at(5, 5);
  const wing1 = at(5, 2);
  const wing2 = at(4, 4);
  const grid = gridWith({
    [pivot]: [2, 5, 8],
    [wing1]: [2, 8],
    [wing2]: [5, 8],
    [at(5, 4)]: [1, 8],
    [at(5, 6)]: [3, 4],
    [at(4, 2)]: [1, 8],
  });

  it('eliminates only in cells that see the pivot and both wings', () => {
    const found = findAllTechniqueInstances(grid, 'XYZ-Wing');
    expect(found).toHaveLength(1);
    const [step] = found;
    expect(step.digit).toBe(8);
    expect(step.baseCells[0]).toBe(pivot);
    expect([...step.baseCells].sort((a, b) => a - b)).toEqual([wing2, wing1, pivot].sort((a, b) => a - b));
    expect(elims(step)).toEqual(['R5C4:8']);
  });

  it('leaves a cell that sees both wings but not the pivot alone', () => {
    const [step] = findAllTechniqueInstances(grid, 'XYZ-Wing');
    const targets = step.eliminations.map((e) => e.cell);
    // R4C2 sees R5C2 (column 2) and R4C4 (row 4), and an XY-Wing on the
    // two wings alone would erase its 8. The pivot is a third place the 8
    // could go, so it must survive.
    expect(targets).not.toContain(at(4, 2));
    expect(grid[at(4, 2)].candidates).toContain(8);
  });

  it('highlights pivot and wings as the pattern and the losing cell as the target', () => {
    const [step] = findAllTechniqueInstances(grid, 'XYZ-Wing');
    expect(highlights(step)).toEqual({
      base: [wing2, wing1, pivot].sort((a, b) => a - b),
      targets: [at(5, 4)],
    });
  });
});

describe('WXYZ-Wing', () => {
  // R1C1 {1,2}, R1C2 {2,3} and R1C3 {3,4} in row 1, plus R5C1 {1,4} in
  // column 1: four cells, four digits. The 1s, 2s and 3s each sit in cells
  // that see one another, so three digits cover at most three cells and one
  // of the four must be the 4. The 4s sit in R1C3 and R5C1, so a cell
  // seeing both of them cannot be 4.
  const set = [at(1, 1), at(1, 2), at(1, 3), at(5, 1)];
  const grid = gridWith({
    [at(1, 1)]: [1, 2],
    [at(1, 2)]: [2, 3],
    [at(1, 3)]: [3, 4],
    [at(5, 1)]: [1, 4],
    [at(2, 1)]: [4, 5],
    [at(3, 1)]: [5, 6],
    [at(4, 3)]: [5, 6],
    [at(5, 3)]: [6, 7],
    [at(6, 3)]: [7, 8],
  });

  it('eliminates the shared digit from cells that see every one of its places', () => {
    const found = findAllTechniqueInstances(grid, 'WXYZ-Wing');
    expect(found).toHaveLength(1);
    const [step] = found;
    expect(step.digit).toBe(4);
    expect(step.subsetDigits).toEqual([1, 2, 3, 4]);
    expect([...step.baseCells].sort((a, b) => a - b)).toEqual([...set].sort((a, b) => a - b));
    expect([...step.zCells].sort((a, b) => a - b)).toEqual([at(1, 3), at(5, 1)]);
    // R2C1 sees R1C3 (box 1) and R5C1 (column 1). R3C1, R4C3, R5C3 and
    // R6C3 see them too but hold no 4.
    expect(elims(step)).toEqual(['R2C1:4']);
  });

  it('highlights the four cells as the pattern and the losing cell as the target', () => {
    const [step] = findAllTechniqueInstances(grid, 'WXYZ-Wing');
    expect(highlights(step)).toEqual({
      base: [...set].sort((a, b) => a - b),
      targets: [at(2, 1)],
    });
  });

  it('does not report four cells of one unit, which are a Naked Quad', () => {
    // The same four digits over four cells of row 1: the quad is the
    // lesson, and it is taught three rungs earlier.
    const quad = gridWith({
      [at(1, 1)]: [1, 2],
      [at(1, 2)]: [2, 3],
      [at(1, 3)]: [3, 4],
      [at(1, 4)]: [1, 4],
      [at(1, 5)]: [1, 5],
    });
    expect(findAllTechniqueInstances(quad, 'WXYZ-Wing')).toEqual([]);
    expect(findAllTechniqueInstances(quad, 'Naked Quad')).toHaveLength(1);
  });
});

describe('the teaching ladder', () => {
  it('prefers a Naked Single to a new technique on the same board', () => {
    // Row 3 carries the Naked Quad of the test above; R9C9 has one mark
    // left. The hint must be the single.
    const grid = gridWith({
      [at(3, 1)]: [1, 2],
      [at(3, 2)]: [2, 3],
      [at(3, 3)]: [3, 4],
      [at(3, 4)]: [1, 4],
      [at(3, 5)]: [1, 5],
      [at(3, 6)]: [2, 6],
      [at(9, 9)]: [7],
    });
    expect(findAllTechniqueInstances(grid, 'Naked Quad')).toHaveLength(1);
    const step = findNextLogicStep(grid, null);
    expect(step.technique).toBe('Naked Single');
    expect(step.placement).toEqual({ cell: at(9, 9), digit: 7 });
  });

  const buildGrid = (puzzle) =>
    generateCandidates(
      puzzle.map((value, index) => ({
        cellIndex: index,
        value: value || null,
        isFixed: value !== 0,
        candidates: [],
        isHighlighted: false,
        highlightColor: null,
        isBaseCell: false,
        isTargetCell: false,
      }))
    );

  // The rungs, easiest first; one entry per detector, so the pointing pair
  // and triple share theirs. The hint path must never reach for one of
  // these while anything above it is still on the board.
  const RUNGS = [
    ['Naked Single'], ['Hidden Single'],
    ['Pointing Pair', 'Pointing Triple'], ['Claiming'],
    ['Naked Pair'], ['Hidden Pair'], ['Naked Triple'],
    ['Hidden Triple'], ['Naked Quad'], ['Hidden Quad'],
    ['X-Wing'], ['Swordfish'], ['XY-Wing'], ['XYZ-Wing'], ['WXYZ-Wing'],
  ];

  it('places the five new techniques in the order the spec gives', () => {
    const library = Object.values(PUZZLES).flat();
    const reached = new Set();
    for (const { name, puzzle } of library) {
      let grid = buildGrid(puzzle);
      for (let n = 0; n < 300; n++) {
        const step = findNextLogicStep(grid, null);
        if (!step) break;
        const rung = RUNGS.findIndex((names) => names.includes(step.technique));
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
    // The walk really exercised the rungs the new techniques sit between.
    expect([...reached].length).toBeGreaterThan(4);
    // Hidden Triple is this batch's rung that the library's solve paths
    // still reach. XYZ-Wing's one step (on Witching Hour) is explained by
    // the Empty Rectangle that #72 placed earlier on the ladder, so the
    // named walk no longer gets that far; the technique itself is still
    // found on the board, which oracleAll.spec.js checks.
    expect(reached).toContain('Hidden Triple');
  });
});

describe('every new technique ships with its teaching content', () => {
  for (const technique of NEW_TECHNIQUES) {
    it(`${technique}: tier, panel entry and reference dialog`, () => {
      const info = TECHNIQUE_INFO[technique];
      expect(info).toBeTruthy();
      expect(['Advanced', 'Expert']).toContain(info.level);
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
      expect(details.plain).not.toMatch(/\b(candidate|unit|bi-value|peer|ALS)\b/i);
    });
  }

  it('the Advanced tier is Advanced and the wings are Expert', () => {
    expect(TECHNIQUE_INFO['Hidden Triple'].level).toBe('Advanced');
    expect(TECHNIQUE_INFO['Naked Quad'].level).toBe('Advanced');
    expect(TECHNIQUE_INFO['Hidden Quad'].level).toBe('Advanced');
    expect(TECHNIQUE_INFO['XYZ-Wing'].level).toBe('Expert');
    expect(TECHNIQUE_INFO['WXYZ-Wing'].level).toBe('Expert');
  });

  it('says in the reference text that quints and larger are redundant', () => {
    const text = `${TECHNIQUE_DETAILS['Naked Quad'].plain} ${TECHNIQUE_DETAILS['Naked Quad'].description} ${TECHNIQUE_DETAILS['Hidden Quad'].plain}`;
    expect(text).toMatch(/smaller subset|redundant/i);
  });
});

describe('one size up, in the same words', () => {
  const LOOK = /^Look at (row|column|box) \d\. The numbers .+ can only go in (two|three|four) cells there: .+\.$/;
  const WHY = /^Those (two|three|four) numbers have nowhere else to go, so between them they must fill (both|all three|all four) cells\. That leaves no room for anything else in those cells, so their other pencil marks \(.+\) can go\.$/;

  const hiddenPairGrid = gridWith({
    [at(1, 1)]: [1, 2, 7],
    [at(1, 2)]: [1, 2, 8],
    [at(1, 3)]: [3, 4, 5, 6, 9],
    [at(1, 4)]: [3, 4, 5, 6, 9],
    [at(1, 5)]: [3, 4, 5, 6, 9],
    [at(1, 6)]: [3, 4, 5, 6, 9],
    [at(1, 7)]: [3, 4, 5, 6, 9],
    [at(1, 8)]: [3, 4, 5, 6, 9],
    [at(1, 9)]: [3, 4, 5, 6, 9],
  });
  const hiddenTripleGrid = gridWith({
    [at(1, 1)]: [1, 2, 7],
    [at(1, 2)]: [2, 3, 8],
    [at(1, 3)]: [1, 3, 9],
    [at(1, 4)]: [4, 5, 6, 7, 8, 9],
    [at(1, 5)]: [4, 5, 6, 7, 8, 9],
    [at(1, 6)]: [4, 5, 6, 7, 8, 9],
    [at(1, 7)]: [4, 5, 6, 7, 8, 9],
    [at(1, 8)]: [4, 5, 6, 7, 8, 9],
    [at(1, 9)]: [4, 5, 6, 7, 8, 9],
  });
  const hiddenQuadGrid = gridWith({
    [at(5, 1)]: [1, 2, 7],
    [at(5, 2)]: [2, 3, 8],
    [at(5, 3)]: [3, 4, 9],
    [at(5, 4)]: [1, 4, 7],
    [at(5, 5)]: [5, 6, 7, 8, 9],
    [at(5, 6)]: [5, 6, 7, 8, 9],
    [at(5, 7)]: [5, 6, 7, 8, 9],
    [at(5, 8)]: [5, 6, 7, 8, 9],
    [at(5, 9)]: [5, 6, 7, 8, 9],
  });

  const plain = (grid, technique) => {
    const [step] = findAllTechniqueInstances(grid, technique);
    expect(step, `no ${technique} on the test grid`).toBeTruthy();
    return explainStep(step, grid, 'simple');
  };

  it('Hidden Pair, Hidden Triple and Hidden Quad read as one family', () => {
    const pair = plain(hiddenPairGrid, 'Hidden Pair');
    const triple = plain(hiddenTripleGrid, 'Hidden Triple');
    const quad = plain(hiddenQuadGrid, 'Hidden Quad');
    for (const out of [pair, triple, quad]) {
      expect(out.look).toMatch(LOOK);
      expect(out.why).toMatch(WHY);
    }
    expect(triple.look).toContain('can only go in three cells there');
    expect(quad.look).toContain('can only go in four cells there');
    expect(triple.why).toContain('Those three numbers have nowhere else to go');
    expect(quad.why).toContain('Those four numbers have nowhere else to go');
  });

  it('Naked Triple and Naked Quad read as one family', () => {
    const tripleGrid = gridWith({
      [at(1, 1)]: [1, 2],
      [at(1, 2)]: [2, 3],
      [at(1, 3)]: [1, 3],
      [at(1, 4)]: [1, 5],
    });
    const quadGrid = gridWith({
      [at(3, 1)]: [1, 2],
      [at(3, 2)]: [2, 3],
      [at(3, 3)]: [3, 4],
      [at(3, 4)]: [1, 4],
      [at(3, 5)]: [1, 5],
    });
    const triple = plain(tripleGrid, 'Naked Triple');
    const quad = plain(quadGrid, 'Naked Quad');
    expect(triple.look).toMatch(/^Look at three cells in row 1: .+\. Between them, their only pencil marks are .+\.$/);
    expect(quad.look).toMatch(/^Look at four cells in row 3: .+\. Between them, their only pencil marks are .+\.$/);
    expect(triple.why).toContain('cells that share only three numbers must use up all of those numbers between them');
    expect(quad.why).toContain('cells that share only four numbers must use up all of those numbers between them');
  });

  it('XYZ-Wing reads as XY-Wing with the pivot counted in', () => {
    const grid = gridWith({
      [at(5, 5)]: [2, 5, 8],
      [at(5, 2)]: [2, 8],
      [at(4, 4)]: [5, 8],
      [at(5, 4)]: [1, 8],
    });
    const out = plain(grid, 'XYZ-Wing');
    expect(out.look).toMatch(/^Look at three cells\. The middle one is R5C5 \(2 or 5 or 8\), which has three pencil marks instead of two\./);
    expect(out.look).toContain('It is connected to R5C2');
    expect(out.why).toContain('the middle cell included');
    expect(out.why).toContain('shares a row, column, or box with all three');
    expect(out.why).toContain('seeing just the two outer cells is not enough');
    expect(`${out.look} ${out.why}`).not.toMatch(/\b(candidate|unit|pivot|wing|bi-value)\b/i);
  });

  it('WXYZ-Wing explains the four cells in plain words', () => {
    const grid = gridWith({
      [at(1, 1)]: [1, 2],
      [at(1, 2)]: [2, 3],
      [at(1, 3)]: [3, 4],
      [at(5, 1)]: [1, 4],
      [at(2, 1)]: [4, 5],
    });
    const out = plain(grid, 'WXYZ-Wing');
    expect(out.look).toContain('Look at four cells');
    expect(out.look).toContain('their only pencil marks are the four numbers 1, 2, 3, and 4');
    expect(out.why).toContain('Three numbers cannot fill four cells');
    expect(out.action.startsWith('Erase the pencil mark 4 from R2C1')).toBe(true);
    expect(`${out.look} ${out.why}`).not.toMatch(/\b(candidate|unit|restricted|bi-value)\b/i);
  });
});
