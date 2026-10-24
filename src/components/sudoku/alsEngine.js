// The rest of the almost-locked-set family (#73).
//
// ALS-XZ is already in the engine (chainEngine.jsx) and its lesson is the
// one every entry here is written on top of: a group of N cells holding
// N + 1 different pencil marks is ONE NUMBER SHORT OF LOCKED - rule out any
// one of its numbers and the rest are forced. Everything below is that one
// idea used more than twice:
//
//   ALS-XY-Wing          three groups in a row, a middle one joined to two
//                        outer ones on a different digit each
//   Death Blossom        one cell and a group per pencil mark it has, so
//                        whatever the cell takes, one group locks
//   Sue de Coq           the cells where a line crosses a box, two numbers
//                        short of locked instead of one, with the rest of
//                        the line and the rest of the box splitting what is
//                        left over between them
//   Sue de Coq, extended the same, one cell and one number further out
//
// ALS chains are not here: a chain that passes through a set is the chain
// engine's job (#67, aicEngine.js), and it already ships.
//
// The restricted-common check every one of these rests on lives in
// restrictedCommon.js, on its own and with its own tests, because that is
// where a wrong hint in this family comes from: one cell of one set that
// the other set's digit does not see is enough to erase a candidate the
// answer needs.
//
// Everything here is pure: a grid in, steps out. The wording a player reads
// is in explainStep.js and techniqueCatalog.js.
import {
  getRow,
  getCol,
  getBox,
  getRowIndices,
  getColIndices,
  getBoxIndices,
  getPeers,
  cellName,
  unitOf,
} from './gridUnits';
import {
  digitCells,
  eliminationTargets,
  findAlmostLockedSets,
} from './restrictedCommon';

/**
 * How big a set may get. Four cells and up cost more than the hint is
 * worth and read as a cloud rather than a group, which is the same bound
 * the chain engine's set nodes use.
 */
const MAX_SET_CELLS = 4;

/** A stem with five pencil marks needs five groups: not a readable lesson. */
const MAX_PETALS = 4;

// ---------------------------------------------------------------------------
// Small shared helpers
// ---------------------------------------------------------------------------

/** Who sees whom, as flags: these run inside the hot loops below. */
const SEES = Array.from({ length: 81 }, (_, i) => {
  const flags = new Uint8Array(81);
  for (const peer of getPeers(i)) flags[peer] = 1;
  return flags;
});

/** The row, column or box every one of `cells` shares, in step shape. */
const sharedUnit = (cells) => {
  if (cells.length < 1) return null;
  if (cells.every((c) => getRow(c) === getRow(cells[0]))) return unitOf('row', getRow(cells[0]));
  if (cells.every((c) => getCol(c) === getCol(cells[0]))) return unitOf('column', getCol(cells[0]));
  if (cells.every((c) => getBox(c) === getBox(cells[0]))) return unitOf('box', getBox(cells[0]));
  return null;
};

const disjoint = (a, b) => !a.some((cell) => b.includes(cell));

const sortedCells = (cells) => [...cells].sort((a, b) => a - b);

const setKey = (cells) => sortedCells(cells).join(',');

/** `{R1C1, R1C2}` - how the engine's own text names a group of cells. */
const cellsText = (cells) => `{${sortedCells(cells).map(cellName).join(', ')}}`;

const digitsText = (digits) => `{${[...digits].sort((a, b) => a - b).join(', ')}}`;

const candidatesOf = (grid, cell) => (grid[cell].value === null ? grid[cell].candidates : []);

/** The digits a group of cells offers between them, sorted. */
const digitsOver = (grid, cells) => {
  const digits = new Set();
  for (const cell of cells) for (const d of candidatesOf(grid, cell)) digits.add(d);
  return [...digits].sort((a, b) => a - b);
};

/** Every subset of `items` of exactly `size`, in index order. */
const subsetsOfSize = (items, size) => {
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
  if (size >= 0 && size <= items.length) pick(0, []);
  return out;
};

/**
 * One node of a set-based step's walk, in the shape the chain replay reads
 * (stepShape.js). `digits` is for a node about several numbers at once - a
 * stem cell, or one region of a Sue de Coq - where `digit` is null.
 */
const node = ({ cells, digit = null, digits = null, label = null, endpoint = false, truth = null }) => ({
  cells: sortedCells(cells),
  cell: sortedCells(cells)[0],
  digit,
  digits: digits ? [...digits] : null,
  kind: cells.length > 1 ? 'group' : 'cell',
  label,
  truth,
  endpoint,
  // The links of a set-based step are listed on the step itself, because
  // they do not always run from one node to the next one along.
  linkToNext: null,
  linkVia: null,
  linkUnit: null,
  linkSet: null,
});

/** One elimination list from a cell list and a digit. */
const elimsOf = (cells, digit) => cells.map((cell) => ({ cell, digit }));

// ---------------------------------------------------------------------------
// The sets on a board, with what every technique here needs to know about
// them, worked out once.
// ---------------------------------------------------------------------------

/**
 * Every almost locked set of one to three cells, each carrying the cells
 * that offer each of its digits and, per digit, the flags of every cell
 * that sees ALL of those - which is what makes a restricted-common check a
 * handful of lookups instead of a loop over two sets.
 */
const buildSets = (grid) => {
  const sets = findAlmostLockedSets(grid, { minCells: 1, maxCells: MAX_SET_CELLS });
  return sets.map((set, index) => {
    /** @type {Map<number, number[]>} */
    const cellsPerDigit = new Map();
    /** @type {Map<number, Uint8Array>} */
    const seenPerDigit = new Map();
    /** @type {Map<number, number[]>} */
    const seeingAllPerDigit = new Map();
    for (const digit of set.digits) {
      const cells = digitCells(grid, set.cells, digit);
      cellsPerDigit.set(digit, cells);
      const flags = new Uint8Array(81);
      const seeingAll = [];
      for (let target = 0; target < 81; target++) {
        if (!cells.every((c) => c !== target && SEES[target][c] === 1)) continue;
        flags[target] = 1;
        // The cells this set could ever erase the digit from, were it known
        // to hold it: the starting point of every elimination below, and
        // small, which is what keeps the search over pairs of sets cheap.
        if (grid[target].value === null && grid[target].candidates.includes(digit)) {
          seeingAll.push(target);
        }
      }
      seenPerDigit.set(digit, flags);
      seeingAllPerDigit.set(digit, seeingAll);
    }
    return { ...set, index, cellsPerDigit, seenPerDigit, seeingAllPerDigit };
  });
};

// Four detectors ask the same board for the same sets, one after another on
// the ladder, and the Techniques panel asks every one of them for a count.
// So the sets are worked out once per board and kept until the board
// changes. Keyed by the grid object, which the app replaces on every
// change, so a stale answer is impossible - the same arrangement the chain
// engine uses for its graph.
const cache = new WeakMap();

const setsOf = (grid) => {
  let held = cache.get(grid);
  if (!held) {
    const sets = buildSets(grid);
    const byDigit = Array.from({ length: 10 }, () => []);
    for (const set of sets) for (const digit of set.digits) byDigit[digit].push(set);
    held = { sets, byDigit, partners: new Map() };
    cache.set(grid, held);
  }
  return held;
};

/**
 * True when `digit` is a restricted common of two prepared sets: both offer
 * it, they share no cell, and every copy in one sees every copy in the
 * other. Read off the flags above, which is the same test
 * `isRestrictedCommon` makes and the reason it is one function.
 */
const restricted = (a, b, digit) => {
  const aCells = a.cellsPerDigit.get(digit);
  const bCells = b.cellsPerDigit.get(digit);
  if (!aCells?.length || !bCells?.length) return false;
  const seenByA = a.seenPerDigit.get(digit);
  return bCells.every((cell) => seenByA[cell] === 1);
};

// ---------------------------------------------------------------------------
// ALS-XY-Wing
// ---------------------------------------------------------------------------

/**
 * Three sets in a row: a middle set joined to each of two outer sets on a
 * different digit.
 *
 * Why it works. Say Z is in neither outer set. Then each outer set is a
 * number short and loses one, so both lock: the first must then hold X, the
 * second must hold Y. X in the first outer set pushes X out of the middle
 * set, because every X in the two sees every X in the other, so the middle
 * set locks too and must hold Y. But the second outer set already holds the
 * Y, and every Y in the two sees every Y in the other. They cannot both.
 * So Z is in one of the two outer sets, and any cell seeing every Z in both
 * can never be Z.
 *
 * Read as a chain it is `(z)A = (x)A - (x)C = (y)C - (y)B = (z)B`, which is
 * exactly how the card walks it.
 */
export const findALSXYWing = (grid, focusedDigit = null, returnAll = false) => {
  const { byDigit, partners } = setsOf(grid);

  // Who is restricted-common with whom, on which digit. Worked out the
  // first time it is asked for and kept with the board, because the three
  // other detectors here and the Techniques panel ask again.
  const partnersOn = (set, digit) => {
    const key = `${set.index}:${digit}`;
    let list = partners.get(key);
    if (!list) {
      list = [];
      // Only the sets that offer the digit at all can be joined on it.
      for (const other of byDigit[digit]) {
        if (other.index === set.index) continue;
        if (restricted(set, other, digit)) list.push(other);
      }
      partners.set(key, list);
    }
    return list;
  };

  /**
   * A middle set for two outer sets, with the two digits joining it to
   * them. The smallest one, so the lesson is the shortest proof of the
   * elimination rather than whichever turned up first.
   */
  const middleFor = (a, b, z) => {
    /** @type {{ a: any, b: any, middle: any, x: number, y: number } | null} */
    let best = null;
    const consider = (outerA, outerB) => {
      for (const x of outerA.digits) {
        if (x === z) continue;
        for (const middle of partnersOn(outerA, x)) {
          // Nothing beats a single cell in the middle, so once one is found
          // the rest of the search would only find a longer way to say it.
          if (best && best.middle.cells.length === 1) return;
          if (middle.cells.length >= (best?.middle.cells.length ?? Infinity)) continue;
          if (!disjoint(middle.cells, outerA.cells) || !disjoint(middle.cells, outerB.cells)) continue;
          if (middle.cells.length === 1 && outerA.cells.length === 1 && outerB.cells.length === 1) {
            // A pivot and two wings, all bi-value: an XY-Wing, which the
            // player meets far earlier under that name.
            continue;
          }
          for (const y of middle.digits) {
            if (y === x || y === z) continue;
            if (!restricted(outerB, middle, y)) continue;
            best = { a: outerA, b: outerB, middle, x, y };
            break;
          }
        }
      }
    };
    consider(a, b);
    if (!best || best.middle.cells.length > 1) consider(b, a);
    return best;
  };

  // One entry per conclusion. The same elimination can be proved by many
  // triples of sets on a busy board - hundreds of them - and they are all
  // the same lesson, so the simplest proof is the one kept.
  /** @type {Map<string, any>} */
  const byResult = new Map();

  for (let z = 1; z <= 9; z++) {
    if (focusedDigit && z !== focusedDigit) continue;
    const holders = byDigit[z];
    for (let i = 0; i < holders.length; i++) {
      const a = holders[i];
      const reach = a.seeingAllPerDigit.get(z);
      if (!reach.length) continue;
      for (let j = i + 1; j < holders.length; j++) {
        const b = holders[j];
        if (!disjoint(a.cells, b.cells)) continue;
        // Cheap first: unless some cell sees every z in both sets there is
        // nothing to erase, whatever middle set might join them.
        const seenByB = b.seenPerDigit.get(z);
        if (!reach.some((cell) => seenByB[cell] === 1)) continue;
        const targets = eliminationTargets(grid, [a.cells, b.cells], z);
        if (targets.length === 0) continue;

        const key = `${z}:${targets.join(',')}`;
        const held = byResult.get(key);
        // The smallest a pattern on these two sets could possibly be. When
        // the conclusion is already proved by something that small, there
        // is no point looking for a middle set at all.
        const floor = a.cells.length + b.cells.length + 1;
        if (held && held.size <= floor) continue;
        const witness = middleFor(a, b, z);
        if (!witness) continue;
        const size = floor - 1 + witness.middle.cells.length;
        if (held && held.size <= size) continue;
        byResult.set(key, { size, step: alsXYWingStep(grid, { ...witness, z, targets }) });
      }
    }
  }

  const found = [...byResult.values()]
    .sort((p, q) => p.size - q.size || p.step.baseCells[0] - q.step.baseCells[0])
    .map((entry) => entry.step);
  if (returnAll) return found;
  return found.length > 0 ? found[0] : null;
};

/** The step an ALS-XY-Wing proves, with the walk the card steps through. */
const alsXYWingStep = (grid, { a, b, middle, x, y, z, targets }) => {
  const zA = a.cellsPerDigit.get(z);
  const xA = a.cellsPerDigit.get(x);
  const xC = middle.cellsPerDigit.get(x);
  const yC = middle.cellsPerDigit.get(y);
  const yB = b.cellsPerDigit.get(y);
  const zB = b.cellsPerDigit.get(z);

  const nodes = [
    node({ cells: zA, digit: z, endpoint: true, truth: false }),
    node({ cells: xA, digit: x, truth: true }),
    node({ cells: xC, digit: x, truth: false }),
    node({ cells: yC, digit: y, truth: true }),
    node({ cells: yB, digit: y, truth: false }),
    node({ cells: zB, digit: z, endpoint: true, truth: true }),
  ];

  // A one-cell set is a bi-value cell, and "it has only two marks left, so
  // if it is not this it is that" is plainer than calling it a set.
  const lockLink = (from, to, set) => ({
    from,
    to,
    type: 'strong',
    via: set.cells.length === 1 ? 'bivalue' : 'als',
    unit: set.cells.length === 1 ? null : { ...set.unit },
    set: set.cells.length === 1 ? null : { cells: sortedCells(set.cells), digits: [...set.digits] },
  });
  const clashLink = (from, to, cells) => ({
    from,
    to,
    type: 'weak',
    via: 'unit',
    unit: sharedUnit(cells),
    set: null,
  });

  const links = [
    lockLink(0, 1, a),
    clashLink(1, 2, [...xA, ...xC]),
    lockLink(2, 3, middle),
    clashLink(3, 4, [...yC, ...yB]),
    lockLink(4, 5, b),
  ];

  const sets = [a, middle, b]
    .filter((set) => set.cells.length > 1)
    .map((set) => ({ cells: sortedCells(set.cells), digits: [...set.digits] }));

  return {
    technique: 'ALS-XY-Wing',
    digit: z,
    baseCells: sortedCells([...a.cells, ...middle.cells, ...b.cells]),
    targetCells: targets,
    eliminations: elimsOf(targets, z),
    subsetDigits: [x, y, z].sort((p, q) => p - q),
    alsSets: [
      { cells: sortedCells(a.cells), digits: [...a.digits], role: 'outer' },
      { cells: sortedCells(middle.cells), digits: [...middle.digits], role: 'middle' },
      { cells: sortedCells(b.cells), digits: [...b.digits], role: 'outer' },
    ],
    xDigit: x,
    yDigit: y,
    zDigit: z,
    chainNodes: nodes,
    chainLinks: links,
    chainClosed: false,
    chainSets: sets.length > 0 ? sets : undefined,
    chainNotation: `(${z})${zA.map(cellName).join('/')} = (${x})${xA.map(cellName).join('/')}` +
      ` - (${x})${xC.map(cellName).join('/')} = (${y})${yC.map(cellName).join('/')}` +
      ` - (${y})${yB.map(cellName).join('/')} = (${z})${zB.map(cellName).join('/')}` +
      ` => ${targets.map(cellName).join(',')} <> ${z}`,
    explanation:
      `ALS-XY-Wing on ${x} and ${y}, eliminating ${z}. ALS A = ${cellsText(a.cells)} in ${a.unit.name}` +
      ` with ${digitsText(a.digits)}; ALS C = ${cellsText(middle.cells)} in ${middle.unit.name}` +
      ` with ${digitsText(middle.digits)}; ALS B = ${cellsText(b.cells)} in ${b.unit.name}` +
      ` with ${digitsText(b.digits)}. ${x} is a restricted common of A and C, ${y} of C and B.` +
      ` Without ${z}, A and B both lock, forcing ${x} into A and ${y} into B; ${x} in A empties ${x}` +
      ` from C, which locks C onto ${y} and clashes with ${y} in B. So ${z} lies in A or B, and every` +
      ` cell seeing all of its candidates in both sets drops it.`,
  };
};

// ---------------------------------------------------------------------------
// Death Blossom
// ---------------------------------------------------------------------------

/**
 * A stem cell with a set for every pencil mark it has left, each set joined
 * to the stem on that mark.
 *
 * Why it works. The stem takes one of its numbers, say D. Every copy of D
 * inside the set tied to D sees the stem, so that set loses D, is a number
 * short, and locks: it must then hold every other number it offers, Z among
 * them. The stem has to take something, so some set locks and holds Z
 * whichever way it falls. Z therefore lands in one of the sets, and a cell
 * seeing every Z in all of them can never be Z.
 *
 * Z may not be one of the stem's own numbers: the stem taking Z would lock
 * the set tied to Z onto a digit it has just lost, which is a different and
 * weaker argument than the one the card explains.
 */
export const findDeathBlossom = (grid, focusedDigit = null, returnAll = false) => {
  const { sets } = setsOf(grid);
  const found = [];

  // Which sets could be a petal for which cell on which digit: the digit is
  // restricted-common between that single cell and the set.
  /** @type {Map<string, any[]>} */
  const petals = new Map();
  for (const set of sets) {
    for (const digit of set.digits) {
      const seen = set.seenPerDigit.get(digit);
      for (let stem = 0; stem < 81; stem++) {
        if (seen[stem] !== 1) continue;
        if (grid[stem].value !== null || !grid[stem].candidates.includes(digit)) continue;
        const key = `${stem}:${digit}`;
        if (!petals.has(key)) petals.set(key, []);
        petals.get(key).push(set);
      }
    }
  }

  for (let stem = 0; stem < 81; stem++) {
    if (grid[stem].value !== null) continue;
    const stemDigits = [...grid[stem].candidates].sort((p, q) => p - q);
    // Two petals is an ALS-XY-Wing with a bi-value cell in the middle, and
    // that is the plainer lesson, so it keeps the earlier name.
    if (stemDigits.length < 3 || stemDigits.length > MAX_PETALS) continue;
    const lists = stemDigits.map((d) => petals.get(`${stem}:${d}`) || []);
    if (lists.some((list) => list.length === 0)) continue;

    const commonDigits = new Set();
    for (const d of lists[0].flatMap((set) => set.digits)) {
      if (stemDigits.includes(d)) continue;
      if (lists.every((list) => list.some((set) => set.digits.includes(d)))) commonDigits.add(d);
    }

    for (const z of [...commonDigits].sort((p, q) => p - q)) {
      if (focusedDigit && z !== focusedDigit) continue;
      const chosen = chooseDisjointPetals(
        lists.map((list) => list.filter((set) => set.digits.includes(z) && !set.cells.includes(stem))),
        stem
      );
      if (!chosen) continue;
      const targets = eliminationTargets(grid, chosen.map((set) => set.cells), z);
      if (targets.length === 0) continue;
      const step = deathBlossomStep(grid, { stem, stemDigits, petals: chosen, z, targets });
      if (!returnAll) return step;
      found.push(step);
    }
  }

  return returnAll ? found : null;
};

/**
 * One petal per stem digit, no two sharing a cell and none holding the stem.
 * The first selection in index order, so the same board always yields the
 * same lesson; the sets a player can see smallest-first.
 */
const chooseDisjointPetals = (lists, stem) => {
  if (lists.some((list) => list.length === 0)) return null;
  const ordered = lists.map((list) =>
    [...list].sort((a, b) => a.cells.length - b.cells.length || a.cells[0] - b.cells[0])
  );
  const chosen = [];
  const used = new Set([stem]);
  const pick = (depth) => {
    if (depth === ordered.length) return true;
    for (const set of ordered[depth]) {
      if (set.cells.some((cell) => used.has(cell))) continue;
      chosen.push(set);
      for (const cell of set.cells) used.add(cell);
      if (pick(depth + 1)) return true;
      chosen.pop();
      for (const cell of set.cells) used.delete(cell);
    }
    return false;
  };
  return pick(0) ? [...chosen] : null;
};

/** The step a Death Blossom proves, as a case per petal. */
const deathBlossomStep = (grid, { stem, stemDigits, petals, z, targets }) => {
  const digits = [...stemDigits];
  const nodes = [
    node({ cells: [stem], digits, label: 'stem' }),
    ...petals.map((set) => node({ cells: set.cellsPerDigit.get(z), digit: z, endpoint: true, truth: true })),
  ];
  // Every link starts at the stem: this is a case for each of its numbers,
  // not a line of reasoning that runs through all of them.
  const links = petals.map((set, i) => ({
    from: 0,
    to: i + 1,
    type: 'case',
    via: 'stem',
    digit: digits[i],
    unit: { ...set.unit },
    set: { cells: sortedCells(set.cells), digits: [...set.digits] },
  }));

  return {
    technique: 'Death Blossom',
    digit: z,
    baseCells: sortedCells([stem, ...petals.flatMap((set) => set.cells)]),
    targetCells: targets,
    eliminations: elimsOf(targets, z),
    subsetDigits: [...new Set([...digits, z])].sort((p, q) => p - q),
    stemCell: stem,
    zDigit: z,
    alsSets: petals.map((set, i) => ({
      cells: sortedCells(set.cells),
      digits: [...set.digits],
      role: 'petal',
      stemDigit: digits[i],
    })),
    chainNodes: nodes,
    chainLinks: links,
    chainClosed: false,
    chainSets: petals.map((set) => ({ cells: sortedCells(set.cells), digits: [...set.digits] })),
    chainNotation:
      digits
        .map((d, i) => `(${d})${cellName(stem)} - (${d})${petals[i].cellsPerDigit.get(d).map(cellName).join('/')}` +
          ` => (${z})${petals[i].cellsPerDigit.get(z).map(cellName).join('/')}`)
        .join('; ') + ` => ${targets.map(cellName).join(',')} <> ${z}`,
    explanation:
      `Death Blossom on stem ${cellName(stem)} ${digitsText(digits)}, eliminating ${z}. ` +
      petals
        .map((set, i) => `${digits[i]} petal = ${cellsText(set.cells)} in ${set.unit.name} with ${digitsText(set.digits)}`)
        .join('; ') +
      `. Each petal's stem digit is a restricted common with the stem, so whichever value the stem` +
      ` takes, that petal loses the digit, locks, and must hold ${z}. ${z} therefore lies in one of` +
      ` the petals, and every cell seeing all of its candidates in all of them drops it.`,
  };
};

// ---------------------------------------------------------------------------
// Sue de Coq
// ---------------------------------------------------------------------------

/** Every place a box overlaps a row or a column, with both units named. */
const INTERSECTIONS = (() => {
  const out = [];
  for (let box = 0; box < 9; box++) {
    const cells = getBoxIndices(box);
    for (const row of [...new Set(cells.map(getRow))]) {
      out.push({
        box,
        line: unitOf('row', row),
        boxUnit: unitOf('box', box),
        inter: cells.filter((i) => getRow(i) === row),
        lineRest: getRowIndices(row).filter((i) => getBox(i) !== box),
        boxRest: cells.filter((i) => getRow(i) !== row),
      });
    }
    for (const col of [...new Set(cells.map(getCol))]) {
      out.push({
        box,
        line: unitOf('column', col),
        boxUnit: unitOf('box', box),
        inter: cells.filter((i) => getCol(i) === col),
        lineRest: getColIndices(col).filter((i) => getBox(i) !== box),
        boxRest: cells.filter((i) => getCol(i) !== col),
      });
    }
  }
  return out;
})();

/**
 * The cells where a line crosses a box, holding two (or three) more numbers
 * than they have cells, with the rest of the line and the rest of the box
 * splitting the leftovers between them.
 *
 * Why it works. Call the overlap cells C and their numbers D, with
 * |D| = |C| + k. Take k cells from the rest of the line and the rest of the
 * box - A inside the line, Q inside the box, at least one each - whose
 * pencil marks all come from D and which share no mark between them. Now
 * every one of those |C| + k cells takes a different number: the ones in
 * the line see each other, the ones in the box see each other, and A and Q
 * have no number in common. |C| + k cells, |D| = |C| + k numbers, so they
 * use every number of D exactly once.
 *
 * So the line holds every number of D except the ones Q took, and the box
 * holds every number of D except the ones A took. Each of those goes from
 * the rest of its unit.
 *
 * @param {number} extra how many numbers past locked the overlap is: 2 is
 *   the plain form, 3 the extended one the spec calls the common case.
 */
const findSueDeCoqOf = (grid, focusedDigit, returnAll, extra, technique) => {
  const found = [];
  const seen = new Set();

  // A cell with one mark left is a Naked Single, which the player meets
  // first; keeping them out keeps this lesson about the split.
  const usable = (cell) => grid[cell].value === null && grid[cell].candidates.length >= 2;

  for (const place of INTERSECTIONS) {
    const inter = place.inter.filter(usable);
    if (inter.length < 2) continue;
    const lineRest = place.lineRest.filter(usable);
    const boxRest = place.boxRest.filter(usable);
    if (lineRest.length === 0 || boxRest.length === 0) continue;

    for (let size = 2; size <= inter.length; size++) {
      for (const overlap of subsetsOfSize(inter, size)) {
        const digits = digitsOver(grid, overlap);
        if (digits.length !== overlap.length + extra) continue;
        const fits = (cell) => candidatesOf(grid, cell).every((d) => digits.includes(d));
        const lineCandidates = lineRest.filter(fits);
        const boxCandidates = boxRest.filter(fits);
        if (lineCandidates.length === 0 || boxCandidates.length === 0) continue;

        for (let lineSize = 1; lineSize <= extra - 1; lineSize++) {
          for (const lineCells of subsetsOfSize(lineCandidates, lineSize)) {
            const lineDigits = digitsOver(grid, lineCells);
            for (const boxCells of subsetsOfSize(boxCandidates, extra - lineSize)) {
              const boxDigits = digitsOver(grid, boxCells);
              if (boxDigits.some((d) => lineDigits.includes(d))) continue;

              const eliminations = sueDeCoqEliminations(grid, {
                place,
                overlap,
                digits,
                lineCells,
                lineDigits,
                boxCells,
                boxDigits,
              });
              const wanted = focusedDigit
                ? eliminations.filter((e) => e.digit === focusedDigit)
                : eliminations;
              if (wanted.length === 0) continue;

              const key = [setKey(overlap), setKey(lineCells), setKey(boxCells)].join('|');
              if (seen.has(key)) continue;
              seen.add(key);
              const step = sueDeCoqStep(technique, {
                place,
                overlap,
                digits,
                lineCells,
                lineDigits,
                boxCells,
                boxDigits,
                eliminations,
              });
              if (!returnAll) return step;
              found.push(step);
            }
          }
        }
      }
    }
  }

  return returnAll ? found : null;
};

/**
 * What the split erases. In the line, every number of D the box part did
 * not take is already used inside the overlap and the line part, so it goes
 * from the rest of the line; in the box, every number the line part did not
 * take goes from the rest of the box. A cell of the overlap that was left
 * out of the pattern sits in both, and loses every number of D.
 */
const sueDeCoqEliminations = (grid, { place, overlap, digits, lineCells, lineDigits, boxCells, boxDigits }) => {
  const out = [];
  const add = (cells, wanted, skip) => {
    for (const cell of cells) {
      if (skip.includes(cell)) continue;
      if (grid[cell].value !== null) continue;
      for (const digit of wanted) {
        if (grid[cell].candidates.includes(digit)) out.push({ cell, digit });
      }
    }
  };
  const lineAll = [...place.inter, ...place.lineRest];
  const boxAll = [...place.inter, ...place.boxRest];
  add(lineAll, digits.filter((d) => !boxDigits.includes(d)), [...overlap, ...lineCells]);
  add(boxAll, digits.filter((d) => !lineDigits.includes(d)), [...overlap, ...boxCells]);
  // An unused overlap cell is reached from both sides; one copy is enough.
  const seen = new Set();
  return out
    .filter((e) => {
      const key = `${e.cell}:${e.digit}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => a.cell - b.cell || a.digit - b.digit);
};

/** The step a Sue de Coq proves, as the three regions and how they hold. */
const sueDeCoqStep = (technique, {
  place, overlap, digits, lineCells, lineDigits, boxCells, boxDigits, eliminations,
}) => {
  const nodes = [
    node({ cells: overlap, digits, label: 'overlap' }),
    node({ cells: lineCells, digits: lineDigits, label: place.line.name }),
    node({ cells: boxCells, digits: boxDigits, label: place.boxUnit.name }),
  ];
  // Not a chain: three regions that cannot clash, which is what makes the
  // count come out exactly. The card labels these links "all different".
  const links = [
    { from: 0, to: 1, type: 'count', via: 'line', unit: { ...place.line }, set: null },
    { from: 0, to: 2, type: 'count', via: 'box', unit: { ...place.boxUnit }, set: null },
    { from: 1, to: 2, type: 'count', via: 'digits', unit: null, set: null },
  ];

  const lineOnly = digits.filter((d) => !boxDigits.includes(d));
  const boxOnly = digits.filter((d) => !lineDigits.includes(d));

  return {
    technique,
    digit: null,
    baseCells: sortedCells([...overlap, ...lineCells, ...boxCells]),
    targetCells: [...new Set(eliminations.map((e) => e.cell))].sort((a, b) => a - b),
    eliminations,
    subsetDigits: [...digits],
    unit: { ...place.line },
    alsSets: [
      { cells: sortedCells(overlap), digits: [...digits], role: 'overlap' },
      { cells: sortedCells(lineCells), digits: [...lineDigits], role: 'line' },
      { cells: sortedCells(boxCells), digits: [...boxDigits], role: 'box' },
    ],
    chainNodes: nodes,
    chainLinks: links,
    chainClosed: false,
    chainSets: [
      { cells: sortedCells(overlap), digits: [...digits], label: 'overlap' },
      { cells: sortedCells(lineCells), digits: [...lineDigits], label: place.line.name },
      { cells: sortedCells(boxCells), digits: [...boxDigits], label: place.boxUnit.name },
    ],
    chainNotation:
      `${cellsText(overlap)}${digitsText(digits)} = ${cellsText(lineCells)}${digitsText(lineDigits)}` +
      ` + ${cellsText(boxCells)}${digitsText(boxDigits)}`,
    explanation:
      `${technique} on ${place.line.name} and ${place.boxUnit.name}. The overlap cells ${cellsText(overlap)}` +
      ` hold ${digitsText(digits)}: ${digits.length} candidates over ${overlap.length} cells.` +
      ` ${cellsText(lineCells)} in ${place.line.name} holds ${digitsText(lineDigits)} and` +
      ` ${cellsText(boxCells)} in ${place.boxUnit.name} holds ${digitsText(boxDigits)}, both subsets of the` +
      ` overlap's candidates and sharing none. Those ${overlap.length + lineCells.length + boxCells.length}` +
      ` cells therefore take all ${digits.length} candidates, one each: ${digitsText(lineOnly)} is used up` +
      ` inside ${place.line.name} and ${digitsText(boxOnly)} inside ${place.boxUnit.name}, so each goes from` +
      ` the rest of its unit.`,
  };
};

/** The plain form: the overlap is two numbers short of locked. */
export const findSueDeCoq = (grid, focusedDigit = null, returnAll = false) =>
  findSueDeCoqOf(grid, focusedDigit, returnAll, 2, 'Sue de Coq');

/** The extended form: one number and one cell further out. */
export const findSueDeCoqExtended = (grid, focusedDigit = null, returnAll = false) =>
  findSueDeCoqOf(grid, focusedDigit, returnAll, 3, 'Sue de Coq, extended');

/** One finder per name, for the ladder and the Techniques panel. */
export const ALS_FINDERS = {
  'ALS-XY-Wing': findALSXYWing,
  'Death Blossom': findDeathBlossom,
  'Sue de Coq': findSueDeCoq,
  'Sue de Coq, extended': findSueDeCoqExtended,
};

export const ALS_TECHNIQUE_NAMES = Object.keys(ALS_FINDERS);
