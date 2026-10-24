// Sudoku Logic Engine - Human-style solving techniques
import { findXCycle, find3DMedusa, findALSXZ, findUniqueRectangle, findBUGPlus1, findFinnedXWing } from './chainEngine';
import {
  findJellyfish,
  findEmptyRectangle,
  findFinnedSwordfish,
  findFinnedJellyfish,
  findSashimiFish,
  findFrankenFish,
  findMutantFish,
} from './fishEngine';
import { CHAIN_FINDERS } from './aicEngine';
import { makeStep } from './stepShape';

// Helper functions
import { getRow, getCol, getBox, getRowIndices, getColIndices, getBoxIndices, getPeers, arePeers, unitOf, cellName, commonUnit } from './gridUnits';

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

// Find the next logical step
// Step objects carry the unit a pattern was found in as { type, index, name }
// with type 'row' | 'column' | 'box', so the UI never has to parse prose.
const normalizeUnit = (unit) => {
  const type = unit.type === 'col' ? 'column' : unit.type;
  const index = Number(String(unit.name).replace(/\D/g, '')) - 1;
  return unitOf(type, index);
};

// Techniques in teaching order: the hint is always the easiest that applies.
const TECHNIQUE_ORDER = () => [
  findNakedSingle,
  findHiddenSingle,
  findPointing,
  findClaiming,
  findNakedPair,
  findHiddenPair,
  findNakedTriple,
  findHiddenTriple,
  findNakedQuad,
  findHiddenQuad,
  findXWing,
  findSwordfish,
  findJellyfish,
  findEmptyRectangle,
  findXYWing,
  findXYZWing,
  findWXYZWing,
  // The chain family (#67). The short chains that have well-known names come
  // first, so the player meets the idea under a name they can look up; the
  // general and the richer forms are the last deductions before what-if.
  CHAIN_FINDERS['Skyscraper'],
  CHAIN_FINDERS['Two-String Kite'],
  CHAIN_FINDERS['W-Wing'],
  CHAIN_FINDERS['Remote Pairs'],
  // Colouring keeps its place: the player has already learned it.
  findXCycle,
  find3DMedusa,
  CHAIN_FINDERS['X-Chain'],
  CHAIN_FINDERS['XY-Chain'],
  findFinnedXWing,
  findFinnedSwordfish,
  findFinnedJellyfish,
  findSashimiFish,
  findALSXZ,
  findUniqueRectangle,
  findBUGPlus1,
  findFrankenFish,
  findMutantFish,
  // The general chain and its richer forms are the last deductions the
  // mentor has before the what-if search.
  CHAIN_FINDERS['Alternating Chain'],
  CHAIN_FINDERS['Grouped X-Chain'],
  CHAIN_FINDERS['Grouped Alternating Chain'],
  CHAIN_FINDERS['Continuous Loop'],
  CHAIN_FINDERS['ALS Chain'],
];

export const findNextLogicStep = (grid, focusedDigit = null) => {
  for (const find of TECHNIQUE_ORDER()) {
    const step = find(grid, focusedDigit);
    if (step) return makeStep(step);
  }
  return null;
};

// Find all instances of a specific technique
export const findAllTechniqueInstances = (grid, techniqueName) => {
  // Mapping of technique names to their detection functions
  const techniqueMap = {
    'Naked Single': findNakedSingle,
    'Hidden Single': findHiddenSingle,
    'Pointing Pair': findPointing,
    'Pointing Triple': findPointing,
    'Claiming': findClaiming,
    'Naked Pair': findNakedPair,
    'Hidden Pair': findHiddenPair,
    'Naked Triple': findNakedTriple,
    'Hidden Triple': findHiddenTriple,
    'Naked Quad': findNakedQuad,
    'Hidden Quad': findHiddenQuad,
    'X-Wing': findXWing,
    'Swordfish': findSwordfish,
    'Jellyfish': findJellyfish,
    'Empty Rectangle': findEmptyRectangle,
    'XY-Wing': findXYWing,
    'XYZ-Wing': findXYZWing,
    'WXYZ-Wing': findWXYZWing,
    'X-Cycle': findXCycle,
    '3D Medusa': find3DMedusa,
    'Finned X-Wing': findFinnedXWing,
    'Finned Swordfish': findFinnedSwordfish,
    'Finned Jellyfish': findFinnedJellyfish,
    'Sashimi Fish': findSashimiFish,
    'ALS-XZ': findALSXZ,
    'Unique Rectangle Type 1': findUniqueRectangle,
    'BUG+1': findBUGPlus1,
    'Franken Fish': findFrankenFish,
    'Mutant Fish': findMutantFish,
    ...CHAIN_FINDERS,
  };

  const findFunc = techniqueMap[techniqueName];
  if (!findFunc) return [];

  // Call the function in 'returnAll' mode to get only currently visible instances
  const results = findFunc(grid, null, true);
  
  // Filter out duplicates (some techniques might find the same cell via different units)
  const uniqueResults = [];
  const seenKeys = new Set();

  (Array.isArray(results) ? results : (results ? [results] : [])).forEach(step => {
    // Filter by specific technique name (important for Pointing Pair vs Pointing Triple)
    if (step.technique !== techniqueName) return;
    
    const key = step.placement 
      ? `p-${step.placement.cell}-${step.placement.digit}` 
      : `e-${step.eliminations?.map(e => `${e.cell}${e.digit}`).join('-') || ''}`;
    
    if (!seenKeys.has(key)) {
      uniqueResults.push(makeStep(step));
      seenKeys.add(key);
    }
  });

  return uniqueResults;
};

// Naked Single: Cell with only one candidate
const findNakedSingle = (grid, focusedDigit, returnAll = false) => {
  const allInstances = [];
  
  for (let i = 0; i < 81; i++) {
    const cell = grid[i];
    if (cell.value === null && cell.candidates.length === 1) {
      const digit = cell.candidates[0];
      if (focusedDigit && digit !== focusedDigit) continue;
      
      const step = {
        technique: 'Naked Single',
        digit,
        baseCells: [i],
        targetCells: [],
        placement: { cell: i, digit },
        eliminations: [],
        explanation: `Cell R${getRow(i) + 1}C${getCol(i) + 1} has only one possible candidate: ${digit}. This is the only number that can go here.`
      };
      
      if (returnAll) {
        allInstances.push(step);
      } else {
        return step;
      }
    }
  }
  
  return returnAll ? allInstances : null;
};

/**
 * Hidden Single: Finds a digit that can only appear in one cell within a unit (row, column, or box)
 * 
 * Optimization: Instead of checking each digit separately for each unit, this function:
 * 1. For each unit (row/col/box), builds a frequency map of all digits in one pass
 * 2. Identifies any digit that appears exactly once in that unit
 * 
 * This reduces complexity from O(27 units × 9 digits × 9 cells) to O(27 units × 9 cells)
 * 
 * @param {Array} grid - The Sudoku grid
 * @param {number|null} focusedDigit - Optional digit to focus on (1-9)
 * @param {boolean} returnAll - If true, returns all instances; if false, returns first found
 * @returns {Object|Array|null} - Step object, array of steps, or null
 */
const findHiddenSingle = (grid, focusedDigit, returnAll = false) => {
  const allInstances = [];
  
  // Helper function to check a single unit for hidden singles
  const checkUnit = (unitCells, unitType, unitNumber) => {
    // Map: digit -> array of cell indices where it appears as a candidate
    const digitLocations = {};
    
    // Single pass through all cells in the unit to build the digit location map
    for (const cellIndex of unitCells) {
      const cell = grid[cellIndex];
      
      // Skip cells that already have a value
      if (cell.value !== null) continue;
      
      // For each candidate in this cell, record its location
      for (const candidate of cell.candidates) {
        // Skip if we're focusing on a specific digit and this isn't it
        if (focusedDigit && candidate !== focusedDigit) continue;
        
        if (!digitLocations[candidate]) {
          digitLocations[candidate] = [];
        }
        digitLocations[candidate].push(cellIndex);
      }
    }
    
    // Check each digit to see if it appears exactly once (hidden single)
    for (const digit in digitLocations) {
      const locations = digitLocations[digit];
      
      if (locations.length === 1) {
        const targetCell = locations[0];
        const digitNum = parseInt(digit);
        
        // Skip if this is a naked single (cell with only 1 candidate)
        // Naked singles are handled by findNakedSingle
        if (grid[targetCell].candidates.length === 1) continue;
        
        const step = {
          technique: 'Hidden Single',
          digit: digitNum,
          unit: unitOf(unitType.toLowerCase(), unitNumber - 1),
          baseCells: [targetCell],
          targetCells: [],
          placement: { cell: targetCell, digit: digitNum },
          eliminations: [],
          explanation: `In ${unitType} ${unitNumber}, the digit ${digitNum} can only go in cell R${getRow(targetCell) + 1}C${getCol(targetCell) + 1}. This is the only cell in this ${unitType.toLowerCase()} where ${digitNum} is possible.`
        };
        
        if (returnAll) {
          allInstances.push(step);
        } else {
          return step;
        }
      }
    }
    
    return null;
  };
  
  // Check all 9 rows
  for (let row = 0; row < 9; row++) {
    const result = checkUnit(getRowIndices(row), 'Row', row + 1);
    if (result && !returnAll) return result;
  }
  
  // Check all 9 columns
  for (let col = 0; col < 9; col++) {
    const result = checkUnit(getColIndices(col), 'Column', col + 1);
    if (result && !returnAll) return result;
  }
  
  // Check all 9 boxes
  for (let box = 0; box < 9; box++) {
    const result = checkUnit(getBoxIndices(box), 'Box', box + 1);
    if (result && !returnAll) return result;
  }
  
  return returnAll ? allInstances : null;
};

// Pointing Pairs/Triples
const findPointing = (grid, focusedDigit, returnAll = false) => {
  const allInstances = [];
  
  for (let box = 0; box < 9; box++) {
    const boxIndices = getBoxIndices(box);
    const digitsToCheck = focusedDigit ? [focusedDigit] : [1, 2, 3, 4, 5, 6, 7, 8, 9];
    
    for (const digit of digitsToCheck) {
      const cellsWithDigit = boxIndices.filter(i => 
        grid[i].value === null && grid[i].candidates.includes(digit)
      );
      
      if (cellsWithDigit.length >= 2 && cellsWithDigit.length <= 3) {
        // Check if all in same row
        const rows = [...new Set(cellsWithDigit.map(getRow))];
        if (rows.length === 1) {
          const row = rows[0];
          const rowIndices = getRowIndices(row);
          const eliminations = rowIndices
            .filter(i => !boxIndices.includes(i) && grid[i].candidates.includes(digit))
            .map(i => ({ cell: i, digit }));
          
          if (eliminations.length > 0) {
            const step = {
              technique: cellsWithDigit.length === 2 ? 'Pointing Pair' : 'Pointing Triple',
              digit,
              baseCells: cellsWithDigit,
              targetCells: eliminations.map(e => e.cell),
              placement: null,
              eliminations,
              explanation: `In Box ${box + 1}, the digit ${digit} is confined to Row ${row + 1}. This means ${digit} can be eliminated from other cells in Row ${row + 1} outside this box.`
            };
            
            if (returnAll) {
              allInstances.push(step);
            } else {
              return step;
            }
          }
        }
        
        // Check if all in same column
        const cols = [...new Set(cellsWithDigit.map(getCol))];
        if (cols.length === 1) {
          const col = cols[0];
          const colIndices = getColIndices(col);
          const eliminations = colIndices
            .filter(i => !boxIndices.includes(i) && grid[i].candidates.includes(digit))
            .map(i => ({ cell: i, digit }));
          
          if (eliminations.length > 0) {
            const step = {
              technique: cellsWithDigit.length === 2 ? 'Pointing Pair' : 'Pointing Triple',
              digit,
              baseCells: cellsWithDigit,
              targetCells: eliminations.map(e => e.cell),
              placement: null,
              eliminations,
              explanation: `In Box ${box + 1}, the digit ${digit} is confined to Column ${col + 1}. This means ${digit} can be eliminated from other cells in Column ${col + 1} outside this box.`
            };
            
            if (returnAll) {
              allInstances.push(step);
            } else {
              return step;
            }
          }
        }
      }
    }
  }
  return returnAll ? allInstances : null;
};

// Claiming (Box-Line Reduction)
const findClaiming = (grid, focusedDigit, returnAll = false) => {
  const allInstances = [];
  
  // Check rows
  for (let row = 0; row < 9; row++) {
    const rowIndices = getRowIndices(row);
    const digitsToCheck = focusedDigit ? [focusedDigit] : [1, 2, 3, 4, 5, 6, 7, 8, 9];
    
    for (const digit of digitsToCheck) {
      const cellsWithDigit = rowIndices.filter(i => 
        grid[i].value === null && grid[i].candidates.includes(digit)
      );
      
      if (cellsWithDigit.length >= 2 && cellsWithDigit.length <= 3) {
        const boxes = [...new Set(cellsWithDigit.map(getBox))];
        if (boxes.length === 1) {
          const box = boxes[0];
          const boxIndices = getBoxIndices(box);
          const eliminations = boxIndices
            .filter(i => !rowIndices.includes(i) && grid[i].candidates.includes(digit))
            .map(i => ({ cell: i, digit }));
          
          if (eliminations.length > 0) {
            const step = {
              technique: 'Claiming',
              digit,
              baseCells: cellsWithDigit,
              targetCells: eliminations.map(e => e.cell),
              placement: null,
              eliminations,
              explanation: `In Row ${row + 1}, the digit ${digit} is confined to Box ${box + 1}. This means ${digit} can be eliminated from other cells in Box ${box + 1} outside this row.`
            };
            
            if (returnAll) {
              allInstances.push(step);
            } else {
              return step;
            }
          }
        }
      }
    }
  }
  
  // Check columns
  for (let col = 0; col < 9; col++) {
    const colIndices = getColIndices(col);
    const digitsToCheck = focusedDigit ? [focusedDigit] : [1, 2, 3, 4, 5, 6, 7, 8, 9];
    
    for (const digit of digitsToCheck) {
      const cellsWithDigit = colIndices.filter(i => 
        grid[i].value === null && grid[i].candidates.includes(digit)
      );
      
      if (cellsWithDigit.length >= 2 && cellsWithDigit.length <= 3) {
        const boxes = [...new Set(cellsWithDigit.map(getBox))];
        if (boxes.length === 1) {
          const box = boxes[0];
          const boxIndices = getBoxIndices(box);
          const eliminations = boxIndices
            .filter(i => !colIndices.includes(i) && grid[i].candidates.includes(digit))
            .map(i => ({ cell: i, digit }));
          
          if (eliminations.length > 0) {
            const step = {
              technique: 'Claiming',
              digit,
              baseCells: cellsWithDigit,
              targetCells: eliminations.map(e => e.cell),
              placement: null,
              eliminations,
              explanation: `In Column ${col + 1}, the digit ${digit} is confined to Box ${box + 1}. This means ${digit} can be eliminated from other cells in Box ${box + 1} outside this column.`
            };
            
            if (returnAll) {
              allInstances.push(step);
            } else {
              return step;
            }
          }
        }
      }
    }
  }
  
  return returnAll ? allInstances : null;
};

// Naked Triple
const findNakedTriple = (grid, focusedDigit, returnAll = false) => {
  const allInstances = [];
  
  const units = [
    ...Array.from({ length: 9 }, (_, i) => ({ type: 'row', indices: getRowIndices(i), name: `Row ${i + 1}` })),
    ...Array.from({ length: 9 }, (_, i) => ({ type: 'col', indices: getColIndices(i), name: `Column ${i + 1}` })),
    ...Array.from({ length: 9 }, (_, i) => ({ type: 'box', indices: getBoxIndices(i), name: `Box ${i + 1}` }))
  ];
  
  for (const unit of units) {
    const emptyCells = unit.indices.filter(i => grid[i].value === null);
    const tripleCells = emptyCells.filter(i => grid[i].candidates.length >= 2 && grid[i].candidates.length <= 3);
    
    // Try all combinations of 3 cells
    for (let i = 0; i < tripleCells.length; i++) {
      for (let j = i + 1; j < tripleCells.length; j++) {
        for (let k = j + 1; k < tripleCells.length; k++) {
          const cell1 = tripleCells[i];
          const cell2 = tripleCells[j];
          const cell3 = tripleCells[k];
          
          // Combine all candidates from the three cells
          const allCands = new Set([
            ...grid[cell1].candidates,
            ...grid[cell2].candidates,
            ...grid[cell3].candidates
          ]);
          
          // If exactly 3 digits appear across the three cells, it's a naked triple
          if (allCands.size === 3) {
            const tripleDigits = Array.from(allCands);
            
            if (focusedDigit && !tripleDigits.includes(focusedDigit)) continue;
            
            const eliminations = [];
            
            for (const idx of emptyCells) {
              if (idx !== cell1 && idx !== cell2 && idx !== cell3) {
                for (const digit of tripleDigits) {
                  if (grid[idx].candidates.includes(digit)) {
                    eliminations.push({ cell: idx, digit });
                  }
                }
              }
            }
            
            if (eliminations.length > 0) {
              const step = {
                technique: 'Naked Triple',
                digit: focusedDigit || tripleDigits[0],
                unit: normalizeUnit(unit),
                baseCells: [cell1, cell2, cell3],
                targetCells: [...new Set(eliminations.map(e => e.cell))],
                placement: null,
                eliminations,
                explanation: `Cells R${getRow(cell1) + 1}C${getCol(cell1) + 1}, R${getRow(cell2) + 1}C${getCol(cell2) + 1}, and R${getRow(cell3) + 1}C${getCol(cell3) + 1} in ${unit.name} form a Naked Triple with candidates {${tripleDigits.join(', ')}}. These three digits must occupy these three cells, so they can be eliminated from other cells in the ${unit.type}.`
              };
              
              if (returnAll) {
                allInstances.push(step);
              } else {
                return step;
              }
            }
          }
        }
      }
    }
  }
  return returnAll ? allInstances : null;
};

// Naked Pair
const findNakedPair = (grid, focusedDigit, returnAll = false) => {
  const allInstances = [];
  
  const units = [
    ...Array.from({ length: 9 }, (_, i) => ({ type: 'row', indices: getRowIndices(i), name: `Row ${i + 1}` })),
    ...Array.from({ length: 9 }, (_, i) => ({ type: 'col', indices: getColIndices(i), name: `Column ${i + 1}` })),
    ...Array.from({ length: 9 }, (_, i) => ({ type: 'box', indices: getBoxIndices(i), name: `Box ${i + 1}` }))
  ];
  
  for (const unit of units) {
    const emptyCells = unit.indices.filter(i => grid[i].value === null);
    const pairCells = emptyCells.filter(i => grid[i].candidates.length === 2);
    
    for (let i = 0; i < pairCells.length; i++) {
      for (let j = i + 1; j < pairCells.length; j++) {
        const cell1 = pairCells[i];
        const cell2 = pairCells[j];
        const cands1 = grid[cell1].candidates;
        const cands2 = grid[cell2].candidates;
        
        if (cands1.length === 2 && cands1[0] === cands2[0] && cands1[1] === cands2[1]) {
          if (focusedDigit && !cands1.includes(focusedDigit)) continue;
          
          const pairDigits = cands1;
          const eliminations = [];
          
          for (const idx of emptyCells) {
            if (idx !== cell1 && idx !== cell2) {
              for (const digit of pairDigits) {
                if (grid[idx].candidates.includes(digit)) {
                  eliminations.push({ cell: idx, digit });
                }
              }
            }
          }
          
          if (eliminations.length > 0) {
            const step = {
              technique: 'Naked Pair',
              digit: focusedDigit || pairDigits[0],
              unit: normalizeUnit(unit),
              baseCells: [cell1, cell2],
              targetCells: [...new Set(eliminations.map(e => e.cell))],
              placement: null,
              eliminations,
              explanation: `Cells R${getRow(cell1) + 1}C${getCol(cell1) + 1} and R${getRow(cell2) + 1}C${getCol(cell2) + 1} in ${unit.name} both contain only candidates {${pairDigits.join(', ')}}. These two digits must go in these two cells, so they can be eliminated from other cells in the ${unit.type}.`
            };
            
            if (returnAll) {
              allInstances.push(step);
            } else {
              return step;
            }
          }
        }
      }
    }
  }
  return returnAll ? allInstances : null;
};

// Hidden Pair
const findHiddenPair = (grid, focusedDigit, returnAll = false) => {
  const allInstances = [];
  
  const units = [
    ...Array.from({ length: 9 }, (_, i) => ({ type: 'row', indices: getRowIndices(i), name: `Row ${i + 1}` })),
    ...Array.from({ length: 9 }, (_, i) => ({ type: 'col', indices: getColIndices(i), name: `Column ${i + 1}` })),
    ...Array.from({ length: 9 }, (_, i) => ({ type: 'box', indices: getBoxIndices(i), name: `Box ${i + 1}` }))
  ];
  
  for (const unit of units) {
    const emptyCells = unit.indices.filter(i => grid[i].value === null);
    const digitsToCheck = focusedDigit ? [focusedDigit] : [1, 2, 3, 4, 5, 6, 7, 8, 9];
    
    // Find digits that appear in exactly 2 cells
    const digitPositions = {};
    for (const digit of digitsToCheck) {
      const positions = emptyCells.filter(i => grid[i].candidates.includes(digit));
      if (positions.length === 2) {
        digitPositions[digit] = positions;
      }
    }
    
    const digits = Object.keys(digitPositions).map(Number);
    for (let i = 0; i < digits.length; i++) {
      for (let j = i + 1; j < digits.length; j++) {
        const d1 = digits[i];
        const d2 = digits[j];
        const pos1 = digitPositions[d1];
        const pos2 = digitPositions[d2];
        
        if (pos1[0] === pos2[0] && pos1[1] === pos2[1]) {
          const cell1 = pos1[0];
          const cell2 = pos1[1];
          const pairDigits = [d1, d2];
          
          const eliminations = [];
          for (const cell of [cell1, cell2]) {
            for (const cand of grid[cell].candidates) {
              if (!pairDigits.includes(cand)) {
                eliminations.push({ cell, digit: cand });
              }
            }
          }
          
          if (eliminations.length > 0) {
            const step = {
              technique: 'Hidden Pair',
              digit: focusedDigit || d1,
              unit: normalizeUnit(unit),
              pairDigits: [d1, d2],
              baseCells: [cell1, cell2],
              targetCells: [cell1, cell2],
              placement: null,
              eliminations,
              explanation: `In ${unit.name}, digits ${d1} and ${d2} can only appear in cells R${getRow(cell1) + 1}C${getCol(cell1) + 1} and R${getRow(cell2) + 1}C${getCol(cell2) + 1}. Other candidates can be eliminated from these cells.`
            };
            
            if (returnAll) {
              allInstances.push(step);
            } else {
              return step;
            }
          }
        }
      }
    }
  }
  return returnAll ? allInstances : null;
};


// --- Subsets of size three and four, and the XYZ/WXYZ wings -------------
// Shared helpers for the four-cell searches. Rows, columns and boxes in
// the shape the subset finders read.
const subsetUnits = () => [
  ...Array.from({ length: 9 }, (_, i) => ({ type: 'row', indices: getRowIndices(i), name: `Row ${i + 1}` })),
  ...Array.from({ length: 9 }, (_, i) => ({ type: 'col', indices: getColIndices(i), name: `Column ${i + 1}` })),
  ...Array.from({ length: 9 }, (_, i) => ({ type: 'box', indices: getBoxIndices(i), name: `Box ${i + 1}` }))
];

// Every combination of `size` items, in input order.
const combinations = (items, size) => {
  const out = [];
  const pick = (start, chosen) => {
    if (chosen.length === size) {
      out.push([...chosen]);
      return;
    }
    for (let i = start; i < items.length; i++) {
      chosen.push(items[i]);
      pick(i + 1, chosen);
      chosen.pop();
    }
  };
  pick(0, []);
  return out;
};

// Candidates as one bit per digit. The quad and WXYZ searches union
// thousands of candidate sets per grid; integers keep that well inside the
// hint path's budget where Sets did not.
const candidateMask = (cell) => cell.candidates.reduce((mask, d) => mask | (1 << d), 0);
const bitCount = (mask) => {
  let n = 0;
  for (let m = mask; m !== 0; m &= m - 1) n++;
  return n;
};
const maskDigits = (mask) => [1, 2, 3, 4, 5, 6, 7, 8, 9].filter(d => (mask & (1 << d)) !== 0);

/**
 * Hidden Triple and Hidden Quad: `size` digits that, within one unit, are
 * candidates only in the same `size` cells. Those cells are reserved for
 * those digits, so every other candidate goes from them. Hidden Pair is
 * the two-digit case of the same idea (findHiddenPair above).
 */
const findHiddenSubset = (grid, focusedDigit, returnAll, size, technique) => {
  const allInstances = [];

  for (const unit of subsetUnits()) {
    const where = normalizeUnit(unit);
    const emptyCells = unit.indices.filter(i => grid[i].value === null);

    // A digit with a single place left is a Hidden Single; one with more
    // places than the subset has cells cannot be part of it.
    const digitPositions = {};
    for (const digit of [1, 2, 3, 4, 5, 6, 7, 8, 9]) {
      const positions = emptyCells.filter(i => grid[i].candidates.includes(digit));
      if (positions.length >= 2 && positions.length <= size) {
        digitPositions[digit] = positions;
      }
    }

    for (const digits of combinations(Object.keys(digitPositions).map(Number), size)) {
      if (focusedDigit && !digits.includes(focusedDigit)) continue;

      const cells = [...new Set(digits.flatMap(d => digitPositions[d]))].sort((a, b) => a - b);
      if (cells.length !== size) continue;

      const eliminations = [];
      for (const cell of cells) {
        for (const cand of grid[cell].candidates) {
          if (!digits.includes(cand)) eliminations.push({ cell, digit: cand });
        }
      }
      // The subset is real either way, but with nothing to erase it is not
      // a step: the card would be a lesson with no move in it.
      if (eliminations.length === 0) continue;

      const step = {
        technique,
        digit: focusedDigit || digits[0],
        unit: where,
        subsetDigits: digits,
        baseCells: cells,
        targetCells: cells,
        placement: null,
        eliminations,
        explanation: `In ${unit.name}, digits ${digits.join(', ')} can only appear in cells ${cells.map(cellName).join(', ')}. Other candidates can be eliminated from these cells.`
      };

      if (returnAll) {
        allInstances.push(step);
      } else {
        return step;
      }
    }
  }
  return returnAll ? allInstances : null;
};

const findHiddenTriple = (grid, focusedDigit, returnAll = false) =>
  findHiddenSubset(grid, focusedDigit, returnAll, 3, 'Hidden Triple');

const findHiddenQuad = (grid, focusedDigit, returnAll = false) =>
  findHiddenSubset(grid, focusedDigit, returnAll, 4, 'Hidden Quad');

/**
 * Naked Quad: four cells in one unit whose candidates together are only
 * four digits. Those four digits are used up by those four cells, so they
 * go from the rest of the unit. The pair and triple cases are above.
 */
const findNakedQuad = (grid, focusedDigit, returnAll = false) => {
  const allInstances = [];

  for (const unit of subsetUnits()) {
    const where = normalizeUnit(unit);
    const emptyCells = unit.indices.filter(i => grid[i].value === null);
    const quadCells = emptyCells.filter(i => grid[i].candidates.length >= 2 && grid[i].candidates.length <= 4);
    const masks = quadCells.map(i => candidateMask(grid[i]));

    for (let a = 0; a < quadCells.length; a++) {
      for (let b = a + 1; b < quadCells.length; b++) {
        const ab = masks[a] | masks[b];
        if (bitCount(ab) > 4) continue;
        for (let c = b + 1; c < quadCells.length; c++) {
          const abc = ab | masks[c];
          if (bitCount(abc) > 4) continue;
          for (let d = c + 1; d < quadCells.length; d++) {
            const mask = abc | masks[d];
            if (bitCount(mask) !== 4) continue;

            const cells = [quadCells[a], quadCells[b], quadCells[c], quadCells[d]];
            const quadDigits = maskDigits(mask);
            if (focusedDigit && !quadDigits.includes(focusedDigit)) continue;

            const eliminations = [];
            for (const idx of emptyCells) {
              if (cells.includes(idx)) continue;
              for (const digit of quadDigits) {
                if (grid[idx].candidates.includes(digit)) eliminations.push({ cell: idx, digit });
              }
            }
            // Four cells holding four digits nobody else wants is real and
            // useless; it is not reported as a step.
            if (eliminations.length === 0) continue;

            const step = {
              technique: 'Naked Quad',
              digit: focusedDigit || quadDigits[0],
              unit: where,
              subsetDigits: quadDigits,
              baseCells: cells,
              targetCells: [...new Set(eliminations.map(e => e.cell))],
              placement: null,
              eliminations,
              explanation: `Cells ${cells.map(cellName).join(', ')} in ${unit.name} form a Naked Quad with candidates {${quadDigits.join(', ')}}. These four digits must occupy these four cells, so they can be eliminated from other cells in the ${where.type}.`
            };

            if (returnAll) {
              allInstances.push(step);
            } else {
              return step;
            }
          }
        }
      }
    }
  }
  return returnAll ? allInstances : null;
};

// X-Wing
const findXWing = (grid, focusedDigit, returnAll = false) => {
  const allInstances = [];
  
  const digitsToCheck = focusedDigit ? [focusedDigit] : [1, 2, 3, 4, 5, 6, 7, 8, 9];
  
  for (const digit of digitsToCheck) {
    // Find rows where digit appears in exactly 2 positions
    const rowsWithTwoPositions = [];
    for (let row = 0; row < 9; row++) {
      const positions = getRowIndices(row)
        .filter(i => grid[i].value === null && grid[i].candidates.includes(digit));
      if (positions.length === 2) {
        rowsWithTwoPositions.push({ row, positions, cols: positions.map(getCol) });
      }
    }
    
    // Look for two rows with same column positions
    for (let i = 0; i < rowsWithTwoPositions.length; i++) {
      for (let j = i + 1; j < rowsWithTwoPositions.length; j++) {
        const r1 = rowsWithTwoPositions[i];
        const r2 = rowsWithTwoPositions[j];
        
        if (r1.cols[0] === r2.cols[0] && r1.cols[1] === r2.cols[1]) {
          const col1 = r1.cols[0];
          const col2 = r1.cols[1];
          const baseCells = [...r1.positions, ...r2.positions];
          
          const eliminations = [];
          for (const col of [col1, col2]) {
            for (const idx of getColIndices(col)) {
              if (!baseCells.includes(idx) && grid[idx].candidates.includes(digit)) {
                eliminations.push({ cell: idx, digit });
              }
            }
          }
          
          if (eliminations.length > 0) {
            const step = {
              technique: 'X-Wing',
              orientation: 'row',
              digit,
              baseCells,
              targetCells: eliminations.map(e => e.cell),
              placement: null,
              eliminations,
              explanation: `An X-Wing on digit ${digit} is formed by Rows ${r1.row + 1} and ${r2.row + 1} in Columns ${col1 + 1} and ${col2 + 1}. The digit ${digit} must appear in two of these four cells, forming a pattern that eliminates ${digit} from other cells in these columns.`
            };
            
            if (returnAll) {
              allInstances.push(step);
            } else {
              return step;
            }
          }
        }
      }
    }
    
    // Check columns for X-Wing
    const colsWithTwoPositions = [];
    for (let col = 0; col < 9; col++) {
      const positions = getColIndices(col)
        .filter(i => grid[i].value === null && grid[i].candidates.includes(digit));
      if (positions.length === 2) {
        colsWithTwoPositions.push({ col, positions, rows: positions.map(getRow) });
      }
    }
    
    for (let i = 0; i < colsWithTwoPositions.length; i++) {
      for (let j = i + 1; j < colsWithTwoPositions.length; j++) {
        const c1 = colsWithTwoPositions[i];
        const c2 = colsWithTwoPositions[j];
        
        if (c1.rows[0] === c2.rows[0] && c1.rows[1] === c2.rows[1]) {
          const row1 = c1.rows[0];
          const row2 = c1.rows[1];
          const baseCells = [...c1.positions, ...c2.positions];
          
          const eliminations = [];
          for (const row of [row1, row2]) {
            for (const idx of getRowIndices(row)) {
              if (!baseCells.includes(idx) && grid[idx].candidates.includes(digit)) {
                eliminations.push({ cell: idx, digit });
              }
            }
          }
          
          if (eliminations.length > 0) {
            const step = {
              technique: 'X-Wing',
              orientation: 'column',
              digit,
              baseCells,
              targetCells: eliminations.map(e => e.cell),
              placement: null,
              eliminations,
              explanation: `An X-Wing on digit ${digit} is formed by Columns ${c1.col + 1} and ${c2.col + 1} in Rows ${row1 + 1} and ${row2 + 1}. The digit ${digit} must appear in two of these four cells, eliminating ${digit} from other cells in these rows.`
            };
            
            if (returnAll) {
              allInstances.push(step);
            } else {
              return step;
            }
          }
        }
      }
    }
  }
  
  return returnAll ? allInstances : null;
};

// Swordfish
const findSwordfish = (grid, focusedDigit, returnAll = false) => {
  const allInstances = [];
  
  const digitsToCheck = focusedDigit ? [focusedDigit] : [1, 2, 3, 4, 5, 6, 7, 8, 9];
  
  for (const digit of digitsToCheck) {
    // Find rows where digit appears in 2-3 positions
    const rowsWithPositions = [];
    for (let row = 0; row < 9; row++) {
      const positions = getRowIndices(row)
        .filter(i => grid[i].value === null && grid[i].candidates.includes(digit));
      if (positions.length >= 2 && positions.length <= 3) {
        rowsWithPositions.push({ row, positions, cols: new Set(positions.map(getCol)) });
      }
    }
    
    // Look for three rows that share exactly three columns
    for (let i = 0; i < rowsWithPositions.length; i++) {
      for (let j = i + 1; j < rowsWithPositions.length; j++) {
        for (let k = j + 1; k < rowsWithPositions.length; k++) {
          const r1 = rowsWithPositions[i];
          const r2 = rowsWithPositions[j];
          const r3 = rowsWithPositions[k];
          
          const allCols = new Set([...r1.cols, ...r2.cols, ...r3.cols]);
          
          if (allCols.size === 3) {
            const cols = Array.from(allCols);
            const baseCells = [...r1.positions, ...r2.positions, ...r3.positions];
            
            const eliminations = [];
            for (const col of cols) {
              for (const idx of getColIndices(col)) {
                if (!baseCells.includes(idx) && grid[idx].candidates.includes(digit)) {
                  eliminations.push({ cell: idx, digit });
                }
              }
            }
            
            if (eliminations.length > 0) {
              const step = {
                technique: 'Swordfish',
                orientation: 'row',
                digit,
                baseCells,
                targetCells: eliminations.map(e => e.cell),
                placement: null,
                eliminations,
                explanation: `A Swordfish on digit ${digit} is formed by Rows ${r1.row + 1}, ${r2.row + 1}, and ${r3.row + 1} in Columns ${cols.map(c => c + 1).join(', ')}. This pattern eliminates ${digit} from other cells in these columns.`
              };
              
              if (returnAll) {
                allInstances.push(step);
              } else {
                return step;
              }
            }
          }
        }
      }
    }
    
    // Check columns for Swordfish
    const colsWithPositions = [];
    for (let col = 0; col < 9; col++) {
      const positions = getColIndices(col)
        .filter(i => grid[i].value === null && grid[i].candidates.includes(digit));
      if (positions.length >= 2 && positions.length <= 3) {
        colsWithPositions.push({ col, positions, rows: new Set(positions.map(getRow)) });
      }
    }
    
    // Look for three columns that share exactly three rows
    for (let i = 0; i < colsWithPositions.length; i++) {
      for (let j = i + 1; j < colsWithPositions.length; j++) {
        for (let k = j + 1; k < colsWithPositions.length; k++) {
          const c1 = colsWithPositions[i];
          const c2 = colsWithPositions[j];
          const c3 = colsWithPositions[k];
          
          const allRows = new Set([...c1.rows, ...c2.rows, ...c3.rows]);
          
          if (allRows.size === 3) {
            const rows = Array.from(allRows);
            const baseCells = [...c1.positions, ...c2.positions, ...c3.positions];
            
            const eliminations = [];
            for (const row of rows) {
              for (const idx of getRowIndices(row)) {
                if (!baseCells.includes(idx) && grid[idx].candidates.includes(digit)) {
                  eliminations.push({ cell: idx, digit });
                }
              }
            }
            
            if (eliminations.length > 0) {
              const step = {
                technique: 'Swordfish',
                orientation: 'column',
                digit,
                baseCells,
                targetCells: eliminations.map(e => e.cell),
                placement: null,
                eliminations,
                explanation: `A Swordfish on digit ${digit} is formed by Columns ${c1.col + 1}, ${c2.col + 1}, and ${c3.col + 1} in Rows ${rows.map(r => r + 1).join(', ')}. This pattern eliminates ${digit} from other cells in these rows.`
              };
              
              if (returnAll) {
                allInstances.push(step);
              } else {
                return step;
              }
            }
          }
        }
      }
    }
  }
  
  return returnAll ? allInstances : null;
};

// XY-Wing
const findXYWing = (grid, focusedDigit, returnAll = false) => {
  const allInstances = [];
  
  // Find all bi-value cells
  const biValueCells = [];
  for (let i = 0; i < 81; i++) {
    if (grid[i].value === null && grid[i].candidates.length === 2) {
      biValueCells.push(i);
    }
  }
  
  for (const pivot of biValueCells) {
    const pivotCands = grid[pivot].candidates;
    const [x, y] = pivotCands;
    
    // Find peers of pivot with XZ and YZ candidates
    const pivotPeers = getPeers(pivot);
    const xzCells = pivotPeers.filter(i => 
      biValueCells.includes(i) && 
      grid[i].candidates.includes(x) && 
      !grid[i].candidates.includes(y)
    );
    const yzCells = pivotPeers.filter(i => 
      biValueCells.includes(i) && 
      grid[i].candidates.includes(y) && 
      !grid[i].candidates.includes(x)
    );
    
    for (const xzCell of xzCells) {
      for (const yzCell of yzCells) {
        const xzCands = grid[xzCell].candidates;
        const yzCands = grid[yzCell].candidates;
        
        // Find common digit Z
        const z1 = xzCands.find(d => d !== x);
        const z2 = yzCands.find(d => d !== y);
        
        if (z1 === z2) {
          const z = z1;
          if (focusedDigit && z !== focusedDigit) continue;
          
          // Find cells that see both wings
          const xzPeers = new Set(getPeers(xzCell));
          const yzPeers = new Set(getPeers(yzCell));
          
          const eliminations = [];
          for (let i = 0; i < 81; i++) {
            if (i !== pivot && i !== xzCell && i !== yzCell &&
                xzPeers.has(i) && yzPeers.has(i) &&
                grid[i].candidates.includes(z)) {
              eliminations.push({ cell: i, digit: z });
            }
          }
          
          if (eliminations.length > 0) {
            const step = {
              technique: 'XY-Wing',
              digit: z,
              baseCells: [pivot, xzCell, yzCell],
              targetCells: eliminations.map(e => e.cell),
              placement: null,
              eliminations,
              explanation: `An XY-Wing is formed with pivot R${getRow(pivot) + 1}C${getCol(pivot) + 1} (${x},${y}), and wings R${getRow(xzCell) + 1}C${getCol(xzCell) + 1} (${x},${z}) and R${getRow(yzCell) + 1}C${getCol(yzCell) + 1} (${y},${z}). Either wing must contain ${z}, so ${z} can be eliminated from cells seeing both wings.`
            };
            
            if (returnAll) {
              allInstances.push(step);
            } else {
              return step;
            }
          }
        }
      }
    }
  }
  
  return returnAll ? allInstances : null;
};


/**
 * XYZ-Wing: a pivot with three candidates {X, Y, Z} sees two bi-value
 * wings, {X, Z} and {Y, Z}. The pivot is a third place Z could go, so the
 * eliminations are only in cells that see ALL THREE of pivot and wings -
 * that is the whole difference from XY-Wing.
 */
const findXYZWing = (grid, focusedDigit, returnAll = false) => {
  const allInstances = [];

  for (let pivot = 0; pivot < 81; pivot++) {
    if (grid[pivot].value !== null || grid[pivot].candidates.length !== 3) continue;
    const pivotCands = grid[pivot].candidates;
    const pivotPeers = getPeers(pivot);

    const wings = pivotPeers.filter(i =>
      grid[i].value === null &&
      grid[i].candidates.length === 2 &&
      grid[i].candidates.every(d => pivotCands.includes(d))
    );

    for (let a = 0; a < wings.length; a++) {
      for (let b = a + 1; b < wings.length; b++) {
        const wing1 = wings[a];
        const wing2 = wings[b];
        const cands1 = grid[wing1].candidates;
        const cands2 = grid[wing2].candidates;

        // Two wings sharing both digits are a Naked Pair, not a wing.
        const shared = cands1.filter(d => cands2.includes(d));
        if (shared.length !== 1) continue;

        const z = shared[0];
        if (focusedDigit && z !== focusedDigit) continue;
        const x = cands1.find(d => d !== z);
        const y = cands2.find(d => d !== z);

        const seesPivot = new Set(pivotPeers);
        const seesWing1 = new Set(getPeers(wing1));
        const seesWing2 = new Set(getPeers(wing2));

        const eliminations = [];
        for (let i = 0; i < 81; i++) {
          if (i === pivot || i === wing1 || i === wing2) continue;
          if (grid[i].value !== null || !grid[i].candidates.includes(z)) continue;
          if (seesPivot.has(i) && seesWing1.has(i) && seesWing2.has(i)) {
            eliminations.push({ cell: i, digit: z });
          }
        }

        if (eliminations.length > 0) {
          const step = {
            technique: 'XYZ-Wing',
            digit: z,
            subsetDigits: [...new Set([x, y, z])].sort((p, q) => p - q),
            baseCells: [pivot, wing1, wing2],
            targetCells: eliminations.map(e => e.cell),
            placement: null,
            eliminations,
            explanation: `An XYZ-Wing is formed with pivot ${cellName(pivot)} (${x},${y},${z}), and wings ${cellName(wing1)} (${x},${z}) and ${cellName(wing2)} (${y},${z}). All three cells can be ${z}, so ${z} can be eliminated only from cells seeing the pivot and both wings.`
          };

          if (returnAll) {
            allInstances.push(step);
          } else {
            return step;
          }
        }
      }
    }
  }
  return returnAll ? allInstances : null;
};

/**
 * WXYZ-Wing: four cells whose candidates together are exactly four digits,
 * where every digit but Z sits only in cells of the set that all see each
 * other. Each of those three digits can then be used at most once across
 * the set, and three digits cannot fill four cells, so one of the four
 * cells holds Z. Z goes from every cell that sees every Z in the set.
 *
 * The plain four-cell form only: the ALS reading of the same shape belongs
 * to the almost-locked-sets batch.
 */
const findWXYZWing = (grid, focusedDigit, returnAll = false) => {
  const allInstances = [];

  const cells = [];
  const masks = [];
  for (let i = 0; i < 81; i++) {
    if (grid[i].value !== null) continue;
    const n = grid[i].candidates.length;
    if (n >= 2 && n <= 4) {
      cells.push(i);
      masks.push(candidateMask(grid[i]));
    }
  }

  // Every cell of the set that can hold `digit` sees every other one, so
  // the set can use that digit at most once.
  const restricted = (set, digit) => {
    const holders = set.filter(i => grid[i].candidates.includes(digit));
    for (let i = 0; i < holders.length; i++) {
      for (let j = i + 1; j < holders.length; j++) {
        if (!arePeers(holders[i], holders[j])) return false;
      }
    }
    return true;
  };

  // One pattern, not four cells that happen to share digits: every cell
  // reaches every other through cells that see each other.
  const connected = (set) => {
    const reached = [set[0]];
    for (let head = 0; head < reached.length; head++) {
      for (const other of set) {
        if (!reached.includes(other) && arePeers(reached[head], other)) reached.push(other);
      }
    }
    return reached.length === set.length;
  };

  for (let a = 0; a < cells.length; a++) {
    for (let b = a + 1; b < cells.length; b++) {
      const ab = masks[a] | masks[b];
      if (bitCount(ab) > 4) continue;
      for (let c = b + 1; c < cells.length; c++) {
        const abc = ab | masks[c];
        if (bitCount(abc) > 4) continue;
        for (let d = c + 1; d < cells.length; d++) {
          const mask = abc | masks[d];
          if (bitCount(mask) !== 4) continue;

          const set = [cells[a], cells[b], cells[c], cells[d]];
          // Four cells in one unit are a Naked Quad, and three cells of the
          // set down to three digits are a Naked Triple wearing a fourth
          // cell. Both are taught earlier, so neither is reported here.
          if (commonUnit(set)) continue;
          const subMasks = [masks[a], masks[b], masks[c], masks[d]];
          if (combinations([0, 1, 2, 3], 3).some(t => bitCount(subMasks[t[0]] | subMasks[t[1]] | subMasks[t[2]]) < 4)) continue;
          if (!connected(set)) continue;

          const digits = maskDigits(mask);
          for (const z of digits) {
            if (focusedDigit && z !== focusedDigit) continue;
            const zCells = set.filter(i => grid[i].candidates.includes(z));
            if (zCells.length < 2) continue;
            if (!digits.every(d2 => d2 === z || restricted(set, d2))) continue;

            const eliminations = [];
            for (let i = 0; i < 81; i++) {
              if (grid[i].value !== null || set.includes(i)) continue;
              if (!grid[i].candidates.includes(z)) continue;
              if (zCells.every(cell => arePeers(i, cell))) eliminations.push({ cell: i, digit: z });
            }
            if (eliminations.length === 0) continue;

            const others = digits.filter(d2 => d2 !== z);
            const step = {
              technique: 'WXYZ-Wing',
              digit: z,
              subsetDigits: digits,
              baseCells: set,
              zCells,
              targetCells: eliminations.map(e => e.cell),
              placement: null,
              eliminations,
              explanation: `A WXYZ-Wing on digits {${digits.join(', ')}} is formed by cells ${set.map(cellName).join(', ')}. Each of ${others.join(', ')} is restricted to cells of the set that see each other, so three digits cover at most three of the four cells and one cell must be ${z}. The ${z} candidates sit in ${zCells.map(cellName).join(', ')}, so ${z} can be eliminated from cells seeing all of them.`
            };

            if (returnAll) {
              allInstances.push(step);
            } else {
              return step;
            }
          }
        }
      }
    }
  }
  return returnAll ? allInstances : null;
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
