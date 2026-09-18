// Advanced Chain-Based Logic Engine for Expert Sudoku Techniques

import { getRow, getCol, getBox, getRowIndices, getColIndices, getBoxIndices, arePeers } from './gridUnits';

// Strong Link: If one candidate is false, the other must be true
const buildLinkGraph = (grid) => {
  const strongLinks = [];

  // Conjugate pair strong links (digit appears exactly twice in a unit).
  // Only these are used by the colouring; per-cell bi-value links were
  // built here for years and never read.
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
  
  return { strongLinks };
};

// X-Cycles (Simple Coloring on conjugate links)
//
// For each digit, connect cells joined by conjugate strong links (the digit
// appears exactly twice in a unit) and 2-color each connected component.
// The invariant: within a component, either every color-A cell holds the
// digit or every color-B cell does. Two standard rules then eliminate:
// - Color wrap: two same-colored cells share a unit, so that color is
//   impossible - the digit comes off every cell of that color.
// - Color trap: an outside candidate that sees both colors is false either
//   way, so the digit comes off that cell.
export const findXCycle = (grid, focusedDigit, returnAll = false) => {
  const allInstances = [];
  const digitsToCheck = focusedDigit ? [focusedDigit] : [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const { strongLinks } = buildLinkGraph(grid);

  for (const digit of digitsToCheck) {
    const digitLinks = strongLinks.filter(link =>
      link.type === 'conjugate' && link.from.digit === digit && link.to.digit === digit
    );

    if (digitLinks.length < 2) continue;

    // Build adjacency over conjugate links
    const adjacency = new Map();
    for (const link of digitLinks) {
      const a = link.from.cell;
      const b = link.to.cell;
      if (!adjacency.has(a)) adjacency.set(a, new Set());
      if (!adjacency.has(b)) adjacency.set(b, new Set());
      adjacency.get(a).add(b);
      adjacency.get(b).add(a);
    }

    // 2-color each connected component
    const colorOf = new Map();
    for (const start of adjacency.keys()) {
      if (colorOf.has(start)) continue;

      const component = [];
      colorOf.set(start, 0);
      const queue = [start];
      let consistent = true;
      while (queue.length > 0) {
        const cell = queue.shift();
        component.push(cell);
        for (const next of adjacency.get(cell)) {
          if (!colorOf.has(next)) {
            colorOf.set(next, 1 - colorOf.get(cell));
            queue.push(next);
          } else if (colorOf.get(next) === colorOf.get(cell)) {
            // Odd cycle of XOR constraints: impossible on a grid with valid
            // candidates. Don't derive eliminations from a broken component.
            consistent = false;
          }
        }
      }
      if (!consistent || component.length < 3) continue;

      const colorA = component.filter(c => colorOf.get(c) === 0);
      const colorB = component.filter(c => colorOf.get(c) === 1);
      if (colorA.length === 0 || colorB.length === 0) continue;

      const eliminations = [];
      let rule = null;

      // Color wrap: same-colored cells sharing a unit kill that color
      const wrappedColor = [colorA, colorB].findIndex(cells =>
        cells.some((c1, idx) => cells.slice(idx + 1).some(c2 => arePeers(c1, c2)))
      );

      if (wrappedColor !== -1) {
        const falseCells = wrappedColor === 0 ? colorA : colorB;
        falseCells.forEach(cell => eliminations.push({ cell, digit }));
        rule = 'wrap';
      } else {
        // Color trap: outside candidates seeing both colors
        for (let i = 0; i < 81; i++) {
          if (
            grid[i].value === null &&
            grid[i].candidates.includes(digit) &&
            !colorOf.has(i)
          ) {
            const seesA = colorA.some(c => arePeers(i, c));
            const seesB = colorB.some(c => arePeers(i, c));
            if (seesA && seesB) {
              eliminations.push({ cell: i, digit });
            }
          }
        }
        rule = 'trap';
      }

      if (eliminations.length > 0) {
        const componentLinks = digitLinks
          .filter(link => colorOf.has(link.from.cell) && component.includes(link.from.cell))
          .map(link => ({
            from: { cell: link.from.cell, digit },
            to: { cell: link.to.cell, digit }
          }));

        const step = {
          technique: 'X-Cycle',
          digit,
          baseCells: component,
          targetCells: eliminations.map(e => e.cell),
          chains: component,
          strongLinks: componentLinks,
          eliminations,
          explanation: rule === 'wrap'
            ? `Simple coloring on digit ${digit}: two cells of the same color share a unit, so that whole color is false and ${digit} can be removed from all of its cells.`
            : `Simple coloring on digit ${digit}: chained strong links split these cells into two colors, one of which must be true. Any outside ${digit} that sees both colors can be eliminated.`
        };

        if (returnAll) {
          allInstances.push(step);
        } else {
          return step;
        }
      }
    }
  }

  return returnAll ? allInstances : null;
};


// Almost Locked Set (ALS) - XZ Rule
export const findALSXZ = (grid, focusedDigit, returnAll = false) => {
  const allInstances = [];
  const findALS = (indices) => {
    const als = [];
    // Enumerate subsets of the EMPTY cells only. Enumerating all cells and
    // skipping filled ones inside the loop yielded each ALS once per subset
    // of filled cells in the unit - up to 2^(filled) duplicate copies.
    const emptyCells = indices.filter(i => grid[i].value === null);
    const n = emptyCells.length;

    for (let mask = 1; mask < (1 << n); mask++) {
      const cells = [];
      const candidates = new Set();

      for (let i = 0; i < n; i++) {
        if (mask & (1 << i)) {
          const cell = emptyCells[i];
          cells.push(cell);
          grid[cell].candidates.forEach(c => candidates.add(c));
        }
      }

      // ALS: n cells with n+1 candidates. Size 1 (a bi-value cell) is the
      // most common ALS-XZ ingredient and is deliberately included.
      if (cells.length <= 4 && candidates.size === cells.length + 1) {
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
  const seenCellSets = new Set();
  for (const unit of units) {
    const alsInUnit = findALS(unit.indices);
    for (const als of alsInUnit) {
      // The same cell set can qualify in several units (any single cell is
      // in three); keep one copy.
      const key = als.cells.slice().sort((a, b) => a - b).join(',');
      if (seenCellSets.has(key)) continue;
      seenCellSets.add(key);
      allALS.push({ ...als, unitName: unit.name });
    }
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
                explanation: `ALS-XZ on digits ${x} (restricted common) and ${z} (eliminated). ALS A = {${als1.cells.map(c => `R${getRow(c)+1}C${getCol(c)+1}`).join(', ')}} in ${als1.unitName} with candidates {${[...als1.candidates].sort().join(', ')}}; ALS B = {${als2.cells.map(c => `R${getRow(c)+1}C${getCol(c)+1}`).join(', ')}} in ${als2.unitName} with candidates {${[...als2.candidates].sort().join(', ')}}. Every ${x} in A sees every ${x} in B, so at most one ALS contains ${x}; the other is then locked and must contain ${z}. Any ${z} that sees all ${z} candidates in both sets can be eliminated.`
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
          
          // The deadly pattern only exists when the four corners span
          // exactly two boxes (a 4-box rectangle is not interchangeable).
          const boxes = corners.map(getBox);
          if (new Set(boxes).size !== 2) continue;

          // Check if all corners are empty
          if (!corners.every(c => grid[c].value === null)) continue;

          // Type 1: three corners hold exactly the same two candidates
          // (the floor); the fourth holds those two plus extras (the roof).
          const biValueCorners = corners.filter(c => grid[c].candidates.length === 2);
          if (biValueCorners.length !== 3) continue;

          const [d1, d2] = grid[biValueCorners[0]].candidates;
          const floorMatches = biValueCorners.every(c =>
            grid[c].candidates.includes(d1) && grid[c].candidates.includes(d2)
          );
          if (!floorMatches) continue;

          const extraCorner = corners.find(c => !biValueCorners.includes(c));
          const extraCands = grid[extraCorner].candidates;
          if (
            extraCands.length <= 2 ||
            !extraCands.includes(d1) ||
            !extraCands.includes(d2)
          ) continue;

          // If all four corners kept only {d1,d2}, the puzzle would have two
          // solutions - so the roof corner must take one of its extras:
          // remove d1 and d2 from it.
          const eliminations = [d1, d2].map(digit => ({ cell: extraCorner, digit }));

          if (focusedDigit && d1 !== focusedDigit && d2 !== focusedDigit) continue;

          const step = {
            technique: 'Unique Rectangle Type 1',
            digit: null,
            baseCells: corners,
            targetCells: [extraCorner],
            eliminations,
            explanation: `Unique Rectangle on digits ${d1} and ${d2}: if R${getRow(extraCorner)+1}C${getCol(extraCorner)+1} were ${d1} or ${d2}, the four corners could swap ${d1}/${d2} freely and the puzzle would have two solutions. Since a valid Sudoku has one solution, ${d1} and ${d2} can be removed from R${getRow(extraCorner)+1}C${getCol(extraCorner)+1}.`
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

// BUG+1 (Bivalue Universal Grave plus 1)
export const findBUGPlus1 = (grid, focusedDigit = null, returnAll = false) => {
  let extraCell = null;
  let extraDigit = null;
  
  // Count bi-value cells and tri-value cells
  let triValueCount = 0;
  
  for (let i = 0; i < 81; i++) {
    const cell = grid[i];
    if (cell.value !== null) continue;
    
    const candCount = cell.candidates.length;
    
    if (candCount === 3) {
      triValueCount++;
      extraCell = i;
    } else if (candCount > 3) {
      return returnAll ? [] : null; // Not a BUG pattern
    }
  }
  
  // BUG+1: All cells bi-value except one tri-value
  if (triValueCount !== 1) return returnAll ? [] : null;
  
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

  // Verify the actual BUG property before placing anything: in EVERY unit,
  // every candidate digit must appear exactly 0 or 2 times - the only
  // exception being the extra digit appearing 3 times in the three units
  // that contain the tri-value cell. Cell-count shapes alone (all bi-value
  // + one tri-value) do NOT guarantee a BUG, and a false positive here
  // places a wrong digit.
  if (extraDigit) {
    for (const unit of units) {
      for (let d = 1; d <= 9; d++) {
        const count = unit.filter(c =>
          grid[c].value === null && grid[c].candidates.includes(d)
        ).length;
        if (count === 0 || count === 2) continue;
        if (count === 3 && d === extraDigit && unit.includes(extraCell)) continue;
        return returnAll ? [] : null;
      }
    }
  }

  if (focusedDigit && extraDigit !== focusedDigit) return returnAll ? [] : null;

  if (extraDigit) {
    const step = {
      technique: 'BUG+1',
      digit: extraDigit,
      baseCells: [extraCell],
      targetCells: [],
      placement: { cell: extraCell, digit: extraDigit },
      eliminations: [],
      explanation: `BUG+1 pattern detected. R${getRow(extraCell)+1}C${getCol(extraCell)+1} must be ${extraDigit} to avoid a deadly pattern with multiple solutions.`
    };
    return returnAll ? [step] : step;
  }
  
  return returnAll ? [] : null;
};

// Finned X-Wing, in both orientations.
//
// Base lines hold the digit in 2 or 3 cells; two base lines share exactly
// two cover lines, and the leftover cells (1 or 2 of them) are the fin.
// If the fin is false the pattern is a plain X-Wing; if it is true its
// peers lose the digit. Only cover-line candidates that see every fin cell
// are false in both cases.
export const findFinnedXWing = (grid, focusedDigit, returnAll = false) => {
  const allInstances = [];
  const digitsToCheck = focusedDigit ? [focusedDigit] : [1, 2, 3, 4, 5, 6, 7, 8, 9];

  const orientations = [
    { name: 'row', baseIndices: getRowIndices, baseOf: getRow, coverOf: getCol, coverIndices: getColIndices, baseWord: 'rows' },
    { name: 'column', baseIndices: getColIndices, baseOf: getCol, coverOf: getRow, coverIndices: getRowIndices, baseWord: 'columns' },
  ];

  for (const digit of digitsToCheck) {
    for (const o of orientations) {
      const lines = [];
      for (let line = 0; line < 9; line++) {
        const positions = o.baseIndices(line)
          .filter(i => grid[i].value === null && grid[i].candidates.includes(digit));
        if (positions.length === 2 || positions.length === 3) {
          lines.push({ line, positions, covers: positions.map(o.coverOf) });
        }
      }

      for (let i = 0; i < lines.length; i++) {
        for (let j = i + 1; j < lines.length; j++) {
          const l1 = lines[i];
          const l2 = lines[j];
          const commonCovers = l1.covers.filter(c => l2.covers.includes(c));
          if (commonCovers.length !== 2) continue;

          const fins = [
            ...l1.positions.filter(p => !commonCovers.includes(o.coverOf(p))),
            ...l2.positions.filter(p => !commonCovers.includes(o.coverOf(p))),
          ];
          if (fins.length === 0 || fins.length > 2) continue;

          const eliminations = [];
          for (const cover of commonCovers) {
            for (const idx of o.coverIndices(cover)) {
              if (!grid[idx].candidates.includes(digit) || grid[idx].value !== null) continue;
              const inBaseLines = [l1.line, l2.line].includes(o.baseOf(idx));
              const seesAllFins = fins.every(fin => arePeers(idx, fin));
              if (!inBaseLines && seesAllFins) eliminations.push({ cell: idx, digit });
            }
          }
          if (eliminations.length === 0) continue;

          const baseCells = [...l1.positions, ...l2.positions];
          const xwingLinks = [];
          if (l1.positions.length === 2) {
            xwingLinks.push({ from: { cell: l1.positions[0], digit }, to: { cell: l1.positions[1], digit } });
          }
          if (l2.positions.length === 2) {
            xwingLinks.push({ from: { cell: l2.positions[0], digit }, to: { cell: l2.positions[1], digit } });
          }

          const finNames = fins.map(c => `R${getRow(c)+1}C${getCol(c)+1}`).join(', ');
          const step = {
            technique: 'Finned X-Wing',
            digit,
            orientation: o.name,
            baseCells,
            targetCells: eliminations.map(e => e.cell),
            finCells: fins,
            strongLinks: xwingLinks,
            eliminations,
            explanation: `Finned X-Wing on digit ${digit} in ${o.baseWord} ${l1.line+1} and ${l2.line+1}, with fin ${finNames}. If the fin is false the pattern is a plain X-Wing; if the fin is true it eliminates its own peers. Only ${digit} candidates that see the fin and lie in the X-Wing ${o.name === 'row' ? 'columns' : 'rows'} are eliminated in both cases.`
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
