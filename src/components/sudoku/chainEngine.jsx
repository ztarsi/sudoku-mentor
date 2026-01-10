// Advanced Chain-Based Logic Engine for Expert Sudoku Techniques

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

// Strong Link: If one candidate is false, the other must be true
// Weak Link: If one candidate is true, the other must be false
const buildLinkGraph = (grid) => {
  const strongLinks = [];
  const weakLinks = [];
  
  // Build bi-value cell strong links (naked pairs within a cell)
  for (let i = 0; i < 81; i++) {
    const cell = grid[i];
    if (cell.value === null && cell.candidates.length === 2) {
      const [c1, c2] = cell.candidates;
      strongLinks.push({
        type: 'bivalue',
        from: { cell: i, digit: c1 },
        to: { cell: i, digit: c2 },
        description: `R${getRow(i)+1}C${getCol(i)+1} is either ${c1} or ${c2}`
      });
    }
  }
  
  // Build conjugate pair strong links (digit appears exactly twice in a unit)
  const units = [
    ...Array.from({ length: 9 }, (_, i) => ({ type: 'row', indices: getRowIndices(i), name: `Row ${i + 1}` })),
    ...Array.from({ length: 9 }, (_, i) => ({ type: 'col', indices: getColIndices(i), name: `Column ${i + 1}` })),
    ...Array.from({ length: 9 }, (_, i) => ({ type: 'box', indices: getBoxIndices(i), name: `Box ${i + 1}` }))
  ];
  
  for (const unit of units) {
    for (let digit = 1; digit <= 9; digit++) {
      const positions = unit.indices.filter(i => 
        grid[i].value === null && grid[i].candidates.includes(digit)
      );
      
      if (positions.length === 2) {
        strongLinks.push({
          type: 'conjugate',
          from: { cell: positions[0], digit },
          to: { cell: positions[1], digit },
          unit: unit.name,
          description: `${digit} must be in one of these two cells in ${unit.name}`
        });
      }
    }
  }
  
  // Build weak links (same digit in peer cells)
  for (let i = 0; i < 81; i++) {
    const cell = grid[i];
    if (cell.value !== null) continue;
    
    for (const digit of cell.candidates) {
      const row = getRow(i);
      const col = getCol(i);
      const box = getBox(i);
      
      // Check all peers
      const peers = new Set([
        ...getRowIndices(row),
        ...getColIndices(col),
        ...getBoxIndices(box)
      ]);
      
      peers.delete(i);
      
      for (const peer of peers) {
        if (grid[peer].candidates.includes(digit)) {
          weakLinks.push({
            from: { cell: i, digit },
            to: { cell: peer, digit }
          });
        }
      }
    }
  }
  
  return { strongLinks, weakLinks };
};

// X-Cycles (Simple Coloring with chains)
export const findXCycle = (grid, focusedDigit, returnAll = false) => {
  const allInstances = [];
  const digitsToCheck = focusedDigit ? [focusedDigit] : [1, 2, 3, 4, 5, 6, 7, 8, 9];
  
  for (const digit of digitsToCheck) {
    const { strongLinks } = buildLinkGraph(grid);
    const digitLinks = strongLinks.filter(link => 
      link.from.digit === digit && link.to.digit === digit
    );
    
    if (digitLinks.length < 2) continue;
    
    // Build adjacency graph
    const graph = new Map();
    digitLinks.forEach(link => {
      const fromKey = `${link.from.cell}`;
      const toKey = `${link.to.cell}`;
      
      if (!graph.has(fromKey)) graph.set(fromKey, []);
      if (!graph.has(toKey)) graph.set(toKey, []);
      
      graph.get(fromKey).push({ cell: link.to.cell, link });
      graph.get(toKey).push({ cell: link.from.cell, link });
    });
    
    // Try to find a cycle
    for (const startCell of graph.keys()) {
      const visited = new Map();
      const queue = [{ cell: parseInt(startCell), color: 0, path: [parseInt(startCell)] }];
      visited.set(parseInt(startCell), 0);
      
      while (queue.length > 0) {
        const { cell, color, path } = queue.shift();
        const neighbors = graph.get(`${cell}`) || [];
        
        for (const { cell: nextCell } of neighbors) {
          const nextColor = 1 - color;
          
          if (visited.has(nextCell)) {
            if (visited.get(nextCell) === color) {
              // Found a contradiction - cycle with odd length
              // Any candidate that sees both colors can be eliminated
              const colorA = Array.from(visited.entries())
                .filter(([_, c]) => c === 0)
                .map(([cell, _]) => cell);
              const colorB = Array.from(visited.entries())
                .filter(([_, c]) => c === 1)
                .map(([cell, _]) => cell);
              
              const eliminations = [];
              for (let i = 0; i < 81; i++) {
                if (grid[i].candidates.includes(digit)) {
                  const seesA = colorA.some(c => arePeers(i, c));
                  const seesB = colorB.some(c => arePeers(i, c));
                  if (seesA && seesB && !colorA.includes(i) && !colorB.includes(i)) {
                    eliminations.push({ cell: i, digit });
                  }
                }
              }
              
              if (eliminations.length > 0) {
                // Build chain links for visualization
                const chainLinks = [];
                for (let i = 0; i < path.length - 1; i++) {
                  chainLinks.push({
                    from: { cell: path[i], digit },
                    to: { cell: path[i + 1], digit }
                  });
                }
                
                const step = {
                  technique: 'X-Cycle',
                  digit,
                  baseCells: [...colorA, ...colorB],
                  targetCells: eliminations.map(e => e.cell),
                  chains: path,
                  strongLinks: chainLinks,
                  eliminations,
                  explanation: `An X-Cycle on digit ${digit} creates two color groups. Candidates seeing both colors can be eliminated.`
                };
                
                if (returnAll) {
                  allInstances.push(step);
                } else {
                  return step;
                }
              }
            }
          } else if (path.length < 10) {
            visited.set(nextCell, nextColor);
            queue.push({ cell: nextCell, color: nextColor, path: [...path, nextCell] });
          }
        }
      }
    }
  }
  
  return returnAll ? allInstances : null;
};

const arePeers = (cell1, cell2) => {
  const row1 = getRow(cell1), col1 = getCol(cell1), box1 = getBox(cell1);
  const row2 = getRow(cell2), col2 = getCol(cell2), box2 = getBox(cell2);
  return row1 === row2 || col1 === col2 || box1 === box2;
};

// Almost Locked Set (ALS) - XZ Rule
export const findALSXZ = (grid, focusedDigit, returnAll = false) => {
  const allInstances = [];
  const findALS = (indices) => {
    const als = [];
    const n = indices.length;
    
    for (let mask = 1; mask < (1 << n); mask++) {
      const cells = [];
      const candidates = new Set();
      
      for (let i = 0; i < n; i++) {
        if (mask & (1 << i)) {
          const cell = indices[i];
          if (grid[cell].value !== null) continue;
          cells.push(cell);
          grid[cell].candidates.forEach(c => candidates.add(c));
        }
      }
      
      // ALS: n cells with n+1 candidates
      if (cells.length > 1 && cells.length <= 4 && candidates.size === cells.length + 1) {
        als.push({ cells, candidates: Array.from(candidates) });
      }
    }
    
    return als;
  };
  
  const units = [
    ...Array.from({ length: 9 }, (_, i) => ({ type: 'row', indices: getRowIndices(i), name: `row ${i + 1}` })),
    ...Array.from({ length: 9 }, (_, i) => ({ type: 'col', indices: getColIndices(i), name: `column ${i + 1}` })),
    ...Array.from({ length: 9 }, (_, i) => ({ type: 'box', indices: getBoxIndices(i), name: `box ${i + 1}` }))
  ];
  
  const allALS = [];
  for (const unit of units) {
    const alsInUnit = findALS(unit.indices);
    alsInUnit.forEach(als => als.unitName = unit.name);
    allALS.push(...alsInUnit);
  }
  
  // Find ALS-XZ: Two ALS with restricted common X and eliminating digit Z
  for (let i = 0; i < allALS.length; i++) {
    for (let j = i + 1; j < allALS.length; j++) {
      const als1 = allALS[i];
      const als2 = allALS[j];
      
      // ALS must not share cells
      const sharedCells = als1.cells.filter(c => als2.cells.includes(c));
      if (sharedCells.length > 0) continue;
      
      const common = als1.candidates.filter(c => als2.candidates.includes(c));
      
      if (common.length >= 2) {
        for (const x of common) {
          // X must be restricted: all X cells from ALS1 see all X cells from ALS2
          const xCells1 = als1.cells.filter(c => grid[c].candidates.includes(x));
          const xCells2 = als2.cells.filter(c => grid[c].candidates.includes(x));
          
          if (xCells1.length === 0 || xCells2.length === 0) continue;
          
          const xIsRestricted = xCells1.every(c1 => xCells2.every(c2 => arePeers(c1, c2)));
          if (!xIsRestricted) continue;
          
          for (const z of common) {
            if (x === z) continue;
            if (focusedDigit && z !== focusedDigit) continue;
            
            // Find Z cells in each ALS
            const zCells1 = als1.cells.filter(c => grid[c].candidates.includes(z));
            const zCells2 = als2.cells.filter(c => grid[c].candidates.includes(z));
            
            if (zCells1.length === 0 || zCells2.length === 0) continue;
            
            // Eliminations: cells that see ALL Z cells from BOTH ALS
            const eliminations = [];
            for (let k = 0; k < 81; k++) {
              if (grid[k].candidates.includes(z) && ![...als1.cells, ...als2.cells].includes(k)) {
                const seesAllZ1 = zCells1.every(c => arePeers(k, c));
                const seesAllZ2 = zCells2.every(c => arePeers(k, c));
                if (seesAllZ1 && seesAllZ2) {
                  eliminations.push({ cell: k, digit: z });
                }
              }
            }
            
            if (eliminations.length > 0) {
              const step = {
                technique: 'ALS-XZ',
                digit: z,
                baseCells: [...als1.cells, ...als2.cells],
                targetCells: eliminations.map(e => e.cell),
                eliminations,
                als1,
                als2,
                xDigit: x,
                zDigit: z,
                explanation: `🎯 The Two-House Trap (ALS-XZ)\n\nLook at the two highlighted groups of cells in ${als1.unitName} and ${als2.unitName}. Each is "Almost Locked"—it has one more candidate than it has cells.\n\n🔗 The Bridge: These groups are linked by digit ${x}. Because of how they see each other, if ${als1.unitName} doesn't contain ${x}, ${als2.unitName} is forced to take it.\n\n⚡ The Result: This "Bridge" forces digit ${z} to stay inside these two groups. Since one of them must claim ${z}, any cell outside that sees all instances of ${z} in both sets can safely have ${z} eliminated.`
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

// Unique Rectangle Type 1
export const findUniqueRectangle = (grid, focusedDigit = null, returnAll = false) => {
  const allInstances = [];
  for (let r1 = 0; r1 < 8; r1++) {
    for (let r2 = r1 + 1; r2 < 9; r2++) {
      for (let c1 = 0; c1 < 8; c1++) {
        for (let c2 = c1 + 1; c2 < 9; c2++) {
          const corners = [
            r1 * 9 + c1,
            r1 * 9 + c2,
            r2 * 9 + c1,
            r2 * 9 + c2
          ];
          
          // Must be in different boxes
          const boxes = corners.map(getBox);
          if (new Set(boxes).size !== 2 && new Set(boxes).size !== 4) continue;
          
          // Check if all corners are empty
          if (!corners.every(c => grid[c].value === null)) continue;
          
          // Find common bi-value pattern
          const cands = corners.map(c => grid[c].candidates);
          const allCands = [...new Set(cands.flat())];
          
          if (allCands.length !== 2) continue;
          
          const [d1, d2] = allCands;
          
          // Count how many corners have both candidates
          const biValueCount = corners.filter(c => {
            const cellCands = grid[c].candidates;
            return cellCands.length === 2 && cellCands.includes(d1) && cellCands.includes(d2);
          }).length;
          
          // Type 1: Three corners are bi-value, fourth has extra candidates
          if (biValueCount === 3) {
            const extraCorner = corners.find(c => {
              const cellCands = grid[c].candidates;
              return cellCands.length > 2 && cellCands.includes(d1) && cellCands.includes(d2);
            });
            
            if (extraCorner !== undefined) {
              const eliminations = grid[extraCorner].candidates
                .filter(c => c !== d1 && c !== d2)
                .map(digit => ({ cell: extraCorner, digit }));
              
              if (eliminations.length > 0) {
                const step = {
                  technique: 'Unique Rectangle Type 1',
                  digit: null,
                  baseCells: corners,
                  targetCells: [extraCorner],
                  eliminations,
                  explanation: `Unique Rectangle on digits ${d1} and ${d2}. Extra candidates in R${getRow(extraCorner)+1}C${getCol(extraCorner)+1} can be eliminated to avoid deadly pattern.`
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
  }
  
  return returnAll ? allInstances : null;
};

// BUG+1 (Bivalue Universal Grave plus 1)
export const findBUGPlus1 = (grid, focusedDigit = null, returnAll = false) => {
  let extraCell = null;
  let extraDigit = null;
  
  // Count bi-value cells and tri-value cells
  let biValueCount = 0;
  let triValueCount = 0;
  
  for (let i = 0; i < 81; i++) {
    const cell = grid[i];
    if (cell.value !== null) continue;
    
    const candCount = cell.candidates.length;
    
    if (candCount === 2) {
      biValueCount++;
    } else if (candCount === 3) {
      triValueCount++;
      extraCell = i;
    } else if (candCount > 3) {
      return null; // Not a BUG pattern
    }
  }
  
  // BUG+1: All cells bi-value except one tri-value
  if (triValueCount !== 1) return null;
  
  // For each digit in units, count occurrences
  const units = [
    ...Array.from({ length: 9 }, (_, i) => getRowIndices(i)),
    ...Array.from({ length: 9 }, (_, i) => getColIndices(i)),
    ...Array.from({ length: 9 }, (_, i) => getBoxIndices(i))
  ];
  
  // Find which digit appears 3 times in all units containing the extra cell
  for (const digit of grid[extraCell].candidates) {
    let isExtra = true;
    
    const relevantUnits = units.filter(unit => unit.includes(extraCell));
    
    for (const unit of relevantUnits) {
      const count = unit.filter(c => 
        grid[c].value === null && grid[c].candidates.includes(digit)
      ).length;
      
      if (count !== 3) {
        isExtra = false;
        break;
      }
    }
    
    if (isExtra) {
      extraDigit = digit;
      break;
    }
  }
  
  if (extraDigit) {
    return {
      technique: 'BUG+1',
      digit: extraDigit,
      baseCells: [extraCell],
      targetCells: [],
      placement: { cell: extraCell, digit: extraDigit },
      eliminations: [],
      explanation: `BUG+1 pattern detected. R${getRow(extraCell)+1}C${getCol(extraCell)+1} must be ${extraDigit} to avoid a deadly pattern with multiple solutions.`
    };
  }
  
  return null;
};

// Finned X-Wing
export const findFinnedXWing = (grid, focusedDigit, returnAll = false) => {
  const allInstances = [];
  const digitsToCheck = focusedDigit ? [focusedDigit] : [1, 2, 3, 4, 5, 6, 7, 8, 9];
  
  for (const digit of digitsToCheck) {
    // Check rows
    const rowsWithPositions = [];
    for (let row = 0; row < 9; row++) {
      const positions = getRowIndices(row)
        .filter(i => grid[i].value === null && grid[i].candidates.includes(digit));
      if (positions.length === 2 || positions.length === 3) {
        rowsWithPositions.push({ row, positions, cols: positions.map(getCol) });
      }
    }
    
    // Look for finned pattern
    for (let i = 0; i < rowsWithPositions.length; i++) {
      for (let j = i + 1; j < rowsWithPositions.length; j++) {
        const r1 = rowsWithPositions[i];
        const r2 = rowsWithPositions[j];
        
        // Check if they share exactly 2 columns
        const commonCols = r1.cols.filter(c => r2.cols.includes(c));
        
        if (commonCols.length === 2) {
          // Check for fins
          const finCells1 = r1.positions.filter(p => !commonCols.includes(getCol(p)));
          const finCells2 = r2.positions.filter(p => !commonCols.includes(getCol(p)));
          
          const fins = [...finCells1, ...finCells2];
          
          if (fins.length > 0 && fins.length <= 2) {
            // Find eliminations: cells in common columns that see all fins
            const eliminations = [];
            
            for (const col of commonCols) {
              for (const idx of getColIndices(col)) {
                if (grid[idx].candidates.includes(digit)) {
                  const inBaseRows = [r1.row, r2.row].includes(getRow(idx));
                  const seesAllFins = fins.every(fin => arePeers(idx, fin));
                  
                  if (!inBaseRows && seesAllFins) {
                    eliminations.push({ cell: idx, digit });
                  }
                }
              }
            }
            
            if (eliminations.length > 0) {
              const baseCells = [...r1.positions, ...r2.positions];
              
              // Build strong links for the X-Wing pattern
              const xwingLinks = [];
              // Link cells in same rows
              if (r1.positions.length === 2) {
                xwingLinks.push({ from: { cell: r1.positions[0], digit }, to: { cell: r1.positions[1], digit } });
              }
              if (r2.positions.length === 2) {
                xwingLinks.push({ from: { cell: r2.positions[0], digit }, to: { cell: r2.positions[1], digit } });
              }
              
              const step = {
                technique: 'Finned X-Wing',
                digit,
                baseCells,
                targetCells: eliminations.map(e => e.cell),
                finCells: fins,
                strongLinks: xwingLinks,
                eliminations,
                explanation: `Finned X-Wing on ${digit} in Rows ${r1.row+1} and ${r2.row+1}. Fin cells create restricted eliminations.`
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