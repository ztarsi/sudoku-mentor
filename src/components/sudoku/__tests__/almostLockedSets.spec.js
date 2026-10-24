// The rest of the almost-locked-set family (#73): ALS-XY-Wing, Death
// Blossom, Sue de Coq and its extended form.
//
// Three things are checked here, in that order of importance.
//
//   1. The eliminations are exactly right, on grids built so that the
//      boundary case sits one cell away. Every technique in this family
//      erases a digit because it is certain to land inside a group, and the
//      cell it is erased from must see EVERY cell of EVERY group that could
//      hold it. One cell short is a candidate taken from the true answer,
//      so each technique has a near-miss grid of its own beside its
//      working one. (The restricted-common check they all rest on is tested
//      on its own in restrictedCommon.spec.js, away from the techniques.)
//   2. The player is shown the groups, can walk the proof, and reads
//      wording that starts from the ALS-XZ lesson's own phrase, "one number
//      short of locked".
//   3. Nothing here pre-empts a rung the player already knows, and none of
//      it costs more than the ladder can afford.
//
// Soundness against the true answer on every intermediate grid of every
// library puzzle is oracleAll.spec.js's job; these four are in its list.
import { describe, it, expect } from 'vitest';
import {
  findAllTechniqueInstances,
  findNextLogicStep,
  generateCandidates,
  applyLogicStep,
  eliminateCandidatesFromPeers,
} from '../logicEngine';
import { ALS_FINDERS, ALS_TECHNIQUE_NAMES } from '../alsEngine';
import { chainWalk, explainStep } from '../explainStep';
import { buildChainOverlay, buildFocusedCandidates } from '../stepHighlights';
import {
  TECHNIQUES,
  TECHNIQUE_DETAILS,
  TECHNIQUE_INFO,
  SCAN_TECHNIQUES,
  SEARCH_TECHNIQUES,
  isTrialTechnique,
  teachingRank,
} from '../techniqueCatalog';
import { cellName } from '../gridUnits';
import { PUZZLES } from '../puzzles';

/** R,C in the names the product uses, as a 0..80 index. */
const at = (row, col) => (row - 1) * 9 + (col - 1);

/**
 * A board with no digits placed, carrying only the pencil marks that
 * matter: the pattern under test and nothing else. Every other cell keeps
 * all nine marks, so no set but the ones written here exists.
 */
const marksOnly = (marks) =>
  generateCandidates(
    Array.from({ length: 81 }, (_, i) => ({
      cellIndex: i,
      value: null,
      isFixed: false,
      candidates: [1, 2, 3, 4, 5, 6, 7, 8, 9],
      isHighlighted: false,
      highlightColor: null,
      isBaseCell: false,
      isTargetCell: false,
    }))
  ).map((cell, i) => (marks[i] ? { ...cell, candidates: [...marks[i]] } : cell));

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

const elims = (step) =>
  step.eliminations.map((e) => `${cellName(e.cell)}:${e.digit}`).sort();

const names = (cells) => cells.map(cellName);

const only = (grid, technique) => {
  const all = findAllTechniqueInstances(grid, technique);
  expect(all, `expected exactly one ${technique}, got ${all.length}`).toHaveLength(1);
  return all[0];
};

// ---------------------------------------------------------------------------
// ALS-XY-Wing
// ---------------------------------------------------------------------------
describe('ALS-XY-Wing', () => {
  // R1C1 is {3,9}; R1C2 and R1C5 hold {6,7,9} between them, one number more
  // than there are cells; R4C5 is {3,7}. The 9s of R1C1 and of the pair see
  // each other along row 1, and the 7s of the pair and of R4C5 see each
  // other down column 5. Without a 3, R1C1 is 9, which empties the 9 from
  // the pair, which locks it onto 7, which clashes with the 7 in R4C5 -
  // and R4C5 without its 7 is 3. So the 3 is in R1C1 or R4C5, and R4C1
  // sees both.
  const grid = marksOnly({
    [at(1, 1)]: [3, 9],
    [at(1, 2)]: [6, 9],
    [at(1, 5)]: [6, 7],
    [at(4, 5)]: [3, 7],
    [at(4, 1)]: [3, 5, 8],
  });

  it('erases the shared digit from the cell that sees it in both outer sets', () => {
    const step = only(grid, 'ALS-XY-Wing');
    expect(elims(step)).toEqual(['R4C1:3']);
    expect(step.digit).toBe(3);
    expect(names(step.targetCells)).toEqual(['R4C1']);
  });

  it('names the three sets, the two joining digits and the one erased', () => {
    const step = only(grid, 'ALS-XY-Wing');
    expect(step.alsSets.map((set) => ({ cells: names(set.cells), digits: set.digits, role: set.role }))).toEqual([
      { cells: ['R1C1'], digits: [3, 9], role: 'outer' },
      { cells: ['R1C2', 'R1C5'], digits: [6, 7, 9], role: 'middle' },
      { cells: ['R4C5'], digits: [3, 7], role: 'outer' },
    ]);
    expect([step.xDigit, step.yDigit, step.zDigit]).toEqual([9, 7, 3]);
    expect(names(step.baseCells)).toEqual(['R1C1', 'R1C2', 'R1C5', 'R4C5']);
    expect(step.subsetDigits).toEqual([3, 7, 9]);
  });

  it('is walkable: five links from one end of the pattern to the other', () => {
    const step = only(grid, 'ALS-XY-Wing');
    const walk = chainWalk(step);
    expect(walk.map((link) => link.kind)).toEqual(['strong', 'weak', 'strong', 'weak', 'strong']);
    // The set in the middle is read in the words the ALS-XZ lesson uses.
    expect(walk[2].text).toContain('one number short of locked');
    expect(walk[2].text).toContain('R1C2 and R1C5');
    expect(walk[0].text).toContain('R1C1 has only two pencil marks left, 3 and 9');
    expect(step.chainNotation).toBe(
      '(3)R1C1 = (9)R1C1 - (9)R1C2 = (7)R1C5 - (7)R4C5 = (3)R4C5 => R4C1 <> 3'
    );
  });

  it('draws the set as its own region and rings the two ends', () => {
    const step = only(grid, 'ALS-XY-Wing');
    const overlay = buildChainOverlay(step, 60);
    // One region: the only set with more than one cell.
    expect(overlay.sets).toHaveLength(1);
    expect(overlay.sets[0].digits).toEqual([6, 7, 9]);
    expect(overlay.links.map((link) => link.strong)).toEqual([true, false, true, false, true]);
    // The two ends are the places the erased digit must land in.
    expect(overlay.endpoints).toHaveLength(2);
    expect(overlay.closed).toBe(false);
    // Every digit the chain of sets turns on is coloured, not only the
    // erased one: the two joining digits and the digit at both ends.
    expect(Object.keys(buildFocusedCandidates(step, grid, {})).map(Number).sort()).toEqual([3, 7, 9]);
  });

  it('reports nothing when the erasure misses one cell of a set', () => {
    // The same pattern with R4C5's 3 spread over two cells of column 5.
    // R4C1 sees the 3 in R4C5 but not the one in R6C5, so the digit is no
    // longer certain to be anywhere R4C1 can see, and there is no hint.
    const nearMiss = marksOnly({
      [at(1, 1)]: [3, 9],
      [at(1, 2)]: [6, 9],
      [at(1, 5)]: [6, 7],
      [at(4, 5)]: [3, 7, 1],
      [at(6, 5)]: [3, 1],
      [at(4, 1)]: [3, 5, 8],
    });
    expect(findAllTechniqueInstances(nearMiss, 'ALS-XY-Wing')).toEqual([]);
  });

  it('never reports an XY-Wing: three bi-value cells belong to that lesson', () => {
    // Pivot R1C5 {6,7}, wings R1C1 {3,6} and R4C5 {3,7}: the textbook
    // XY-Wing, which is also three sets one number short of locked. The
    // player meets it as an XY-Wing, fifteen rungs earlier.
    const xyWing = marksOnly({
      [at(1, 1)]: [3, 6],
      [at(1, 5)]: [6, 7],
      [at(4, 5)]: [3, 7],
      [at(4, 1)]: [3, 5, 8],
    });
    expect(findAllTechniqueInstances(xyWing, 'XY-Wing').length).toBeGreaterThan(0);
    expect(findAllTechniqueInstances(xyWing, 'ALS-XY-Wing')).toEqual([]);
  });

  it('starts its lesson from the phrase the ALS-XZ entry uses', () => {
    const step = only(grid, 'ALS-XY-Wing');
    const out = explainStep(step, grid, 'simple');
    expect(out.look).toContain('Group A is the single cell R1C1');
    expect(out.look).toContain('The middle group is the two cells R1C2 and R1C5');
    expect(out.why).toContain('one number short of locked');
    expect(out.why).toContain('R4C1 clashes with every 3 in both groups');
    expect(TECHNIQUE_DETAILS['ALS-XY-Wing'].plain).toContain('one number short of locked');
  });
});

// ---------------------------------------------------------------------------
// Death Blossom
// ---------------------------------------------------------------------------
describe('Death Blossom', () => {
  // The stem R1C1 is {2,4,7}, and each of those has a group of its own, one
  // number short of locked, whose copies of that number all clash with the
  // stem: the 2 with R4C1/R5C1 {2,3,8}, the 4 with R1C9/R5C9 {3,4,8}, the 7
  // with R1C3/R1C5 {3,7,8}. Whatever the stem is, one group locks and must
  // hold the 8. R5C5 sees the 8 in all three.
  const grid = marksOnly({
    [at(1, 1)]: [2, 4, 7],
    [at(4, 1)]: [2, 3],
    [at(5, 1)]: [3, 8],
    [at(1, 9)]: [4, 3],
    [at(5, 9)]: [3, 8],
    [at(1, 3)]: [7, 3],
    [at(1, 5)]: [3, 8],
    [at(5, 5)]: [8, 1, 9],
  });

  it('erases the digit every petal shares from the cell that sees them all', () => {
    const step = only(grid, 'Death Blossom');
    expect(elims(step)).toEqual(['R5C5:8']);
    expect(step.digit).toBe(8);
    expect(step.stemCell).toBe(at(1, 1));
  });

  it('names one petal per mark the stem has left', () => {
    const step = only(grid, 'Death Blossom');
    expect(step.alsSets.map((set) => ({ cells: names(set.cells), digits: set.digits, stemDigit: set.stemDigit }))).toEqual([
      { cells: ['R4C1', 'R5C1'], digits: [2, 3, 8], stemDigit: 2 },
      { cells: ['R1C9', 'R5C9'], digits: [3, 4, 8], stemDigit: 4 },
      { cells: ['R1C3', 'R1C5'], digits: [3, 7, 8], stemDigit: 7 },
    ]);
    expect(step.subsetDigits).toEqual([2, 4, 7, 8]);
  });

  it('is walkable as one case per number the stem could be', () => {
    const step = only(grid, 'Death Blossom');
    const walk = chainWalk(step);
    expect(walk).toHaveLength(3);
    expect(walk.map((link) => link.kind)).toEqual(['case', 'case', 'case']);
    expect(walk[0].text).toContain('If R1C1 is 2');
    expect(walk[0].text).toContain('one number short of locked');
    expect(walk[0].text).toContain('one of them must be 8');
    expect(walk[1].text).toContain('If R1C1 is 4');
    expect(walk[2].text).toContain('If R1C1 is 7');
    // A case is not a chain link: it is neither "at least one of these two"
    // nor "at most one", and the card must not label it as either.
    expect(walk.every((link) => link.strong === false)).toBe(true);
  });

  it('draws every case from the stem, and rings the places the digit can land', () => {
    const step = only(grid, 'Death Blossom');
    const overlay = buildChainOverlay(step, 60);
    expect(overlay.sets).toHaveLength(3);
    // Three lines, all starting at the stem: a blossom, not a line of
    // reasoning that runs through one petal into the next.
    expect(overlay.links).toHaveLength(3);
    const stem = overlay.links[0].from;
    for (const link of overlay.links) expect(link.from).toEqual(stem);
    expect(new Set(overlay.links.map((link) => JSON.stringify(link.to))).size).toBe(3);
    // One ring per petal cell that could hold the digit: the conclusion is
    // that it lands in one of them, so each is an end of the proof.
    expect(overlay.endpoints).toHaveLength(3);
  });

  it('reports nothing when the erasure misses one cell of one petal', () => {
    // R4C1 gains an 8. Its petal can now hold the 8 in a cell R5C5 cannot
    // see, so the 8 is no longer certain to be in sight of R5C5.
    const nearMiss = marksOnly({
      [at(1, 1)]: [2, 4, 7],
      [at(4, 1)]: [2, 3, 8],
      [at(5, 1)]: [3, 8],
      [at(1, 9)]: [4, 3],
      [at(5, 9)]: [3, 8],
      [at(1, 3)]: [7, 3],
      [at(1, 5)]: [3, 8],
      [at(5, 5)]: [8, 1, 9],
    });
    expect(findAllTechniqueInstances(nearMiss, 'Death Blossom')).toEqual([]);
  });

  it('needs a petal for every mark the stem has: one missing and there is no hint', () => {
    // The same board with the 7's petal gone. The stem may still be 7, and
    // then nothing forces the 8 anywhere.
    const noPetal = marksOnly({
      [at(1, 1)]: [2, 4, 7],
      [at(4, 1)]: [2, 3],
      [at(5, 1)]: [3, 8],
      [at(1, 9)]: [4, 3],
      [at(5, 9)]: [3, 8],
      [at(5, 5)]: [8, 1, 9],
    });
    expect(findAllTechniqueInstances(noPetal, 'Death Blossom')).toEqual([]);
  });

  it('leaves a two-petal stem to the ALS-XY-Wing lesson', () => {
    // A stem of two marks with a petal each is an ALS-XY-Wing whose middle
    // set is a single bi-value cell, and that is the plainer name.
    const twoPetals = marksOnly({
      [at(1, 1)]: [2, 4],
      [at(4, 1)]: [2, 3],
      [at(5, 1)]: [3, 8],
      [at(1, 9)]: [4, 3],
      [at(5, 9)]: [3, 8],
      [at(5, 5)]: [8, 1, 9],
    });
    expect(findAllTechniqueInstances(twoPetals, 'Death Blossom')).toEqual([]);
    // The wing reaches the same conclusion, with the stem as its middle set.
    const wings = findAllTechniqueInstances(twoPetals, 'ALS-XY-Wing');
    const sameConclusion = wings.filter((step) => elims(step).includes('R5C5:8'));
    expect(sameConclusion.length).toBeGreaterThan(0);
    expect(sameConclusion[0].alsSets.find((set) => set.role === 'middle').cells).toContain(at(1, 1));
  });

  it('starts its lesson from the phrase the ALS-XZ entry uses', () => {
    const step = only(grid, 'Death Blossom');
    const out = explainStep(step, grid, 'simple');
    expect(out.look).toContain('Look at R1C1, which can only be 2, 4 or 7');
    expect(out.look).toContain('the 2 goes with R4C1 and R5C1');
    expect(out.why).toContain('one number short of locked');
    expect(out.why).toContain('R5C5 clashes with every 8 in all of them');
    expect(TECHNIQUE_DETAILS['Death Blossom'].plain).toContain('one number short of locked');
  });
});

// ---------------------------------------------------------------------------
// Sue de Coq
// ---------------------------------------------------------------------------
describe('Sue de Coq', () => {
  // Row 5 crosses box 4 at R5C1, R5C2 and R5C3. Take the first two: they
  // hold {1,2,5,8}, four numbers for two cells, so they are two numbers
  // short of locked rather than one. R5C7, further along row 5, is {1,2};
  // R4C2, elsewhere in box 4, is {5,8}. Both draw only on those four and
  // share nothing, so the four cells take 1, 2, 5 and 8 one each: the 1 and
  // the 2 are used up inside row 5, the 5 and the 8 inside box 4.
  const grid = marksOnly({
    [at(5, 1)]: [1, 2, 5],
    [at(5, 2)]: [2, 5, 8],
    [at(5, 3)]: [1, 5, 9],
    [at(5, 4)]: [3, 4, 6],
    [at(5, 5)]: [3, 4, 7],
    [at(5, 6)]: [6, 7, 8],
    [at(5, 7)]: [1, 2],
    [at(5, 8)]: [2, 3, 4],
    [at(5, 9)]: [3, 6, 9],
    [at(4, 1)]: [3, 4, 6],
    [at(4, 2)]: [5, 8],
    [at(4, 3)]: [6, 7, 9],
    [at(6, 1)]: [5, 6, 7],
    [at(6, 2)]: [3, 4, 6],
    [at(6, 3)]: [6, 7, 9],
  });

  /** The instance built on the two-cell overlap. */
  const twoCellOverlap = () => {
    const found = findAllTechniqueInstances(grid, 'Sue de Coq').filter(
      (step) => step.alsSets[0].cells.length === 2
    );
    expect(found).toHaveLength(1);
    return found[0];
  };

  it('erases in the line and in the box, and clears an unused overlap cell', () => {
    const step = twoCellOverlap();
    // R5C8 loses the 2 from row 5; R6C1 loses the 5 from box 4; R5C3 is in
    // the overlap but outside the pattern, so it is reached from both sides.
    expect(elims(step)).toEqual(['R5C3:1', 'R5C3:5', 'R5C8:2', 'R6C1:5']);
    expect(step.digit).toBeNull();
    expect(step.subsetDigits).toEqual([1, 2, 5, 8]);
  });

  it('names the overlap, the line part and the box part as three regions', () => {
    const step = twoCellOverlap();
    expect(step.alsSets.map((set) => ({ cells: names(set.cells), digits: set.digits, role: set.role }))).toEqual([
      { cells: ['R5C1', 'R5C2'], digits: [1, 2, 5, 8], role: 'overlap' },
      { cells: ['R5C7'], digits: [1, 2], role: 'line' },
      { cells: ['R4C2'], digits: [5, 8], role: 'box' },
    ]);
    expect(step.unit).toEqual({ type: 'row', index: 4, name: 'row 5' });
  });

  it('draws the three regions, named, and never twice over the same cells', () => {
    const step = twoCellOverlap();
    const overlay = buildChainOverlay(step, 60);
    expect(overlay.sets.map((set) => set.label)).toEqual(['overlap', 'row 5', 'box 4']);
    expect(overlay.sets.map((set) => set.digits)).toEqual([[1, 2, 5, 8], [1, 2], [5, 8]]);
    // Each region is outlined once, as a region; a node that is one of them
    // is not outlined again as a group over the same cells.
    expect(overlay.groups).toEqual([]);
    // The overlap is joined to each part, and the two parts to each other:
    // that third line is the one that says they cannot clash.
    expect(overlay.links).toHaveLength(3);
    expect(overlay.endpoints).toEqual([]);
  });

  it('is walkable: the two parts, then the reason nothing is left over', () => {
    const step = twoCellOverlap();
    const walk = chainWalk(step);
    expect(walk.map((link) => link.kind)).toEqual(['count', 'count', 'count']);
    expect(walk[0].text).toContain('R5C7 is in row 5 with the overlap cells');
    expect(walk[1].text).toContain('R4C2 is in box 4 with the overlap cells');
    expect(walk[2].text).toContain('They have no number in common');
  });

  it('reports nothing when the line part and the box part share a number', () => {
    // R4C2 becomes {2,5}: the 2 is now on both sides of the split, so the
    // line part and the box part could take the same number and the count
    // no longer comes out exactly.
    const shared = marksOnly({
      [at(5, 1)]: [1, 2, 5],
      [at(5, 2)]: [2, 5, 8],
      [at(5, 7)]: [1, 2],
      [at(4, 2)]: [2, 5],
      [at(5, 8)]: [2, 3, 4],
      [at(6, 1)]: [5, 6, 7],
    });
    const found = findAllTechniqueInstances(shared, 'Sue de Coq').filter(
      (step) => step.alsSets[1].cells[0] === at(5, 7) && step.alsSets[2].cells[0] === at(4, 2)
    );
    expect(found).toEqual([]);
  });

  it('reports nothing when a part brings in a number the overlap cannot use', () => {
    // R4C2 becomes {5,8,9}: the 9 is not among the overlap's four, so that
    // cell is not spoken for by the count and the argument does not run.
    const outsider = marksOnly({
      [at(5, 1)]: [1, 2, 5],
      [at(5, 2)]: [2, 5, 8],
      [at(5, 7)]: [1, 2],
      [at(4, 2)]: [5, 8, 9],
      [at(5, 8)]: [2, 3, 4],
      [at(6, 1)]: [5, 6, 7],
    });
    const found = findAllTechniqueInstances(outsider, 'Sue de Coq').filter(
      (step) => step.alsSets[1].cells[0] === at(5, 7) && step.alsSets[2].cells[0] === at(4, 2)
    );
    expect(found).toEqual([]);
  });

  it('needs both a line part and a box part: one alone is a naked subset', () => {
    // R5C1, R5C2 and R5C7 hold {1,2,5,8} between them with no box part at
    // all - three cells, four numbers, nothing proved. A fourth cell in the
    // line would make it a Naked Quad, which is taught far earlier.
    const lineOnly = marksOnly({
      [at(5, 1)]: [1, 2, 5],
      [at(5, 2)]: [2, 5, 8],
      [at(5, 7)]: [1, 2],
      [at(5, 8)]: [2, 3, 4],
      [at(6, 1)]: [5, 6, 7],
    });
    expect(findAllTechniqueInstances(lineOnly, 'Sue de Coq')).toEqual([]);
  });

  it('starts its lesson from the phrase the ALS-XZ entry uses', () => {
    const step = twoCellOverlap();
    const out = explainStep(step, grid, 'simple');
    expect(out.look).toContain('Look at the two cells where row 5 crosses box 4: R5C1 and R5C2');
    expect(out.look).toContain('four numbers for two cells');
    expect(out.look).toContain('instead of being one number short of locked, they are two numbers short');
    expect(out.why).toContain('nothing left over');
    expect(TECHNIQUE_DETAILS['Sue de Coq'].plain).toContain('one number short of locked');
  });
});

// ---------------------------------------------------------------------------
// Sue de Coq, extended
// ---------------------------------------------------------------------------
describe('Sue de Coq, extended', () => {
  // The same shape one step further out: R5C1 and R5C2 hold five numbers
  // between them, three more than they have cells, so three cells outside
  // take up the slack - R5C7 in the line, R4C2 and R4C3 in the box.
  const grid = marksOnly({
    [at(5, 1)]: [1, 2, 5],
    [at(5, 2)]: [2, 5, 8, 9],
    [at(5, 3)]: [1, 5, 9],
    [at(5, 4)]: [3, 4, 6],
    [at(5, 5)]: [3, 4, 7],
    [at(5, 6)]: [6, 7, 8],
    [at(5, 7)]: [1, 2],
    [at(5, 8)]: [2, 3, 4],
    [at(5, 9)]: [3, 6, 9],
    [at(4, 1)]: [3, 4, 6],
    [at(4, 2)]: [5, 8],
    [at(4, 3)]: [8, 9],
    [at(6, 1)]: [5, 6, 7],
    [at(6, 2)]: [3, 4, 6],
    [at(6, 3)]: [6, 7, 9],
  });

  const onTwoCellOverlap = () => {
    const found = findAllTechniqueInstances(grid, 'Sue de Coq, extended').filter(
      (step) => step.alsSets[0].cells[0] === at(5, 1)
    );
    expect(found).toHaveLength(1);
    return found[0];
  };

  it('splits five numbers over five cells and erases in both units', () => {
    const step = onTwoCellOverlap();
    expect(step.alsSets.map((set) => names(set.cells))).toEqual([
      ['R5C1', 'R5C2'],
      ['R5C7'],
      ['R4C2', 'R4C3'],
    ]);
    expect(step.alsSets[0].digits).toEqual([1, 2, 5, 8, 9]);
    expect(elims(step)).toEqual(['R5C3:1', 'R5C3:5', 'R5C3:9', 'R5C8:2', 'R6C1:5', 'R6C3:9']);
  });

  it('says in plain words how far short of locked the overlap is', () => {
    const step = onTwoCellOverlap();
    const out = explainStep(step, grid, 'simple');
    expect(out.look).toContain('five numbers for two cells');
    expect(out.look).toContain('they are three numbers short');
    expect(out.why).toContain('R4C2 and R4C3');
    expect(TECHNIQUE_DETAILS['Sue de Coq, extended'].plain).toContain('one number short of locked');
  });

  it('the plain form is a rung earlier, so the player meets it first', () => {
    expect(teachingRank('Sue de Coq')).toBeLessThan(teachingRank('Sue de Coq, extended'));
  });
});

// ---------------------------------------------------------------------------
// Where the family sits, and what it costs
// ---------------------------------------------------------------------------
describe('the family on the ladder', () => {
  it('is in the catalog in the spec\'s order, after the set lesson it builds on', () => {
    expect(ALS_TECHNIQUE_NAMES).toEqual([
      'ALS-XY-Wing',
      'Death Blossom',
      'Sue de Coq',
      'Sue de Coq, extended',
    ]);
    for (const name of ALS_TECHNIQUE_NAMES) {
      expect(TECHNIQUES.map((t) => t.name)).toContain(name);
      expect(teachingRank(name)).toBeGreaterThan(teachingRank('ALS-XZ'));
      // Ahead of the general chain: a named shape before a chain that says
      // the same thing a longer way round.
      expect(teachingRank(name)).toBeLessThan(teachingRank('Alternating Chain'));
      expect(teachingRank(name)).toBeLessThan(teachingRank('ALS Chain'));
    }
    expect(ALS_TECHNIQUE_NAMES.map(teachingRank)).toEqual(
      [...ALS_TECHNIQUE_NAMES.map(teachingRank)].sort((a, b) => a - b)
    );
  });

  it('is a deduction, in the Ultimate tier, behind Scan', () => {
    for (const name of ALS_TECHNIQUE_NAMES) {
      // A pattern on the board, counted by Scan: neither something only
      // the search finds nor the trial fallback (#75).
      expect(SEARCH_TECHNIQUES).not.toContain(name);
      expect(isTrialTechnique(name)).toBe(false);
      expect(TECHNIQUE_INFO[name].level).toBe('Ultimate');
      // Too expensive to count on every board change, like every other
      // rung of this tier.
      expect(SCAN_TECHNIQUES).toContain(name);
    }
  });

  it('never pre-empts a technique the player already knows', () => {
    // A Death Blossom board with one cell down to a single mark: the hint
    // is the single, every time.
    const grid = marksOnly({
      [at(1, 1)]: [2, 4, 7],
      [at(4, 1)]: [2, 3],
      [at(5, 1)]: [3, 8],
      [at(1, 9)]: [4, 3],
      [at(5, 9)]: [3, 8],
      [at(1, 3)]: [7, 3],
      [at(1, 5)]: [3, 8],
      [at(5, 5)]: [8, 1, 9],
      [at(9, 9)]: [6],
    });
    expect(findAllTechniqueInstances(grid, 'Death Blossom').length).toBeGreaterThan(0);
    expect(findNextLogicStep(grid, null).technique).toBe('Naked Single');
  });

  it('every step it reports does something, and says what it is', () => {
    // The shape contract, on the hand-built grids above: a step that
    // changes nothing would loop the hint-apply cycle forever.
    const boards = [
      marksOnly({
        [at(1, 1)]: [3, 9], [at(1, 2)]: [6, 9], [at(1, 5)]: [6, 7],
        [at(4, 5)]: [3, 7], [at(4, 1)]: [3, 5, 8],
      }),
      marksOnly({
        [at(1, 1)]: [2, 4, 7], [at(4, 1)]: [2, 3], [at(5, 1)]: [3, 8],
        [at(1, 9)]: [4, 3], [at(5, 9)]: [3, 8], [at(1, 3)]: [7, 3],
        [at(1, 5)]: [3, 8], [at(5, 5)]: [8, 1, 9],
      }),
    ];
    for (const board of boards) {
      for (const name of ALS_TECHNIQUE_NAMES) {
        for (const step of findAllTechniqueInstances(board, name)) {
          expect(step.technique).toBe(name);
          expect(step.eliminations.length).toBeGreaterThan(0);
          expect(step.baseCells.length).toBeGreaterThan(0);
          expect(typeof step.explanation).toBe('string');
          expect(step.explanation.length).toBeGreaterThan(40);
          // Everything it erases is outside the pattern it is built on.
          for (const e of step.eliminations) expect(step.baseCells).not.toContain(e.cell);
          const after = applyLogicStep(board, step);
          expect(after.some((cell, i) => cell.candidates.length !== board[i].candidates.length)).toBe(true);
        }
      }
    }
  });

  it('each detector stays well inside the 150 ms a count may cost', () => {
    // The densest board there will ever be: a library puzzle before a
    // single digit has been placed, where every set that will ever exist
    // exists at once.
    const costs = [];
    for (const { name, puzzle } of Object.values(PUZZLES).flat()) {
      const board = buildGrid(puzzle);
      for (const [technique, find] of Object.entries(ALS_FINDERS)) {
        const started = performance.now();
        find(board, null, true);
        costs.push({ where: `${technique} on ${name}`, ms: performance.now() - started });
      }
    }
    const worst = costs.reduce((a, b) => (a.ms > b.ms ? a : b));
    expect(worst.ms, `the worst was ${worst.where} at ${worst.ms.toFixed(1)} ms`).toBeLessThan(150);
  });

  it('the whole named ladder still answers inside a second', () => {
    for (const shelf of ['diabolical', 'ultimate']) {
      for (const { name, puzzle } of PUZZLES[shelf]) {
        let grid = buildGrid(puzzle);
        for (let i = 0; i < 400 && grid.filter((c) => c.value !== null).length < 40; i++) {
          const step = findNextLogicStep(grid, null);
          if (!step) break;
          grid = applyLogicStep(grid, step);
          if (step.placement) grid = eliminateCandidatesFromPeers(grid, step.placement.cell, step.placement.digit);
        }
        const started = performance.now();
        findNextLogicStep(grid, null);
        const ms = performance.now() - started;
        expect(ms, `${name}: the ladder took ${ms.toFixed(1)} ms`).toBeLessThan(1000);
      }
    }
  });
});
