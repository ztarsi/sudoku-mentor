// Solution oracle for EVERY technique, not only the ones the hint path
// happens to reach. On each intermediate grid of every library puzzle,
// every instance every detector reports is checked against the true
// solution. The what-if engines are checked on the Ultimate shelf.
import { describe, it, expect } from 'vitest';
import {
  findNextLogicStep,
  findAllTechniqueInstances,
  generateCandidates,
  eliminateCandidatesFromPeers,
  applyLogicStep,
} from '../logicEngine';
import { findWhatIfStep, findForcingChain, findForcingNet, findHypothesis } from '../forcingChainEngine';
import { solveSudoku } from '../solver';
import { PUZZLES } from '../puzzles';
import { TECHNIQUE_INFO, TECHNIQUES, SEARCH_TECHNIQUES, TRIAL_TECHNIQUES, COUNT_SEARCH } from '../techniqueCatalog';
import { establishUniqueness } from '../uniqueness';
import { cellName } from '../gridUnits';

const buildGrid = (puzzle) =>
  generateCandidates(
    puzzle.map((value, index) => ({
      cellIndex: index, value: value || null, isFixed: value !== 0, candidates: [],
      isHighlighted: false, highlightColor: null, isBaseCell: false, isTargetCell: false,
    }))
  );

// Every deductive technique in the catalog, so a technique added there
// joins this oracle without anyone remembering to list it twice. The split
// is by what a detector costs to run on every intermediate grid, not by
// tier: ALS-XZ, the rest of the almost-locked-set family, the two unit fish
// and the larger finned forms are too slow for every iteration and run
// every eighth one.
const EXPENSIVE = [
  'ALS-XZ',
  'ALS-XY-Wing',
  'Death Blossom',
  'Sue de Coq',
  'Sue de Coq, extended',
  'Sashimi Fish',
  'Finned Jellyfish',
  'Franken Fish',
  'Mutant Fish',
  'Unique Loop',
];
const CHEAP = TECHNIQUES
  .filter((t) => t.count !== COUNT_SEARCH && !EXPENSIVE.includes(t.name))
  .map((t) => t.name);

const checkStep = (step, solution, where) => {
  // Shape contract from stepShape.js
  expect(typeof step.technique).toBe('string');
  expect(TECHNIQUE_INFO[step.technique] || SEARCH_TECHNIQUES.includes(step.technique)).toBeTruthy();
  expect(Array.isArray(step.baseCells)).toBe(true);
  expect(Array.isArray(step.targetCells)).toBe(true);
  expect(Array.isArray(step.eliminations)).toBe(true);
  expect(step.placement === null || typeof step.placement?.cell === 'number').toBe(true);
  expect(step.digit === null || typeof step.digit === 'number').toBe(true);
  expect(typeof step.explanation).toBe('string');
  if (step.placement) {
    expect(step.digit, `${where}: digit should be the placed digit`).toBe(step.placement.digit);
    expect(
      step.placement.digit,
      `${where}: ${step.technique} places ${step.placement.digit} at ${cellName(step.placement.cell)}, solution has ${solution[step.placement.cell]}`
    ).toBe(solution[step.placement.cell]);
  }
  for (const e of step.eliminations) {
    expect(
      e.digit,
      `${where}: ${step.technique} eliminates ${e.digit} from ${cellName(e.cell)}, but that is the solution digit`
    ).not.toBe(solution[e.cell]);
  }
  expect(step.placement || step.eliminations.length > 0, `${where}: ${step.technique} step does nothing`).toBeTruthy();
};

const ALL = Object.entries(PUZZLES).flatMap(([difficulty, list]) => list.map((p) => ({ ...p, difficulty })));

describe('every technique instance agrees with the solution', () => {
  const seen = {};

  for (const { name, difficulty, puzzle } of ALL) {
    it(`${difficulty}: ${name}`, () => {
      let grid = buildGrid(puzzle);
      const solution = solveSudoku(grid).map((c) => c.value);
      // The library is vetted, so the uniqueness family applies here - and
      // the count is established the same way the app does it rather than
      // assumed, so a library puzzle that stopped having one answer would
      // turn the family off here too.
      const { state: uniqueness } = establishUniqueness(puzzle);
      const options = { uniqueness };
      for (let iteration = 0; iteration < 300; iteration++) {
        const techniques = iteration % 8 === 0 ? [...CHEAP, ...EXPENSIVE] : CHEAP;
        for (const tech of techniques) {
          const instances = findAllTechniqueInstances(grid, tech, options);
          for (const inst of instances) {
            expect(inst.technique).toBe(tech);
            checkStep(inst, solution, `${name} step ${iteration}`);
            seen[tech] = (seen[tech] || 0) + 1;
          }
        }
        const step = findNextLogicStep(grid, null, options);
        if (!step) break;
        grid = applyLogicStep(grid, step);
        if (step.placement) grid = eliminateCandidatesFromPeers(grid, step.placement.cell, step.placement.digit);
      }
    });
  }

  // Twenty puzzles cannot exercise forty-odd techniques (#83). These are
  // the ones this walk never reaches, so it cannot check them, and each is
  // checked elsewhere instead:
  //
  //   Avoidable Rectangle Type 1 needs cells already worked out, so it
  //   only appears past the point where the named ladder stalls. It is
  //   checked on the real solve path, what-if steps included, in
  //   uniqueness.spec.js.
  //
  //   The other four appear nowhere in the library at all, and are checked
  //   against hand-built grids in uniqueness.spec.js.
  //
  // The list is exact on purpose: a technique that quietly stops firing
  // fails this test, and so does one the library starts covering.
  const NOT_ON_THE_NAMED_WALK = [
    'Unique Rectangle Type 5',
    'Avoidable Rectangle Type 1',
    'Avoidable Rectangle Type 2',
    'BUG+2',
    'BUG+3',
    'Unique Loop',
  ];

  it('the library exercises every named technique it can reach', () => {
    const missing = CHEAP.concat(EXPENSIVE).filter((t) => !seen[t]);
    expect(
      missing.slice().sort(),
      `library coverage changed - techniques with no instance on this walk: ${missing.join(', ')}`
    ).toEqual(NOT_ON_THE_NAMED_WALK.slice().sort());
  });
});

describe('the search engines agree with the solution (Ultimate shelf)', () => {
  // The Ultimate shelf is where the ladder of patterns stops and the
  // search takes over. Every step it produces is checked against the true
  // solution, the way the pattern detectors are, and the proofs and the
  // trial fallback are checked separately: the forcing engines on the path
  // the player would actually walk, and Hypothesis Mode on the same boards
  // even though it is no longer the step the player gets there (#75).
  let proofSteps = 0;
  let trialSteps = 0;
  const seenForcing = new Set();

  for (const { name, puzzle } of PUZZLES.ultimate) {
    it(`${name}: every forcing proof and every trial is sound`, () => {
      let grid = buildGrid(puzzle);
      const solution = solveSudoku(grid).map((c) => c.value);
      const { state: uniqueness } = establishUniqueness(puzzle);

      for (let i = 0; i < 400; i++) {
        if (grid.every((cell) => cell.value !== null)) break;
        let step = findNextLogicStep(grid, null, { uniqueness });
        if (!step) {
          // The hint path's own order, so what is checked here is what a
          // player would be shown.
          step = findWhatIfStep(grid);
          if (!step) break;
          checkStep(step, solution, `${name} search step ${i}`);
          expect(SEARCH_TECHNIQUES).toContain(step.technique);
          if (TRIAL_TECHNIQUES.includes(step.technique)) trialSteps++;
          else {
            proofSteps++;
            seenForcing.add(step.technique);
            // A proof by cases carries its branches, and the card walks them.
            expect(Array.isArray(step.forcingBranches)).toBe(true);
            expect(step.forcingBranches.length).toBeGreaterThan(1);
          }

          // The trial engine still has to be sound wherever it fires, even
          // where a proof got there first, so it is asked about the same
          // board and its answer checked without being applied.
          const trial = findHypothesis(grid);
          if (trial) {
            checkStep(trial, solution, `${name} hypothesis at step ${i}`);
            expect(trial.technique).toBe('Hypothesis Mode');
            trialSteps++;
          }
        }
        grid = applyLogicStep(grid, step);
        if (step.placement) grid = eliminateCandidatesFromPeers(grid, step.placement.cell, step.placement.digit);
      }
      // Whatever it took, the mentor finishes the puzzle.
      expect(grid.every((cell) => cell.value !== null), `${name} was not solved`).toBe(true);
    });
  }

  it('the shelf exercises the forcing engines, proofs and trial alike', () => {
    expect(proofSteps).toBeGreaterThan(0);
    expect(trialSteps).toBeGreaterThan(0);
    // Every name in the Forcing tier is reached somewhere on this shelf,
    // so none of them can quietly stop firing.
    expect([...seenForcing].sort()).toEqual(
      ['Cell Forcing Chain', 'Digit Forcing Chain', 'Double Forcing Chain', 'Forcing Net', 'Unit Forcing Chain']
    );
  });

  it('a forcing proof is tried before a net, and a net before a trial', () => {
    // The order matters for the honesty line as much as for speed: a
    // position that has a proof must never be shown as a trial.
    let checked = 0;
    for (const { puzzle } of PUZZLES.ultimate) {
      let grid = buildGrid(puzzle);
      const { state: uniqueness } = establishUniqueness(puzzle);
      for (let i = 0; i < 400; i++) {
        if (grid.every((cell) => cell.value !== null)) break;
        let step = findNextLogicStep(grid, null, { uniqueness });
        if (!step) {
          const chain = findForcingChain(grid);
          const net = chain ? null : findForcingNet(grid);
          const whole = findWhatIfStep(grid);
          expect(whole).toBeTruthy();
          if (chain) expect(whole.technique).toBe(chain.technique);
          else if (net) expect(whole.technique).toBe(net.technique);
          else expect(whole.technique).toBe('Hypothesis Mode');
          checked++;
          step = whole;
        }
        grid = applyLogicStep(grid, step);
        if (step.placement) grid = eliminateCandidatesFromPeers(grid, step.placement.cell, step.placement.digit);
      }
    }
    expect(checked).toBeGreaterThan(0);
  });
});

describe('Finned X-Wing scans both orientations', () => {
  it('a transposed grid yields the mirrored instance', () => {
    const transpose = (puzzle) => puzzle.map((_, i) => puzzle[(i % 9) * 9 + Math.floor(i / 9)]);
    let rowBased = 0;
    let columnBased = 0;
    for (const { puzzle } of ALL) {
      const a = findAllTechniqueInstances(buildGrid(puzzle), 'Finned X-Wing');
      const b = findAllTechniqueInstances(buildGrid(transpose(puzzle)), 'Finned X-Wing');
      rowBased += a.filter((s) => s.orientation === 'row').length + b.filter((s) => s.orientation === 'row').length;
      columnBased += a.filter((s) => s.orientation === 'column').length + b.filter((s) => s.orientation === 'column').length;
      // Mirror symmetry: rows in one grid are columns in the other
      expect(a.filter((s) => s.orientation === 'row').length).toBe(b.filter((s) => s.orientation === 'column').length);
      expect(a.filter((s) => s.orientation === 'column').length).toBe(b.filter((s) => s.orientation === 'row').length);
    }
    expect(rowBased + columnBased).toBeGreaterThan(0);
    expect(columnBased).toBeGreaterThan(0);
  });

  it('BUG+1 honours returnAll', () => {
    const grid = buildGrid(PUZZLES.easy[0].puzzle);
    const { state: uniqueness } = establishUniqueness(PUZZLES.easy[0].puzzle);
    expect(Array.isArray(findAllTechniqueInstances(grid, 'BUG+1', { uniqueness }))).toBe(true);
  });
});
