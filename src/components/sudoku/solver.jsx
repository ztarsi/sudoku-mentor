// Sudoku solver using backtracking algorithm

export function solveSudoku(grid) {
  // Create a copy of the grid to solve
  const solvedGrid = grid.map(cell => ({ ...cell }));
  
  // Helper to check if a number is valid in a position
  const isValid = (index, num) => {
    const row = Math.floor(index / 9);
    const col = index % 9;
    
    // Check row
    for (let c = 0; c < 9; c++) {
      const checkIdx = row * 9 + c;
      if (checkIdx !== index && solvedGrid[checkIdx].value === num) {
        return false;
      }
    }
    
    // Check column
    for (let r = 0; r < 9; r++) {
      const checkIdx = r * 9 + col;
      if (checkIdx !== index && solvedGrid[checkIdx].value === num) {
        return false;
      }
    }
    
    // Check 3x3 box
    const boxStartRow = Math.floor(row / 3) * 3;
    const boxStartCol = Math.floor(col / 3) * 3;
    for (let r = boxStartRow; r < boxStartRow + 3; r++) {
      for (let c = boxStartCol; c < boxStartCol + 3; c++) {
        const checkIdx = r * 9 + c;
        if (checkIdx !== index && solvedGrid[checkIdx].value === num) {
          return false;
        }
      }
    }
    
    return true;
  };
  
  // Backtracking solver
  const solve = () => {
    // Find first empty cell
    const emptyIndex = solvedGrid.findIndex(cell => cell.value === null);
    
    // If no empty cell, puzzle is solved
    if (emptyIndex === -1) {
      return true;
    }
    
    // Try numbers 1-9
    for (let num = 1; num <= 9; num++) {
      if (isValid(emptyIndex, num)) {
        solvedGrid[emptyIndex].value = num;
        
        if (solve()) {
          return true;
        }
        
        // Backtrack
        solvedGrid[emptyIndex].value = null;
      }
    }
    
    return false;
  };
  
  // Attempt to solve
  if (solve()) {
    return solvedGrid;
  }
  
  return null; // No solution found
}