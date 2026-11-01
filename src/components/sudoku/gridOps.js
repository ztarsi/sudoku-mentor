// Grid operations the board needs on its first second: candidates from the
// placed digits, clearing a placed digit from its peers, applying a step,
// and the "only singles left" test. They live apart from logicEngine so the
// board can load without a single detector (first-board payload, #91).
import { getPeers } from './gridUnits';

export const generateCandidates = (grid) => {
  return grid.map((cell, index) => {
    if (cell.value !== null) {
      return { ...cell, candidates: [] };
    }
    
    const peers = getPeers(index);
    const usedDigits = new Set(peers.map(i => grid[i].value).filter(v => v !== null));
    const candidates = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter(d => !usedDigits.has(d));
    
    return { ...cell, candidates };
  });
};

// Eliminate candidates from peers after a placement (preserves existing eliminations)
export const eliminateCandidatesFromPeers = (grid, placedCell, placedDigit) => {
  const peers = getPeers(placedCell);
  
  return grid.map((cell, index) => {
    // Skip the placed cell itself
    if (index === placedCell) {
      return cell;
    }
    
    // Only eliminate from peers
    if (peers.includes(index) && cell.value === null && cell.candidates.includes(placedDigit)) {
      return {
        ...cell,
        candidates: cell.candidates.filter(c => c !== placedDigit)
      };
    }
    
    return cell;
  });
};

// Apply the logic step to the grid
export const applyLogicStep = (grid, step) => {
  const newGrid = grid.map(cell => ({
    ...cell,
    isHighlighted: false,
    highlightColor: null,
    isBaseCell: false,
    isTargetCell: false
  }));
  
  // Apply placement if any, and clear the digit from its peers: a grid
  // that keeps the placed digit as a peer candidate makes every later
  // technique reason from a lie. (Callers used to have to remember this.)
  if (step.placement) {
    const { cell, digit } = step.placement;
    newGrid[cell] = {
      ...newGrid[cell],
      value: digit,
      candidates: []
    };
    const cleared = eliminateCandidatesFromPeers(newGrid, cell, digit);
    for (let i = 0; i < 81; i++) newGrid[i] = cleared[i];
  }
  
  // Apply eliminations (handle both array and potentially undefined)
  if (step.eliminations && step.eliminations.length > 0) {
    for (const elim of step.eliminations) {
      const { cell, digit } = elim;
      newGrid[cell] = {
        ...newGrid[cell],
        candidates: newGrid[cell].candidates.filter(d => d !== digit)
      };
    }
  }
  
  // Reapply highlighting based on the step
  if (step.baseCells) {
    for (const cellIndex of step.baseCells) {
      newGrid[cellIndex] = {
        ...newGrid[cellIndex],
        isHighlighted: true,
        isBaseCell: true,
        highlightColor: 'blue'
      };
    }
  }
  
  if (step.targetCells) {
    for (const cellIndex of step.targetCells) {
      newGrid[cellIndex] = {
        ...newGrid[cellIndex],
        isHighlighted: true,
        isTargetCell: true,
        highlightColor: 'red'
      };
    }
  }
  
  // Don't regenerate all candidates, just return the modified grid
  // This preserves any manual candidate toggles the user made
  return newGrid;
};

/**
 * True when every empty cell shows exactly one pencil mark, so the board
 * the player is looking at says the rest by itself ("only singles left"
 * hint state, amended for issue #54). Pass the player's grid, not the
 * repaired one: the wording must be true of the marks on screen. Hidden
 * singles do not count; until the marks say it, Hint keeps teaching
 * singles as lessons.
 */
export const onlySinglesRemain = (grid) =>
  grid.every((c) => c.value !== null || (Array.isArray(c.candidates) && c.candidates.length === 1));
