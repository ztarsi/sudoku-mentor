// Solution-oracle tests: play the logic engine against real puzzles and check
// every step it produces against the puzzle's true solution.
//
// A placement is wrong if it disagrees with the solution. An elimination is
// wrong if it removes the solution digit from a cell. A step that changes
// nothing means the engine would loop forever in a hint-apply cycle.
import { describe, it, expect } from 'vitest';
import {
  findNextLogicStep,
  generateCandidates,
  eliminateCandidatesFromPeers,
  applyLogicStep,
} from '../logicEngine';
import { solveSudoku } from '../solver';
import { PUZZLES } from '../puzzles';

const buildGrid = (puzzleArray) =>
  generateCandidates(
    puzzleArray.map((value, index) => ({
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

const cellName = (i) => `R${Math.floor(i / 9) + 1}C${(i % 9) + 1}`;

// Every built-in puzzle, flattened with its difficulty label.
const ALL_PUZZLES = Object.entries(PUZZLES).flatMap(([difficulty, list]) =>
  list.map((p) => ({ ...p, difficulty }))
);

describe('logic engine soundness (solution oracle)', () => {
  for (const { name, difficulty, puzzle } of ALL_PUZZLES) {
    it(`${difficulty}: ${name} - every step agrees with the solution`, () => {
      let grid = buildGrid(puzzle);
      const solved = solveSudoku(grid);
      expect(solved, 'built-in puzzle must be solvable').not.toBeNull();
      const solution = solved.map((c) => c.value);

      for (let iteration = 0; iteration < 300; iteration++) {
        const step = findNextLogicStep(grid, null);
        if (!step) break; // engine ran out of techniques - fine, we only test soundness

        if (step.placement) {
          const { cell, digit } = step.placement;
          expect(
            digit,
            `${step.technique} places ${digit} at ${cellName(cell)}, but the solution has ${solution[cell]}`
          ).toBe(solution[cell]);
        }

        for (const elim of step.eliminations ?? []) {
          expect(
            elim.digit,
            `${step.technique} eliminates ${elim.digit} from ${cellName(elim.cell)}, but that IS the solution digit there`
          ).not.toBe(solution[elim.cell]);
        }

        // Apply the step the way the app does, and require progress:
        // a step that changes nothing would make hint-apply loop forever.
        const before = grid;
        grid = applyLogicStep(grid, step);
        if (step.placement) {
          grid = eliminateCandidatesFromPeers(
            grid,
            step.placement.cell,
            step.placement.digit
          );
        }
        const changed = grid.some(
          (cell, i) =>
            cell.value !== before[i].value ||
            cell.candidates.length !== before[i].candidates.length
        );
        expect(
          changed,
          `${step.technique} produced a no-op step (would loop forever): ${step.explanation?.slice(0, 120)}`
        ).toBe(true);
      }

      // Sanity: whatever the engine placed so far must match the solution.
      grid.forEach((cell, i) => {
        if (cell.value !== null) {
          expect(cell.value, `${cellName(i)} ended up wrong`).toBe(solution[i]);
        }
      });
    });
  }
});
