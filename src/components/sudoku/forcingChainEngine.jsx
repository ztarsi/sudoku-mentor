// Deep Forcing Chain Engine - Explores "What-If" scenarios

const getRow = (index) => Math.floor(index / 9);
const getCol = (index) => index % 9;
const getBox = (index) => Math.floor(getRow(index) / 3) * 3 + Math.floor(getCol(index) / 3);

const getRowIndices = (row) => Array.from({ length: 9 }, (_, i) => row * 9 + i);
const getColIndices = (col) => Array.from({ length: 9 }, (_, i) => i * 9 + col);
const getBoxIndices = (box) => {
  const startRow = Math.floor(box / 3) * 3;
  const startCol = (box % 3) * 3;
  const indices = [];
  for (let r = startRow; r < startRow + 3; r++) {
    for (let c = startCol; c < startCol + 3; c++) {
      indices.push(r * 9 + c);
    }
  }
  return indices;
};

const getPeers = (index) => {
  const row = getRow(index);
  const col = getCol(index);
  const box = getBox(index);
  const peers = new Set([
    ...getRowIndices(row),
    ...getColIndices(col),
    ...getBoxIndices(box)
  ]);
  peers.delete(index);
  return Array.from(peers);
};

// Clone grid for simulation
const cloneGrid = (grid) => {
  return grid.map(cell => ({
    ...cell,
    candidates: [...cell.candidates]
  }));
};

// Apply a value and propagate constraints
const applyValueAndPropagate = (grid, cellIndex, value, depth) => {
  const newGrid = cloneGrid(grid);
  
  // Set the value
  newGrid[cellIndex].value = value;
  newGrid[cellIndex].candidates = [];
  
  // Remove from peers
  const peers = getPeers(cellIndex);
  for (const peerIdx of peers) {
    if (newGrid[peerIdx].value === null) {
      newGrid[peerIdx].candidates = newGrid[peerIdx].candidates.filter(c => c !== value);
      
      // Check for contradictions
      if (newGrid[peerIdx].candidates.length === 0) {
        return { grid: newGrid, contradiction: true, cell: peerIdx };
      }
      
      // Auto-solve naked singles
      if (newGrid[peerIdx].candidates.length === 1 && depth < 8) {
        const result = applyValueAndPropagate(newGrid, peerIdx, newGrid[peerIdx].candidates[0], depth + 1);
        if (result.contradiction) {
          return result;
        }
        return { grid: result.grid, contradiction: false };
      }
    } else if (newGrid[peerIdx].value === value) {
      // Same value in peer = contradiction
      return { grid: newGrid, contradiction: true, cell: peerIdx };
    }
  }
  
  return { grid: newGrid, contradiction: false };
};

// Find forcing chains
export const findForcingChain = (grid, maxDepth = 8) => {
  // Find bi-value cells (cells with exactly 2 candidates)
  const biValueCells = [];
  for (let i = 0; i < 81; i++) {
    if (grid[i].value === null && grid[i].candidates.length === 2) {
      biValueCells.push(i);
    }
  }
  
  // Try each bi-value cell
  for (const cellIndex of biValueCells) {
    const [value1, value2] = grid[cellIndex].candidates;
    
    // Explore both branches
    const branch1 = exploreBranch(grid, cellIndex, value1, maxDepth, []);
    const branch2 = exploreBranch(grid, cellIndex, value2, maxDepth, []);
    
    // Check for contradictions
    if (branch1.contradiction && !branch2.contradiction) {
      return {
        technique: 'Deep Forcing Chain',
        explanation: `If R${getRow(cellIndex) + 1}C${getCol(cellIndex) + 1} = ${value1}, it leads to a contradiction. Therefore, it must be ${value2}.`,
        baseCells: [cellIndex],
        targetCells: [],
        placement: { cell: cellIndex, digit: value2 },
        eliminations: [],
        chain: branch1.chain,
        contradiction: true,
        digit: value2
      };
    }
    
    if (branch2.contradiction && !branch1.contradiction) {
      return {
        technique: 'Deep Forcing Chain',
        explanation: `If R${getRow(cellIndex) + 1}C${getCol(cellIndex) + 1} = ${value2}, it leads to a contradiction. Therefore, it must be ${value1}.`,
        baseCells: [cellIndex],
        targetCells: [],
        placement: { cell: cellIndex, digit: value1 },
        eliminations: [],
        chain: branch2.chain,
        contradiction: true,
        digit: value1
      };
    }
    
    // Check for common eliminations in both branches
    if (!branch1.contradiction && !branch2.contradiction) {
      const eliminations = findCommonEliminations(grid, branch1.grid, branch2.grid);
      
      if (eliminations.length > 0) {
        return {
          technique: 'Deep Forcing Chain',
          explanation: `Both values in R${getRow(cellIndex) + 1}C${getCol(cellIndex) + 1} (${value1} and ${value2}) lead to the same eliminations.`,
          baseCells: [cellIndex],
          targetCells: eliminations.map(e => e.cell),
          placement: null,
          eliminations,
          chains: [
            { cells: branch1.chain, color: '#3b82f6', label: `If ${value1}` },
            { cells: branch2.chain, color: '#10b981', label: `If ${value2}` }
          ],
          digit: null
        };
      }
    }
  }
  
  return null;
};

// Explore a branch of the forcing chain
const exploreBranch = (grid, cellIndex, value, maxDepth, chain) => {
  const newChain = [...chain, { cell: cellIndex, value, depth: chain.length }];
  
  if (chain.length >= maxDepth) {
    return { grid, contradiction: false, chain: newChain };
  }
  
  const result = applyValueAndPropagate(grid, cellIndex, value, 0);
  
  if (result.contradiction) {
    return { grid: result.grid, contradiction: true, chain: newChain, contradictionCell: result.cell };
  }
  
  // Continue exploring if we made progress
  const newGrid = result.grid;
  
  // Look for next bi-value cell
  for (let i = 0; i < 81; i++) {
    if (newGrid[i].value === null && newGrid[i].candidates.length === 2) {
      const [v1, v2] = newGrid[i].candidates;
      
      // Try first value
      const subBranch1 = exploreBranch(newGrid, i, v1, maxDepth, newChain);
      if (subBranch1.contradiction) {
        // If first value leads to contradiction, second must be true
        const subBranch2 = applyValueAndPropagate(newGrid, i, v2, 0);
        if (!subBranch2.contradiction) {
          return exploreBranch(subBranch2.grid, i, v2, maxDepth, newChain);
        }
      }
      
      return subBranch1;
    }
  }
  
  return { grid: newGrid, contradiction: false, chain: newChain };
};

// Find common eliminations between two branches
const findCommonEliminations = (originalGrid, grid1, grid2) => {
  const eliminations = [];
  
  for (let i = 0; i < 81; i++) {
    if (originalGrid[i].value === null) {
      for (const candidate of originalGrid[i].candidates) {
        // If candidate is eliminated in both branches
        if (!grid1[i].candidates.includes(candidate) && !grid2[i].candidates.includes(candidate)) {
          eliminations.push({ cell: i, digit: candidate });
        }
      }
    }
  }
  
  return eliminations;
};