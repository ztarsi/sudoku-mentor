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

// Find forcing chains - convergence-based logical technique
export const findForcingChain = (grid, maxDepth = 10) => {
  // Priority 1: Bi-value cells (most likely to succeed)
  const biValueCells = [];
  for (let i = 0; i < 81; i++) {
    if (grid[i].value === null && grid[i].candidates.length === 2) {
      biValueCells.push(i);
    }
  }
  
  // Try Cell Forcing Chains first
  for (const cellIndex of biValueCells) {
    const [value1, value2] = grid[cellIndex].candidates;
    
    // Explore both branches and collect implications
    const branch1 = collectImplications(grid, cellIndex, value1, maxDepth);
    const branch2 = collectImplications(grid, cellIndex, value2, maxDepth);
    
    // Check for convergence (common placements or eliminations)
    const convergence = findConvergence(grid, branch1, branch2, cellIndex, value1, value2);
    
    if (convergence) {
      return convergence; // This is a valid Forcing Chain!
    }
  }
  
  // Try tri-value cells
  const triValueCells = [];
  for (let i = 0; i < 81; i++) {
    if (grid[i].value === null && grid[i].candidates.length === 3) {
      triValueCells.push(i);
    }
  }
  
  for (const cellIndex of triValueCells) {
    const [value1, value2, value3] = grid[cellIndex].candidates;
    
    const branch1 = collectImplications(grid, cellIndex, value1, maxDepth);
    const branch2 = collectImplications(grid, cellIndex, value2, maxDepth);
    const branch3 = collectImplications(grid, cellIndex, value3, maxDepth);
    
    // Find 3-way convergence
    const convergence = findTripleConvergence(grid, branch1, branch2, branch3, cellIndex, value1, value2, value3);
    
    if (convergence) {
      return convergence;
    }
  }
  
  return null; // No forcing chain found - use other techniques or fallback to hypothesis mode
};

// FALLBACK: Hypothesis mode (contradiction-based, not pure logic)
export const findHypothesis = (grid, maxDepth = 8) => {
  const biValueCells = [];
  for (let i = 0; i < 81; i++) {
    if (grid[i].value === null && grid[i].candidates.length === 2) {
      biValueCells.push(i);
    }
  }
  
  for (const cellIndex of biValueCells) {
    const [value1, value2] = grid[cellIndex].candidates;
    
    const branch1 = exploreBranch(grid, cellIndex, value1, maxDepth, []);
    const branch2 = exploreBranch(grid, cellIndex, value2, maxDepth, []);
    
    // Check for contradictions
    if (branch1.contradiction && !branch2.contradiction) {
      const placements = branch1.chain.filter(c => c.action === 'place');
      const eliminations = branch1.chain.filter(c => c.action === 'eliminate');
      
      let explanation = `🔍 Let's explore: What if R${getRow(cellIndex) + 1}C${getCol(cellIndex) + 1} = ${value1}?\n\n`;

      // Build a detailed narrative with natural language
      const placements1 = branch1.chain.filter(s => s.action === 'place');

      placements1.forEach((step, idx) => {
        const cellRef = `R${getRow(step.cell) + 1}C${getCol(step.cell) + 1}`;
        const boxNum = getBox(step.cell) + 1;

        if (idx === 0) {
          explanation += `📍 Starting assumption: Place ${step.value} at ${cellRef}\n\n`;
        } else {
          explanation += `➜ Step ${idx}: ${cellRef} must be ${step.value}\n`;
          explanation += `   Why? ${step.reason}\n`;
        }

        // Find and explain immediate eliminations
        const nextElims = [];
        const chainIdx = branch1.chain.findIndex(s => s === step);
        for (let i = chainIdx + 1; i < branch1.chain.length; i++) {
          if (branch1.chain[i].action === 'eliminate') {
            nextElims.push(branch1.chain[i]);
          } else {
            break;
          }
        }

        if (nextElims.length > 0) {
          const peerElims = nextElims.filter(e => e.reason.includes('Sees'));
          if (peerElims.length > 0) {
            explanation += `   This eliminates ${step.value} from ${peerElims.length} peer cell${peerElims.length > 1 ? 's' : ''}\n`;
          }
        }
        explanation += '\n';
      });

      const contradCell = `R${getRow(branch1.contradictionCell) + 1}C${getCol(branch1.contradictionCell) + 1}`;
      explanation += `❌ CONTRADICTION: After ${placements1.length} forced placement${placements1.length > 1 ? 's' : ''}, ${contradCell} has no valid candidates left!\n\n`;
      explanation += `✅ Conclusion: The assumption was wrong. R${getRow(cellIndex) + 1}C${getCol(cellIndex) + 1} must be ${value2}.`;
      
      return {
        technique: 'Hypothesis Mode',
        explanation,
        baseCells: [cellIndex],
        targetCells: [branch1.contradictionCell],
        placement: { cell: cellIndex, digit: value2 },
        eliminations: [],
        chain: branch1.chain,
        contradiction: true,
        contradictionCell: branch1.contradictionCell,
        digit: value1,
        contradictoryDigit: value1
      };
    }
    
    if (branch2.contradiction && !branch1.contradiction) {
      const placements = branch2.chain.filter(c => c.action === 'place');
      const eliminations = branch2.chain.filter(c => c.action === 'eliminate');
      
      let explanation = `🔍 Let's explore: What if R${getRow(cellIndex) + 1}C${getCol(cellIndex) + 1} = ${value2}?\n\n`;

      // Build a detailed narrative with natural language
      const placements2 = branch2.chain.filter(s => s.action === 'place');

      placements2.forEach((step, idx) => {
        const cellRef = `R${getRow(step.cell) + 1}C${getCol(step.cell) + 1}`;
        const boxNum = getBox(step.cell) + 1;

        if (idx === 0) {
          explanation += `📍 Starting assumption: Place ${step.value} at ${cellRef}\n\n`;
        } else {
          explanation += `➜ Step ${idx}: ${cellRef} must be ${step.value}\n`;
          explanation += `   Why? ${step.reason}\n`;
        }

        // Find and explain immediate eliminations
        const nextElims = [];
        const chainIdx = branch2.chain.findIndex(s => s === step);
        for (let i = chainIdx + 1; i < branch2.chain.length; i++) {
          if (branch2.chain[i].action === 'eliminate') {
            nextElims.push(branch2.chain[i]);
          } else {
            break;
          }
        }

        if (nextElims.length > 0) {
          const peerElims = nextElims.filter(e => e.reason.includes('Sees'));
          if (peerElims.length > 0) {
            explanation += `   This eliminates ${step.value} from ${peerElims.length} peer cell${peerElims.length > 1 ? 's' : ''}\n`;
          }
        }
        explanation += '\n';
      });

      const contradCell = `R${getRow(branch2.contradictionCell) + 1}C${getCol(branch2.contradictionCell) + 1}`;
      explanation += `❌ CONTRADICTION: After ${placements2.length} forced placement${placements2.length > 1 ? 's' : ''}, ${contradCell} has no valid candidates left!\n\n`;
      explanation += `✅ Conclusion: The assumption was wrong. R${getRow(cellIndex) + 1}C${getCol(cellIndex) + 1} must be ${value1}.`;
      
      return {
        technique: 'Hypothesis Mode',
        explanation,
        baseCells: [cellIndex],
        targetCells: [branch2.contradictionCell],
        placement: { cell: cellIndex, digit: value1 },
        eliminations: [],
        chain: branch2.chain,
        contradiction: true,
        contradictionCell: branch2.contradictionCell,
        digit: value2,
        contradictoryDigit: value2
      };
    }
  }
  
  return null;
};

// Collect all implications from a branch
const collectImplications = (grid, cellIndex, value, maxDepth) => {
  const placements = new Map(); // cell -> digit
  const eliminations = new Map(); // cell -> Set<digits>
  
  const result = exploreBranchForImplications(grid, cellIndex, value, maxDepth, placements, eliminations, []);
  
  return {
    grid: result.grid,
    placements,
    eliminations,
    chain: result.chain,
    contradiction: result.contradiction
  };
};

const exploreBranchForImplications = (grid, cellIndex, value, maxDepth, placements, eliminations, chain) => {
  const newChain = [...chain, { cell: cellIndex, value, action: 'place', reason: chain.length === 0 ? 'Path assumption' : 'Forced' }];
  
  if (chain.length >= maxDepth) {
    return { grid, chain: newChain, contradiction: false };
  }
  
  placements.set(cellIndex, value);
  
  const result = applyValueAndPropagate(grid, cellIndex, value, 0);
  
  if (result.contradiction) {
    return { grid: result.grid, chain: newChain, contradiction: true };
  }
  
  const newGrid = result.grid;
  
  // Track all changes
  for (let i = 0; i < 81; i++) {
    if (newGrid[i].value !== null && grid[i].value === null) {
      placements.set(i, newGrid[i].value);
    }
    
    if (newGrid[i].value === null && grid[i].value === null) {
      const eliminated = grid[i].candidates.filter(c => !newGrid[i].candidates.includes(c));
      if (eliminated.length > 0) {
        if (!eliminations.has(i)) {
          eliminations.set(i, new Set());
        }
        eliminated.forEach(d => eliminations.get(i).add(d));
      }
    }
  }
  
  // Continue chain
  for (let i = 0; i < 81; i++) {
    if (newGrid[i].value === null && newGrid[i].candidates.length === 1) {
      return exploreBranchForImplications(newGrid, i, newGrid[i].candidates[0], maxDepth, placements, eliminations, newChain);
    }
  }
  
  return { grid: newGrid, chain: newChain, contradiction: false };
};

// Find convergence between two branches
const findConvergence = (grid, branch1, branch2, cellIndex, value1, value2) => {
  if (branch1.contradiction || branch2.contradiction) {
    return null; // Not a forcing chain, use hypothesis mode
  }
  
  // Find common placements
  const commonPlacements = [];
  for (const [cell, digit] of branch1.placements) {
    if (branch2.placements.get(cell) === digit && cell !== cellIndex) {
      commonPlacements.push({ cell, digit });
    }
  }
  
  // Find common eliminations
  const commonEliminations = [];
  for (const [cell, digits1] of branch1.eliminations) {
    if (branch2.eliminations.has(cell)) {
      const digits2 = branch2.eliminations.get(cell);
      for (const digit of digits1) {
        if (digits2.has(digit)) {
          commonEliminations.push({ cell, digit });
        }
      }
    }
  }
  
  if (commonPlacements.length > 0) {
    const placement = commonPlacements[0];
    
    let explanation = `🎯 Cell Forcing Chain: R${getRow(cellIndex) + 1}C${getCol(cellIndex) + 1} has candidates {${value1}, ${value2}}.\n\n`;
    explanation += `✅ Path A (if ${value1}): Forces R${getRow(placement.cell) + 1}C${getCol(placement.cell) + 1} = ${placement.digit}\n`;
    explanation += `✅ Path B (if ${value2}): Also forces R${getRow(placement.cell) + 1}C${getCol(placement.cell) + 1} = ${placement.digit}\n\n`;
    explanation += `💡 Convergence: No matter which value we choose, R${getRow(placement.cell) + 1}C${getCol(placement.cell) + 1} must be ${placement.digit}!`;
    
    return {
      technique: 'Cell Forcing Chain',
      explanation,
      baseCells: [cellIndex],
      targetCells: [placement.cell],
      placement,
      eliminations: [],
      chains: [
        { cells: branch1.chain, color: '#10b981', label: `Path A: ${value1}` },
        { cells: branch2.chain, color: '#a855f7', label: `Path B: ${value2}` }
      ],
      convergenceCell: placement.cell,
      digit: null
    };
  }
  
  if (commonEliminations.length > 0) {
    let explanation = `🎯 Cell Forcing Chain: R${getRow(cellIndex) + 1}C${getCol(cellIndex) + 1} has candidates {${value1}, ${value2}}.\n\n`;
    explanation += `Both paths lead to the same eliminations:\n`;
    commonEliminations.forEach(e => {
      explanation += `• R${getRow(e.cell) + 1}C${getCol(e.cell) + 1} cannot be ${e.digit}\n`;
    });
    explanation += `\n💡 Convergence: These eliminations are certain regardless of which path is correct!`;
    
    return {
      technique: 'Cell Forcing Chain',
      explanation,
      baseCells: [cellIndex],
      targetCells: [...new Set(commonEliminations.map(e => e.cell))],
      placement: null,
      eliminations: commonEliminations,
      chains: [
        { cells: branch1.chain, color: '#10b981', label: `Path A: ${value1}` },
        { cells: branch2.chain, color: '#a855f7', label: `Path B: ${value2}` }
      ],
      digit: null
    };
  }
  
  return null;
};

// Find triple convergence
const findTripleConvergence = (grid, branch1, branch2, branch3, cellIndex, value1, value2, value3) => {
  if (branch1.contradiction || branch2.contradiction || branch3.contradiction) {
    return null;
  }
  
  // Find 3-way common placements
  const commonPlacements = [];
  for (const [cell, digit] of branch1.placements) {
    if (branch2.placements.get(cell) === digit && branch3.placements.get(cell) === digit && cell !== cellIndex) {
      commonPlacements.push({ cell, digit });
    }
  }
  
  // Find 3-way common eliminations
  const commonEliminations = [];
  for (const [cell, digits1] of branch1.eliminations) {
    if (branch2.eliminations.has(cell) && branch3.eliminations.has(cell)) {
      const digits2 = branch2.eliminations.get(cell);
      const digits3 = branch3.eliminations.get(cell);
      for (const digit of digits1) {
        if (digits2.has(digit) && digits3.has(digit)) {
          commonEliminations.push({ cell, digit });
        }
      }
    }
  }
  
  if (commonPlacements.length > 0) {
    const placement = commonPlacements[0];
    
    let explanation = `🎯 Cell Forcing Chain: R${getRow(cellIndex) + 1}C${getCol(cellIndex) + 1} has candidates {${value1}, ${value2}, ${value3}}.\n\n`;
    explanation += `All three paths converge on: R${getRow(placement.cell) + 1}C${getCol(placement.cell) + 1} = ${placement.digit}\n\n`;
    explanation += `💡 This placement is logically certain!`;
    
    return {
      technique: 'Cell Forcing Chain',
      explanation,
      baseCells: [cellIndex],
      targetCells: [placement.cell],
      placement,
      eliminations: [],
      chains: [
        { cells: branch1.chain, color: '#10b981', label: `Path A: ${value1}` },
        { cells: branch2.chain, color: '#a855f7', label: `Path B: ${value2}` },
        { cells: branch3.chain, color: '#3b82f6', label: `Path C: ${value3}` }
      ],
      convergenceCell: placement.cell,
      digit: null
    };
  }
  
  if (commonEliminations.length > 0) {
    let explanation = `🎯 Cell Forcing Chain: R${getRow(cellIndex) + 1}C${getCol(cellIndex) + 1} has candidates {${value1}, ${value2}, ${value3}}.\n\n`;
    explanation += `All three paths lead to these eliminations:\n`;
    commonEliminations.forEach(e => {
      explanation += `• R${getRow(e.cell) + 1}C${getCol(e.cell) + 1} cannot be ${e.digit}\n`;
    });
    
    return {
      technique: 'Cell Forcing Chain',
      explanation,
      baseCells: [cellIndex],
      targetCells: [...new Set(commonEliminations.map(e => e.cell))],
      placement: null,
      eliminations: commonEliminations,
      chains: [
        { cells: branch1.chain, color: '#10b981', label: `Path A: ${value1}` },
        { cells: branch2.chain, color: '#a855f7', label: `Path B: ${value2}` },
        { cells: branch3.chain, color: '#3b82f6', label: `Path C: ${value3}` }
      ],
      digit: null
    };
  }
  
  return null;
};

// Explore a branch of the forcing chain
const exploreBranch = (grid, cellIndex, value, maxDepth, chain) => {
  // Track initial state before applying value
  const initialCandidates = {};
  grid.forEach((cell, idx) => {
    if (cell.value === null) {
      initialCandidates[idx] = [...cell.candidates];
    }
  });
  
  const newChain = [...chain, { 
    cell: cellIndex, 
    value, 
    action: 'place',
    reason: chain.length === 0 ? 'Initial assumption' : 'Forced by previous eliminations'
  }];
  
  if (chain.length >= maxDepth) {
    return { grid, contradiction: false, chain: newChain };
  }
  
  const result = applyValueAndPropagate(grid, cellIndex, value, 0);
  
  if (result.contradiction) {
    return { grid: result.grid, contradiction: true, chain: newChain, contradictionCell: result.cell };
  }
  
  // Track eliminations
  const newGrid = result.grid;
  const eliminationSteps = [];
  
  newGrid.forEach((cell, idx) => {
    if (cell.value === null && initialCandidates[idx]) {
      const eliminated = initialCandidates[idx].filter(c => !cell.candidates.includes(c));
      eliminated.forEach(digit => {
        const reason = getPeers(cellIndex).includes(idx) && digit === value 
          ? `Sees ${value} at R${getRow(cellIndex) + 1}C${getCol(cellIndex) + 1}`
          : 'Constraint propagation';
        eliminationSteps.push({ cell: idx, value: digit, action: 'eliminate', reason });
      });
    }
  });
  
  const chainWithEliminations = [...newChain, ...eliminationSteps];
  
  // Look for next bi-value cell
  for (let i = 0; i < 81; i++) {
    if (newGrid[i].value === null && newGrid[i].candidates.length === 2) {
      const [v1, v2] = newGrid[i].candidates;
      
      // Try first value
      const subBranch1 = exploreBranch(newGrid, i, v1, maxDepth, chainWithEliminations);
      if (subBranch1.contradiction) {
        // If first value leads to contradiction, second must be true
        const subBranch2 = applyValueAndPropagate(newGrid, i, v2, 0);
        if (!subBranch2.contradiction) {
          return exploreBranch(subBranch2.grid, i, v2, maxDepth, chainWithEliminations);
        }
      }
      
      return subBranch1;
    }
  }
  
  return { grid: newGrid, contradiction: false, chain: chainWithEliminations };
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