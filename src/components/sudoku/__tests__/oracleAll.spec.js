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
import { findForcingChain, findHypothesis } from '../forcingChainEngine';
import { solveSudoku } from '../solver';
import { PUZZLES } from '../puzzles';
import { TECHNIQUE_INFO } from '../techniqueCatalog';
import { cellName } from '../gridUnits';

const buildGrid = (puzzle) =>
  generateCandidates(
    puzzle.map((value, index) => ({
      cellIndex: index, value: value || null, isFixed: value !== 0, candidates: [],
      isHighlighted: false, highlightColor: null, isBaseCell: false, isTargetCell: false,
    }))
  );

const CHEAP = [
  'Naked Single', 'Hidden Single', 'Pointing Pair', 'Pointing Triple', 'Claiming',
  'Naked Pair', 'Hidden Pair', 'Naked Triple', 'X-Wing', 'Swordfish', 'XY-Wing',
  'Unique Rectangle Type 1', 'BUG+1', 'Finned X-Wing', 'X-Cycle',
];
const EXPENSIVE = ['ALS-XZ'];

const checkStep = (step, solution, where) => {
  // Shape contract from stepShape.js
  expect(typeof step.technique).toBe('string');
  expect(TECHNIQUE_INFO[step.technique] || ['Cell Forcing Chain', 'Hypothesis Mode'].includes(step.technique)).toBeTruthy();
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
      for (let iteration = 0; iteration < 300; iteration++) {
        const techniques = iteration % 8 === 0 ? [...CHEAP, ...EXPENSIVE] : CHEAP;
        for (const tech of techniques) {
          const instances = findAllTechniqueInstances(grid, tech);
          for (const inst of instances) {
            expect(inst.technique).toBe(tech);
            checkStep(inst, solution, `${name} step ${iteration}`);
            seen[tech] = (seen[tech] || 0) + 1;
          }
        }
        const step = findNextLogicStep(grid, null);
        if (!step) break;
        grid = applyLogicStep(grid, step);
        if (step.placement) grid = eliminateCandidatesFromPeers(grid, step.placement.cell, step.placement.digit);
      }
    });
  }

  it('the library exercises every named technique at least once', () => {
    const missing = CHEAP.concat(EXPENSIVE).filter((t) => !seen[t]);
    // Report what the library covers; a technique with zero instances has
    // no oracle coverage and needs a puzzle that shows it.
    expect(missing, `no library instance of: ${missing.join(', ')}`).toEqual([]);
  });
});

describe('what-if engines agree with the solution (Ultimate shelf)', () => {
  for (const { name, puzzle } of PUZZLES.ultimate) {
    it(`${name}: forcing chain / hypothesis steps are sound`, () => {
      let grid = buildGrid(puzzle);
      const solution = solveSudoku(grid).map((c) => c.value);
      // Play the deductive engine as far as it goes, then take a few
      // what-if steps, checking each and applying it.
      for (let i = 0; i < 300; i++) {
        const step = findNextLogicStep(grid, null);
        if (!step) break;
        grid = applyLogicStep(grid, step);
        if (step.placement) grid = eliminateCandidatesFromPeers(grid, step.placement.cell, step.placement.digit);
      }
      let whatIfSteps = 0;
      for (let i = 0; i < 4; i++) {
        const step = findForcingChain(grid, 30) || findHypothesis(grid, 30);
        if (!step) break;
        checkStep(step, solution, `${name} what-if ${i}`);
        expect(['Cell Forcing Chain', 'Hypothesis Mode']).toContain(step.technique);
        whatIfSteps++;
        grid = applyLogicStep(grid, step);
        if (step.placement) grid = eliminateCandidatesFromPeers(grid, step.placement.cell, step.placement.digit);
      }
      expect(whatIfSteps).toBeGreaterThan(0);
    });
  }
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
    expect(Array.isArray(findAllTechniqueInstances(buildGrid(PUZZLES.easy[0].puzzle), 'BUG+1'))).toBe(true);
  });
});
