// Deep Forcing Chain Engine - Explores "What-If" scenarios

import { getRow, getCol, getBox, getRowIndices, getColIndices, getBoxIndices, getPeers, ALL_UNITS, cellName } from './gridUnits';
import { makeStep } from './stepShape';

// Clone grid for simulation
const cloneGrid = (grid) => {
  return grid.map(cell => ({
    ...cell,
    candidates: [...cell.candidates]
  }));
};

// Apply a value and propagate constraints: naked singles AND hidden
// singles, to a fixpoint.
//
// A worklist processes every peer of every placement (an older recursive
// version stopped at the first naked single and left stale candidates).
// After the naked-single cascade drains, each unit is scanned for a digit
// with exactly one place left, which is queued with its reason; a digit
// with NO place left is a contradiction. Without hidden singles the two
// branches of a forcing chain almost never converged on library grids, so
// the mentor fell straight to hypothesis search.
//
// Returns { grid, contradiction, cell?, text?, placements } where
// `placements` lists every placement that followed from the first one, in
// order, each with a plain-language reason. Exported for tests.
export const applyValueAndPropagate = (grid, cellIndex, value) => {
  const newGrid = cloneGrid(grid);
  const queue = [[cellIndex, value, null]];
  const placements = [];

  const contradiction = (cell, text) => ({ grid: newGrid, contradiction: true, cell, text, placements });

  for (;;) {
    while (queue.length > 0) {
      const [idx, val, reason] = queue.shift();

      if (newGrid[idx].value === val) continue; // already placed (re-entry)
      if (newGrid[idx].value !== null) {
        return contradiction(idx, `${cellName(idx)} would have to be both ${newGrid[idx].value} and ${val}`);
      }
      if (idx !== cellIndex && !newGrid[idx].candidates.includes(val)) {
        return contradiction(idx, `${cellName(idx)} would have to be ${val}, which it can no longer hold`);
      }

      newGrid[idx].value = val;
      newGrid[idx].candidates = [];
      if (reason) placements.push({ cell: idx, value: val, reason });

      for (const peerIdx of getPeers(idx)) {
        const peer = newGrid[peerIdx];
        if (peer.value === null) {
          if (peer.candidates.includes(val)) {
            peer.candidates = peer.candidates.filter(c => c !== val);

            if (peer.candidates.length === 0) {
              return contradiction(peerIdx, `${cellName(peerIdx)} has no valid candidates left`);
            }
            if (peer.candidates.length === 1) {
              queue.push([peerIdx, peer.candidates[0], `Only candidate left in ${cellName(peerIdx)}`]);
            }
          }
        } else if (peer.value === val) {
          // Same value in peer = contradiction
          return contradiction(peerIdx, `${cellName(peerIdx)} already holds ${val}`);
        }
      }
    }

    // Hidden singles: a digit with one place left in a unit goes there.
    let queued = false;
    for (const unit of ALL_UNITS) {
      for (let d = 1; d <= 9; d++) {
        let placed = false;
        let spots = [];
        for (const idx of unit.indices) {
          const cell = newGrid[idx];
          if (cell.value === d) { placed = true; break; }
          if (cell.value === null && cell.candidates.includes(d)) spots.push(idx);
        }
        if (placed) continue;
        if (spots.length === 0) {
          const empty = unit.indices.find((idx) => newGrid[idx].value === null);
          return contradiction(empty ?? unit.indices[0], `no cell in ${unit.name} can hold ${d}`);
        }
        if (spots.length === 1) {
          queue.push([spots[0], d, `Only place for ${d} in ${unit.name}`]);
          queued = true;
        }
      }
      if (queued) break; // apply what we found, then rescan
    }
    if (!queued) break;
  }

  return { grid: newGrid, contradiction: false, placements };
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

const cellRef = cellName;

// The step-by-step story of a branch that ended in a contradiction.
const narrateContradiction = (cellIndex, value, branch, conclusion) => {
  let text = `What if ${cellRef(cellIndex)} = ${value}?\n\n`;
  const placements = branch.chain.filter(s => s.action === 'place');
  placements.forEach((step, idx) => {
    if (idx === 0) {
      text += `Starting assumption: place ${step.value} at ${cellRef(step.cell)}\n\n`;
    } else {
      text += `Step ${idx}: ${cellRef(step.cell)} must be ${step.value}\n   Why? ${step.reason}\n`;
    }
    const chainIdx = branch.chain.indexOf(step);
    let peerElims = 0;
    for (let i = chainIdx + 1; i < branch.chain.length && branch.chain[i].action === 'eliminate'; i++) {
      if (branch.chain[i].reason.includes('Sees')) peerElims++;
    }
    if (peerElims > 0) text += `   This eliminates ${step.value} from ${peerElims} peer cell${peerElims > 1 ? 's' : ''}\n`;
    text += '\n';
  });
  const caseSplits = placements.filter(s => s.reason && s.reason.startsWith('Case analysis')).length;
  text += `CONTRADICTION: after ${placements.length} placement${placements.length > 1 ? 's' : ''}`;
  if (caseSplits > 0) text += ` (including ${caseSplits} case split${caseSplits > 1 ? 's' : ''})`;
  text += `, ${branch.contradictionText || `${cellRef(branch.contradictionCell)} has no valid candidates left`}.\n\n`;
  text += `Conclusion: ${conclusion}`;
  return text;
};

// A Hypothesis Mode step from a branch that contradicted. `placement` is
// given when the contradiction leaves exactly one candidate in the cell.
const hypothesisStep = (cellIndex, badValue, branch, placement) => {
  const conclusion = placement
    ? `${badValue} is impossible, so ${cellRef(cellIndex)} must be ${placement.digit}.`
    : `${badValue} is impossible, so it can be removed from ${cellRef(cellIndex)}.`;
  return makeStep({
    technique: 'Hypothesis Mode',
    explanation: narrateContradiction(cellIndex, badValue, branch, conclusion),
    baseCells: [cellIndex],
    targetCells: [branch.contradictionCell],
    placement: placement || null,
    eliminations: placement ? [] : [{ cell: cellIndex, digit: badValue }],
    chain: branch.chain,
    contradiction: true,
    contradictionCell: branch.contradictionCell,
    contradictionText: branch.contradictionText || null,
    contradictoryDigit: badValue,
  });
};

// FALLBACK: Hypothesis mode (contradiction-based, not pure logic).
//
// Any candidate whose assumption leads to a contradiction is false; that
// is sound on its own, so a contradicted digit is eliminated regardless of
// what the other branches do. When the cell has two candidates and one of
// them contradicts, the other is placed.
export const findHypothesis = (grid, maxDepth = 8) => {
  const bySize = (n) => {
    const cells = [];
    for (let i = 0; i < 81; i++) {
      if (grid[i].value === null && grid[i].candidates.length === n) cells.push(i);
    }
    return cells;
  };

  // Bi-value cells first: a contradiction here places a digit.
  for (const cellIndex of bySize(2)) {
    const [v1, v2] = grid[cellIndex].candidates;
    const b1 = exploreBranch(grid, cellIndex, v1, maxDepth, []);
    if (b1.contradiction) return hypothesisStep(cellIndex, v1, b1, { cell: cellIndex, digit: v2 });
    const b2 = exploreBranch(grid, cellIndex, v2, maxDepth, []);
    if (b2.contradiction) return hypothesisStep(cellIndex, v2, b2, { cell: cellIndex, digit: v1 });
  }

  // Then tri-value cells, then anything: a contradiction eliminates.
  const rest = [...bySize(3)];
  for (let i = 0; i < 81; i++) {
    if (grid[i].value === null && grid[i].candidates.length > 3) rest.push(i);
  }
  for (const cellIndex of rest) {
    for (const value of grid[cellIndex].candidates) {
      const branch = exploreBranch(grid, cellIndex, value, maxDepth, []);
      if (branch.contradiction) return hypothesisStep(cellIndex, value, branch, null);
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
  
  const result = applyValueAndPropagate(grid, cellIndex, value);
  
  if (result.contradiction) {
    return { grid: result.grid, chain: newChain, contradiction: true };
  }
  
  const newGrid = result.grid;
  // Every placement the propagation forced goes into the chain with its
  // reason, so the narrative shows the actual path and not just its ends.
  const derived = result.placements.map((p) => ({ cell: p.cell, value: p.value, action: 'place', reason: p.reason, derived: true }));
  newChain.push(...derived);
  
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
    const originCell = cellName(cellIndex);
    const targetCell = cellName(placement.cell);
    
    let explanation = `🎯 Cell Forcing Chain (Convergence Proof)\n\n`;
    explanation += `📍 Origin: ${originCell} can only be ${value1} or ${value2}.\n\n`;
    
    // Build chain narrative for Path A
    explanation += `✅ Path A: If ${originCell} = ${value1}\n`;
    const pathASteps = branch1.chain.filter(s => s.action === 'place').slice(1, 4); // Show first few steps
    pathASteps.forEach((step, idx) => {
      const cellRef = cellName(step.cell);
      explanation += `   ${idx + 1}. ${cellRef} must be ${step.value}\n`;
    });
    if (branch1.chain.filter(s => s.action === 'place').length > 4) {
      explanation += `   ... (${branch1.chain.filter(s => s.action === 'place').length - 4} more steps)\n`;
    }
    explanation += `   ➜ Result: ${targetCell} = ${placement.digit}\n\n`;
    
    // Build chain narrative for Path B
    explanation += `✅ Path B: If ${originCell} = ${value2}\n`;
    const pathBSteps = branch2.chain.filter(s => s.action === 'place').slice(1, 4);
    pathBSteps.forEach((step, idx) => {
      const cellRef = cellName(step.cell);
      explanation += `   ${idx + 1}. ${cellRef} must be ${step.value}\n`;
    });
    if (branch2.chain.filter(s => s.action === 'place').length > 4) {
      explanation += `   ... (${branch2.chain.filter(s => s.action === 'place').length - 4} more steps)\n`;
    }
    explanation += `   ➜ Result: ${targetCell} = ${placement.digit}\n\n`;
    
    explanation += `💡 Proven Conclusion: Both paths converge on ${targetCell} = ${placement.digit}\n`;
    explanation += `This is logically certain, regardless of which candidate is correct!`;
    
    return makeStep({
      technique: 'Cell Forcing Chain',
      explanation,
      baseCells: [cellIndex],
      targetCells: [placement.cell],
      placement,
      eliminations: [],
      chains: [
        { cells: branch1.chain, color: '#10b981', label: `If ${value1}` },
        { cells: branch2.chain, color: '#a855f7', label: `If ${value2}` }
      ],
      convergenceCell: placement.cell,
      digit: null
    });
  }
  
  if (commonEliminations.length > 0) {
    const originCell = cellName(cellIndex);
    
    let explanation = `🎯 Cell Forcing Chain (Convergence Proof)\n\n`;
    explanation += `📍 Origin: ${originCell} can only be ${value1} or ${value2}.\n\n`;
    
    explanation += `✅ Path A: If ${originCell} = ${value1}\n`;
    explanation += `   Leads to these eliminations...\n\n`;
    
    explanation += `✅ Path B: If ${originCell} = ${value2}\n`;
    explanation += `   Also leads to the same eliminations!\n\n`;
    
    explanation += `💡 Proven Eliminations (both paths agree):\n`;
    commonEliminations.slice(0, 5).forEach(e => {
      explanation += `   • R${getRow(e.cell) + 1}C${getCol(e.cell) + 1} cannot be ${e.digit}\n`;
    });
    if (commonEliminations.length > 5) {
      explanation += `   ... and ${commonEliminations.length - 5} more\n`;
    }
    explanation += `\nThese eliminations are logically certain!`;
    
    return makeStep({
      technique: 'Cell Forcing Chain',
      explanation,
      baseCells: [cellIndex],
      targetCells: [...new Set(commonEliminations.map(e => e.cell))],
      placement: null,
      eliminations: commonEliminations,
      chains: [
        { cells: branch1.chain, color: '#10b981', label: `If ${value1}` },
        { cells: branch2.chain, color: '#a855f7', label: `If ${value2}` }
      ],
      digit: null
    });
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
    const originCell = cellName(cellIndex);
    const targetCell = cellName(placement.cell);
    
    let explanation = `🎯 Cell Forcing Chain (Triple Convergence)\n\n`;
    explanation += `📍 Origin: ${originCell} has three candidates {${value1}, ${value2}, ${value3}}.\n\n`;
    
    explanation += `✅ Path A: If ${originCell} = ${value1} ➜ ${targetCell} = ${placement.digit}\n`;
    explanation += `✅ Path B: If ${originCell} = ${value2} ➜ ${targetCell} = ${placement.digit}\n`;
    explanation += `✅ Path C: If ${originCell} = ${value3} ➜ ${targetCell} = ${placement.digit}\n\n`;
    
    explanation += `💡 Proven Conclusion: All three paths converge!\n`;
    explanation += `${targetCell} must be ${placement.digit} (logically certain)`;
    
    return makeStep({
      technique: 'Cell Forcing Chain',
      explanation,
      baseCells: [cellIndex],
      targetCells: [placement.cell],
      placement,
      eliminations: [],
      chains: [
        { cells: branch1.chain, color: '#10b981', label: `If ${value1}` },
        { cells: branch2.chain, color: '#a855f7', label: `If ${value2}` },
        { cells: branch3.chain, color: '#3b82f6', label: `If ${value3}` }
      ],
      convergenceCell: placement.cell,
      digit: null
    });
  }
  
  if (commonEliminations.length > 0) {
    const originCell = cellName(cellIndex);
    
    let explanation = `🎯 Cell Forcing Chain (Triple Convergence)\n\n`;
    explanation += `📍 Origin: ${originCell} has three candidates {${value1}, ${value2}, ${value3}}.\n\n`;
    
    explanation += `All three paths agree on these eliminations:\n`;
    commonEliminations.slice(0, 5).forEach(e => {
      explanation += `   • R${getRow(e.cell) + 1}C${getCol(e.cell) + 1} cannot be ${e.digit}\n`;
    });
    if (commonEliminations.length > 5) {
      explanation += `   ... and ${commonEliminations.length - 5} more\n`;
    }
    explanation += `\n💡 These eliminations are proven by triple convergence!`;
    
    return makeStep({
      technique: 'Cell Forcing Chain',
      explanation,
      baseCells: [cellIndex],
      targetCells: [...new Set(commonEliminations.map(e => e.cell))],
      placement: null,
      eliminations: commonEliminations,
      chains: [
        { cells: branch1.chain, color: '#10b981', label: `If ${value1}` },
        { cells: branch2.chain, color: '#a855f7', label: `If ${value2}` },
        { cells: branch3.chain, color: '#3b82f6', label: `If ${value3}` }
      ],
      digit: null
    });
  }
  
  return null;
};

// Explore a branch of the forcing chain
// `forcedReason`, when given, is the honest reason for this placement and
// skips the hidden-single check. The caller uses it when a value is taken
// because its alternative led to a contradiction: by then the alternative
// has been ruled out on this grid, so the hidden-single test would pass
// trivially and mislabel a case split as a deduction.
const exploreBranch = (grid, cellIndex, value, maxDepth, chain, forcedReason = null) => {
  // Track initial state before applying value
  const initialCandidates = {};
  grid.forEach((cell, idx) => {
    if (cell.value === null) {
      initialCandidates[idx] = [...cell.candidates];
    }
  });
  
  // Determine reason for this placement
  let reason = 'Initial assumption';
  if (forcedReason) {
    reason = forcedReason;
  } else if (chain.length > 0) {
    const cell = grid[cellIndex];
    if (cell.candidates.length === 1) {
      reason = 'Only candidate remaining (Naked Single)';
    } else {
      // Check if it's a hidden single
      const row = getRow(cellIndex);
      const col = getCol(cellIndex);
      const box = getBox(cellIndex);
      
      const rowCells = getRowIndices(row).filter(i => i !== cellIndex && grid[i].value === null);
      const colCells = getColIndices(col).filter(i => i !== cellIndex && grid[i].value === null);
      const boxCells = getBoxIndices(box).filter(i => i !== cellIndex && grid[i].value === null);
      
      const isHiddenInRow = !rowCells.some(i => grid[i].candidates.includes(value));
      const isHiddenInCol = !colCells.some(i => grid[i].candidates.includes(value));
      const isHiddenInBox = !boxCells.some(i => grid[i].candidates.includes(value));
      
      if (isHiddenInRow) {
        reason = `Only place for ${value} in row ${row + 1}`;
      } else if (isHiddenInCol) {
        reason = `Only place for ${value} in column ${col + 1}`;
      } else if (isHiddenInBox) {
        reason = `Only place for ${value} in box ${box + 1}`;
      } else {
        // This placement is a case split on a bi-value cell, not a forced
        // deduction - the conclusion stays sound (both cases are checked),
        // but the narrative must not present it as forced.
        reason = `Case analysis: trying ${value} in a two-candidate cell`;
      }
    }
  }

  const newChain = [...chain, {
    cell: cellIndex,
    value,
    action: 'place',
    reason
  }];

  // Budget by placements, not raw chain entries: the chain also carries one
  // entry per elimination (often dozens per placement), which used to eat
  // the whole depth budget after a step or two.
  // Propagated (derived) placements are narrated but do not spend budget.
  const placementCount = chain.filter(s => s.action === 'place' && !s.derived).length;
  if (placementCount >= maxDepth) {
    return { grid, contradiction: false, chain: newChain };
  }
  
  const result = applyValueAndPropagate(grid, cellIndex, value);
  
  if (result.contradiction) {
    // Placements made before the contradiction are part of the story.
    const derived = result.placements.map((p) => ({ cell: p.cell, value: p.value, action: 'place', reason: p.reason, derived: true }));
    return {
      grid: result.grid,
      contradiction: true,
      chain: [...newChain, ...derived],
      contradictionCell: result.cell,
      contradictionText: result.text,
    };
  }
  
  // Track eliminations
  const newGrid = result.grid;
  const derived = result.placements.map((p) => ({ cell: p.cell, value: p.value, action: 'place', reason: p.reason, derived: true }));
  const placedHere = [{ cell: cellIndex, value }, ...result.placements];
  const eliminationSteps = [];
  
  newGrid.forEach((cell, idx) => {
    if (cell.value === null && initialCandidates[idx]) {
      const eliminated = initialCandidates[idx].filter(c => !cell.candidates.includes(c));
      eliminated.forEach(digit => {
        const source = placedHere.find((p) => p.value === digit && getPeers(p.cell).includes(idx));
        const reason = source
          ? `Sees ${digit} at ${cellName(source.cell)}`
          : 'Constraint propagation';
        eliminationSteps.push({ cell: idx, value: digit, action: 'eliminate', reason });
      });
    }
  });
  
  const chainWithEliminations = [...newChain, ...derived, ...eliminationSteps];
  
  // Look for next bi-value cell
  for (let i = 0; i < 81; i++) {
    if (newGrid[i].value === null && newGrid[i].candidates.length === 2) {
      const [v1, v2] = newGrid[i].candidates;
      
      // Try first value
      const subBranch1 = exploreBranch(newGrid, i, v1, maxDepth, chainWithEliminations);
      if (subBranch1.contradiction) {
        // The first value broke the puzzle, so the second is the only
        // option left. Explore it from the SAME grid (exploreBranch applies
        // the value itself) with the honest reason attached.
        const reason = `Case analysis: ${v1} leads to a contradiction, so it must be ${v2}`;
        const subBranch2 = exploreBranch(newGrid, i, v2, maxDepth, chainWithEliminations, reason);
        if (!subBranch2.contradiction) {
          return subBranch2;
        }
      }
      
      return subBranch1;
    }
  }
  
  return { grid: newGrid, contradiction: false, chain: chainWithEliminations };
};
