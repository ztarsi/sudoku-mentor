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
  'proof by cases': 'Every option a cell, a unit or a digit has is tried, and the conclusion is what all of them force. Sound whichever option turns out to be true, which is what makes it a proof rather than a trial.',
  'forcing chain': 'The consequences of one assumption, followed with naked and hidden singles until nothing more is forced.',
  'forcing net': 'A forcing proof that needs more than one assumption at a time: where the singles stall, both options of a further cell are tried and only what both of them force is kept.',
  stem: 'The cell a Death Blossom hangs on: it has an almost locked set of its own for every candidate it still holds.',
  petal: 'One of the almost locked sets hanging off a Death Blossom stem, tied to one of the stem\'s candidates by a restricted common.',
  'two-sector disjoint subsets': 'The formal name for Sue de Coq: cells in the overlap of a line and a box holding more candidates than they have cells, with the rest of the line and the rest of the box splitting the surplus.',
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
  'ALS-XY-Wing': ['Almost Locked Set (ALS)', 'restricted common', 'sees'],
  'Death Blossom': ['Almost Locked Set (ALS)', 'restricted common', 'stem', 'petal', 'sees'],
  'Sue de Coq': ['Almost Locked Set (ALS)', 'two-sector disjoint subsets', 'candidate', 'unit'],
  'Sue de Coq, extended': ['Almost Locked Set (ALS)', 'two-sector disjoint subsets', 'candidate', 'unit'],
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
  'Cell Forcing Chain': ['proof by cases', 'forcing chain', 'bi-value cell'],
  'Unit Forcing Chain': ['proof by cases', 'forcing chain', 'unit'],
  'Digit Forcing Chain': ['proof by cases', 'forcing chain', 'strong link', 'conjugate pair'],
  'Double Forcing Chain': ['proof by cases', 'forcing chain', 'contradiction'],
  'Forcing Net': ['proof by cases', 'forcing net', 'forcing chain', 'contradiction'],
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
// "3 or 9", "1, 2 or 3". The comma and the spaces round "and" go with it,
// or the line reads "3  or  9".
const listOr = (items) => listWords(items.map(String)).replace(/,? and /, ' or ');

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
        extra: 'Animate it on the board to watch the colouring spread, one link at a time.',
      };
    }
    return {
      look,
      why: `Colour the chain alternately, like a checkerboard. Exactly one colour is the real set of ${d}s; we just do not know which. A cell that shares a row, column, or box with a cell of each colour would clash with the real ${d} either way, so it can never be ${d}.`,
      extra: 'Animate it on the board to watch the colouring spread, one link at a time.',
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

  // The rest of the almost-locked-set family (#73). Every one of these
  // begins where the ALS-XZ lesson above leaves off - a group of cells one
  // number short of locked - and says what happens when there are three of
  // them, or one per mark in a cell, or one that is two numbers short.
  'ALS-XY-Wing': (step) => {
    const [a, middle, b] = step.alsSets ?? [];
    const { xDigit: x, yDigit: y, zDigit: z } = step;
    const targets = uniq(step.eliminations.map((e) => e.cell));
    const plural = targets.length !== 1;
    return {
      look: `${setLook(a, 'Group A')} ${setLook(middle, 'The middle group')} ${setLook(b, 'Group B')}`,
      why:
        `Each group has exactly one more possible number than it has cells, so each one is one number` +
        ` short of locked: rule out any one of its numbers and every cell in it is forced.` +
        ` Every ${x} in group A clashes with every ${x} in the middle group, and every ${y} in the` +
        ` middle group clashes with every ${y} in group B. Now suppose neither outer group takes ${z}.` +
        ` Then both of them lock, so group A has to use ${x} and group B has to use ${y}. The ${x} in` +
        ` group A leaves the middle group without one, so the middle group locks too and has to use` +
        ` ${y} - and group B has already taken it. They clash, so that cannot be. So ${z} ends up` +
        ` inside group A or group B. ${shortCells(targets)} ${plural ? 'clash' : 'clashes'} with every` +
        ` ${z} in both groups, so ${plural ? 'they' : 'it'} can never be ${z}.`,
      extra: 'Animate it on the board to follow it one group at a time.',
    };
  },

  'Death Blossom': (step) => {
    const stem = step.stemCell;
    const z = step.zDigit;
    const petals = step.alsSets ?? [];
    const stemDigits = petals.map((petal) => petal.stemDigit);
    const targets = uniq(step.eliminations.map((e) => e.cell));
    const plural = targets.length !== 1;
    const petalText = petals
      .map((petal) =>
        petal.cells.length === 1
          ? `the ${petal.stemDigit} goes with ${shortCell(petal.cells[0])}, which can only be ${listWords(petal.digits)}`
          : `the ${petal.stemDigit} goes with ${shortCells(petal.cells)}, which hold only ${listWords(petal.digits)} between them`
      )
      .join('; ');
    return {
      look:
        `Look at ${shortCell(stem)}, which can only be ${listOr(stemDigits)}. Each of those numbers has` +
        ` a group of its own: ${petalText}.`,
      why:
        `Every one of those groups has exactly one more possible number than it has cells, so each is` +
        ` one number short of locked: take one number away and the rest are forced. And every copy of` +
        ` a number inside the group it belongs to clashes with ${shortCell(stem)}. So whichever number` +
        ` ${shortCell(stem)} turns out to be, that number's group loses it, locks, and has to use every` +
        ` other number it holds - ${z} among them, because all ${countWord(petals.length)} groups can` +
        ` use ${z}. ${shortCell(stem)} has to be something, so ${z} always ends up inside one of the` +
        ` groups. ${shortCells(targets)} ${plural ? 'clash' : 'clashes'} with every ${z} in all of them,` +
        ` so ${plural ? 'they' : 'it'} can never be ${z}.`,
      extra: 'Animate it on the board: one case for each number the stem could be.',
    };
  },

  'Sue de Coq': (step) => sueDeCoq(step),
  'Sue de Coq, extended': (step) => sueDeCoq(step),

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

  'Cell Forcing Chain': (step) => forcingPlain(step),
  'Unit Forcing Chain': (step) => forcingPlain(step),
  'Digit Forcing Chain': (step) => forcingPlain(step),
  'Double Forcing Chain': (step) => forcingPlain(step),
  'Forcing Net': (step) => forcingPlain(step),

  'Hypothesis Mode': (step) => {
    const origin = step.baseCells?.[0];
    const tried = step.contradictoryDigit ?? step.digit;
    const bad = step.contradictionCell;
    const branch = step.forcingBranches?.[0];
    const forced = branch?.moves?.length ?? 0;
    const deadEnd = step.contradictionText
      ? plainContradiction(step.contradictionText)
      : `${bad != null ? shortCell(bad) : 'a cell'} is left with no possible number at all`;
    const outcome = step.placement
      ? `So ${shortCell(origin)} cannot be ${tried}, and its only other option, ${step.placement.digit}, must be right.`
      : `So ${shortCell(origin)} cannot be ${tried}, and that pencil mark can be erased.`;
    const path = forced > 0 ? ` through ${forced} forced move${forced === 1 ? '' : 's'}` : '';
    const netNote = branch?.net
      ? ' Along the way the test had to try both options of another cell and keep what they forced.'
      : '';
    return {
      look: `This is a "what if" test, and the only thing the mentor shows you that is not a proof. Suppose ${shortCell(origin)} were ${tried}.`,
      why: `Following that assumption${path} leads to a dead end: ${deadEnd}.${netNote} An assumption that breaks the puzzle must be wrong. ${outcome} Only this one pencil mark was tested, so nothing is claimed about the others: that is why this is labelled reasoning by trial.`,
    };
  },
};

function capitalize(s) {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

// ---------------------------------------------------------------------------
// Sets, in plain words.
//
// Every one of these starts from the ALS-XZ lesson's own sentence - a group
// of cells with one more number than it has cells is one number short of
// locked - so a player who has read that entry meets the same idea again
// rather than a new one (#73).
// ---------------------------------------------------------------------------

/** One group of a set-based step, named the way ALS-XZ names its two. */
const setLook = (set, label) => {
  if (!set) return '';
  const marks = [...set.digits].sort((a, b) => a - b);
  if (set.cells.length === 1) {
    return `${label} is the single cell ${shortCell(set.cells[0])}, which can only be ${listOr(marks)}.`;
  }
  return `${label} is the ${countWord(set.cells.length)} cells ${shortCells(set.cells)} - between them they can only use ${countWord(marks.length)} numbers: ${listWords(marks)}.`;
};

/** Sue de Coq and its extended form, in one set of words. */
function sueDeCoq(step) {
  const [overlap, line, box] = step.alsSets ?? [];
  const digits = overlap.digits;
  const short = digits.length - overlap.cells.length;
  const cells = overlap.cells.length + line.cells.length + box.cells.length;
  const lineName = step.unit?.name ?? 'the line';
  const boxName = `box ${getBox(box.cells[0]) + 1}`;
  const lineOnly = digits.filter((d) => !box.digits.includes(d));
  const boxOnly = digits.filter((d) => !line.digits.includes(d));
  const part = (set, where) =>
    set.cells.length === 1
      ? `${shortCell(set.cells[0])}, further along ${where}, can only be ${listOr(set.digits)}`
      : `${shortCells(set.cells)}, further along ${where}, can only hold ${listWords(set.digits)} between them`;
  return {
    look:
      `Look at the ${countWord(overlap.cells.length)} cells where ${lineName} crosses ${boxName}:` +
      ` ${shortCells(overlap.cells)}. Between them they can only hold ${listWords(digits)} -` +
      ` ${countWord(digits.length)} numbers for ${countWord(overlap.cells.length)} cells. So instead of being one` +
      ` number short of locked, they are ${countWord(short)} numbers short.`,
    why:
      `${capitalize(part(line, lineName))}, and ${part(box, boxName)}. Every one of those numbers is on` +
      ` the overlap's list, and the two have none in common. So all ${countWord(cells)} cells take` +
      ` different numbers: the ones in ${lineName} cannot clash, the ones in ${boxName} cannot clash,` +
      ` and the last two share no number to clash over. ${capitalize(countWord(cells))} cells and` +
      ` ${countWord(digits.length)} numbers, one each, nothing left over. That means ${listWords(lineOnly)}` +
      ` ${lineOnly.length === 1 ? 'is' : 'are'} used up inside ${lineName}, so ${lineOnly.length === 1 ? 'it goes' : 'they go'}` +
      ` from the rest of it; and ${listWords(boxOnly)} ${boxOnly.length === 1 ? 'is' : 'are'} used up` +
      ` inside ${boxName}, so ${boxOnly.length === 1 ? 'it goes' : 'they go'} from the rest of that.`,
    extra: 'Animate it on the board to see why nothing is left over.',
  };
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

/**
 * The one sentence a single link is worth.
 *
 * Most links are a chain's own strong and weak links (#67). A set-based
 * step (#73) can also carry a CASE - one of the values a stem cell may
 * take - or a COUNT, two groups that cannot take the same number, because
 * those proofs are not one line of reasoning from end to end. Each gets
 * the same one sentence, and the card labels it for what it is.
 */
function linkSentence(from, to) {
  const unit = from.linkUnit?.name;
  const a = nodePlace(from);
  const b = nodePlace(to);

  // A case: the stem of a Death Blossom takes one of its numbers, and the
  // group tied to that number loses it and locks.
  if (from.linkToNext === 'case') {
    const set = from.linkSet;
    const d = from.linkDigit;
    if (set && set.cells.length === 1) {
      return `If ${a} is ${d}, then ${shortCells(set.cells)} cannot be ${d} too. It has only ${listWords(set.digits)} left, so it has to be ${to.digit}.`;
    }
    if (set) {
      return `If ${a} is ${d}, then no cell of ${shortCells(set.cells)} can be ${d} either. Those ${countWord(set.cells.length)} cells hold only ${listWords(set.digits)} between them, one number more than there are cells, so they are one number short of locked: losing the ${d} forces the rest, and one of them must be ${to.digit}.`;
    }
    return `If ${a} is ${d}, then ${b} must be ${to.digit}.`;
  }

  // A count: two groups that cannot take the same number, which is what
  // makes a Sue de Coq's numbers come out exactly.
  if (from.linkToNext === 'count') {
    const fromDigits = from.digits ?? (from.digit === null ? [] : [from.digit]);
    const toDigits = to.digits ?? (to.digit === null ? [] : [to.digit]);
    const plural = to.cells.length > 1;
    if (from.linkVia === 'digits') {
      return `${a} can only hold ${listWords(fromDigits)} and ${b} can only hold ${listWords(toDigits)}. They have no number in common, so those cannot clash either.`;
    }
    return `${b} ${plural ? 'are' : 'is'} in ${unit ?? 'that row, column, or box'} with the overlap cells and can only hold ${listWords(toDigits)}, every one of them on the overlap's list of ${countWord(fromDigits.length)}. So ${plural ? 'they take numbers from that list, and never the same one as' : 'it takes one of that list, and never the same one as'} any overlap cell.`;
  }

  if (from.linkToNext === 'strong') {
    if (from.linkVia === 'bivalue') {
      return `${a} has only two pencil marks left, ${from.digit} and ${to.digit}. So if it is not ${from.digit}, it is ${to.digit}.`;
    }
    if (from.linkVia === 'als' && from.linkSet) {
      const set = from.linkSet;
      return `The ${countWord(set.cells.length)} cells ${shortCells(set.cells)} hold only ${listWords(set.digits)} between them, one number more than there are cells, so they are one number short of locked. If none of them is ${from.digit}, the rest are forced and one of them must be ${to.digit}.`;
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

// ---------------------------------------------------------------------------
// Colouring, in plain words (#82)
//
// A colouring step's proof is a network, so it is walked along the run of
// links the engine kept: the pair of marks that decides it, and the links
// between them. Every link in a colouring is an exactly-one-of-two, so each
// one hands the next mark the opposite colour, which is the whole idea.
// ---------------------------------------------------------------------------

/** The one sentence a single link of a colouring is worth. */
function colorLinkSentence(from, to) {
  const a = shortCell(from.cell);
  const b = shortCell(to.cell);
  if (from.linkVia === 'bivalue') {
    return `${a} has only two pencil marks left, ${from.digit} and ${to.digit}, so exactly one of the two is right. They get opposite colours.`;
  }
  const where = from.linkUnit?.name ?? 'that row, column, or box';
  return `In ${where}, the only two places for ${from.digit} are ${a} and ${b}, so exactly one of them is the ${from.digit}. They get opposite colours.`;
}

/** Which row, column or box two cells share, named for a beginner. */
const sharedLine = (a, b) =>
  getRow(a) === getRow(b) ? `row ${r1(a)}`
  : getCol(a) === getCol(b) ? `column ${c1(a)}`
  : `box ${getBox(a) + 1}`;

/**
 * The last thing the player walks to: what the two ends of the run prove.
 * For a clash it is the colour that cannot be right; for a trap it is the
 * cell that is dead whichever colour turns out to be right.
 */
function colorEnding(step) {
  const [a, b] = step.colorWitness ?? [];
  if (!a || !b) return null;
  if (step.colorRule === 'cell') {
    return {
      label: 'so that colour is out',
      text: `Back at ${shortCell(a.cell)}: its ${a.digit} and its ${b.digit} have come out the same colour. That would make one cell two numbers at once, so that colour is wrong, and every pencil mark wearing it can go.`,
    };
  }
  if (step.colorRule === 'trap') {
    const target = step.colorTarget ?? step.eliminations?.[0]?.cell;
    // One run proves one cell dead; the others go by the same rule, so say
    // so rather than leaving the player to wonder about them.
    const others = uniq((step.eliminations ?? []).map((e) => e.cell)).filter((c) => c !== target);
    const rest = others.length
      ? ` Any other cell that shares a row, column, or box with both colours goes the same way.`
      : '';
    return {
      label: 'so one cell is dead either way',
      text: `${shortCell(a.cell)} and ${shortCell(b.cell)} have come out opposite colours, so one of them is a real ${a.digit}. ${shortCell(target)} shares a row, column, or box with both, so it can never be ${a.digit}.${rest}`,
    };
  }
  return {
    label: 'so that colour is out',
    text: `${shortCell(a.cell)} and ${shortCell(b.cell)} have come out the same colour, and they are both in ${sharedLine(a.cell, b.cell)}. Two ${a.digit}s there is impossible, so that colour is wrong, and every pencil mark wearing it can go.`,
  };
}

// ---------------------------------------------------------------------------
// Forcing proofs, in plain words (#75)
//
// A forcing proof is not a line, it is a handful of lines side by side:
// every option the origin has, each followed to what it forces. So it
// walks case by case - the assumption, the moves it forces, what became of
// it - and ends on one entry for what the cases prove together. The card
// steps through that with the same controls it uses for a chain, and the
// board draws each case as its own path; there is one walker, not two.
// ---------------------------------------------------------------------------

const CASE_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];

/** What the origin of a forcing proof is, in one sentence. */
const forcingLook = (step) => {
  const origin = step.forcingOrigin;
  if (!origin) return 'Look at the highlighted cells.';
  const options = (origin.options ?? []).map((o) => o.digit);
  if (origin.kind === 'cell') {
    return `Look at ${shortCell(origin.cells[0])}. It can only be ${listOr(options)}, so one of those is the answer.`;
  }
  if (origin.kind === 'candidate') {
    return `Look at ${shortCell(origin.cells[0])} and the pencil mark ${origin.digit}.`;
  }
  const where = origin.unitName ?? 'that row, column or box';
  if (origin.kind === 'digit') {
    return `Look at the number ${origin.digit} in ${where}. It has only two places left, ${shortCells(origin.cells)}, so one of them is the ${origin.digit}.`;
  }
  return `Look at the number ${origin.digit} in ${where}. It can only go in ${shortCells(origin.cells)}, so one of them is the ${origin.digit}.`;
};

/** What a forcing proof concludes, and why that is a proof and not a guess. */
const forcingWhy = (step) => {
  const branches = step.forcingBranches ?? [];
  const conclusion = step.forcingConclusion ?? {};
  const placement = step.placement;
  const broken = branches.filter((b) => b.outcome?.kind === 'contradiction').length;
  const net = branches.some((b) => b.net);

  let body;
  if (conclusion.kind === 'refutation') {
    const what = placement
      ? `The one left standing, ${shortCell(placement.cell)} = ${placement.digit}, must be the answer.`
      : `Those options can be rubbed out; the ones that survive are still open.`;
    body =
      `Each option is followed in turn. ${broken === branches.length - 1 ? 'All of them but one' : `${broken} of them`} ` +
      `break the board - a cell with no number left, or a number with nowhere to go - so they were never possible. ${what}`;
  } else {
    const what = placement
      ? `every one of them ends with ${shortCell(placement.cell)} as ${placement.digit}`
      : 'every one of them rubs out the same pencil marks';
    const brokeNote = broken > 0
      ? ` (${broken === 1 ? 'One option' : `${broken} options`} broke the board along the way, which rules ${broken === 1 ? 'it' : 'them'} out too.)`
      : '';
    body =
      `Each option is followed as far as it forces anything, and ${what}.${brokeNote} ` +
      'You never have to decide which option is right: they agree, so the result holds either way.';
  }

  const netNote = net
    ? ` This one needed a net: where the forced moves ran out, the proof tried both options of another cell and kept only what both of them force. Animating it shows which.${
        branches.some((b) => b.limited)
          ? ' It stopped at the depth the mentor allows, so there may be more it did not reach.'
          : ''
      }`
    : '';

  return `${body} That makes it a proof, not a guess: every possibility was checked.${netNote}`;
};

/** The lesson for every forcing proof: the origin, and what the cases prove. */
function forcingPlain(step) {
  return {
    look: forcingLook(step),
    why: forcingWhy(step),
    extra: 'Animate it on the board to watch the proof, one case at a time.',
  };
}

/** What became of one case, in the words the walk ends that case with. */
const caseOutcome = (branch) => {
  const outcome = branch.outcome ?? {};
  if (outcome.kind === 'contradiction') {
    return {
      label: 'breaks the board',
      tone: 'red',
      text: `${capitalize(plainContradiction(outcome.text || 'the board breaks'))}. So this option was never possible.`,
      notation: `Contradiction: ${outcome.text || 'the grid becomes invalid'}. Branch refuted.`,
    };
  }
  if (outcome.kind === 'survives') {
    return {
      label: 'the one left',
      tone: 'emerald',
      text: 'Nothing breaks here, and every other option did. So this is the one that must be true.',
      notation: 'No contradiction; every other branch refuted.',
    };
  }
  if (outcome.kind === 'forces') {
    return {
      label: 'and so',
      tone: 'emerald',
      text: `This case ends with ${outcome.text}.`,
      notation: `Branch forces ${outcome.text}.`,
    };
  }
  return {
    label: 'and so',
    tone: 'emerald',
    text: 'This case rubs out the shared pencil marks.',
    notation: 'Branch forces the common eliminations.',
  };
};

/**
 * A forcing proof as the card walks it: every case in turn - what it
 * assumes, the moves it forces, what became of it - and one last entry for
 * what the cases prove together.
 */
function forcingWalk(step) {
  const branches = step.forcingBranches ?? [];
  if (branches.length === 0) return [];
  const walk = [];
  const push = (entry) => walk.push({ index: walk.length, from: null, to: null, strong: false, ...entry });

  branches.forEach((branch, i) => {
    const letter = CASE_LETTERS[i] ?? String(i + 1);
    const name = branches.length === 1 ? 'Suppose' : `Case ${letter}`;
    push({
      branch: i,
      assume: branch.assume,
      tone: 'blue',
      strong: true,
      label: name,
      text: `Suppose ${shortCell(branch.assume.cell)} is ${branch.assume.digit}.`,
      notation: `${name}: ${shortCell(branch.assume.cell)} = ${branch.assume.digit}`,
    });
    (branch.proof ?? []).forEach((move) => {
      push({
        branch: i,
        move,
        tone: 'slate',
        label: move.net ? 'net' : 'then',
        text: `${shortCell(move.cell)} must be ${move.digit}. ${capitalize(move.reason || '')}.`,
        notation: `=> ${shortCell(move.cell)} = ${move.digit}${move.net ? ' (net)' : ''}`,
      });
    });
    if (branch.skipped > 0) {
      push({
        branch: i,
        tone: 'slate',
        label: 'then',
        text: `${branch.skipped} more forced move${branch.skipped === 1 ? '' : 's'} follow${branch.skipped === 1 ? 's' : ''} the same way.`,
        notation: `=> ${branch.skipped} further forced placement${branch.skipped === 1 ? '' : 's'}`,
      });
    }
    push({ branch: i, ...caseOutcome(branch) });
  });

  const conclusion = step.forcingConclusion;
  if (conclusion) {
    const placement = step.placement;
    push({
      conclusion: true,
      tone: 'amber',
      label: 'proved',
      text: placement
        ? `Every case was checked, so ${shortCell(placement.cell)} is ${placement.digit}.`
        : `Every case was checked, so ${(step.eliminations ?? []).length === 1 ? 'that pencil mark' : 'those pencil marks'} can go.`,
      notation: `All branches exhausted => ${resultNotation(step)}`,
    });
  }
  return walk;
}

// ---------------------------------------------------------------------------
// The same walk in the Expert's own notation (#97)
//
// Every line of the walk carries two wordings: the plain-English one a
// beginner reads, and the standard notation an experienced solver would
// write the same link in. The animation's captions follow whichever
// explanation level the player has chosen, so both have to exist per line
// rather than per step.
// ---------------------------------------------------------------------------

/** Simple colouring's two rules, under the names the literature gives them. */
const COLOUR_RULE_NOTATION = {
  wrap: 'Colour wrap: two cells of one colour share a unit',
  trap: 'Colour trap: a candidate sees both colours',
  cell: 'Colour wrap: one cell holds two marks of one colour',
};

/** `=` for a strong link, `-` for a weak one, in the usual way. */
const LINK_GLYPH = { strong: '=', weak: '-', case: '=>', count: '!=' };

/** A node as the notation writes it: `(5)R1C3`, or `(5)R1C1/R1C2` grouped. */
const nodeNotation = (node) => {
  const digits = Array.isArray(node.digits) && node.digits.length > 0
    ? node.digits.join('')
    : node.digit == null ? '' : String(node.digit);
  return `(${digits})${nodePlace(node)}`;
};

/** What justifies a link, in standard terms. */
const linkBasis = (from) => {
  if (from.linkVia === 'bivalue') return 'bivalue cell';
  if (from.linkVia === 'cell') return 'same cell';
  if (from.linkVia === 'digits') return 'no common digit';
  if (from.linkVia === 'als' && from.linkSet) {
    return `ALS ${from.linkSet.cells.map(shortCell).join(',')} on ${[...from.linkSet.digits].sort((a, b) => a - b).join('')}`;
  }
  if (from.linkToNext === 'case' && from.linkDigit != null) return `case ${from.linkDigit}`;
  return from.linkUnit?.name ?? null;
};

/** One link, in notation: `(5)R1C1 = (5)R1C3, conjugate pair in row 1`. */
const linkNotation = (from, to, { conjugate = false } = {}) => {
  const glyph = LINK_GLYPH[from.linkToNext] ?? '-';
  const basis = linkBasis(from);
  const named = conjugate && basis && from.linkVia !== 'bivalue' ? `conjugate pair in ${basis}` : basis;
  return `${nodeNotation(from)} ${glyph} ${nodeNotation(to)}${named ? `, ${named}` : ''}`;
};

/** `R1C9 <> 5, R2C9 <> 5` or `R4C9 = 5`: what the step concludes. */
const resultNotation = (step) => {
  if (step.placement) return `${shortCell(step.placement.cell)} = ${step.placement.digit}`;
  const byDigit = new Map();
  for (const e of step.eliminations ?? []) {
    if (!byDigit.has(e.digit)) byDigit.set(e.digit, []);
    byDigit.get(e.digit).push(shortCell(e.cell));
  }
  return [...byDigit.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([digit, cells]) => `${cells.join(',')} <> ${digit}`)
    .join('; ');
};

// What each kind of link proves, in the fewest words that are still true.
// A chain's links are its strong and weak ones (#67); a set-based step may
// also take one case of several, or say that two groups cannot hold the
// same number (#73).
const LINK_LABELS = {
  strong: 'at least one',
  weak: 'at most one',
  case: 'if this, then',
  count: 'all different',
};

/**
 * The links of a step, in the order the player walks them.
 *
 * A chain's links run from each node to the next one along, and a step says
 * so by leaving `chainLinks` out (#67). A set-based step whose proof is not
 * one line from end to end - a case for each number a stem can take, or
 * three groups that cannot clash - lists its links instead, each naming the
 * two nodes it joins (#73). Either way what comes back is the same shape,
 * so there is one walk and one replay.
 *
 * @param {object} step a step carrying `chainNodes`
 * @returns {{ from: object, to: object, kind: string }[]}
 */
const linksOf = (step) => {
  const nodes = step?.chainNodes;
  if (!Array.isArray(nodes) || nodes.length < 2) return [];
  if (Array.isArray(step.chainLinks) && step.chainLinks.length > 0) {
    return step.chainLinks
      .filter((link) => nodes[link.from] && nodes[link.to])
      .map((link) => ({
        // The link's own type and reason, read through the node the
        // sentence is written from, so one linkSentence serves both shapes.
        from: {
          ...nodes[link.from],
          linkToNext: link.type,
          linkVia: link.via ?? null,
          linkUnit: link.unit ?? null,
          linkSet: link.set ?? null,
          linkDigit: link.digit ?? null,
        },
        to: nodes[link.to],
        kind: link.type,
      }));
  }
  const linkCount = step.chainClosed ? nodes.length : nodes.length - 1;
  const links = [];
  for (let i = 0; i < linkCount; i++) {
    const from = nodes[i];
    links.push({ from, to: nodes[(i + 1) % nodes.length], kind: from.linkToNext });
  }
  return links;
};

/**
 * The proof as the card walks it: one entry per link, in order, each with
 * the nodes it joins and the sentence that explains it. For a continuous
 * loop the last entry closes the loop back onto the first node. A
 * colouring step (#82) walks the run of links that decides it and ends on
 * one more entry: what the two ends of the run prove.
 *
 * A forcing proof (#75) walks the same way and comes back in the same
 * shape: `branch` says which case a line belongs to, `tone` which of the
 * walk's colours the card gives its chip, and `assume` or `move` the
 * placement that line is about, so the board can show the case so far as
 * ghost digits.
 *
 * @param {object} step a step carrying `chainNodes` or `forcingBranches`
 * @returns {{ index: number, from: object|null, to: object|null, strong: boolean,
 *             kind?: string, label: string, conclusion?: boolean, text: string,
 *             branch?: number, tone?: string,
 *             assume?: {cell:number, digit:number},
 *             move?: {cell:number, digit:number, reason?: string} }[]}
 */
export function chainWalk(step) {
  if (step?.forcingBranches) return forcingWalk(step);
  const nodes = step?.chainNodes;
  if (!Array.isArray(nodes) || nodes.length < 2) return [];
  const colouring = !!step.chainColouring;
  const walk = linksOf(step).map((link, index) => ({
    index,
    from: link.from,
    to: link.to,
    strong: link.kind === 'strong',
    kind: link.kind,
    conclusion: false,
    // A colouring's links are all exactly-one-of-two, which is stronger
    // than the "at least one" a chain's solid link promises.
    label: colouring ? 'exactly one' : LINK_LABELS[link.kind] ?? 'at most one',
    text: colouring ? colorLinkSentence(link.from, link.to) : linkSentence(link.from, link.to),
    notation: linkNotation(link.from, link.to, { conjugate: colouring }),
  }));
  const ending = colouring ? colorEnding(step) : null;
  if (ending) {
    walk.push({
      index: walk.length,
      from: nodes[nodes.length - 1],
      to: null,
      strong: false,
      kind: 'conclusion',
      conclusion: true,
      label: ending.label,
      text: ending.text,
      notation: `${COLOUR_RULE_NOTATION[step.colorRule] ?? 'Colour contradiction'} => ${resultNotation(step)}`,
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
    extra: 'Animate it on the board to watch the chain build, one link at a time.',
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

const countWord = (n) =>
  ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'][n] ?? String(n);

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
      extra: 'Animate it on the board to watch the colouring spread, one link at a time.',
    };
  }
  const line =
    getRow(a.cell) === getRow(b.cell) ? `row ${r1(a.cell)}`
    : getCol(a.cell) === getCol(b.cell) ? `column ${c1(a.cell)}`
    : `box ${getBox(a.cell) + 1}`;
  return {
    look,
    why: `One colour lands twice in ${line} here: ${shortCell(a.cell)} and ${shortCell(b.cell)} would both be ${a.digit}. A number goes once in a row, column, or box, so that colour cannot be the right one. Every pencil mark wearing it can go.`,
    extra: 'Animate it on the board to watch the colouring spread, one link at a time.',
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
