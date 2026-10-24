import { DEFAULT_COLORS } from './colors';
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

  const multiCandidateTechniques = [
    'Naked Pair', 'Hidden Pair', 'Naked Triple', 'Hidden Triple', 'Naked Quad', 'Hidden Quad',
  ];
  if (multiCandidateTechniques.includes(step.technique) && step.baseCells) {
    const candidatesInvolved = new Set();
    step.baseCells.forEach((cellIdx) => {
      grid[cellIdx].candidates.forEach((c) => candidatesInvolved.add(c));
    });

    const colorPalette = [
      colors.focusDigit || DEFAULT_COLORS.focusDigit,
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

  // A chain over several digits: each node shows the digit it is about, so
  // every digit the chain touches is coloured, not only the one erased. A
  // colouring step is left out: its own two tints already say which marks
  // the step is about, and a second colour vocabulary on top of them reads
  // as noise.
  if (Array.isArray(step.chainNodes) && step.chainNodes.length > 1 && !step.chainColouring) {
    const digits = [...new Set(step.chainNodes.map((node) => node.digit))].sort((a, b) => a - b);
    if (digits.length > 1) {
      const palette = [colors.focusDigit || DEFAULT_COLORS.focusDigit, '#3b82f6', '#f59e0b', '#a855f7', '#ef4444'];
      return Object.fromEntries(digits.map((digit, i) => [digit, palette[i % palette.length]]));
    }
  }

  if (step.digit) {
    return { [step.digit]: colors.focusDigit || DEFAULT_COLORS.focusDigit };
  }

  return null;
};

/**
 * The geometry the board draws a chain with (#67): the nodes in order, a
 * line per link, a region per group, and a ring round each endpoint. A
 * continuous loop gets one more line than it has nodes gaps, so it closes.
 *
 * Pure, so the drawing can be checked without a browser: the SVG is a
 * straight map over what comes back.
 *
 * @param {object|null} step      a step carrying `chainNodes`
 * @param {number|null} cellSize  the measured on-screen cell size
 * @typedef {{x:number, y:number, width:number, height:number}} Box
 * @typedef {Box & { parts: Box[], joins: {from:{x:number,y:number}, to:{x:number,y:number}}[] }} Region
 *
 * @returns {{ links: {from: {x:number,y:number}, to: {x:number,y:number}, strong: boolean}[],
 *             groups: Region[],
 *             sets: (Region & {digits:number[]})[],
 *             endpoints: {x:number,y:number}[], closed: boolean } | null}
 */
export const buildChainOverlay = (step, cellSize) => {
  const nodes = step?.chainNodes;
  if (!Array.isArray(nodes) || nodes.length < 2 || !cellSize) return null;

  const centre = (index) => ({
    x: (index % 9) * cellSize + cellSize / 2,
    y: Math.floor(index / 9) * cellSize + cellSize / 2,
  });
  const anchorOf = (node) => {
    const centres = node.cells.map(centre);
    return {
      x: centres.reduce((sum, c) => sum + c.x, 0) / centres.length,
      y: centres.reduce((sum, c) => sum + c.y, 0) / centres.length,
    };
  };
  const pad = cellSize * 0.1;
  const boxOf = (cells) => {
    const rows = cells.map((i) => Math.floor(i / 9));
    const cols = cells.map((i) => i % 9);
    return {
      x: Math.min(...cols) * cellSize + pad,
      y: Math.min(...rows) * cellSize + pad,
      width: (Math.max(...cols) - Math.min(...cols) + 1) * cellSize - pad * 2,
      height: (Math.max(...rows) - Math.min(...rows) + 1) * cellSize - pad * 2,
    };
  };
  /**
   * A region is outlined cell by cell and joined up, never as one box over
   * its bounding rectangle: the cells of a group or a set need not be
   * next to each other, and a box over the gap would claim a cell that is
   * not in the node. `x/y/width/height` is the extent, for labelling.
   */
  const regionOf = (cells) => ({
    ...boxOf(cells),
    parts: cells.map((cell) => boxOf([cell])),
    joins: cells.slice(0, -1).map((cell, i) => ({ from: centre(cell), to: centre(cells[i + 1]) })),
  });
  const outlineOf = (node) => regionOf(node.cells);

  const anchors = nodes.map(anchorOf);
  const closed = !!step.chainClosed;
  const linkCount = closed ? nodes.length : nodes.length - 1;
  const links = [];
  for (let i = 0; i < linkCount; i++) {
    links.push({
      from: anchors[i],
      to: anchors[(i + 1) % nodes.length],
      strong: nodes[i].linkToNext === 'strong',
    });
  }
  return {
    links,
    groups: nodes.filter((n) => n.cells.length > 1).map(outlineOf),
    // An almost locked set the chain passes through is drawn as its own
    // region, distinct from a grouped node, with its digits for the label.
    sets: (step.chainSets ?? []).map((set) => ({
      ...regionOf(set.cells),
      digits: [...set.digits],
    })),
    // One ring per cell of each end, never one ring on the middle of a
    // group: the cell between two group cells may not be in the group.
    endpoints: closed
      ? []
      : [...nodes[0].cells, ...nodes[nodes.length - 1].cells].map(centre),
    closed,
  };
};

/**
 * Derive the highlight cell sets for a list of steps: unit cells for
 * singles, blue base cells, red target cells. Purely derived data - the
 * grid itself is never mutated for visuals, so highlighting can't trigger
 * game-state effects or end up inside undo snapshots.
 */
export const buildHighlightSets = (steps) => {
  const baseCells = new Set();
  const targetCells = new Set();
  const unitCells = new Set();

  steps.forEach((step) => {
    // A step found inside one unit (Hidden Single) highlights that unit.
    if (step.unit && (step.technique === 'Hidden Single' || step.technique === 'Naked Single')) {
      const { type, index } = step.unit;
      if (type === 'row') {
        for (let c = 0; c < 9; c++) unitCells.add(index * 9 + c);
      } else if (type === 'column') {
        for (let r = 0; r < 9; r++) unitCells.add(r * 9 + index);
      } else if (type === 'box') {
        const boxStartRow = Math.floor(index / 3) * 3;
        const boxStartCol = (index % 3) * 3;
        for (let r = boxStartRow; r < boxStartRow + 3; r++) {
          for (let c = boxStartCol; c < boxStartCol + 3; c++) {
            unitCells.add(r * 9 + c);
          }
        }
      }
    }

    step.baseCells?.forEach((idx) => baseCells.add(idx));
    step.targetCells?.forEach((idx) => targetCells.add(idx));
  });

  return { baseCells, targetCells, unitCells };
};
