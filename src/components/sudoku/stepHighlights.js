// Pure helpers for turning a logic-engine step into UI highlight state.
// One implementation, shared by the hint flow and the technique browser
// (this logic used to be copy-pasted three times inside SudokuMentor.jsx).

/** Map of cellIndex -> Set of digits the step eliminates, or null. */
export const buildRemovalMap = (step) => {
  if (!step?.eliminations?.length) return null;
  const removalMap = {};
  step.eliminations.forEach(({ cell, digit }) => {
    if (!removalMap[cell]) removalMap[cell] = new Set();
    removalMap[cell].add(digit);
  });
  return removalMap;
};

/** Map of digit -> highlight color for the step's candidates, or null. */
export const buildFocusedCandidates = (step, grid, colors) => {
  if (!step) return null;

  const multiCandidateTechniques = ['Naked Pair', 'Hidden Pair', 'Naked Triple'];
  if (multiCandidateTechniques.includes(step.technique) && step.baseCells) {
    const candidatesInvolved = new Set();
    step.baseCells.forEach((cellIdx) => {
      grid[cellIdx].candidates.forEach((c) => candidatesInvolved.add(c));
    });

    const colorPalette = [
      colors.focusDigit || '#10b981',
      '#3b82f6',
      '#f59e0b',
      '#ef4444',
      '#8b5cf6',
    ];
    const candidateColorMap = {};
    Array.from(candidatesInvolved).forEach((digit, idx) => {
      candidateColorMap[digit] = colorPalette[idx % colorPalette.length];
    });
    return candidateColorMap;
  }

  if (step.technique === 'ALS-XZ' && step.xDigit && step.zDigit) {
    return {
      [step.xDigit]: '#f59e0b',
      [step.zDigit]: '#a855f7',
    };
  }

  if (step.digit) {
    return { [step.digit]: colors.focusDigit || '#10b981' };
  }

  return null;
};

/** Reset all per-cell highlight flags. */
export const clearHighlightFlags = (grid) =>
  grid.map((cell) => ({
    ...cell,
    isHighlighted: false,
    highlightColor: null,
    isBaseCell: false,
    isTargetCell: false,
    isUnitCell: false,
  }));

/**
 * Return a new grid with highlight flags stamped for the given steps:
 * unit cells for singles, blue base cells, red target cells.
 */
export const stampStepHighlights = (grid, steps) => {
  const newGrid = clearHighlightFlags(grid);

  steps.forEach((step) => {
    // For Hidden/Naked Singles, highlight the whole unit named in the text
    if (
      (step.technique === 'Hidden Single' || step.technique === 'Naked Single') &&
      step.baseCells?.[0] !== undefined
    ) {
      const cellIdx = step.baseCells[0];
      const row = Math.floor(cellIdx / 9);
      const col = cellIdx % 9;

      const unitCells = [];
      if (step.explanation.includes('row')) {
        for (let c = 0; c < 9; c++) unitCells.push(row * 9 + c);
      } else if (step.explanation.includes('column')) {
        for (let r = 0; r < 9; r++) unitCells.push(r * 9 + col);
      } else if (step.explanation.includes('box')) {
        const boxStartRow = Math.floor(row / 3) * 3;
        const boxStartCol = Math.floor(col / 3) * 3;
        for (let r = boxStartRow; r < boxStartRow + 3; r++) {
          for (let c = boxStartCol; c < boxStartCol + 3; c++) {
            unitCells.push(r * 9 + c);
          }
        }
      }

      unitCells.forEach((idx) => {
        newGrid[idx] = { ...newGrid[idx], isUnitCell: true };
      });
    }

    step.baseCells?.forEach((idx) => {
      newGrid[idx] = {
        ...newGrid[idx],
        isHighlighted: true,
        isBaseCell: true,
        highlightColor: 'blue',
      };
    });

    step.targetCells?.forEach((idx) => {
      newGrid[idx] = {
        ...newGrid[idx],
        isHighlighted: true,
        isTargetCell: true,
        highlightColor: 'red',
      };
    });
  });

  return newGrid;
};
