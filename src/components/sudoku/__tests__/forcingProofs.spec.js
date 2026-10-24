// Forcing chains, forcing nets, and the honesty line (#75).
//
// The soundness of these steps on real boards is oracleAll's job: there
// every step the search produces on the Ultimate shelf is compared with the
// puzzle's true solution. This file is about the four things that cannot be
// checked that way:
//
//   each technique on a board built to contain exactly it, with the
//   placement, the eliminations and the highlighted cells spelled out;
//   the proof the card walks, case by case, and the paths the board draws;
//   that a proof always beats a trial, which is the honesty line itself;
//   that every branch's claim about the board is true of the board.
import { describe, it, expect } from 'vitest';
import {
  NET_DEPTH,
  findForcingChain,
  findForcingNet,
  findHypothesis,
  findWhatIfStep,
  refutes,
} from '../forcingChainEngine';
import {
  findNextLogicStep,
  applyLogicStep,
  eliminateCandidatesFromPeers,
  generateCandidates,
} from '../logicEngine';
import { solveSudoku } from '../solver';
import { chainWalk, explainStep } from '../explainStep';
import { buildChainOverlay, buildHighlightSets } from '../stepHighlights';
import { isTrialTechnique, techniqueTier } from '../techniqueCatalog';
import { PUZZLES } from '../puzzles';
import { establishUniqueness } from '../uniqueness';
import { cellName } from '../gridUnits';

/**
 * A board where every cell may still hold anything, so that a test can cut
 * one shape into it and nothing else. Every digit has plenty of room in
 * every unit, which is what keeps an edit from contradicting by accident.
 */
const openBoard = () =>
  Array.from({ length: 81 }, (_, cellIndex) => ({
    cellIndex,
    value: null,
    isFixed: false,
    candidates: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    isHighlighted: false,
    highlightColor: null,
    isBaseCell: false,
    isTargetCell: false,
  }));

const at = (row, col) => (row - 1) * 9 + (col - 1);
const named = (cells) => cells.map(cellName).sort();
const elims = (step) => step.eliminations.map((e) => `${cellName(e.cell)}-${e.digit}`).sort();

const buildGrid = (puzzle) =>
  generateCandidates(
    puzzle.map((value, cellIndex) => ({
      cellIndex,
      value: value || null,
      isFixed: value !== 0,
      candidates: [],
      isHighlighted: false,
      highlightColor: null,
      isBaseCell: false,
      isTargetCell: false,
    }))
  );

describe('each forcing technique on a board built to contain it', () => {
  it('Cell Forcing Chain: both options of one cell place the same digit', () => {
    // R1C1 is 1 or 2. If 1, R1C2 must be 3 and R2C2 must be 4; if 2, R2C1
    // must be 3 and R2C2 must be 4 again. R2C2 = 4 either way.
    const grid = openBoard();
    grid[at(1, 1)].candidates = [1, 2];
    grid[at(1, 2)].candidates = [1, 3];
    grid[at(2, 1)].candidates = [2, 3];
    grid[at(2, 2)].candidates = [3, 4];

    const step = findForcingChain(grid);
    expect(step.technique).toBe('Cell Forcing Chain');
    expect(step.placement).toEqual({ cell: at(2, 2), digit: 4 });
    expect(step.digit).toBe(4);
    expect(step.eliminations).toEqual([]);
    // What the card highlights: the origin in the base colour, the cell it
    // proves in the target colour.
    const highlights = buildHighlightSets([step]);
    expect(named([...highlights.baseCells])).toEqual(['R1C1']);
    expect(named([...highlights.targetCells])).toEqual(['R2C2']);
    // One case per candidate, each ending on the shared conclusion.
    expect(step.forcingBranches).toHaveLength(2);
    expect(step.forcingBranches.map((b) => b.assume.digit)).toEqual([1, 2]);
    for (const branch of step.forcingBranches) {
      expect(branch.outcome.kind).toBe('forces');
      expect(branch.moves.some((m) => m.cell === at(2, 2) && m.digit === 4)).toBe(true);
    }
    expect(step.forcingNet).toBeNull();
  });

  it('Digit Forcing Chain: the two places for a digit in a unit agree', () => {
    // In row 1 both 5 and 7 can only go in R1C1 and R1C2. Whichever way
    // round they fall, those two cells hold them - so every other cell of
    // box 1 loses both, and the two cells lose everything else.
    const grid = openBoard();
    for (let col = 3; col <= 9; col++) {
      grid[at(1, col)].candidates = [1, 2, 3, 4, 6, 8, 9];
    }

    const step = findForcingChain(grid);
    expect(step.technique).toBe('Digit Forcing Chain');
    expect(step.placement).toBeNull();
    expect(step.forcingOrigin).toMatchObject({ kind: 'digit', digit: 5, unitName: 'row 1' });
    expect(named(step.forcingOrigin.cells)).toEqual(['R1C1', 'R1C2']);
    expect(step.forcingBranches).toHaveLength(2);
    // Exactly what it proves: 5 and 7 leave the rest of box 1, and the two
    // cells that hold them keep nothing else.
    const expected = [];
    for (const cell of [at(2, 1), at(2, 2), at(2, 3), at(3, 1), at(3, 2), at(3, 3)]) {
      expected.push(`${cellName(cell)}-5`, `${cellName(cell)}-7`);
    }
    for (const cell of [at(1, 1), at(1, 2)]) {
      for (const digit of [1, 2, 3, 4, 6, 8, 9]) expected.push(`${cellName(cell)}-${digit}`);
    }
    expect(elims(step)).toEqual(expected.sort());
    const highlights = buildHighlightSets([step]);
    expect(named([...highlights.baseCells])).toEqual(['R1C1', 'R1C2']);
  });

  it('Unit Forcing Chain: three places for a digit in a unit agree', () => {
    // 5 can only go in R1C1, R1C2 or R1C3 - all inside box 1 - so box 1
    // takes its 5 from row 1 and the rest of the box cannot be 5.
    const grid = openBoard();
    for (let col = 4; col <= 9; col++) {
      grid[at(1, col)].candidates = [1, 2, 3, 4, 6, 7, 8, 9];
    }

    const step = findForcingChain(grid);
    expect(step.technique).toBe('Unit Forcing Chain');
    expect(step.digit).toBe(5);
    expect(step.forcingOrigin).toMatchObject({ kind: 'unit', digit: 5, unitName: 'row 1' });
    expect(named(step.forcingOrigin.cells)).toEqual(['R1C1', 'R1C2', 'R1C3']);
    expect(step.forcingBranches).toHaveLength(3);
    expect(elims(step)).toEqual(
      [at(2, 1), at(2, 2), at(2, 3), at(3, 1), at(3, 2), at(3, 3)].map((c) => `${cellName(c)}-5`).sort()
    );
  });

  it('Double Forcing Chain: every option but one breaks the board', () => {
    // 5 has only two homes in row 1, R1C1 and R1C2, and R2C1 sees both of
    // them. If R2C1 were 5, row 1 would have nowhere left to put its 5. So
    // R2C1 is 7 - and the proof tried both of its options to say so.
    const grid = openBoard();
    for (let col = 3; col <= 9; col++) {
      grid[at(1, col)].candidates = [1, 2, 3, 4, 6, 7, 8, 9];
    }
    grid[at(2, 1)].candidates = [5, 7];

    const step = findForcingChain(grid);
    expect(step.technique).toBe('Double Forcing Chain');
    expect(step.placement).toEqual({ cell: at(2, 1), digit: 7 });
    expect(step.forcingConclusion.kind).toBe('refutation');
    expect(step.forcingBranches).toHaveLength(2);
    const [five, seven] = step.forcingBranches;
    expect(five.assume).toEqual({ cell: at(2, 1), digit: 5 });
    expect(five.outcome.kind).toBe('contradiction');
    expect(five.outcome.text).toContain('row 1');
    expect(seven.outcome.kind).not.toBe('contradiction');
    // The refuted case really is refuted, asked again from the same board.
    expect(refutes(grid, at(2, 1), 5)).toBe(true);
    expect(refutes(grid, at(2, 1), 7)).toBe(false);
  });

  it('Hypothesis Mode: one candidate assumed, and the board breaks', () => {
    // R1C2 and R1C3 can each only be 1 or 3. Assume R1C1 = 1 and both are
    // forced to 3 in the same row. Sound - and only this one candidate was
    // ever examined, which is what makes it a trial and not a proof.
    const grid = openBoard();
    grid[at(1, 1)].candidates = [1, 2];
    grid[at(1, 2)].candidates = [1, 3];
    grid[at(1, 3)].candidates = [1, 3];

    const step = findHypothesis(grid);
    expect(step.technique).toBe('Hypothesis Mode');
    expect(step.placement).toEqual({ cell: at(1, 1), digit: 2 });
    expect(step.contradictionText).toBeTruthy();
    expect(step.forcingBranches).toHaveLength(1);
    expect(step.forcingBranches[0].outcome.kind).toBe('contradiction');
    expect(isTrialTechnique(step.technique)).toBe(true);
  });
});

describe('the honesty line', () => {
  it('a proof by cases is offered before a trial for the same conclusion', () => {
    // The Hypothesis Mode board above: the trial engine would erase a
    // candidate by assuming it, and the search as a whole proves the same
    // placement by checking every option instead. The player gets the
    // proof, which is the whole point of the line (#75).
    const grid = openBoard();
    grid[at(1, 1)].candidates = [1, 2];
    grid[at(1, 2)].candidates = [1, 3];
    grid[at(1, 3)].candidates = [1, 3];

    const trial = findHypothesis(grid);
    const offered = findWhatIfStep(grid);
    expect(trial.placement).toEqual({ cell: at(1, 1), digit: 2 });
    expect(offered.placement).toEqual(trial.placement);
    expect(offered.technique).toBe('Double Forcing Chain');
    expect(isTrialTechnique(offered.technique)).toBe(false);
    expect(techniqueTier(offered.technique)).toBe('Forcing');
  });

  it('every forcing technique is a deduction, and only the trial is not', () => {
    const grid = openBoard();
    grid[at(1, 1)].candidates = [1, 2];
    grid[at(1, 2)].candidates = [1, 3];
    grid[at(2, 1)].candidates = [2, 3];
    grid[at(2, 2)].candidates = [3, 4];
    const proof = findForcingChain(grid);
    expect(techniqueTier(proof.technique)).toBe('Forcing');
    expect(isTrialTechnique(proof.technique)).toBe(false);
    // And the lesson says so in as many words, at both levels.
    const beginner = explainStep(proof, grid, 'simple');
    expect(beginner.why).toContain('proof, not a guess');
    const expert = explainStep(proof, grid, 'detailed');
    expect(expert.why).toContain('Every option forces the same thing');
    // The caveat the Expert level carries, in the spirit of the franken fish.
    expect(expert.why).toContain('not a pattern anybody spots by eye');
  });

  it('a pattern on the ladder is still preferred to any forcing proof', () => {
    // The bar every batch meets: where an easy technique and a new one both
    // apply, the hint is the easy one. The hint path only reaches the
    // search when the ladder has nothing, so the ladder is what is checked.
    const grid = openBoard();
    grid[at(1, 1)].candidates = [1, 2];
    grid[at(1, 2)].candidates = [1, 3];
    grid[at(2, 1)].candidates = [2, 3];
    grid[at(2, 2)].candidates = [3, 4];
    grid[at(9, 9)].candidates = [8]; // a naked single, far away

    const step = findNextLogicStep(grid, null, { uniqueness: 'one' });
    expect(step.technique).toBe('Naked Single');
    expect(step.placement).toEqual({ cell: at(9, 9), digit: 8 });
    // The forcing proof is still there to be had, once nothing easier is.
    expect(findForcingChain(grid).technique).toBe('Cell Forcing Chain');
  });
});

describe('the proof the player walks', () => {
  const proofStep = () => {
    const grid = openBoard();
    grid[at(1, 1)].candidates = [1, 2];
    grid[at(1, 2)].candidates = [1, 3];
    grid[at(2, 1)].candidates = [2, 3];
    grid[at(2, 2)].candidates = [3, 4];
    return findForcingChain(grid);
  };

  it('walks case by case and ends on what the cases prove', () => {
    const step = proofStep();
    const walk = chainWalk(step);
    expect(walk.length).toBeGreaterThan(step.forcingBranches.length);
    // Every line but the last belongs to a case, in order, and the last is
    // the conclusion.
    const branches = walk.slice(0, -1).map((entry) => entry.branch);
    expect(branches).toEqual([...branches].sort((a, b) => a - b));
    expect(new Set(branches).size).toBe(step.forcingBranches.length);
    expect(walk[0].label).toBe('Case A');
    expect(walk[0].text).toBe('Suppose R1C1 is 1.');
    const last = walk[walk.length - 1];
    expect(last.conclusion).toBe(true);
    expect(last.text).toContain('Every case was checked');
    // One supposition line and one outcome line per case.
    expect(walk.filter((entry) => entry.label?.startsWith('Case'))).toHaveLength(2);
    expect(walk.filter((entry) => entry.label === 'and so')).toHaveLength(2);
  });

  it('draws one path per case on the board, and rings the origin', () => {
    const step = proofStep();
    const overlay = buildChainOverlay(step, 40);
    expect(overlay.branched).toBe(true);
    expect(overlay.groups).toEqual([]);
    expect(overlay.endpoints).toHaveLength(step.forcingOrigin.cells.length);
    // Each case is drawn as its own path: the links of one case carry its
    // index, so the board can tell them apart without a second walker.
    expect(new Set(overlay.links.map((link) => link.branch))).toEqual(new Set([0, 1]));
    for (const [index, branch] of step.forcingBranches.entries()) {
      const links = overlay.links.filter((link) => link.branch === index);
      expect(links).toHaveLength(branch.proof.length);
    }
  });

  it('a board with no cells to draw yields no overlay', () => {
    expect(buildChainOverlay(proofStep(), null)).toBeNull();
    expect(buildChainOverlay({ forcingBranches: [] }, 40)).toBeNull();
  });
});

describe('the net, and its stated depth', () => {
  it('states a depth limit that is a number, not an accident', () => {
    expect(Number.isInteger(NET_DEPTH)).toBe(true);
    expect(NET_DEPTH).toBeGreaterThan(1);
  });

  // The net only matters where the plain chains have nothing, which is a
  // position no hand-built board reaches honestly. So it is taken from the
  // library, at the first point on a real solve path where the mentor needs
  // one, and checked there.
  const firstNet = () => {
    for (const { name, puzzle } of PUZZLES.ultimate) {
      let grid = buildGrid(puzzle);
      const solution = solveSudoku(grid).map((c) => c.value);
      const { state: uniqueness } = establishUniqueness(puzzle);
      for (let i = 0; i < 400; i++) {
        if (grid.every((cell) => cell.value !== null)) break;
        let step = findNextLogicStep(grid, null, { uniqueness });
        if (!step) {
          step = findForcingChain(grid);
          if (!step) {
            const net = findForcingNet(grid);
            if (net) return { name, grid, step: net, solution };
            step = findHypothesis(grid);
          }
          if (!step) break;
        }
        grid = applyLogicStep(grid, step);
        if (step.placement) grid = eliminateCandidatesFromPeers(grid, step.placement.cell, step.placement.digit);
      }
    }
    return null;
  };

  const found = firstNet();

  it('the library still needs a net somewhere, so this is checked on a real board', () => {
    expect(found, 'no library position needed a forcing net').not.toBeNull();
  });

  it('names itself a net, says how many suppositions it held, and holds them', () => {
    const { step } = found;
    expect(step.technique).toBe('Forcing Net');
    expect(step.forcingNet.depth).toBe(NET_DEPTH);
    // A net is a net because at least one case needed a supposition of its
    // own to get anywhere, and the card can show which cell that was.
    const netMoves = step.forcingBranches.flatMap((b) => b.moves.filter((m) => m.net));
    expect(netMoves.length).toBeGreaterThan(0);
    for (const move of netMoves) {
      expect(move.net.digits).toHaveLength(2);
      expect(move.net.digits).toContain(move.digit === move.net.digits[0] ? move.net.digits[0] : move.net.digits[1]);
    }
    // And the lesson says it is a net rather than letting it read as a
    // plain chain.
    const lesson = explainStep(step, found.grid, 'simple');
    expect(lesson.why).toContain('needed a net');
  });

  it('says when a case stopped at the limit instead of appearing to finish', () => {
    // Whether the net on this particular board ran into its limit is the
    // board's business; what matters is that a case which did is reported
    // as cut short, in the step and in the lesson.
    const { step } = found;
    const limited = step.forcingBranches.some((b) => b.limited);
    expect(step.forcingNet.limited).toBe(limited);
    const lesson = explainStep(step, found.grid, 'simple');
    const expert = explainStep(step, found.grid, 'detailed');
    if (limited) {
      expect(lesson.why).toContain('stopped at the depth the mentor allows');
      expect(expert.why).toContain('stopped at that limit');
    } else {
      expect(lesson.why).not.toContain('stopped at the depth');
    }
  });

  it('the conclusion a net draws agrees with the puzzle it came from', () => {
    const { step, solution } = found;
    if (step.placement) expect(step.placement.digit).toBe(solution[step.placement.cell]);
    for (const e of step.eliminations) expect(e.digit).not.toBe(solution[e.cell]);
  });
});

describe('every branch claim is true of the board it was made on', () => {
  // The deepest honesty check in here: a step says "this case was
  // impossible" or "this case forces that", and both halves are asked again
  // of the board the branch started from, on every forcing step the library
  // produces.
  it('refuted cases really break, and live cases really force', () => {
    let steps = 0;
    for (const { name, puzzle } of PUZZLES.ultimate) {
      let grid = buildGrid(puzzle);
      const { state: uniqueness } = establishUniqueness(puzzle);
      for (let i = 0; i < 400 && steps < 40; i++) {
        if (grid.every((cell) => cell.value !== null)) break;
        let step = findNextLogicStep(grid, null, { uniqueness });
        if (!step) {
          step = findWhatIfStep(grid);
          if (!step) break;
          if (!isTrialTechnique(step.technique)) {
            steps++;
            const where = `${name} step ${i} (${step.technique})`;
            // The options are exhaustive: one of them must be the answer.
            expect(step.forcingBranches.map((b) => b.assume.cell).length, where)
              .toBe(step.forcingOrigin.options.length);
            for (const branch of step.forcingBranches) {
              if (branch.outcome.kind === 'contradiction') {
                expect(refutes(grid, branch.assume.cell, branch.assume.digit), `${where}: ${cellName(branch.assume.cell)}=${branch.assume.digit} should really break`).toBe(true);
              } else if (step.placement && step.forcingConclusion.kind === 'convergence') {
                expect(
                  branch.moves.some((m) => m.cell === step.placement.cell && m.digit === step.placement.digit),
                  `${where}: the case that assumes ${cellName(branch.assume.cell)}=${branch.assume.digit} should force the conclusion`
                ).toBe(true);
              }
            }
          }
        }
        grid = applyLogicStep(grid, step);
        if (step.placement) grid = eliminateCandidatesFromPeers(grid, step.placement.cell, step.placement.digit);
      }
    }
    expect(steps).toBeGreaterThan(10);
  });
});
