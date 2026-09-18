// Plain-language explanations for engine steps.
//
// The engines emit a compact `explanation` string written in standard Sudoku
// vocabulary (candidates, units, strong links, ALS...). That is fine for an
// experienced solver and baffling for a beginner. This module turns the
// step DATA (cells, digits, eliminations) into a structured explanation at
// two levels:
//
//   simple   - everyday words, no jargon, cells as R5C3 (a legend explains
//              the notation once), three short parts: what to look at, why
//              it works, what to do.
//   detailed - the engine's own text, plus a short glossary of the terms it
//              uses, and the same "what to do" line.
//
// Both levels are derived per step, so they always describe the actual
// pattern on the board rather than a generic textbook case.
import { getRow, getCol, getBox, arePeers } from './gridUnits';

export const EXPLAIN_LEVELS = ['simple', 'detailed'];
export const EXPLAIN_LEVEL_KEY = 'sudoku-mentor:explain-level';

/** @returns {'simple'|'detailed'} */
export const readExplainLevel = () => {
  try {
    const v = window.localStorage.getItem(EXPLAIN_LEVEL_KEY);
    return v === 'detailed' ? 'detailed' : 'simple';
  } catch {
    return 'simple';
  }
};

export const writeExplainLevel = (level) => {
  try {
    window.localStorage.setItem(EXPLAIN_LEVEL_KEY, level);
  } catch {
    // ignore
  }
};

// ---------------------------------------------------------------------------
// Glossary: the jargon the detailed texts use, in one sentence each.
// ---------------------------------------------------------------------------
export const GLOSSARY = {
  candidate: 'A small pencil-mark number: a digit that could still go in a cell.',
  unit: 'A row, a column, or a 3x3 box. Each unit must end up holding 1 to 9 once.',
  sees: 'Two cells "see" each other when they share a row, column, or 3x3 box, so they cannot hold the same digit.',
  peer: 'A cell that shares a row, column, or box with the cell in question.',
  'bi-value cell': 'A cell with exactly two candidates left.',
  'strong link': 'Two cells that are the only places for a digit in some unit. If one is not that digit, the other must be.',
  'conjugate pair': 'Another name for a strong link: the only two spots for a digit in a unit.',
  'Almost Locked Set (ALS)': 'A group of N cells that together hold N+1 different candidates. Remove any one candidate and the group is forced.',
  'restricted common': 'A digit shared by two groups where every copy in one group sees every copy in the other, so only one group can contain it.',
  fin: 'One or two extra candidates that spoil a perfect X-Wing. Eliminations survive only where they see the fin.',
  pivot: 'The middle cell of a wing pattern; its two candidates each point at one wing.',
  wing: 'An end cell of a wing pattern; it shares one candidate with the pivot and one with the other wing.',
  'deadly pattern': 'Four cells in a rectangle across two boxes holding the same two candidates. It would give the puzzle two solutions, so a valid puzzle never contains one.',
  contradiction: 'A state where some cell has no possible digit left, proving the assumption that led there was wrong.',
};

const TERMS_BY_TECHNIQUE = {
  'Naked Single': ['candidate'],
  'Hidden Single': ['candidate', 'unit'],
  'Pointing Pair': ['candidate', 'unit'],
  'Pointing Triple': ['candidate', 'unit'],
  'Claiming': ['candidate', 'unit'],
  'Naked Pair': ['candidate', 'unit'],
  'Hidden Pair': ['candidate', 'unit'],
  'Naked Triple': ['candidate', 'unit'],
  'X-Wing': ['candidate'],
  'Swordfish': ['candidate'],
  'XY-Wing': ['bi-value cell', 'pivot', 'wing', 'sees'],
  'X-Cycle': ['strong link', 'conjugate pair', 'sees'],
  'Finned X-Wing': ['fin', 'sees'],
  'ALS-XZ': ['Almost Locked Set (ALS)', 'restricted common', 'sees'],
  'Unique Rectangle Type 1': ['deadly pattern', 'candidate'],
  'BUG+1': ['bi-value cell', 'deadly pattern'],
  'Cell Forcing Chain': ['bi-value cell', 'contradiction'],
  'Hypothesis Mode': ['contradiction', 'bi-value cell'],
};

// ---------------------------------------------------------------------------
// Small formatting helpers
// ---------------------------------------------------------------------------
const r1 = (i) => getRow(i) + 1;
const c1 = (i) => getCol(i) + 1;
const b1 = (i) => getBox(i) + 1;

/** "row 5, column 1" - the long form, used once in the legend. */
export const plainCell = (i) => `row ${r1(i)}, column ${c1(i)}`;
/** "R5C1" - the notation used everywhere else; shorter and easier to scan. */
export const shortCell = (i) => `R${r1(i)}C${c1(i)}`;
/** The legend shown under beginner explanations. */
export const CELL_LEGEND = 'R5C3 means row 5, column 3.';

const listWords = (items) => {
  const arr = items.map(String);
  if (arr.length <= 1) return arr.join('');
  if (arr.length === 2) return `${arr[0]} and ${arr[1]}`;
  return `${arr.slice(0, -1).join(', ')}, and ${arr[arr.length - 1]}`;
};

const shortCells = (cells) => listWords(cells.map(shortCell));

const uniq = (arr) => [...new Set(arr)];

/** The row/column/box name shared by every cell in the list, if any. */
const commonUnit = (cells, prefer = null) => {
  if (!cells.length) return null;
  const rows = uniq(cells.map(getRow));
  const cols = uniq(cells.map(getCol));
  const boxes = uniq(cells.map(getBox));
  const found = [];
  if (rows.length === 1) found.push({ type: 'row', index: rows[0], name: `row ${rows[0] + 1}` });
  if (cols.length === 1) found.push({ type: 'column', index: cols[0], name: `column ${cols[0] + 1}` });
  if (boxes.length === 1) found.push({ type: 'box', index: boxes[0], name: `box ${boxes[0] + 1}` });
  if (prefer) {
    const p = found.find((u) => u.type === prefer);
    if (p) return p;
  }
  return found[0] || null;
};

/** The unit that holds both the base cells and the eliminated cells. */
const unitForElims = (baseCells, elimCells) => {
  const all = [...baseCells, ...elimCells];
  return commonUnit(all) || commonUnit(baseCells);
};

const candidatesOf = (grid, cell) => (grid?.[cell]?.candidates ?? []);

const elimSummary = (eliminations) => {
  if (!eliminations?.length) return null;
  const byDigit = {};
  eliminations.forEach(({ cell, digit }) => {
    (byDigit[digit] ||= []).push(cell);
  });
  const digits = Object.keys(byDigit).map(Number).sort((a, b) => a - b);
  return { digits, byDigit, cells: uniq(eliminations.map((e) => e.cell)) };
};

/** "Erase the pencil mark 7 from R3C4 and R3C8." */
const eraseLine = (eliminations) => {
  const s = elimSummary(eliminations);
  if (!s) return null;
  return s.digits
    .map((d) => `Erase the pencil mark ${d} from ${shortCells(s.byDigit[d])}.`)
    .join(' ');
};

const placeLine = (placement) => {
  if (!placement) return null;
  return `Write ${placement.digit} in ${shortCell(placement.cell)}.`;
};

// ---------------------------------------------------------------------------
// Per-technique simple explanations. Each returns { look, why, extra? }.
// "look" = what to look at on the board; "why" = the reasoning in plain words.
// ---------------------------------------------------------------------------
const SIMPLE = {
  'Naked Single': (step) => {
    const cell = step.placement?.cell ?? step.baseCells?.[0];
    return {
      look: `Look at ${shortCell(cell)}. It has only one pencil mark left: ${step.digit}.`,
      why: `Every other number from 1 to 9 already appears somewhere in its row, its column, or its 3x3 box. ${step.digit} is the only number that still fits.`,
    };
  },

  'Hidden Single': (step, grid) => {
    const cell = step.placement?.cell ?? step.baseCells?.[0];
    const unit = unitFromText(step.explanation) || commonUnit([cell]);
    const unitName = unit?.name ?? 'this row, column, or box';
    return {
      look: `Look at ${unitName}. The number ${step.digit} is still missing from it, and ${shortCell(cell)} is the only empty cell there where ${step.digit} can go.`,
      why: `Every other empty cell in ${unitName} already has a ${step.digit} in its row, column, or box, so none of them can take it. Since ${unitName} must contain a ${step.digit} somewhere, it has to be this cell.`,
      _grid: grid,
    };
  },

  'Pointing Pair': (step) => pointing(step),
  'Pointing Triple': (step) => pointing(step),

  'Claiming': (step) => {
    const elims = elimSummary(step.eliminations);
    const box = commonUnit([...step.baseCells, ...elims.cells], 'box');
    const line = commonUnit(step.baseCells, 'row') || commonUnit(step.baseCells, 'column');
    return {
      look: `Look at ${line.name}. The number ${step.digit} can only go in ${step.baseCells.length} cells there (${shortCells(step.baseCells)}), and all of them sit inside ${box.name}.`,
      why: `${capitalize(line.name)} must contain a ${step.digit} somewhere, and every possible spot is in ${box.name}. So ${box.name} gets its ${step.digit} from ${line.name}, and no other cell in ${box.name} can be ${step.digit}.`,
    };
  },

  'Naked Pair': (step, grid) => nakedSet(step, grid, 2),
  'Naked Triple': (step, grid) => nakedSet(step, grid, 3),

  'Hidden Pair': (step) => {
    const [a, b] = step.baseCells;
    const unit = unitForElims(step.baseCells, []) ;
    const digits = uniq(step.eliminations.map((e) => e.digit));
    const pair = pairDigitsFromText(step.explanation) || [];
    const pairText = pair.length === 2 ? `${pair[0]} and ${pair[1]}` : 'two numbers';
    return {
      look: `Look at ${unit?.name ?? 'this unit'}. The numbers ${pairText} can only go in two cells there: ${shortCell(a)} and ${shortCell(b)}.`,
      why: `Those two numbers have nowhere else to go, so between them they must fill both cells. That leaves no room for anything else in those cells, so their other pencil marks (${listWords(digits)}) can go.`,
    };
  },

  'X-Wing': (step) => fish(step, 2),
  'Swordfish': (step) => fish(step, 3),

  'XY-Wing': (step, grid) => {
    const [pivot, wing1, wing2] = step.baseCells;
    const z = step.digit;
    const pivotC = candidatesOf(grid, pivot);
    const w1 = candidatesOf(grid, wing1);
    const w2 = candidatesOf(grid, wing2);
    const pv = pivotC.length ? `${pivotC.join(' or ')}` : 'one of two numbers';
    return {
      look: `Look at three cells that each have just two pencil marks. The middle one is ${shortCell(pivot)} (${pv}). It is connected to ${shortCell(wing1)} (${w1.join(' or ') || 'two numbers'}) and to ${shortCell(wing2)} (${w2.join(' or ') || 'two numbers'}). Both outer cells contain ${z}.`,
      why: `Whatever the middle cell turns out to be, it forces one of the two outer cells to be ${z}. So ${z} is guaranteed to land in one of those two outer cells. Any cell that shares a row, column, or box with both outer cells can never be ${z}.`,
    };
  },

  'X-Cycle': (step) => {
    const d = step.digit;
    const elimCells = uniq(step.eliminations.map((e) => e.cell));
    const wrap = elimCells.every((c) => step.baseCells.includes(c));
    const look = `Follow the ${d} pencil marks in the highlighted cells. They are joined in a chain: each link is a row, column, or box where ${d} has only two possible spots, so if one spot is not ${d}, the other must be.`;
    if (wrap) {
      return {
        look,
        why: `Colour the chain alternately, like a checkerboard. Exactly one colour is the real set of ${d}s. Here, two cells of the same colour share a row, column, or box, which is impossible for a real set. So that colour is wrong, and ${d} can be erased from every cell of that colour.`,
      };
    }
    return {
      look,
      why: `Colour the chain alternately, like a checkerboard. Exactly one colour is the real set of ${d}s; we just do not know which. A cell that shares a row, column, or box with a cell of each colour would clash with the real ${d} either way, so it can never be ${d}.`,
    };
  },

  'Finned X-Wing': (step) => {
    const d = step.digit;
    const fins = step.finCells ?? [];
    const core = step.baseCells.filter((c) => !fins.includes(c));
    const rows = uniq(core.map(r1));
    const cols = uniq(core.map(c1));
    return {
      look: `Look at rows ${listWords(rows)}. Almost every ${d} in those rows sits in columns ${listWords(cols)}, forming a rectangle, except for ${fins.length === 1 ? 'one extra spot' : 'a couple of extra spots'} at ${shortCells(fins)} (the "fin").`,
      why: `There are two cases. If the fin is not ${d}, the rectangle works like a normal X-Wing and ${d} can be erased from the rest of columns ${listWords(cols)}. If the fin is ${d}, then any cell sharing a row, column, or box with the fin can't be ${d}. The highlighted cells are ruled out in both cases, so they can never be ${d}.`,
    };
  },

  'ALS-XZ': (step) => {
    const { als1, als2, xDigit: x, zDigit: z } = step;
    const groupText = (als, label) => {
      const marks = [...als.candidates].sort();
      if (als.cells.length === 1) {
        return `Group ${label} is the single cell ${shortCell(als.cells[0])}, which can only be ${marks.join(' or ')}.`;
      }
      return `Group ${label} is the ${als.cells.length} cells ${shortCells(als.cells)} in ${als.unitName}. Between them they can only use ${marks.length} numbers: ${listWords(marks)}.`;
    };
    return {
      look: `${groupText(als1, 'A')} ${groupText(als2, 'B')}`,
      why: `Each group has exactly one more possible number than it has cells, so it is one step from being fully decided: rule out any one number and every cell in the group is forced. Both groups can use ${x}, but every ${x} in group A clashes with every ${x} in group B (they share a row, column, or box), so only one group can actually take ${x}. The other group loses ${x}, becomes forced, and must then use ${z}. Either way, ${z} ends up inside one of the two groups. Any cell that clashes with every ${z} in both groups can never be ${z}.`,
    };
  },

  'Unique Rectangle Type 1': (step) => {
    const extra = step.targetCells?.[0];
    const corners = step.baseCells.filter((c) => c !== extra);
    const digits = uniq(step.eliminations.map((e) => e.digit)).sort();
    return {
      look: `Look at four cells that form a rectangle, spread over two boxes: ${shortCells(step.baseCells)}. Three of them (${shortCells(corners)}) hold exactly the same two pencil marks, ${digits[0]} and ${digits[1]}. The fourth, ${shortCell(extra)}, has those two plus something else.`,
      why: `If the fourth cell were also ${digits[0]} or ${digits[1]}, all four corners could swap ${digits[0]} and ${digits[1]} with each other and the puzzle would have two different answers. A proper Sudoku has exactly one answer, so that cannot happen. The fourth cell must be one of its other pencil marks.`,
    };
  },

  'BUG+1': (step) => {
    const cell = step.placement?.cell ?? step.baseCells?.[0];
    return {
      look: `Look at the whole grid: every empty cell has exactly two pencil marks, except ${shortCell(cell)}, which has three.`,
      why: `A grid where every cell has two options, and each digit appears exactly twice in every row, column, and box, would have two answers. A proper Sudoku has exactly one, so this cell must break the pattern. The only number that breaks it is ${step.digit}: it is the one that appears three times in this cell's row, column, or box.`,
    };
  },

  'Cell Forcing Chain': (step, grid) => {
    const origin = step.baseCells?.[0];
    const cands = candidatesOf(grid, origin);
    const target = step.placement?.cell;
    const opts = cands.length ? listWords(cands.map(String)).replace(', and ', ' or ').replace(' and ', ' or ') : 'a couple of numbers';
    return {
      look: `Look at ${shortCell(origin)}. It can only be ${opts}.`,
      why: `Try each option in turn and follow the consequences. Every option leads to the same result: ${target != null ? `${shortCell(target)} becomes ${step.placement.digit}` : 'the same pencil marks disappear'}. When every road leads to the same place, that result is certain, no matter which option is right. This is real logic, not guessing.`,
    };
  },

  'Hypothesis Mode': (step) => {
    const origin = step.baseCells?.[0];
    const tried = step.contradictoryDigit ?? step.digit;
    const bad = step.contradictionCell;
    const placements = (step.chain ?? []).filter((s) => s.action === 'place').length;
    const outcome = step.placement
      ? `So ${shortCell(origin)} cannot be ${tried}, and its only other option, ${step.placement.digit}, must be right.`
      : `So ${shortCell(origin)} cannot be ${tried}, and that pencil mark can be erased.`;
    return {
      look: `This is a "what if" test. Suppose ${shortCell(origin)} were ${tried}.`,
      why: `Following that assumption${placements > 1 ? ` through ${placements} forced moves` : ''} leads to a dead end: ${bad != null ? shortCell(bad) : 'a cell'} is left with no possible number at all. An assumption that breaks the puzzle must be wrong. ${outcome}`,
    };
  },
};

function capitalize(s) {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

/** Pull "Row 3" / "Column 7" / "Box 2" out of an engine explanation. */
function unitFromText(text) {
  const m = /\b(Row|Column|Box)\s+(\d)/i.exec(text || '');
  if (!m) return null;
  const type = m[1].toLowerCase();
  return { type, index: Number(m[2]) - 1, name: `${type} ${m[2]}` };
}

/** Pull "digits 3 and 7" out of the Hidden Pair engine text. */
function pairDigitsFromText(text) {
  const m = /digits (\d) and (\d)/.exec(text || '');
  return m ? [Number(m[1]), Number(m[2])] : null;
}

function pointing(step) {
  const elims = elimSummary(step.eliminations);
  const box = commonUnit(step.baseCells, 'box');
  const line = commonUnit([...step.baseCells, ...elims.cells], 'row') || commonUnit([...step.baseCells, ...elims.cells], 'column');
  const n = step.baseCells.length;
  return {
    look: `Look at ${box.name}. The number ${step.digit} can only go in ${n} cells there (${shortCells(step.baseCells)}), and they all sit in ${line.name}.`,
    why: `${capitalize(box.name)} must contain a ${step.digit} somewhere, and every possible spot is in ${line.name}. So ${line.name} gets its ${step.digit} from inside ${box.name}, and no other cell in ${line.name} can be ${step.digit}.`,
  };
}

function nakedSet(step, grid, size) {
  const elims = elimSummary(step.eliminations);
  const unit = unitForElims(step.baseCells, elims.cells);
  const digits = uniq(step.baseCells.flatMap((c) => candidatesOf(grid, c))).sort((a, b) => a - b);
  const digitText = digits.length ? listWords(digits) : elims ? listWords(elims.digits) : 'the same numbers';
  const word = size === 2 ? 'two' : 'three';
  return {
    look: `Look at ${word} cells in ${unit?.name ?? 'the same row, column, or box'}: ${shortCells(step.baseCells)}. Between them, their only pencil marks are ${digitText}.`,
    why: `${capitalize(word)} cells that share only ${word} numbers must use up all of those numbers between them. So ${digitText} are spoken for, and no other cell in ${unit?.name ?? 'that unit'} can hold them.`,
  };
}

function fish(step, size) {
  const d = step.digit;
  const elims = elimSummary(step.eliminations);
  const elimRows = uniq(elims.cells.map(getRow));
  const elimCols = uniq(elims.cells.map(getCol));
  const rows = uniq(step.baseCells.map(r1)).sort((a, b) => a - b);
  const cols = uniq(step.baseCells.map(c1)).sort((a, b) => a - b);
  // Row-based fish eliminate down the columns (elims span several rows).
  const rowBased = elimRows.length >= elimCols.length;
  const baseName = rowBased ? 'rows' : 'columns';
  const coverName = rowBased ? 'columns' : 'rows';
  const baseList = rowBased ? rows : cols;
  const coverList = rowBased ? cols : rows;
  const word = size === 2 ? 'two' : 'three';
  return {
    look: `Look at ${baseName} ${listWords(baseList)}. In each of them, the number ${d} can only go in ${coverName} ${listWords(coverList)}.`,
    why: `Each of those ${word} ${baseName} needs exactly one ${d}, and they only have those ${word} ${coverName} to choose from. So those ${word} ${coverName} will each get one ${d} from these ${baseName}. That uses up every ${d} those ${coverName} are allowed, so no other cell in ${coverName} ${listWords(coverList)} can be ${d}.`,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Build a structured explanation for a step.
 *
 * @param {object} step   a step object from any engine
 * @param {Array}  grid   the current grid (used to read candidates)
 * @param {'simple'|'detailed'} level
 * @returns {{ level, look, why, extra, action, terms: Array<{term, meaning}> }}
 */
export function explainStep(step, grid, level = 'simple') {
  if (!step) return null;
  const action = [placeLine(step.placement), eraseLine(step.eliminations)]
    .filter(Boolean)
    .join(' ');

  if (level === 'detailed') {
    const terms = (TERMS_BY_TECHNIQUE[step.technique] || [])
      .filter((t) => GLOSSARY[t])
      .map((t) => ({ term: t, meaning: GLOSSARY[t] }));
    return { level, look: null, why: step.explanation || '', extra: null, action, terms };
  }

  const builder = SIMPLE[step.technique];
  if (!builder) {
    return {
      level,
      look: null,
      why: step.explanation || '',
      extra: null,
      action,
      terms: [],
    };
  }
  let parts;
  try {
    parts = builder(step, grid);
  } catch {
    // A step shape we did not anticipate: fall back to the engine text
    // rather than crash the hint card.
    parts = { look: null, why: step.explanation || '' };
  }
  return {
    level,
    look: parts.look || null,
    why: parts.why || '',
    extra: parts.extra || null,
    action,
    terms: [],
  };
}

/** True when two cells share a unit; exported for the tests. */
export const cellsSee = arePeers;
