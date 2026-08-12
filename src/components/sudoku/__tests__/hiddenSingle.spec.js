// Hidden Single regression tests, ported from the former logicEngine.test.jsx
// (which ran as an import side effect on the TestHiddenSingle browser page).
import { describe, it, expect } from 'vitest';
import { findNextLogicStep } from '../logicEngine';

const createEmptyGrid = () =>
  Array.from({ length: 81 }, () => ({
    value: null,
    candidates: [],
    isFixed: false,
    isHighlighted: false,
    highlightColor: null,
    isBaseCell: false,
    isTargetCell: false,
  }));

describe('Hidden Single', () => {
  it('does not report a hidden single when the digit appears elsewhere in every shared unit', () => {
    const grid = createEmptyGrid();
    grid[75].candidates = [2, 5, 7]; // R9C4
    grid[76].candidates = [2, 3, 8]; // R9C5 - same row and box
    grid[12].candidates = [2, 4, 6]; // R2C4 - same column
    grid[30].candidates = [2, 9]; // R4C4 - same column
    for (let i = 0; i < 81; i++) {
      if (grid[i].candidates.length === 0 && grid[i].value === null) {
        grid[i].candidates = [1, 2, 3, 4, 5, 6, 7, 8, 9];
      }
    }

    const step = findNextLogicStep(grid, 2);
    const isFalsePositive = Boolean(
      step && step.technique === 'Hidden Single' && step.baseCells[0] === 75
    );
    expect(isFalsePositive, 'R9C4 must not be a hidden single for digit 2').toBe(false);
  });

  it('reports a hidden single when a digit fits only one cell of a unit', () => {
    const grid = createEmptyGrid();
    grid[75].candidates = [2, 5, 7]; // R9C4 - only cell in row 9 with candidate 2
    for (let col = 0; col < 9; col++) {
      const idx = 8 * 9 + col;
      if (idx !== 75 && grid[idx].value === null) {
        grid[idx].candidates = [3, 4, 5, 6, 7, 8, 9];
      }
    }
    for (let i = 0; i < 81; i++) {
      if (grid[i].candidates.length === 0 && grid[i].value === null) {
        grid[i].candidates = [1, 3, 4, 5, 6, 7, 8, 9];
      }
    }

    const step = findNextLogicStep(grid, 2);
    expect(step?.technique).toBe('Hidden Single');
    expect(step?.baseCells[0]).toBe(75);
    expect(step?.digit).toBe(2);
  });
});
