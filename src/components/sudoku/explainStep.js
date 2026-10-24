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
import { cellName, getRow, getCol, getBox, arePeers, getPeers, getRowIndices, getColIndices, getBoxIndices } from './gridUnits';

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
  fin: 'One or two extra candidates that spoil an otherwise perfect fish. Eliminations survive only where they see every fin.',
  'base set': 'One of the units a fish is built on: it must hold the digit somewhere, and no two base sets share a candidate cell.',
  'cover set': 'One of the units a fish ends in: between them, the cover sets hold every candidate the base sets offer.',
  colouring: 'Marking a network of strong links in two alternating colours, exactly one of which is the true set.',
  pivot: 'The middle cell of a wing pattern; its two candidates each point at one wing.',
  wing: 'An end cell of a wing pattern; it shares one candidate with the pivot and one with the other wing.',
  'deadly pattern': 'Cells that could swap two digits between them without breaking anything: four in a rectangle across two boxes, or a longer loop. It would give the puzzle two solutions, so a valid puzzle never contains one.',
  'locked set': 'N cells of one unit whose candidates come to exactly N digits. Those digits fill those cells, so they leave every other cell of the unit.',
  'bivalue universal grave': 'A board where every empty cell has exactly two candidates and every digit has exactly two homes in every unit. Such a board always has more than one solution, so a proper puzzle never reaches one.',
  contradiction: 'A state where some cell has no possible digit left, proving the assumption that led there was wrong.',
  'weak link': 'Two places where at most one can be true: the same digit in cells that all see each other, or two digits in one cell.',
  'alternating inference chain': 'A chain of nodes whose links alternate strong, weak, strong, beginning and ending with a strong link. At least one of its two endpoints is true.',
  'group node': 'Every candidate for one digit in the cells where a box overlaps a row or a column. The digit is somewhere in the group or nowhere in it, so the group behaves as one node.',
  'continuous loop': 'A chain that closes on itself with the alternation intact. Every weak link in it becomes exact, so each one eliminates.',
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
  'Hidden Triple': ['candidate', 'unit'],
  'Naked Quad': ['candidate', 'unit'],
  'Hidden Quad': ['candidate', 'unit'],
  'X-Wing': ['candidate'],
  'Swordfish': ['candidate'],
  'Jellyfish': ['candidate'],
  'Empty Rectangle': ['candidate', 'strong link', 'conjugate pair'],
  'XY-Wing': ['bi-value cell', 'pivot', 'wing', 'sees'],
  'XYZ-Wing': ['bi-value cell', 'pivot', 'wing', 'sees'],
  'WXYZ-Wing': ['candidate', 'restricted common', 'sees'],
  'Skyscraper': ['strong link', 'conjugate pair', 'sees'],
  'Two-String Kite': ['strong link', 'conjugate pair', 'sees'],
  'W-Wing': ['bi-value cell', 'conjugate pair', 'sees'],
  'Remote Pairs': ['bi-value cell', 'strong link', 'sees'],
  'X-Chain': ['alternating inference chain', 'strong link', 'weak link', 'conjugate pair'],
  'XY-Chain': ['alternating inference chain', 'strong link', 'weak link', 'bi-value cell'],
  'Alternating Chain': ['alternating inference chain', 'strong link', 'weak link', 'sees'],
  'Grouped X-Chain': ['alternating inference chain', 'group node', 'strong link', 'weak link'],
  'Grouped Alternating Chain': ['alternating inference chain', 'group node', 'strong link', 'weak link'],
  'Continuous Loop': ['continuous loop', 'alternating inference chain', 'strong link', 'weak link'],
  'ALS Chain': ['alternating inference chain', 'Almost Locked Set (ALS)', 'restricted common', 'weak link'],
  'X-Cycle': ['strong link', 'conjugate pair', 'sees'],
  'Finned X-Wing': ['fin', 'sees'],
  'Finned Swordfish': ['fin', 'sees'],
  'Finned Jellyfish': ['fin', 'sees'],
  'Sashimi Fish': ['fin', 'sees', 'candidate'],
  'Franken Fish': ['base set', 'cover set', 'candidate'],
  'Mutant Fish': ['base set', 'cover set', 'candidate'],
  '3D Medusa': ['colouring', 'strong link', 'bi-value cell', 'conjugate pair'],
  'ALS-XZ': ['Almost Locked Set (ALS)', 'restricted common', 'sees'],
  'Unique Rectangle Type 1': ['deadly pattern', 'candidate'],
  'Unique Rectangle Type 2': ['deadly pattern', 'candidate', 'sees'],
  'Unique Rectangle Type 3': ['deadly pattern', 'candidate', 'unit', 'locked set'],
  'Unique Rectangle Type 4': ['deadly pattern', 'candidate', 'strong link'],
  'Unique Rectangle Type 5': ['deadly pattern', 'candidate', 'sees'],
  'Unique Rectangle Type 6': ['deadly pattern', 'candidate', 'strong link'],
  'Hidden Unique Rectangle': ['deadly pattern', 'strong link', 'conjugate pair'],
  'Avoidable Rectangle Type 1': ['deadly pattern'],
  'Avoidable Rectangle Type 2': ['deadly pattern', 'candidate', 'sees'],
  'BUG+1': ['bi-value cell', 'deadly pattern', 'bivalue universal grave'],
  'BUG+2': ['bi-value cell', 'deadly pattern', 'bivalue universal grave'],
  'BUG+3': ['bi-value cell', 'deadly pattern', 'bivalue universal grave'],
  'Unique Loop': ['deadly pattern', 'candidate', 'sees'],
  'Cell Forcing Chain': ['bi-value cell', 'contradiction'],
  'Hypothesis Mode': ['contradiction', 'bi-value cell'],
};

// ---------------------------------------------------------------------------
// Small formatting helpers
// ---------------------------------------------------------------------------
// Engine contradiction text uses R#C# and unit names; the beginner text
// uses the same short cell names, so pass it through.
const plainContradiction = (text) => text.replace(/^no cell in (\w+) (\d) can hold (\d)$/, 'no cell in $1 $2 can hold $3');

const unitIndices = (unit) =>
  unit.type === 'row' ? getRowIndices(unit.index)
  : unit.type === 'column' || unit.type === 'col' ? getColIndices(unit.index)
  : unit.type === 'box' ? getBoxIndices(unit.index)
  : [];

const r1 = (i) => getRow(i) + 1;
const c1 = (i) => getCol(i) + 1;

/** "row 5, column 1" - the long form, used once in the legend. */
export const plainCell = (i) => `row ${r1(i)}, column ${c1(i)}`;
/** "R5C1" - the notation used everywhere else; shorter and easier to scan. */
export const shortCell = (i) => `R${r1(i)}C${c1(i)}`;
/** The legend shown under beginner explanations. */
export const CELL_LEGEND = 'R5C3 means row 5, column 3.';

/** The legend, naming a cell this hint is about (falls back to the generic one). */
export const legendFor = (cellIndex) =>
  typeof cellIndex === 'number' && cellIndex >= 0 && cellIndex < 81
    ? `${cellName(cellIndex)} means row ${getRow(cellIndex) + 1}, column ${getCol(cellIndex) + 1}.`
    : CELL_LEGEND;

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

/** "1 or 2", for a list of alternatives. */
const listOr = (items) => listWords(items.map(String)).replace(/, and |\band\b/, ' or ');

/**
 * The half of the uniqueness argument that every technique in the family
 * shares, written once. The player has read it under Unique Rectangle Type
 * 1; the other types differ only in the shape of the corner that breaks it.
 */
const swapWhy = (a, b, past = false) =>
  past
    ? `Then you could swap ${a} and ${b} right round the rectangle and nothing else would change, so the puzzle would have two answers - and it has exactly one.`
    : `If all four corners were down to ${a} and ${b}, you could swap the two numbers right round the rectangle and nothing else would change: the puzzle would have two answers. It has exactly one.`;

/** Type 2 and Type 5: the same shared extra, in two or three corners. */
const uniqueRectangleExtras = (step, howMany) => {
  const [a, b] = step.pairDigits;
  const { corners, floor, roof } = step.rectangle;
  const extra = step.extraDigits[0];
  const rest =
    floor.length === 0
      ? 'every corner carries the same one extra'
      : `${shortCells(floor)} hold exactly ${a} and ${b}`;
  return {
    look: `Look at the four corners of a rectangle spread over two boxes: ${shortCells(corners)}. ${rest}, and the other ${howMany} (${shortCells(roof)}) hold those two plus ${extra}.`,
    why: `${swapWhy(a, b)} So at least one of ${shortCells(roof)} must take its extra number, and ${extra} is the only extra on offer. ${extra} is therefore true in one of them, and any cell that clashes with all of them can never be ${extra}.`,
  };
};

/** BUG+2 and BUG+3: the board-wide version, with two or three extras. */
const bugPlus = (step, howMany) => {
  const extras = step.bugExtras ?? [];
  const where = extras.map((e) => `${e.digit} in ${shortCell(e.cell)}`);
  return {
    look: `Look at the whole board: every empty cell is down to two pencil marks, apart from ${listWords(where)}.`,
    why: `Rub out those ${howMany} marks and every number would have exactly two homes in every row, column and box. A board like that can always be finished in two different ways, so a puzzle with exactly one answer never reaches it. At least one of ${listWords(where)} must therefore be true, and anything that every one of them would rule out can be erased.`,
  };
};

// ---------------------------------------------------------------------------
// Per-technique simple explanations. Each returns { look, why, extra? }.
// "look" = what to look at on the board; "why" = the reasoning in plain words.
// ---------------------------------------------------------------------------
const SIMPLE = {
  'Naked Single': (step, grid) => {
    const cell = step.placement?.cell ?? step.baseCells?.[0];
    // The strong claim ("already appears in its row, column or box") only
    // holds when the other digits were removed by placements. After any
    // elimination technique it is false, so check before saying it.
    const seen = grid ? new Set(getPeers(cell).map((i) => grid[i].value).filter((v) => v !== null)) : null;
    const allSeen = seen ? [1, 2, 3, 4, 5, 6, 7, 8, 9].every((d) => d === step.digit || seen.has(d)) : false;
    return {
      look: `Look at ${shortCell(cell)}. It has only one pencil mark left: ${step.digit}.`,
      why: allSeen
        ? `Every other number from 1 to 9 already appears somewhere in its row, its column, or its 3x3 box. ${step.digit} is the only number that still fits.`
        : `Every other number has already been ruled out for this cell, some by digits in its row, column, or box and some by earlier steps. ${step.digit} is the only number that still fits.`,
    };
  },

  'Hidden Single': (step, grid) => {
    const cell = step.placement?.cell ?? step.baseCells?.[0];
    const unitName = step.unit?.name ?? 'this row, column, or box';
    const unitCells = step.unit ? unitIndices(step.unit) : [];
    const others = grid ? unitCells.filter((i) => i !== cell && grid[i].value === null) : [];
    const allBlocked = grid && others.length > 0
      ? others.every((i) => getPeers(i).some((p) => grid[p].value === step.digit))
      : false;
    return {
      look: `Look at ${unitName}. The number ${step.digit} is still missing from it, and ${shortCell(cell)} is the only empty cell there where ${step.digit} can go.`,
      why: allBlocked
        ? `Every other empty cell in ${unitName} already has a ${step.digit} in its row, column, or box, so none of them can take it. Since ${unitName} must contain a ${step.digit} somewhere, it has to be this cell.`
        : `No other empty cell in ${unitName} still has ${step.digit} as a pencil mark; the others were ruled out by digits nearby or by earlier steps. Since ${unitName} must contain a ${step.digit} somewhere, it has to be this cell.`,
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
  'Naked Quad': (step, grid) => nakedSet(step, grid, 4),

  // One size up each time, in the same words, so the player sees the family.
  'Hidden Pair': (step) => hiddenSet(step, 2),
  'Hidden Triple': (step) => hiddenSet(step, 3),
  'Hidden Quad': (step) => hiddenSet(step, 4),

  'X-Wing': (step) => fish(step, 2),
  'Swordfish': (step) => fish(step, 3),
  // Jellyfish is the same family one size up, in the same words, because
  // the reference entry promises the player exactly that.
  'Jellyfish': (step) => fish(step, 4),

  'Empty Rectangle': (step) => emptyRectangle(step),

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

  // XYZ-Wing is XY-Wing's wording one step on: the pivot is a third place
  // the digit could go, which is why the targets must see all three cells.
  'XYZ-Wing': (step, grid) => {
    const [pivot, wing1, wing2] = step.baseCells;
    const z = step.digit;
    const pivotC = candidatesOf(grid, pivot);
    const w1 = candidatesOf(grid, wing1);
    const w2 = candidatesOf(grid, wing2);
    const pv = pivotC.length ? `${pivotC.join(' or ')}` : 'one of three numbers';
    return {
      look: `Look at three cells. The middle one is ${shortCell(pivot)} (${pv}), which has three pencil marks instead of two. It is connected to ${shortCell(wing1)} (${w1.join(' or ') || 'two numbers'}) and to ${shortCell(wing2)} (${w2.join(' or ') || 'two numbers'}). All three cells contain ${z}.`,
      why: `Whatever the middle cell turns out to be, one of these three cells ends up as ${z}: if the middle cell is not ${z} itself, it pushes one of the two outer cells to ${z}. So ${z} is guaranteed to land in one of the three, the middle cell included. Only a cell that shares a row, column, or box with all three can never be ${z}; seeing just the two outer cells is not enough.`,
    };
  },

  'WXYZ-Wing': (step, grid) => {
    const z = step.digit;
    const digits = step.subsetDigits ?? [];
    const others = digits.filter((d) => d !== z);
    const zCells = step.zCells ?? step.baseCells.filter((c) => candidatesOf(grid, c).includes(z));
    return {
      look: `Look at four cells: ${shortCells(step.baseCells)}. Between them, their only pencil marks are the four numbers ${listWords(digits)}, and the cells that could be ${z} are ${shortCells(zCells)}.`,
      why: `Each of the other three numbers (${listWords(others)}) sits only in cells that share a row, column, or box with one another, so each of those three can be used once at most across the four cells. Three numbers cannot fill four cells, so one of these cells has to be ${z}. Any cell that shares a row, column, or box with every one of ${shortCells(zCells)} can never be ${z}.`,
    };
  },

  // The chain family (#67). The four short patterns read as their own
  // lesson; the general and the richer forms share one set of words, with
  // the link-by-link walk in chainWalk() so the player steps through it
  // instead of reading a wall of text.
  'Skyscraper': (step) => twoPairFish(step),
  'Two-String Kite': (step) => twoPairFish(step),
  'W-Wing': (step) => wWing(step),
  'Remote Pairs': (step, grid) => remotePairs(step, grid),
  'X-Chain': (step) => chainPlain(step),
  'XY-Chain': (step) => chainPlain(step),
  'Alternating Chain': (step) => chainPlain(step),
  'Grouped X-Chain': (step) => chainPlain(step),
  'Grouped Alternating Chain': (step) => chainPlain(step),
  'Continuous Loop': (step) => chainPlain(step),
  'ALS Chain': (step) => chainPlain(step),

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

  // One set of words for every finned fish, so the bigger ones read as the
  // X-Wing case one and two sizes up, and the sashimi form says what is
  // different about it: the corner is empty rather than occupied.
  'Finned X-Wing': (step) => finnedFish(step, 2),
  'Finned Swordfish': (step) => finnedFish(step, 3),
  'Finned Jellyfish': (step) => finnedFish(step, 4),
  'Sashimi Fish': (step) => finnedFish(step, step.fishSize ?? 2),

  'Franken Fish': (step) => unitFish(step),
  'Mutant Fish': (step) => unitFish(step),

  '3D Medusa': (step) => medusa(step),

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

  'Unique Rectangle Type 2': (step) => uniqueRectangleExtras(step, 'two'),
  'Unique Rectangle Type 5': (step) => uniqueRectangleExtras(step, 'three'),

  'Unique Rectangle Type 3': (step) => {
    const [a, b] = step.pairDigits;
    const { corners, floor, roof } = step.rectangle;
    const extras = step.extraDigits;
    const subset = step.subsetDigits;
    const withCells = step.zCells ?? [];
    return {
      look: `Look at the four corners of a rectangle spread over two boxes: ${shortCells(corners)}. ${shortCells(floor)} hold exactly ${a} and ${b}. ${shortCells(roof)} hold those two as well, plus ${listOr(extras)}.`,
      why: `${swapWhy(a, b)} So one of ${shortCells(roof)} has to take one of its extra numbers, ${listOr(extras)}. That means those two cells behave like a single cell holding ${listWords(extras.map(String))}, sitting in ${step.unit?.name ?? 'the line they share'}. Put it beside ${shortCells(withCells)} and you have ${countWord(withCells.length + 1)} cells for the ${countWord(subset.length)} numbers ${listWords(subset.map(String))}, so those numbers are used up there and can go from the rest of ${step.unit?.name ?? 'that line'}.`,
    };
  },

  'Unique Rectangle Type 4': (step) => {
    const [a, b] = step.pairDigits;
    const { corners, floor, roof } = step.rectangle;
    const gone = step.digit;
    const locked = gone === a ? b : a;
    return {
      look: `Look at the four corners of a rectangle spread over two boxes: ${shortCells(corners)}. ${shortCells(floor)} hold exactly ${a} and ${b}; ${shortCells(roof)} hold those two plus something else. In ${step.unit?.name ?? 'the line they share'}, ${locked} has nowhere left to go but ${shortCells(roof)}.`,
      why: `One of ${shortCells(roof)} is therefore ${locked}. Suppose the other were ${gone}: then the first takes ${locked}, and the two cells holding only ${a} and ${b} are forced to the numbers left over. All four corners would be down to ${a} and ${b}. ${swapWhy(a, b, true)} So neither of ${shortCells(roof)} can be ${gone}.`,
    };
  },

  'Unique Rectangle Type 6': (step) => {
    const [a, b] = step.pairDigits;
    const { corners, floor, roof } = step.rectangle;
    const digit = step.digit;
    const other = digit === a ? b : a;
    return {
      look: `Look at the four corners of a rectangle spread over two boxes: ${shortCells(corners)}. ${shortCells(floor)} hold exactly ${a} and ${b}, and they sit across the rectangle from each other. ${shortCells(roof)} hold those two plus something else.`,
      why: `In both lines of the rectangle, ${digit} can only go in these corners, so it takes one corner in each - which means it runs along one diagonal of the rectangle or the other. If it ran along ${shortCells(roof)}, the other two corners would both be forced to ${other}, and all four corners would be down to ${a} and ${b}. ${swapWhy(a, b, true)} So ${digit} runs along the other diagonal, and it can go from ${shortCells(roof)}.`,
    };
  },

  'Hidden Unique Rectangle': (step) => {
    const [a, b] = step.pairDigits;
    const { corners, floor } = step.rectangle;
    const far = step.targetCells[0];
    const gone = step.digit;
    const linked = gone === a ? b : a;
    const beside = (step.strongLinks ?? []).map((l) => l.to.cell);
    return {
      look: `Look at the four corners of a rectangle spread over two boxes: ${shortCells(corners)}. Only ${shortCells(floor)} holds exactly ${a} and ${b}. Across the rectangle from it is ${shortCell(far)}, and in ${shortCell(far)}'s own row and column the number ${linked} can only go in these corners.`,
      why: `Suppose ${shortCell(far)} were ${gone}. Then its row and its column would both have to put their ${linked} on ${shortCells(beside)}, and ${shortCells(floor)}, which clashes with both of them, would be left with ${gone}. All four corners would be down to ${a} and ${b}. ${swapWhy(a, b, true)} So ${shortCell(far)} cannot be ${gone}.`,
    };
  },

  'Avoidable Rectangle Type 1': (step) => {
    const placed = step.placedDigits ?? [];
    const target = step.targetCells[0];
    const digit = step.digit;
    const other = placed.find((p) => p.digit !== digit)?.digit;
    return {
      look: `Look at the four corners of a rectangle spread over two boxes: ${shortCells(step.rectangle.corners)}. Three of them are already filled in - ${placed.map((pl) => `${shortCell(pl.cell)} is ${pl.digit}`).join(', ')} - and none of the four was a starting clue. ${shortCell(target)} is the empty one.`,
      why: `This is the deadly rectangle again, but over numbers already written in, so it is about avoiding the pattern rather than breaking it. If ${shortCell(target)} were ${digit}, the four corners would hold ${digit} and ${other} on their two diagonals, and you could swap them round without breaking anything - the puzzle would have had two answers all along. It has one, so ${shortCell(target)} is not ${digit}.`,
    };
  },

  'Avoidable Rectangle Type 2': (step) => {
    const placed = step.placedDigits ?? [];
    const empty = step.rectangle.roof;
    const extra = step.digit;
    const [p, q] = placed;
    return {
      look: `Look at the four corners of a rectangle spread over two boxes: ${shortCells(step.rectangle.corners)}. ${shortCell(p.cell)} is already ${p.digit} and ${shortCell(q.cell)} is already ${q.digit}, and none of the four was a starting clue. ${shortCells(empty)} are still empty, and each can only be the number sitting across from it or ${extra}.`,
      why: `This is the deadly rectangle again, but over numbers already written in, so it is about avoiding the pattern rather than breaking it. If both empty corners took the number across from them, the four would hold ${p.digit} and ${q.digit} on their two diagonals and could swap round - two answers. So ${extra} goes in ${shortCells(empty)}, in one or the other, and any cell that clashes with both of them can never be ${extra}.`,
    };
  },

  'BUG+2': (step) => bugPlus(step, 'two'),
  'BUG+3': (step) => bugPlus(step, 'three'),

  'Unique Loop': (step, grid) => {
    const [a, b] = step.pairDigits;
    const loop = step.loopCells ?? step.baseCells;
    // The ring cells with something beyond the two loop numbers: the only
    // ones that can break the alternation.
    const carriers = loop.filter((c) => candidatesOf(grid, c).length > 2);
    const extra = step.extraDigits?.[0] ?? null;
    const odd = carriers.length === 1 ? carriers[0] : step.targetCells[0];
    return {
      look: `Look at a ring of ${loop.length} cells that can all hold ${a} and ${b}: ${shortCells(loop)}. Every row, column and box the ring touches holds exactly two of them.`,
      why: extra
        ? `${a} and ${b} could alternate right round the ring in two different ways, and both would solve the puzzle, so some ring cell has to take something else. Only ${shortCells(carriers)} can: each of them carries ${extra}. So ${extra} is true in one of them, and any cell that clashes with all of them can never be ${extra}.`
        : `${a} and ${b} could alternate right round the ring in two different ways, and both would solve the puzzle. The puzzle has exactly one answer, so some ring cell must take something else - and ${shortCell(odd)} is the only one that can. So ${a} and ${b} can go from it.`,
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
      why: `Rub out the odd mark and every number would have exactly two homes in every row, column and box. A board like that can always be finished in two different ways, so a puzzle with exactly one answer never reaches it. The mark that would have to go is ${step.digit}, so ${step.digit} is the one number ${shortCell(cell)} can take.`,
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
    const chain = step.chain ?? [];
    // Forced moves: placements that followed from the assumption, not the
    // assumption itself and not case splits.
    const forced = chain.filter((s, i) => s.action === 'place' && i > 0 && !(s.reason || '').startsWith('Case analysis')).length;
    const splits = chain.filter((s) => s.action === 'place' && (s.reason || '').startsWith('Case analysis')).length;
    const notes = chain.filter((s) => s.action === 'note');
    const deadEnd = step.contradictionText
      ? plainContradiction(step.contradictionText)
      : `${bad != null ? shortCell(bad) : 'a cell'} is left with no possible number at all`;
    const outcome = step.placement
      ? `So ${shortCell(origin)} cannot be ${tried}, and its only other option, ${step.placement.digit}, must be right.`
      : `So ${shortCell(origin)} cannot be ${tried}, and that pencil mark can be erased.`;
    const path = forced > 0 ? ` through ${forced} forced move${forced === 1 ? '' : 's'}` : '';
    const splitNote = splits > 0
      ? ` Along the way the test had to try both options of ${splits === 1 ? 'a two-option cell' : `${splits} two-option cells`}; ${notes.length > 0 ? 'both options failed each time' : 'the option shown is the one that did not fail on its own'}.`
      : '';
    return {
      look: `This is a "what if" test. Suppose ${shortCell(origin)} were ${tried}.`,
      why: `Following that assumption${path} leads to a dead end: ${deadEnd}.${splitNote} An assumption that breaks the puzzle must be wrong. ${outcome}`,
    };
  },
};

function capitalize(s) {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

// ---------------------------------------------------------------------------
// Chains, in plain words.
//
// A chain's proof is a sequence, so it is told as a sequence: one sentence
// per link, which the hint card steps through. The explanation itself says
// what to look at and what the two ends prove, and never repeats the whole
// walk as one paragraph.
// ---------------------------------------------------------------------------

// A group of cells counts as one place in the chain, so it needs one name.
// "R4C2/R6C2" keeps every sentence short; the look line explains it once,
// the way the R5C3 legend explains a cell name once.
const nodePlace = (node) => node.cells.map(shortCell).join('/');
const isGroupNode = (node) => node.cells.length > 1;
/** The legend, naming a group from this hint rather than a made-up one. */
const groupLegend = (node) =>
  `Cells written ${nodePlace(node)} count as one place: ${node.digit} is somewhere in there or nowhere in it.`;

/** The one sentence a single link of a chain is worth. */
function linkSentence(from, to) {
  const unit = from.linkUnit?.name;
  const a = nodePlace(from);
  const b = nodePlace(to);

  if (from.linkToNext === 'strong') {
    if (from.linkVia === 'bivalue') {
      return `${a} has only two pencil marks left, ${from.digit} and ${to.digit}. So if it is not ${from.digit}, it is ${to.digit}.`;
    }
    if (from.linkVia === 'als' && from.linkSet) {
      const set = from.linkSet;
      return `The ${countWord(set.cells.length)} cells ${shortCells(set.cells)} hold only ${listWords(set.digits)} between them, one number more than there are cells. So if none of them is ${from.digit}, the rest are forced and one of them must be ${to.digit}.`;
    }
    if (isGroupNode(from) || isGroupNode(to)) {
      return `In ${unit ?? 'that row, column, or box'}, ${from.digit} has only two possible places left, ${a} and ${b}. So if ${from.digit} is not in ${a}, it is in ${b}.`;
    }
    return `In ${unit ?? 'that row, column, or box'}, the only two places for ${from.digit} are ${a} and ${b}. So if ${a} is not ${from.digit}, ${b} is.`;
  }

  if (from.linkVia === 'cell') {
    return `${a} holds one number only, so if it is ${from.digit} it is not ${to.digit}.`;
  }
  if (isGroupNode(from) || isGroupNode(to)) {
    return `Every cell in ${a} shares a row, column, or box with every cell in ${b}, so ${from.digit} cannot be in both places. So if ${from.digit} is in ${a}, it is not in ${b}.`;
  }
  return `${a} and ${b} ${unit ? `are both in ${unit}` : 'share a row, column, or box'}, so they cannot both be ${from.digit}. So if ${a} is ${from.digit}, ${b} is not.`;
}

/**
 * The chain as the card walks it: one entry per link, in order, each with
 * the nodes it joins and the sentence that explains it. For a continuous
 * loop the last entry closes the loop back onto the first node.
 *
 * @param {object} step a step carrying `chainNodes`
 * @returns {{ index: number, from: object, to: object, strong: boolean, text: string }[]}
 */
export function chainWalk(step) {
  const nodes = step?.chainNodes;
  if (!Array.isArray(nodes) || nodes.length < 2) return [];
  const linkCount = step.chainClosed ? nodes.length : nodes.length - 1;
  const walk = [];
  for (let i = 0; i < linkCount; i++) {
    const from = nodes[i];
    const to = nodes[(i + 1) % nodes.length];
    walk.push({
      index: i,
      from,
      to,
      strong: from.linkToNext === 'strong',
      text: linkSentence(from, to),
    });
  }
  return walk;
}

/** What the two ends of the chain prove, in plain words. */
function chainConclusion(step) {
  const nodes = step.chainNodes ?? [];
  if (step.chainClosed) {
    return 'Because the chain comes back to where it started, each link is now an exact either-or rather than a one-way push: in every dashed link, exactly one of its two sides is right. That is what lets the loop erase something at every one of them instead of only at one end.';
  }
  const first = nodes[0];
  const last = nodes[nodes.length - 1];
  if (!first || !last) return step.explanation || '';
  if (step.placement) {
    return `Say ${nodePlace(first)} is not ${first.digit}, and the chain forces it to be ${first.digit} after all. It cannot be both, so ${nodePlace(first)} is ${first.digit}.`;
  }
  if (first.digit === last.digit) {
    const targets = uniq(step.eliminations.map((e) => e.cell));
    const plural = targets.length !== 1;
    const grouped = isGroupNode(first) || isGroupNode(last);
    const either = grouped
      ? `Either ${first.digit} is in ${nodePlace(first)}, or it is in ${nodePlace(last)}.`
      : `Either ${nodePlace(first)} or ${nodePlace(last)} is ${first.digit}.`;
    const seeing = grouped ? 'every cell at both ends' : 'both of them';
    return `${either} ${shortCells(targets)} ${plural ? 'see' : 'sees'} ${seeing}, so ${plural ? 'they' : 'it'} can never be ${first.digit}.`;
  }
  return `Either way, ${nodePlace(first)} ends up as ${first.digit} or ${last.digit}, so every other pencil mark in it can go.`;
}

/** The generic chain lesson: what to look at, and what the ends prove. */
function chainPlain(step) {
  const nodes = step.chainNodes ?? [];
  const links = chainWalk(step).length;
  const digits = uniq(nodes.map((n) => n.digit)).sort((a, b) => a - b);
  const about = digits.length === 1 ? `the number ${digits[0]}` : `the numbers ${listWords(digits)}`;
  const legend =
    'A solid step means at least one of its two ends is right; a dashed step means at most one of them is.';
  const firstGroup = nodes.find(isGroupNode);
  const groups = firstGroup ? ` ${groupLegend(firstGroup)}` : '';
  const first = nodes[0];
  const last = nodes[nodes.length - 1];
  const ends =
    first && last && first.cells.length === 1 && last.cells.length === 1 && first.cells[0] === last.cells[0]
      ? `starting and ending at ${nodePlace(first)}`
      : `from ${nodePlace(first)} to ${nodePlace(last)}`;
  const look = step.chainClosed
    ? `Follow the highlighted marks round the loop: ${links} steps about ${about}, ending back where they began. ${legend}${groups}`
    : `Follow the highlighted marks in order: ${links} steps about ${about}, ${ends}. ${legend}${groups}`;
  return {
    look,
    why: chainConclusion(step),
    extra: 'Step through the chain below to watch it build, one link at a time.',
  };
}

/**
 * Skyscraper and Two-String Kite: the two four-node patterns on one digit.
 * One sentence for each pair, one for where they touch.
 */
function twoPairFish(step) {
  const nodes = step.chainNodes ?? [];
  if (nodes.length !== 4) return chainPlain(step);
  const [freeA, nearA, nearB, freeB] = nodes;
  const d = freeA.digit;
  const unitA = freeA.linkUnit?.name ?? 'its line';
  const unitB = nearB.linkUnit?.name ?? 'its line';
  const join = nearA.linkUnit?.name ?? 'the same row, column, or box';
  const targets = uniq(step.eliminations.map((e) => e.cell));
  const plural = targets.length !== 1;
  return {
    look: `Look at the number ${d}. In ${unitA} it can only go in ${shortCell(freeA.cells[0])} or ${shortCell(nearA.cells[0])}; in ${unitB} only in ${shortCell(nearB.cells[0])} or ${shortCell(freeB.cells[0])}. ${shortCell(nearA.cells[0])} and ${shortCell(nearB.cells[0])} are both in ${join}.`,
    why: `Those two cannot both be ${d}, because they share a ${join.split(' ')[0]}. ${capitalize(unitA)} and ${unitB} each need a ${d} somewhere, so at least one of the other two cells, ${shortCell(freeA.cells[0])} and ${shortCell(freeB.cells[0])}, must be ${d}. ${shortCells(targets)} ${plural ? 'see' : 'sees'} both of them, so ${plural ? 'they' : 'it'} can never be ${d}.`,
  };
}

/** W-Wing: the same bare pair twice, bridged by a conjugate pair. */
function wWing(step) {
  const nodes = step.chainNodes ?? [];
  if (nodes.length !== 6) return chainPlain(step);
  const z = nodes[0].digit;
  const x = nodes[2].digit;
  const left = shortCell(nodes[0].cells[0]);
  const right = shortCell(nodes[5].cells[0]);
  const bridgeA = shortCell(nodes[2].cells[0]);
  const bridgeB = shortCell(nodes[3].cells[0]);
  const bridgeUnit = nodes[2].linkUnit?.name ?? 'one row, column, or box';
  const targets = uniq(step.eliminations.map((e) => e.cell));
  const plural = targets.length !== 1;
  return {
    look: `Look at ${left} and ${right}. Both hold exactly the same two pencil marks, ${x} and ${z}. In ${bridgeUnit} the number ${x} can only go in ${bridgeA} or ${bridgeB}, and ${bridgeA} shares a row, column, or box with ${left} while ${bridgeB} shares one with ${right}.`,
    why: `One of ${bridgeA} and ${bridgeB} is ${x}. Whichever it is, it stops the matching cell beside it from being ${x}, and that cell has only ${x} and ${z} to choose from, so it has to be ${z}. Either way one of ${left} and ${right} is ${z}. ${shortCells(targets)} ${plural ? 'see' : 'sees'} both of them, so ${plural ? 'they' : 'it'} can never be ${z}.`,
  };
}

/** Remote Pairs: a line of cells all holding the very same two marks. */
function remotePairs(step, grid) {
  const nodes = step.chainNodes ?? [];
  if (nodes.length < 4) return chainPlain(step);
  const cells = uniq(nodes.map((n) => n.cells[0]));
  const marks = candidatesOf(grid, cells[0]);
  const pair = marks.length === 2 ? listWords([...marks].sort((a, b) => a - b)) : 'the same two numbers';
  const d = nodes[0].digit;
  const first = shortCell(cells[0]);
  const last = shortCell(cells[cells.length - 1]);
  const targets = uniq(step.eliminations.map((e) => e.cell));
  const plural = targets.length !== 1;
  return {
    look: `Look at ${countWord(cells.length)} cells that all hold exactly the same two pencil marks, ${pair}: ${shortCells(cells)}. Each one shares a row, column, or box with the next.`,
    why: `Since every one of these cells has only those two numbers to choose from, the line flips between them: whatever ${first} takes, its neighbour must take the other, and the one after that flips back. Follow it to the far end and one of ${first} and ${last} has to be ${d}. ${shortCells(targets)} ${plural ? 'see' : 'sees'} both of them, so ${plural ? 'they' : 'it'} can never be ${d}.`,
  };
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

const countWord = (n) => ['', 'one', 'two', 'three', 'four'][n] ?? String(n);

/**
 * Hidden Pair, Hidden Triple and Hidden Quad, in one set of words: the
 * reference dialog promises the player that the bigger ones are the same
 * idea one size up, so the hint has to say it the same way too.
 */
function hiddenSet(step, size) {
  const unitName = step.unit?.name ?? 'this row, column, or box';
  const digits = uniq(step.eliminations.map((e) => e.digit)).sort((a, b) => a - b);
  const subset = step.subsetDigits || step.pairDigits || [];
  const word = countWord(size);
  const subsetText = subset.length === size ? listWords(subset) : `${word} numbers`;
  const fill = size === 2 ? 'both cells' : `all ${word} cells`;
  return {
    look: `Look at ${unitName}. The numbers ${subsetText} can only go in ${word} cells there: ${shortCells(step.baseCells)}.`,
    why: `Those ${word} numbers have nowhere else to go, so between them they must fill ${fill}. That leaves no room for anything else in those cells, so their other pencil marks (${listWords(digits)}) can go.`,
  };
}

function nakedSet(step, grid, size) {
  const elims = elimSummary(step.eliminations);
  const unit = step.unit || unitForElims(step.baseCells, elims.cells);
  const digits = uniq(step.baseCells.flatMap((c) => candidatesOf(grid, c))).sort((a, b) => a - b);
  const digitText = digits.length ? listWords(digits) : elims ? listWords(elims.digits) : 'the same numbers';
  const word = countWord(size);
  return {
    look: `Look at ${word} cells in ${unit?.name ?? 'the same row, column, or box'}: ${shortCells(step.baseCells)}. Between them, their only pencil marks are ${digitText}.`,
    why: `${capitalize(word)} cells that share only ${word} numbers must use up all of those numbers between them. So ${digitText} are spoken for, and no other cell in ${unit?.name ?? 'that unit'} can hold them.`,
  };
}

/**
 * Every finned fish, at every size, in one set of words. The shape word
 * follows the size, and the sashimi case says where its corner went.
 */
function finnedFish(step, size) {
  const d = step.digit;
  const fins = step.finCells ?? [];
  const core = step.baseCells.filter((c) => !fins.includes(c));
  const rows = uniq(core.map(r1));
  const cols = uniq(core.map(c1));
  // The engine says which lines are the base (orientation); the text
  // must follow it, or every column-based instance is described wrong.
  const byRows = step.orientation ? step.orientation === 'row' : rows.length <= cols.length;
  const baseWord = byRows ? 'rows' : 'columns';
  const coverWord = byRows ? 'columns' : 'rows';
  const base = byRows ? rows : cols;
  const cover = byRows ? cols : rows;
  const shape = size === 2 ? 'a rectangle' : `a ${countWord(size)}-line pattern`;
  const spots = fins.length === 1 ? 'one extra spot' : 'a couple of extra spots';
  const emptyCorner = step.sashimi
    ? ` One corner of the pattern has no ${d} left in it at all, which is the only difference from the usual shape.`
    : '';
  return {
    look: `Look at ${baseWord} ${listWords(base)}. Almost every ${d} in those ${baseWord} sits in ${coverWord} ${listWords(cover)}, forming ${shape}, except for ${spots} at ${shortCells(fins)} (the "fin").${emptyCorner}`,
    why: `There are two cases. If the fin is not ${d}, the pattern works like a normal ${size === 2 ? 'X-Wing' : countWord(size)}-line fish and ${d} can be erased from the rest of ${coverWord} ${listWords(cover)}. If the fin is ${d}, then any cell sharing a row, column, or box with the fin can't be ${d}. The highlighted cells are ruled out in both cases, so they can never be ${d}.`,
  };
}

/** Franken and Mutant fish: the groups, and why the covering groups fill up. */
function unitFish(step) {
  const d = step.digit;
  const baseNames = (step.baseUnits ?? []).map((u) => u.name);
  const coverNames = (step.coverUnits ?? []).map((u) => u.name);
  const n = countWord(baseNames.length);
  return {
    look: `Look at ${n} groups of cells, each of which has to hold a ${d} somewhere: ${listWords(baseNames)}. No two of them share a cell. Every place a ${d} could still go in those groups lies inside ${n} other groups: ${listWords(coverNames)}.`,
    why: `The first ${n} groups need a ${d} each and share no cell, so there are ${n} different ${d}s among them. Each of the other ${n} groups can hold a ${d} once at most, and between them they cover all ${n}, so every one of those groups is spoken for by a ${d} that is already in the first ${n}. So no other cell inside ${listWords(coverNames)} can be ${d}. Nobody is expected to spot this shape by eye; finding it is the mentor's job, and the reasoning above is all of it.`,
  };
}

/** 3D Medusa: the colouring, and which of the two clashes was found. */
function medusa(step) {
  const [a, b] = step.medusaWitness ?? [];
  const rule = step.medusaRule;
  const cells = step.baseCells ?? [];
  const named = cells.length > 6
    ? `${shortCells(cells.slice(0, 6))} and ${cells.length - 6} more`
    : shortCells(cells);
  const look =
    `Follow the pencil marks in the highlighted cells (${named}). They are joined in pairs where one of the two has to be right: ` +
    'a number with only two homes left in a row, column, or box, and a cell with only two marks left. Colour the ' +
    'pairs alternately, like a checkerboard, and one whole colour is right while the other is wrong.';
  if (!a || !b) {
    return { look, why: 'One colour contradicts itself, so every pencil mark of that colour can go.' };
  }
  if (rule === 'cell') {
    return {
      look,
      why: `One colour lands twice in the same cell here: ${shortCell(a.cell)} would have to be ${a.digit} and ${b.digit} at once. A cell holds one number, so that colour cannot be the right one. Every pencil mark wearing it can go.`,
    };
  }
  const line =
    getRow(a.cell) === getRow(b.cell) ? `row ${r1(a.cell)}`
    : getCol(a.cell) === getCol(b.cell) ? `column ${c1(a.cell)}`
    : `box ${getBox(a.cell) + 1}`;
  return {
    look,
    why: `One colour lands twice in ${line} here: ${shortCell(a.cell)} and ${shortCell(b.cell)} would both be ${a.digit}. A number goes once in a row, column, or box, so that colour cannot be the right one. Every pencil mark wearing it can go.`,
  };
}

/** Empty Rectangle: the box's two crossing lines, and the pair that breaks it. */
function emptyRectangle(step) {
  const d = step.digit;
  const boxName = step.unit?.name ?? 'that box';
  const crossRow = (step.crossing?.row ?? 0) + 1;
  const crossCol = (step.crossing?.col ?? 0) + 1;
  const [near, far] = (step.strongLinks?.[0] ? [step.strongLinks[0].from.cell, step.strongLinks[0].to.cell] : []);
  const target = step.eliminations?.[0]?.cell;
  const alongRow = step.linkUnit?.type === 'row';
  const linkName = step.linkUnit?.name ?? 'a line nearby';
  const usedUp = alongRow ? `row ${crossRow}` : `column ${crossCol}`;
  const forcedOnto = alongRow ? `column ${crossCol}` : `row ${crossRow}`;
  const shared = alongRow ? 'column' : 'row';
  return {
    look: `Look at ${boxName}. Every place a ${d} can still go there sits on row ${crossRow} or on column ${crossCol}, and nowhere else in the box, so ${boxName} takes its ${d} from one of those two lines.`,
    why: `${capitalize(linkName)} has only two places left for a ${d}, ${shortCell(near)} and ${shortCell(far)}, so one of those two is it. Now suppose ${shortCell(target)} were ${d}. That uses up ${usedUp} outside ${boxName}, so ${boxName} would have to take its ${d} from ${forcedOnto}, which leaves no ${d} anywhere else along ${forcedOnto} - including ${shortCell(near)}. ${capitalize(linkName)} would then need ${shortCell(far)}, which shares a ${shared} with ${shortCell(target)}. Two ${d}s in one ${shared} is impossible, so ${shortCell(target)} cannot be ${d}.`,
  };
}

function fish(step, size) {
  const d = step.digit;
  const elims = elimSummary(step.eliminations);
  const elimRows = uniq(elims.cells.map(getRow));
  const elimCols = uniq(elims.cells.map(getCol));
  const rows = uniq(step.baseCells.map(r1)).sort((a, b) => a - b);
  const cols = uniq(step.baseCells.map(c1)).sort((a, b) => a - b);
  // The engine says which way the fish lies; never guess it from the
  // shape of the eliminations (ties made that wrong for column fish).
  const rowBased = step.orientation
    ? step.orientation === 'row'
    : elimRows.length > elimCols.length;
  const baseName = rowBased ? 'rows' : 'columns';
  const coverName = rowBased ? 'columns' : 'rows';
  const baseList = rowBased ? rows : cols;
  const coverList = rowBased ? cols : rows;
  const word = countWord(size);
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
