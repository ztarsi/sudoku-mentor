// Advanced Chain-Based Logic Engine for Expert Sudoku Techniques

import { getRow, getCol, getRowIndices, getColIndices, getBoxIndices, arePeers, cellName } from './gridUnits';

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

// ---------------------------------------------------------------------------
// Walking a colouring (#82)
//
// A colouring is a network rather than a single line, so there is no one
// order to read it in. What makes a colour wrong is one pair of marks, and
// what proves that pair is the run of links between them: follow the run
// and the colours alternate, mark by mark, until the two ends come out the
// same colour (or, for a trap, opposite colours either side of a cell that
// sees both). That run is what the hint card walks, in the order the
// colouring spread along it, and the board draws it with the chain overlay
// the chain family already uses.
// ---------------------------------------------------------------------------

const edgeKey = (a, b) => (a < b ? `${a}:${b}` : `${b}:${a}`);

/** Every node from here back to where this colouring started. */
const colorAncestry = (parentOf, node) => {
  const up = [];
  for (let at = node; at !== undefined; at = parentOf.get(at)) up.push(at);
  return up;
};

/**
 * The run of links joining two coloured marks: up from the first, through
 * the node where the two spreads meet, and back down to the second.
 */
const colorRun = (parentOf, a, b) => {
  const up = colorAncestry(parentOf, a);
  const down = colorAncestry(parentOf, b);
  const depth = new Map(up.map((node, i) => [node, i]));
  const meet = down.find((node) => depth.has(node));
  if (meet === undefined) return null;
  return [...up.slice(0, depth.get(meet) + 1), ...down.slice(0, down.indexOf(meet)).reverse()];
};

/**
 * The run as chain nodes: the shape the card's link-by-link walk and the
 * board's chain overlay already read. One node per mark, each saying how it
 * joins the next; every link in a colouring is an exactly-one-of-two, so
 * every one of them is a strong link.
 */
const colorChainNodes = (run, { cellOf, digitOf, colorOf, edges }) =>
  run.map((node, i) => {
    const next = run[i + 1];
    const edge = next === undefined ? null : edges.get(edgeKey(node, next));
    return {
      cells: [cellOf(node)],
      cell: cellOf(node),
      digit: digitOf(node),
      kind: 'candidate',
      // 1 or 2, the two tints the board gives a colouring step.
      color: colorOf(node) + 1,
      truth: null,
      endpoint: i === 0 || i === run.length - 1,
      linkToNext: next === undefined ? null : 'strong',
      linkVia: next === undefined ? null : edge?.via ?? 'unit',
      linkUnit: edge?.unit ?? null,
      linkSet: null,
    };
  });

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

    // Build adjacency over conjugate links, keeping the unit each link was
    // found in: the walk names it one link at a time ("in row 3, the only
    // two places for 5 are...").
    const adjacency = new Map();
    const edges = new Map();
    for (const link of digitLinks) {
      const a = link.from.cell;
      const b = link.to.cell;
      if (!adjacency.has(a)) adjacency.set(a, new Set());
      if (!adjacency.has(b)) adjacency.set(b, new Set());
      adjacency.get(a).add(b);
      adjacency.get(b).add(a);
      const key = edgeKey(a, b);
      if (!edges.has(key)) edges.set(key, { via: 'unit', unit: { name: link.unit.toLowerCase() } });
    }

    // 2-color each connected component
    const colorOf = new Map();
    for (const start of adjacency.keys()) {
      if (colorOf.has(start)) continue;

      const component = [];
      colorOf.set(start, 0);
      // Where the colouring reached each cell from, so the run of links
      // between any two of them can be read back off the spread.
      const parentOf = new Map();
      const queue = [start];
      let consistent = true;
      while (queue.length > 0) {
        const cell = queue.shift();
        component.push(cell);
        for (const next of adjacency.get(cell)) {
          if (!colorOf.has(next)) {
            colorOf.set(next, 1 - colorOf.get(cell));
            parentOf.set(next, cell);
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

      // Color wrap: same-colored cells sharing a unit kill that color. The
      // pair itself is kept, not just the colour: it is what the card walks
      // to, and the two marks the player is shown at the end.
      let wrapPair = null;
      let wrappedColor = -1;
      [colorA, colorB].forEach((cells, index) => {
        if (wrapPair) return;
        for (let i = 0; i < cells.length && !wrapPair; i++) {
          for (let j = i + 1; j < cells.length; j++) {
            if (arePeers(cells[i], cells[j])) {
              wrapPair = [cells[i], cells[j]];
              wrappedColor = index;
              break;
            }
          }
        }
      });

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

        // The run of links the card walks (#82). For a wrap it joins the
        // two marks of one colour that cannot both be the digit; for a
        // trap it joins the two opposite-coloured marks the erased cell
        // sees, which is what makes that cell dead either way. The
        // shortest such run is taken, so the player walks as few links as
        // the proof needs.
        const target = rule === 'trap' ? eliminations[0].cell : null;
        let witness = wrapPair;
        if (rule === 'trap') {
          let best = null;
          for (const a of colorA) {
            if (!arePeers(target, a)) continue;
            for (const b of colorB) {
              if (!arePeers(target, b)) continue;
              const run = colorRun(parentOf, a, b);
              if (run && (!best || run.length < best.length)) {
                best = run;
                witness = [a, b];
              }
            }
          }
        }
        const run = witness ? colorRun(parentOf, witness[0], witness[1]) : null;
        const walk = run
          ? colorChainNodes(run, {
              cellOf: (cell) => cell,
              digitOf: () => digit,
              colorOf: (cell) => colorOf.get(cell),
              edges,
            })
          : null;
        const survivingFirst = rule === 'wrap'
          ? [wrappedColor === 0 ? colorB : colorA, wrappedColor === 0 ? colorA : colorB]
          // A trap proves nothing against either colour, so these are just
          // the two colours, in the order the colouring found them.
          : [colorA, colorB];

        const step = {
          technique: 'X-Cycle',
          digit,
          baseCells: component,
          targetCells: eliminations.map(e => e.cell),
          chains: component,
          strongLinks: componentLinks,
          // The two colours for the board, in the same two tints 3D Medusa
          // uses, so the colouring family looks like one family.
          colorGroups: survivingFirst.map((cells) => [...cells].sort((a, b) => a - b)),
          colorRule: rule,
          colorWitness: witness ? witness.map((cell) => ({ cell, digit })) : null,
          colorTarget: target,
          ...(walk && walk.length > 1 ? { chainNodes: walk, chainColouring: true } : {}),
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


// 3D Medusa: colouring every digit at once.
//
// X-Cycle colours one digit along its conjugate pairs. Medusa adds the
// other half of the picture: inside a cell with exactly two candidates,
// one of the two is true, which is a strong link as well. Colour both
// kinds of link together and the colouring spans every digit on the board.
//
// Every link is an exactly-one-of-two, so within a component one colour is
// entirely true and the other entirely false. Two conclusions follow, and
// both are implemented here because the second is the common one:
//
//   a cell that meets one colour twice - two candidates of the same cell
//   in the same colour - cannot have that colour true, because a cell
//   holds one digit;
//
//   a unit that meets one colour twice - the same digit in two cells of
//   one row, column or box, both in the same colour - cannot have that
//   colour true either.
//
// Either way that colour is false, and every candidate wearing it goes.
export const find3DMedusa = (grid, focusedDigit = null, returnAll = false) => {
  const allInstances = [];

  // A node is one candidate: cell * 10 + digit.
  const nodeCell = (node) => Math.floor(node / 10);
  const nodeDigit = (node) => node % 10;

  const adjacency = new Map();
  // What kind of link each join was made with, so the walk can say it one
  // link at a time: a digit with two homes left in a row, column or box,
  // or a cell with two pencil marks left.
  const edges = new Map();
  const join = (a, b, edge) => {
    if (!adjacency.has(a)) adjacency.set(a, new Set());
    if (!adjacency.has(b)) adjacency.set(b, new Set());
    adjacency.get(a).add(b);
    adjacency.get(b).add(a);
    const key = edgeKey(a, b);
    if (!edges.has(key)) edges.set(key, edge);
  };

  const units = [
    ...Array.from({ length: 9 }, (_, i) => ({ type: 'row', indices: getRowIndices(i), name: `row ${i + 1}` })),
    ...Array.from({ length: 9 }, (_, i) => ({ type: 'column', indices: getColIndices(i), name: `column ${i + 1}` })),
    ...Array.from({ length: 9 }, (_, i) => ({ type: 'box', indices: getBoxIndices(i), name: `box ${i + 1}` })),
  ];

  // Strong links of the first kind: a digit with exactly two homes in a unit.
  for (const unit of units) {
    for (let digit = 1; digit <= 9; digit++) {
      const spots = unit.indices.filter(
        (i) => grid[i].value === null && grid[i].candidates.includes(digit)
      );
      if (spots.length === 2) {
        join(spots[0] * 10 + digit, spots[1] * 10 + digit, { via: 'unit', unit: { name: unit.name } });
      }
    }
  }
  // And of the second kind: a cell with exactly two candidates left.
  for (let i = 0; i < 81; i++) {
    if (grid[i].value !== null || grid[i].candidates.length !== 2) continue;
    const [d1, d2] = grid[i].candidates;
    join(i * 10 + d1, i * 10 + d2, { via: 'bivalue', unit: null });
  }

  const colorOf = new Map();
  for (const start of adjacency.keys()) {
    if (colorOf.has(start)) continue;

    const component = [];
    colorOf.set(start, 0);
    // Where the colouring reached each mark from, so the run of links
    // between any two of them can be read back off the spread.
    const parentOf = new Map();
    const queue = [start];
    let consistent = true;
    while (queue.length > 0) {
      const node = queue.shift();
      component.push(node);
      for (const next of adjacency.get(node)) {
        if (!colorOf.has(next)) {
          colorOf.set(next, 1 - colorOf.get(node));
          parentOf.set(next, node);
          queue.push(next);
        } else if (colorOf.get(next) === colorOf.get(node)) {
          // An odd cycle of exactly-one-of-two constraints cannot be
          // coloured, and nothing may be concluded from it.
          consistent = false;
        }
      }
    }
    if (!consistent || component.length < 3) continue;

    const colors = [
      component.filter((n) => colorOf.get(n) === 0),
      component.filter((n) => colorOf.get(n) === 1),
    ];
    if (colors[0].length === 0 || colors[1].length === 0) continue;

    // Which colour contradicts itself, and by which of the two rules.
    let falseColor = -1;
    let rule = null;
    let witness = null;
    for (let c = 0; c < 2 && falseColor === -1; c++) {
      const nodes = colors[c];
      for (let i = 0; i < nodes.length && falseColor === -1; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          if (nodeCell(a) === nodeCell(b)) {
            falseColor = c;
            rule = 'cell';
            witness = [a, b];
            break;
          }
          if (nodeDigit(a) === nodeDigit(b) && arePeers(nodeCell(a), nodeCell(b))) {
            falseColor = c;
            rule = 'unit';
            witness = [a, b];
            break;
          }
        }
      }
    }
    if (falseColor === -1) continue;

    const eliminations = colors[falseColor].map((n) => ({ cell: nodeCell(n), digit: nodeDigit(n) }));
    if (focusedDigit && !eliminations.some((e) => e.digit === focusedDigit)) continue;

    const cellsOf = (nodes) => [...new Set(nodes.map(nodeCell))];
    const trueColor = 1 - falseColor;
    const falseCells = new Set(cellsOf(colors[falseColor]));
    const trueCells = new Set(cellsOf(colors[trueColor]));
    // A cell can wear both colours, when two of its candidates are in the
    // network; those are left plain rather than given one of the two tints.
    const onlyTrue = [...trueCells].filter((c) => !falseCells.has(c)).sort((a, b) => a - b);
    const onlyFalse = [...falseCells].filter((c) => !trueCells.has(c)).sort((a, b) => a - b);
    const name = (node) => `${cellName(nodeCell(node))}'s ${nodeDigit(node)}`;
    const clash = rule === 'cell'
      ? `${cellName(nodeCell(witness[0]))} would have to be both ${nodeDigit(witness[0])} and ${nodeDigit(witness[1])}`
      : `${cellName(nodeCell(witness[0]))} and ${cellName(nodeCell(witness[1]))} would both be ${nodeDigit(witness[0])}, and they share a ${
          getRow(nodeCell(witness[0])) === getRow(nodeCell(witness[1])) ? 'row'
          : getCol(nodeCell(witness[0])) === getCol(nodeCell(witness[1])) ? 'column' : 'box'
        }`;

    // The run of links the card walks (#82): from one of the two marks
    // that clash to the other, which is the part of the network that
    // proves this colour wrong.
    const run = colorRun(parentOf, witness[0], witness[1]);
    const walk = run
      ? colorChainNodes(run, { cellOf: nodeCell, digitOf: nodeDigit, colorOf: (n) => colorOf.get(n), edges })
      : null;

    const step = {
      technique: '3D Medusa',
      digit: null,
      baseCells: cellsOf(component),
      targetCells: [...new Set(eliminations.map((e) => e.cell))],
      medusaRule: rule,
      medusaWitness: witness.map((n) => ({ cell: nodeCell(n), digit: nodeDigit(n) })),
      // The same two fields X-Cycle carries, so one walk serves both.
      colorRule: rule,
      colorWitness: witness.map((n) => ({ cell: nodeCell(n), digit: nodeDigit(n) })),
      ...(walk && walk.length > 1 ? { chainNodes: walk, chainColouring: true } : {}),
      // The two colours for the board, the surviving one first and the
      // false one second, in the two tints the ALS sets already use.
      colorGroups: [onlyTrue, onlyFalse],
      strongLinks: component.flatMap((node) =>
        [...adjacency.get(node)]
          .filter((other) => other > node)
          .map((other) => ({
            from: { cell: nodeCell(node), digit: nodeDigit(node) },
            to: { cell: nodeCell(other), digit: nodeDigit(other) },
          }))
      ),
      eliminations,
      explanation:
        `3D Medusa: strong links on every digit - a digit with two homes in a unit, and the two candidates of a ` +
        `bi-value cell - chain these candidates into one network, two-coloured so that one colour is entirely true ` +
        `and the other entirely false. ${rule === 'cell' ? 'A cell' : 'A unit'} meets one colour twice here: ` +
        `${clash}. That colour cannot be the true one, so every candidate in it is eliminated` +
        `${witness ? ` (${name(witness[0])} and ${name(witness[1])} among them)` : ''}.`,
    };

    if (returnAll) allInstances.push(step);
    else return step;
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

// Unique Rectangle Type 1 and BUG+1 used to live here. They moved to
// uniquenessEngine.jsx with the rest of the uniqueness family, because they
// share its one argument and, more importantly, its guard: nothing in that
// family may run on a grid that is not known to have exactly one answer.

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

          // Both corners of the X-Wing occupied. A base line left with a
          // single candidate inside the cover lines is the sashimi shape,
          // which fishEngine reports as a Sashimi Fish at every size, so
          // one pattern never carries two names.
          const coreCount = (line) =>
            line.positions.filter(p => commonCovers.includes(o.coverOf(p))).length;
          if (coreCount(l1) < 2 || coreCount(l2) < 2) continue;

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
