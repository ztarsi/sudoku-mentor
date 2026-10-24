// The uniqueness family: every technique that works because the puzzle has
// exactly one answer.
//
// One argument proves all of them, and it is worth writing down once.
//
//   Take four cells at the corners of a rectangle, lying in two rows, two
//   columns and exactly two boxes, all four empty, all four able to hold
//   two particular digits a and b. If the true answer gave all four corners
//   values from {a, b}, then swapping a and b around the rectangle would
//   give a second, equally valid answer: each row, each column and each box
//   of the rectangle still holds one a and one b, and no cell outside the
//   rectangle changed. A proper Sudoku has one answer, so that cannot be
//   the case: at least one corner must hold something else.
//
// Everything below is that one sentence applied to a different shape.
//
//   Type 1    three corners are the bare pair; the fourth cannot be a or b
//   Type 2    two corners in one unit carry the same one extra digit, so
//             one of them holds it
//   Type 3    the extra digits of two corners act as one more cell in their
//             unit, making a subset with the cells beside them
//   Type 4    one pair digit is locked in two of the corners, so the other
//             pair digit cannot be in either of them
//   Type 5    the same one extra digit sits in three (or four, or two
//             diagonal) corners, so one of them holds it
//   Type 6    one pair digit can only reach the corners, so it runs down
//             one diagonal, and cannot be on the other
//   Hidden    the rectangle is read through strong links instead of bare
//             pairs: one bare corner and two links decide the far corner
//   Avoidable the same argument over digits the player has already placed,
//             so the deadly pattern is avoided rather than broken
//   BUG       the whole board, rather than four cells: when every cell is
//             down to two candidates and every digit has exactly two homes
//             in every unit, the board has two answers, so whatever stops
//             that from happening must be true
//   Loop      the rectangle argument over six, eight or more cells that
//             close a loop across two digits
//
// None of it is valid on a grid with two answers, where the same reasoning
// produces a confident wrong hint. The gate is in logicEngine, which will
// not run anything from this module unless the puzzle's answer count has
// been established as exactly one; see uniqueness.js for the guard and
// docs/specs/uniqueness-techniques.md for the rules it keeps.

import {
  getRow,
  getCol,
  getBox,
  getRowIndices,
  getColIndices,
  arePeers,
  cellName,
  ALL_UNITS,
} from './gridUnits';

// ---------------------------------------------------------------------------
// Shared geometry and small helpers
// ---------------------------------------------------------------------------

/**
 * Every rectangle that can carry the deadly pattern: four corners in two
 * rows, two columns and exactly two boxes. A rectangle over four boxes is
 * not interchangeable - swapping its digits breaks a box - so it is not
 * here. There are 486 of them and they never change, so they are built
 * once rather than on every call.
 *
 * Corners are always in reading order: [topLeft, topRight, bottomLeft,
 * bottomRight].
 */
export const DEADLY_RECTANGLES = (() => {
  const all = [];
  for (let r1 = 0; r1 < 8; r1++) {
    for (let r2 = r1 + 1; r2 < 9; r2++) {
      for (let c1 = 0; c1 < 8; c1++) {
        for (let c2 = c1 + 1; c2 < 9; c2++) {
          const corners = [r1 * 9 + c1, r1 * 9 + c2, r2 * 9 + c1, r2 * 9 + c2];
          if (new Set(corners.map(getBox)).size !== 2) continue;
          all.push({ corners, rows: [r1, r2], cols: [c1, c2] });
        }
      }
    }
  }
  return all;
})();

/** The corner diagonally opposite `cell` in a rectangle's four corners. */
const diagonalOf = (corners, cell) =>
  corners.find((c) => getRow(c) !== getRow(cell) && getCol(c) !== getCol(cell));

/** The units (row, column, box) that hold every one of `cells`. */
const unitsHolding = (cells) =>
  ALL_UNITS.filter((unit) => cells.every((c) => unit.indices.includes(c)));

/** Empty cells outside `cells` that still hold `digit` and see all of them. */
const seesAll = (grid, cells, digit, exclude = cells) => {
  const out = [];
  for (let i = 0; i < 81; i++) {
    if (exclude.includes(i)) continue;
    if (grid[i].value !== null || !grid[i].candidates.includes(digit)) continue;
    if (cells.every((c) => arePeers(i, c))) out.push(i);
  }
  return out;
};

const names = (cells) => cells.map(cellName).join(', ');

const list = (items) => {
  const parts = items.map(String);
  if (parts.length <= 1) return parts.join('');
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
};

/** Report one step or collect them all, the convention every finder follows. */
const emit = (step, collected, returnAll) => {
  if (returnAll) {
    collected.push(step);
    return null;
  }
  return step;
};

// The sentence every card in this family carries, so the assumption is
// never implied and never hidden.
const BECAUSE = 'This works because the puzzle has exactly one answer.';

// ---------------------------------------------------------------------------
// The Unique Rectangle shape, shared by types 1 to 6 and the hidden form
// ---------------------------------------------------------------------------

/**
 * Walk every rectangle / digit-pair combination that could carry a deadly
 * pattern: four empty corners that can all hold both digits.
 *
 * The callback gets the corners, the pair, the corners that are exactly the
 * bare pair (the floor) and the corners with something extra (the roof).
 * Returning a value from the callback stops the walk and hands that value
 * back, which is how a finder returns its first step.
 */
const forEachRectangle = (grid, fn) => {
  for (const rect of DEADLY_RECTANGLES) {
    const { corners } = rect;
    if (!corners.every((c) => grid[c].value === null)) continue;
    // Digits every corner can still hold; a pair needs two of them.
    const common = [];
    for (let d = 1; d <= 9; d++) {
      if (corners.every((c) => grid[c].candidates.includes(d))) common.push(d);
    }
    if (common.length < 2) continue;
    for (let i = 0; i < common.length; i++) {
      for (let j = i + 1; j < common.length; j++) {
        const a = common[i];
        const b = common[j];
        // A corner with exactly two candidates holds exactly {a, b}: it
        // already contains both. Anything longer carries extras.
        const floor = corners.filter((c) => grid[c].candidates.length === 2);
        const roof = corners.filter((c) => grid[c].candidates.length > 2);
        const extrasOf = (c) => grid[c].candidates.filter((d) => d !== a && d !== b);
        const result = fn({ rect, corners, a, b, floor, roof, extrasOf });
        if (result !== undefined && result !== null) return result;
      }
    }
  }
  return null;
};

/** The step fields every rectangle step carries, for the card's drawing. */
const rectangleShape = (corners, floor, roof, a, b) => ({
  baseCells: corners,
  rectangle: { corners, floor, roof },
  pairDigits: [a, b],
});

// ---------------------------------------------------------------------------
// Unique Rectangle Type 1
// ---------------------------------------------------------------------------

/**
 * Three corners are the same bare pair; the fourth cannot be either pair
 * digit, or all four would be interchangeable.
 */
export const findUniqueRectangle = (grid, focusedDigit = null, returnAll = false) => {
  const all = [];
  const found = forEachRectangle(grid, ({ corners, a, b, floor, roof }) => {
    if (floor.length !== 3 || roof.length !== 1) return null;
    if (focusedDigit && a !== focusedDigit && b !== focusedDigit) return null;
    const odd = roof[0];
    const eliminations = [a, b].map((digit) => ({ cell: odd, digit }));
    const step = {
      technique: 'Unique Rectangle Type 1',
      digit: null,
      ...rectangleShape(corners, floor, roof, a, b),
      targetCells: [odd],
      eliminations,
      explanation:
        `Unique Rectangle on ${a} and ${b}: ${names(floor)} hold exactly {${a}, ${b}} and ` +
        `${cellName(odd)} holds them too, plus ${list(grid[odd].candidates.filter((d) => d !== a && d !== b))}. ` +
        `If ${cellName(odd)} were ${a} or ${b}, the four corners could swap ${a} and ${b} freely and ` +
        `the puzzle would have two solutions, so ${a} and ${b} come off ${cellName(odd)}. ${BECAUSE}`,
    };
    return emit(step, all, returnAll);
  });
  return returnAll ? all : found;
};

// ---------------------------------------------------------------------------
// Unique Rectangle Types 2 and 5: one extra digit, shared by the roof
// ---------------------------------------------------------------------------

/**
 * Every roof corner carries the same single extra digit. One of them must
 * take it - otherwise all four corners are down to the pair - so the extra
 * digit goes from every cell that sees all of them.
 *
 * Two roof corners in one unit is Type 2. Anything else (three corners,
 * four corners, or two on a diagonal) is Type 5. The two-corner diagonal
 * case is in here for completeness and never eliminates anything: diagonal
 * corners of a two-box rectangle share no unit, so no cell sees both.
 */
const findURSharedExtra = (grid, focusedDigit, returnAll, wanted) => {
  const all = [];
  const found = forEachRectangle(grid, ({ corners, a, b, floor, roof, extrasOf }) => {
    if (roof.length < 2) return null;
    const extras = [...new Set(roof.flatMap(extrasOf))];
    if (extras.length !== 1) return null;
    const c = extras[0];
    if (focusedDigit && c !== focusedDigit) return null;

    const aligned = roof.length === 2 && arePeers(roof[0], roof[1]);
    const technique = aligned ? 'Unique Rectangle Type 2' : 'Unique Rectangle Type 5';
    if (technique !== wanted) return null;

    const targets = seesAll(grid, roof, c, corners);
    if (targets.length === 0) return null;
    const eliminations = targets.map((cell) => ({ cell, digit: c }));
    const rest =
      floor.length === 0
        ? 'every corner carries that same extra'
        : `${names(floor)} hold exactly {${a}, ${b}}`;
    const shared = aligned
      ? `they share ${unitsHolding(roof)[0]?.name ?? 'a unit'}`
      : roof.length === 2
        ? 'they lie across the rectangle from each other'
        : `${roof.length} of the corners carry it`;
    const step = {
      technique,
      digit: c,
      ...rectangleShape(corners, floor, roof, a, b),
      targetCells: targets,
      extraDigits: [c],
      eliminations,
      explanation:
        `Unique Rectangle on ${a} and ${b} with ${names(corners)}. ${names(roof)} hold {${a}, ${b}, ${c}} and ` +
        `${rest}. If none of ${names(roof)} took ${c}, all four corners would be down to {${a}, ${b}} and the ` +
        `puzzle would have two solutions. So ${c} is true in one of ${names(roof)} (${shared}), and every ${c} ` +
        `that sees all of them is eliminated. ${BECAUSE}`,
    };
    return emit(step, all, returnAll);
  });
  return returnAll ? all : found;
};

export const findURType2 = (grid, focusedDigit = null, returnAll = false) =>
  findURSharedExtra(grid, focusedDigit, returnAll, 'Unique Rectangle Type 2');

export const findURType5 = (grid, focusedDigit = null, returnAll = false) =>
  findURSharedExtra(grid, focusedDigit, returnAll, 'Unique Rectangle Type 5');

// ---------------------------------------------------------------------------
// Unique Rectangle Type 3: the roof's extras as one more cell in the unit
// ---------------------------------------------------------------------------

/**
 * Two roof corners share a unit and carry two or more extra digits between
 * them. At least one of those extras must be true in one of the two
 * corners, so the pair of corners behaves like a single cell holding that
 * set of extras. Put that virtual cell beside N other cells of the unit: if
 * the extras and those cells' candidates together come to exactly N + 1
 * digits, the set is locked and those digits go from the rest of the unit.
 */
export const findURType3 = (grid, focusedDigit = null, returnAll = false) => {
  const all = [];
  const found = forEachRectangle(grid, ({ corners, a, b, floor, roof, extrasOf }) => {
    if (roof.length !== 2 || floor.length !== 2) return null;
    const extras = [...new Set(roof.flatMap(extrasOf))].sort((x, y) => x - y);
    // One shared extra is Type 2's shape, and it is the stronger statement.
    if (extras.length < 2) return null;

    for (const unit of unitsHolding(roof)) {
      const others = unit.indices.filter(
        (i) => grid[i].value === null && !corners.includes(i)
      );
      // Subsets of the unit's other cells, smallest first: the smallest
      // locked set is the one worth teaching, and a bigger one containing
      // it says less, so once a size works, stop growing it.
      for (let size = Math.max(1, extras.length - 1); size <= 3; size++) {
        if (others.length < size) break;
        const before = all.length;
        const chosen = [];
        const walk = (start) => {
          if (chosen.length === size) {
            const digits = new Set(extras);
            chosen.forEach((i) => grid[i].candidates.forEach((d) => digits.add(d)));
            if (digits.size !== size + 1) return null;
            const subset = [...digits].sort((x, y) => x - y);
            const eliminations = [];
            for (const i of unit.indices) {
              if (corners.includes(i) || chosen.includes(i)) continue;
              if (grid[i].value !== null) continue;
              for (const d of subset) {
                if (grid[i].candidates.includes(d)) eliminations.push({ cell: i, digit: d });
              }
            }
            if (eliminations.length === 0) return null;
            if (focusedDigit && !eliminations.some((e) => e.digit === focusedDigit)) return null;
            const step = {
              technique: 'Unique Rectangle Type 3',
              digit: null,
              ...rectangleShape(corners, floor, roof, a, b),
              targetCells: [...new Set(eliminations.map((e) => e.cell))],
              extraDigits: extras,
              subsetDigits: subset,
              zCells: [...chosen],
              unit: { type: unit.type, index: unit.index, name: unit.name },
              eliminations,
              explanation:
                `Unique Rectangle on ${a} and ${b} with ${names(corners)}. ${names(roof)} carry the extra ` +
                `digits {${extras.join(', ')}}; one of those extras must be true there, or all four corners ` +
                `would be down to {${a}, ${b}} and the puzzle would have two solutions. So the two corners act ` +
                `as one cell holding {${extras.join(', ')}} in ${unit.name}. Together with ${names(chosen)} that ` +
                `makes ${size + 1} cells over the ${size + 1} digits {${subset.join(', ')}}, a locked set, so those ` +
                `digits come off the rest of ${unit.name}. ${BECAUSE}`,
            };
            return emit(step, all, returnAll);
          }
          for (let i = start; i < others.length; i++) {
            chosen.push(others[i]);
            const result = walk(i + 1);
            chosen.pop();
            if (result) return result;
          }
          return null;
        };
        const result = walk(0);
        if (result) return result;
        if (all.length > before) break;
      }
    }
    return null;
  });
  return returnAll ? all : found;
};

// ---------------------------------------------------------------------------
// Unique Rectangle Type 4: a pair digit locked in two corners
// ---------------------------------------------------------------------------

/**
 * Two roof corners share a unit, and in that unit one of the pair digits
 * has nowhere to go but those two corners. Then the other pair digit cannot
 * be in either of them.
 *
 * Suppose it were: say the pair is {a, b}, b is locked in the two roof
 * corners, and one roof corner takes a. The unit still needs its b, so the
 * other roof corner takes b. The two floor corners are bare pairs, and each
 * sees one of the roof corners down its own column (or row), so one is
 * forced to b and the other to a. All four corners end up inside {a, b},
 * which the puzzle's single answer forbids.
 */
export const findURType4 = (grid, focusedDigit = null, returnAll = false) => {
  const all = [];
  const found = forEachRectangle(grid, ({ corners, a, b, floor, roof }) => {
    if (roof.length !== 2 || floor.length !== 2) return null;
    if (!arePeers(roof[0], roof[1])) return null;

    for (const unit of unitsHolding(roof)) {
      for (const [locked, gone] of [
        [a, b],
        [b, a],
      ]) {
        if (focusedDigit && gone !== focusedDigit) continue;
        const homes = unit.indices.filter(
          (i) => grid[i].value === null && grid[i].candidates.includes(locked)
        );
        if (homes.length !== 2) continue;
        if (!roof.every((c) => homes.includes(c))) continue;
        const eliminations = roof
          .filter((c) => grid[c].candidates.includes(gone))
          .map((cell) => ({ cell, digit: gone }));
        if (eliminations.length === 0) continue;
        const step = {
          technique: 'Unique Rectangle Type 4',
          digit: gone,
          ...rectangleShape(corners, floor, roof, a, b),
          targetCells: roof,
          strongLinks: [
            { from: { cell: roof[0], digit: locked }, to: { cell: roof[1], digit: locked } },
          ],
          unit: { type: unit.type, index: unit.index, name: unit.name },
          eliminations,
          explanation:
            `Unique Rectangle on ${a} and ${b} with ${names(corners)}, where ${names(floor)} hold exactly ` +
            `{${a}, ${b}}. In ${unit.name} the digit ${locked} has only ${names(roof)} left, so one of them is ` +
            `${locked}. If either took ${gone}, the other would take ${locked}, the two bare corners would be ` +
            `forced to ${a} and ${b}, and all four corners would hold only ${a} and ${b} - two solutions. ` +
            `So ${gone} comes off ${names(roof)}. ${BECAUSE}`,
        };
        const result = emit(step, all, returnAll);
        if (result) return result;
      }
    }
    return null;
  });
  return returnAll ? all : found;
};

// ---------------------------------------------------------------------------
// Unique Rectangle Type 6: a pair digit confined to the corners
// ---------------------------------------------------------------------------

/**
 * Both bare corners lie on one diagonal, and one pair digit can only reach
 * the rectangle's corners in both of the rectangle's rows (or in both of
 * its columns). The digit then has to run down one diagonal or the other.
 * If it ran down the diagonal of the two corners with extras, the two bare
 * corners would be forced to the other pair digit and all four corners
 * would be inside the pair - two solutions. So it runs down the bare
 * diagonal, and comes off the other two corners.
 */
export const findURType6 = (grid, focusedDigit = null, returnAll = false) => {
  const all = [];
  const found = forEachRectangle(grid, ({ rect, corners, a, b, floor, roof }) => {
    if (roof.length !== 2 || floor.length !== 2) return null;
    // The bare corners must be a diagonal, so that fixing the digit on the
    // other diagonal forces both of them.
    if (arePeers(floor[0], floor[1])) return null;

    for (const digit of [a, b]) {
      if (focusedDigit && digit !== focusedDigit) continue;
      const confinedTo = (indices) => {
        const homes = indices.filter(
          (i) => grid[i].value === null && grid[i].candidates.includes(digit)
        );
        return homes.length === 2 && homes.every((i) => corners.includes(i));
      };
      const inRows = rect.rows.every((r) => confinedTo(getRowIndices(r)));
      const inCols = rect.cols.every((c) => confinedTo(getColIndices(c)));
      if (!inRows && !inCols) continue;

      const eliminations = roof
        .filter((c) => grid[c].candidates.includes(digit))
        .map((cell) => ({ cell, digit }));
      if (eliminations.length === 0) continue;
      const lines = inRows
        ? `rows ${rect.rows.map((r) => r + 1).join(' and ')}`
        : `columns ${rect.cols.map((c) => c + 1).join(' and ')}`;
      const step = {
        technique: 'Unique Rectangle Type 6',
        digit,
        ...rectangleShape(corners, floor, roof, a, b),
        targetCells: roof,
        strongLinks: inRows
          ? rect.rows.map((r) => {
              const [p, q] = corners.filter((c) => getRow(c) === r);
              return { from: { cell: p, digit }, to: { cell: q, digit } };
            })
          : rect.cols.map((c) => {
              const [p, q] = corners.filter((cell) => getCol(cell) === c);
              return { from: { cell: p, digit }, to: { cell: q, digit } };
            }),
        eliminations,
        explanation:
          `Unique Rectangle on ${a} and ${b} with ${names(corners)}, where ${names(floor)} hold exactly ` +
          `{${a}, ${b}} and lie on one diagonal. In ${lines} the digit ${digit} can only go in the ` +
          `rectangle's corners, so it takes one corner in each line - one diagonal or the other. On the ` +
          `${names(roof)} diagonal it would force both bare corners to ${digit === a ? b : a}, leaving all four ` +
          `corners inside {${a}, ${b}} - two solutions. So ${digit} runs down the other diagonal and comes off ` +
          `${names(roof)}. ${BECAUSE}`,
      };
      const result = emit(step, all, returnAll);
      if (result) return result;
    }
    return null;
  });
  return returnAll ? all : found;
};

// ---------------------------------------------------------------------------
// Hidden Unique Rectangle
// ---------------------------------------------------------------------------

/**
 * The rectangle read through strong links rather than bare pairs: one
 * corner is the bare pair, and in the far corner's own row and column one
 * pair digit has only the rectangle's corners left.
 *
 * Suppose the far corner took the other pair digit. Then its row's copy of
 * the linked digit falls on the corner beside it, and its column's copy on
 * the other corner beside it. Those two corners see the bare corner, which
 * is left with the far corner's digit - and all four corners end up inside
 * the pair. Two solutions, so the far corner cannot take that digit.
 */
export const findHiddenUniqueRectangle = (grid, focusedDigit = null, returnAll = false) => {
  const all = [];
  const found = forEachRectangle(grid, ({ corners, a, b, floor, roof }) => {
    if (floor.length !== 1) return null;
    const bare = floor[0];
    const far = diagonalOf(corners, bare);
    const inRow = corners.find((c) => c !== far && getRow(c) === getRow(far));
    const inCol = corners.find((c) => c !== far && getCol(c) === getCol(far));

    for (const [linked, gone] of [
      [a, b],
      [b, a],
    ]) {
      if (focusedDigit && gone !== focusedDigit) continue;
      if (!grid[far].candidates.includes(gone)) continue;
      const confined = (indices, other) => {
        const homes = indices.filter(
          (i) => grid[i].value === null && grid[i].candidates.includes(linked)
        );
        return homes.length === 2 && homes.includes(far) && homes.includes(other);
      };
      if (!confined(getRowIndices(getRow(far)), inRow)) continue;
      if (!confined(getColIndices(getCol(far)), inCol)) continue;

      const step = {
        technique: 'Hidden Unique Rectangle',
        digit: gone,
        ...rectangleShape(corners, floor, roof, a, b),
        targetCells: [far],
        strongLinks: [
          { from: { cell: far, digit: linked }, to: { cell: inRow, digit: linked } },
          { from: { cell: far, digit: linked }, to: { cell: inCol, digit: linked } },
        ],
        eliminations: [{ cell: far, digit: gone }],
        explanation:
          `Hidden Unique Rectangle on ${a} and ${b} with ${names(corners)}. ${cellName(bare)} holds exactly ` +
          `{${a}, ${b}}. In row ${getRow(far) + 1} and in column ${getCol(far) + 1} the digit ${linked} has only ` +
          `the rectangle's corners left, so each line gives its ${linked} to ${cellName(far)} or to the corner ` +
          `beside it. If ${cellName(far)} were ${gone}, both lines would put ${linked} on ${names([inRow, inCol])}, ` +
          `${cellName(bare)} would be forced to ${gone}, and all four corners would hold only ${a} and ${b} - ` +
          `two solutions. So ${gone} comes off ${cellName(far)}. ${BECAUSE}`,
      };
      const result = emit(step, all, returnAll);
      if (result) return result;
    }
    return null;
  });
  return returnAll ? all : found;
};

// ---------------------------------------------------------------------------
// Avoidable Rectangles: the same argument over digits already placed
// ---------------------------------------------------------------------------

/**
 * An Avoidable Rectangle runs over cells the player (or the mentor) has
 * already filled in, so the deadly pattern is avoided before it forms
 * rather than broken after. Only cells that were worked out count: a given
 * is fixed by the puzzle and cannot take part in a swap, so all four
 * corners must be non-given.
 *
 * The argument reads the digits in those cells as the puzzle's answer,
 * which is what the game guarantees by refusing a wrong entry on the spot
 * (useSudokuGame) - a board carrying a wrong digit has no answer at all,
 * and nothing the engines say about it means anything.
 *
 * Type 1: three corners are filled, the two beside the empty one hold the
 * same digit, and the one across from it holds another. The empty corner
 * cannot take that other digit, or the four would be interchangeable.
 */
export const findAvoidableRectangle1 = (grid, focusedDigit = null, returnAll = false) => {
  const all = [];
  for (const { corners } of DEADLY_RECTANGLES) {
    if (corners.some((c) => grid[c].isFixed)) continue;
    const empty = corners.filter((c) => grid[c].value === null);
    if (empty.length !== 1) continue;
    const target = empty[0];
    const across = diagonalOf(corners, target);
    const beside = corners.filter((c) => c !== target && c !== across);
    if (grid[beside[0]].value !== grid[beside[1]].value) continue;
    const digit = grid[across].value;
    if (digit === grid[beside[0]].value) continue;
    if (!grid[target].candidates.includes(digit)) continue;
    if (focusedDigit && digit !== focusedDigit) continue;

    const step = {
      technique: 'Avoidable Rectangle Type 1',
      digit,
      baseCells: corners,
      rectangle: { corners, floor: beside.concat(across), roof: [target] },
      pairDigits: [digit, grid[beside[0]].value],
      placedDigits: [
        { cell: across, digit },
        ...beside.map((c) => ({ cell: c, digit: grid[c].value })),
      ],
      targetCells: [target],
      eliminations: [{ cell: target, digit }],
      explanation:
        `Avoidable Rectangle on ${names(corners)}, none of them a given. ${names(beside)} were worked out as ` +
        `${grid[beside[0]].value} and ${cellName(across)} as ${digit}. If ${cellName(target)} were also ` +
        `${digit}, the four corners would hold ${digit} and ${grid[beside[0]].value} on their two diagonals and ` +
        `could swap, so the puzzle would have two solutions. So ${digit} comes off ${cellName(target)}. ${BECAUSE}`,
    };
    const result = emit(step, all, returnAll);
    if (result) return result;
  }
  return returnAll ? all : null;
};

/**
 * Type 2: two corners are filled, side by side, and the two empty corners
 * each hold the digit the pattern would need plus the same one extra digit.
 * The pattern needs both of them to take their pattern digit, so at least
 * one takes the extra instead - and the extra goes from every cell that
 * sees both.
 */
export const findAvoidableRectangle2 = (grid, focusedDigit = null, returnAll = false) => {
  const all = [];
  for (const { corners } of DEADLY_RECTANGLES) {
    if (corners.some((c) => grid[c].isFixed)) continue;
    const empty = corners.filter((c) => grid[c].value === null);
    if (empty.length !== 2) continue;
    // The two filled corners must be side by side, which is the same as
    // saying the two empty ones are: a diagonal pair of equal digits is the
    // only pattern a diagonal can carry, and two empty diagonal corners
    // share no unit to eliminate in.
    const [s, t] = empty;
    if (!arePeers(s, t)) continue;
    // What the deadly pattern would need each empty corner to hold: the
    // digit sitting across from it.
    const needS = grid[diagonalOf(corners, s)].value;
    const needT = grid[diagonalOf(corners, t)].value;
    if (!needS || !needT || needS === needT) continue;
    const extrasS = grid[s].candidates.filter((d) => d !== needS);
    const extrasT = grid[t].candidates.filter((d) => d !== needT);
    if (!grid[s].candidates.includes(needS) || !grid[t].candidates.includes(needT)) continue;
    if (extrasS.length !== 1 || extrasT.length !== 1) continue;
    if (extrasS[0] !== extrasT[0]) continue;
    const extra = extrasS[0];
    if (focusedDigit && extra !== focusedDigit) continue;

    const targets = seesAll(grid, empty, extra, corners);
    if (targets.length === 0) continue;
    const step = {
      technique: 'Avoidable Rectangle Type 2',
      digit: extra,
      baseCells: corners,
      rectangle: { corners, floor: corners.filter((c) => !empty.includes(c)), roof: empty },
      pairDigits: [needS, needT],
      extraDigits: [extra],
      placedDigits: corners
        .filter((c) => grid[c].value !== null)
        .map((c) => ({ cell: c, digit: grid[c].value })),
      targetCells: targets,
      eliminations: targets.map((cell) => ({ cell, digit: extra })),
      explanation:
        `Avoidable Rectangle on ${names(corners)}, none of them a given. ${cellName(diagonalOf(corners, s))} was ` +
        `worked out as ${needS} and ${cellName(diagonalOf(corners, t))} as ${needT}. ${cellName(s)} can only be ` +
        `${needS} or ${extra}, and ${cellName(t)} only ${needT} or ${extra}. If both took the first option the ` +
        `four corners would hold ${needS} and ${needT} on their diagonals and could swap - two solutions. So ` +
        `${extra} is true in ${cellName(s)} or ${cellName(t)}, and every ${extra} that sees both is ` +
        `eliminated. ${BECAUSE}`,
    };
    const result = emit(step, all, returnAll);
    if (result) return result;
  }
  return returnAll ? all : null;
};

// ---------------------------------------------------------------------------
// The Bivalue Universal Grave, with two or three extra candidates
// ---------------------------------------------------------------------------

/**
 * A board is a Bivalue Universal Grave when every empty cell is down to
 * exactly two candidates and every digit has exactly two homes (or none) in
 * every row, column and box. Such a board has two answers: colour the
 * network of pairs and either colour solves it. A proper Sudoku never
 * reaches one.
 *
 * So if removing a particular set of N candidates would leave a grave, at
 * least one of those N candidates must be true. N = 1 is BUG+1 and places
 * the digit; N = 2 and N = 3 are the cases here, and what they prove
 * depends on where the extras sit:
 *
 *   same digit, different cells   it goes from every cell seeing them all
 *   same cell, different digits   the cell's other candidates go
 *   mixed                         a candidate that contradicts every one of
 *                                 the extras goes, which for two extras
 *                                 that see each other is the cross pair
 *
 * All three fall out of one test, applied to every candidate on the board:
 * eliminate it when each extra being true would rule it out.
 */
const extraCandidateSets = (grid, n) => {
  const cells = [];
  let total = 0;
  let empty = 0;
  for (let i = 0; i < 81; i++) {
    if (grid[i].value !== null) continue;
    empty++;
    const k = grid[i].candidates.length;
    // A cell with fewer than two candidates is not a grave with extras; it
    // is a single (or a broken board), and belongs to another rung.
    if (k < 2) return [];
    if (k > 2) {
      total += k - 2;
      cells.push(i);
    }
  }
  if (empty === 0 || total !== n) return [];

  // Choose which of each cell's candidates are the extras: a cell with k
  // candidates contributes k - 2 of them.
  const perCell = cells.map((cell) => {
    const cands = grid[cell].candidates;
    const take = cands.length - 2;
    const choices = [];
    const pick = (start, chosen) => {
      if (chosen.length === take) {
        choices.push(chosen.map((d) => ({ cell, digit: d })));
        return;
      }
      for (let i = start; i < cands.length; i++) pick(i + 1, [...chosen, cands[i]]);
    };
    pick(0, []);
    return choices;
  });

  let sets = [[]];
  for (const choices of perCell) {
    sets = sets.flatMap((base) => choices.map((choice) => [...base, ...choice]));
  }
  return sets.filter((set) => leavesAGrave(grid, set));
};

/** Would removing `set` leave every digit exactly two homes in every unit? */
const leavesAGrave = (grid, set) => {
  const removed = new Set(set.map(({ cell, digit }) => cell * 10 + digit));
  for (const unit of ALL_UNITS) {
    for (let d = 1; d <= 9; d++) {
      let homes = 0;
      for (const i of unit.indices) {
        if (grid[i].value !== null) continue;
        if (!grid[i].candidates.includes(d)) continue;
        if (removed.has(i * 10 + d)) continue;
        homes++;
      }
      if (homes !== 0 && homes !== 2) return false;
    }
  }
  return true;
};

/** Does `(cell, digit)` being true rule out `(other, d)`? */
const rulesOut = (cell, digit, other, d) =>
  other === cell ? d !== digit : d === digit && arePeers(other, cell);

const findBUGPlus = (grid, focusedDigit, returnAll, n, technique) => {
  const all = [];
  for (const set of extraCandidateSets(grid, n)) {
    const eliminations = [];
    for (let i = 0; i < 81; i++) {
      if (grid[i].value !== null) continue;
      for (const d of grid[i].candidates) {
        if (set.every(({ cell, digit }) => rulesOut(cell, digit, i, d))) {
          eliminations.push({ cell: i, digit: d });
        }
      }
    }
    if (eliminations.length === 0) continue;
    if (focusedDigit && !eliminations.some((e) => e.digit === focusedDigit)) continue;

    const where = set.map(({ cell, digit }) => `${digit} in ${cellName(cell)}`);
    const step = {
      technique,
      digit: null,
      baseCells: [...new Set(set.map((s) => s.cell))],
      targetCells: [...new Set(eliminations.map((e) => e.cell))],
      bugExtras: set,
      eliminations,
      explanation:
        `${technique}: every empty cell is down to two candidates apart from ${list(where)}. Without ` +
        `${n === 2 ? 'those two' : 'those three'} the board would be a bivalue universal grave - every digit ` +
        `with exactly two homes in every unit - which has two solutions. So at least one of ${list(where)} is ` +
        `true, and every candidate that each of them would rule out is eliminated. ${BECAUSE}`,
    };
    const result = emit(step, all, returnAll);
    if (result) return result;
  }
  return returnAll ? all : null;
};

export const findBUGPlus2 = (grid, focusedDigit = null, returnAll = false) =>
  findBUGPlus(grid, focusedDigit, returnAll, 2, 'BUG+2');

export const findBUGPlus3 = (grid, focusedDigit = null, returnAll = false) =>
  findBUGPlus(grid, focusedDigit, returnAll, 3, 'BUG+3');

/**
 * BUG+1: one extra candidate, so it must be true and the digit is placed.
 *
 * This is the same machinery one size down, with a placement instead of
 * eliminations: a single extra candidate that must be true is a digit for
 * its cell.
 */
export const findBUGPlus1 = (grid, focusedDigit = null, returnAll = false) => {
  const sets = extraCandidateSets(grid, 1);
  for (const [{ cell, digit }] of sets) {
    if (focusedDigit && digit !== focusedDigit) continue;
    const step = {
      technique: 'BUG+1',
      digit,
      baseCells: [cell],
      targetCells: [],
      bugExtras: [{ cell, digit }],
      placement: { cell, digit },
      eliminations: [],
      explanation:
        `BUG+1: every empty cell is down to two candidates except ${cellName(cell)}, which has three. ` +
        `Without its ${digit} the board would be a bivalue universal grave - every digit with exactly two ` +
        `homes in every unit - and would have two solutions. So ${cellName(cell)} is ${digit}. ${BECAUSE}`,
    };
    return returnAll ? [step] : step;
  }
  return returnAll ? [] : null;
};

// ---------------------------------------------------------------------------
// Unique Loops
// ---------------------------------------------------------------------------

/**
 * The rectangle argument over a longer loop. Six, eight or more cells that
 * can all hold the same two digits, arranged so that every row, column and
 * box holds either none of them or exactly two, and so that the cells close
 * a single loop through those shared units. The two digits then alternate
 * around the loop in two ways, and both are valid, so a proper Sudoku never
 * has the loop's cells all down to the two digits.
 *
 * One cell with something extra: the two digits come off it. Several cells
 * with the same one extra digit: that digit is true in one of them, so it
 * goes from every cell that sees them all.
 */
const LOOP_SIZES = [6, 8];
// The walk is bounded so a mid-game board can never cost the hint path more
// than a few milliseconds here. In practice the "two cells per unit" rule
// prunes so hard that the budget is not approached.
const LOOP_NODE_BUDGET = 60_000;

/**
 * The two conditions that make the swap legal, and they are strict.
 *
 * Every row, column and box that meets the loop must meet it exactly twice.
 * Once is not enough: a unit holding a single loop cell would, after the
 * swap, hold two copies of the same digit, because the digit the loop cell
 * gave up has to live somewhere else in that unit. And each cell must have
 * exactly two partners in the loop, so the shared units close one cycle
 * rather than branching - which also makes the loop even, and so colourable
 * in the two alternating ways the argument needs.
 */
const isUniqueLoop = (loop) => {
  const counts = new Map();
  for (const cell of loop) {
    for (const key of [`r${getRow(cell)}`, `c${getCol(cell)}`, `b${getBox(cell)}`]) {
      counts.set(key, (counts.get(key) || 0) + 1);
    }
  }
  for (const n of counts.values()) if (n !== 2) return false;
  for (const cell of loop) {
    const partners = loop.filter((other) => other !== cell && arePeers(cell, other));
    if (partners.length !== 2) return false;
  }
  return true;
};

export const findUniqueLoop = (grid, focusedDigit = null, returnAll = false) => {
  const all = [];
  for (let a = 1; a <= 9; a++) {
    for (let b = a + 1; b <= 9; b++) {
      const cells = [];
      for (let i = 0; i < 81; i++) {
        if (grid[i].value === null && grid[i].candidates.includes(a) && grid[i].candidates.includes(b)) {
          cells.push(i);
        }
      }
      if (cells.length < LOOP_SIZES[0]) continue;

      const neighbours = new Map(
        cells.map((c) => [c, cells.filter((other) => other !== c && arePeers(c, other))])
      );
      let budget = LOOP_NODE_BUDGET;

      for (const start of cells) {
        // Each loop is walked once, from its lowest cell.
        const path = [start];
        const used = new Set([start]);
        const unitCount = new Map();
        const bump = (cell, by) => {
          for (const key of [`r${getRow(cell)}`, `c${getCol(cell)}`, `b${getBox(cell)}`]) {
            const next = (unitCount.get(key) || 0) + by;
            unitCount.set(key, next);
          }
        };
        const overfull = (cell) =>
          [`r${getRow(cell)}`, `c${getCol(cell)}`, `b${getBox(cell)}`].some(
            (key) => (unitCount.get(key) || 0) >= 2
          );
        bump(start, 1);

        const walk = () => {
          if (budget-- <= 0) return null;
          const here = path[path.length - 1];
          if (
            path.length >= LOOP_SIZES[0] &&
            path.length % 2 === 0 &&
            arePeers(here, start) &&
            isUniqueLoop(path)
          ) {
            const step = loopStep(grid, [...path], a, b, focusedDigit);
            if (step) {
              const result = emit(step, all, returnAll);
              if (result) return result;
            }
          }
          if (path.length >= LOOP_SIZES[LOOP_SIZES.length - 1]) return null;
          for (const next of neighbours.get(here)) {
            if (next < start || used.has(next) || overfull(next)) continue;
            path.push(next);
            used.add(next);
            bump(next, 1);
            const result = walk();
            bump(next, -1);
            used.delete(next);
            path.pop();
            if (result) return result;
          }
          return null;
        };
        const result = walk();
        if (result) return result;
      }
    }
  }
  return returnAll ? all : null;
};

/** What a validated loop proves, or null when it proves nothing useful. */
const loopStep = (grid, loop, a, b, focusedDigit) => {
  const roof = loop.filter((c) => grid[c].candidates.length > 2);
  const floor = loop.filter((c) => grid[c].candidates.length === 2);
  const ordered = [...loop];

  if (roof.length === 1) {
    const odd = roof[0];
    if (focusedDigit && a !== focusedDigit && b !== focusedDigit) return null;
    return {
      technique: 'Unique Loop',
      digit: null,
      baseCells: ordered,
      loopCells: ordered,
      pairDigits: [a, b],
      targetCells: [odd],
      eliminations: [a, b].map((digit) => ({ cell: odd, digit })),
      explanation:
        `Unique Loop on ${a} and ${b} through ${ordered.length} cells: ${names(ordered)}. Every row, column ` +
        `and box that meets the loop meets it exactly twice, so ${a} and ${b} could alternate around it in ` +
        `two ways. ${names(floor)} hold exactly {${a}, ${b}}; if ${cellName(odd)} were ${a} or ${b} too, both ` +
        `ways would solve the puzzle and it would have two answers. So ${a} and ${b} come off ` +
        `${cellName(odd)}. ${BECAUSE}`,
    };
  }

  if (roof.length >= 2) {
    const extras = [...new Set(roof.flatMap((c) => grid[c].candidates.filter((d) => d !== a && d !== b)))];
    if (extras.length !== 1) return null;
    const c = extras[0];
    if (focusedDigit && c !== focusedDigit) return null;
    const targets = seesAll(grid, roof, c, loop);
    if (targets.length === 0) return null;
    return {
      technique: 'Unique Loop',
      digit: c,
      baseCells: ordered,
      loopCells: ordered,
      pairDigits: [a, b],
      extraDigits: [c],
      targetCells: targets,
      eliminations: targets.map((cell) => ({ cell, digit: c })),
      explanation:
        `Unique Loop on ${a} and ${b} through ${ordered.length} cells: ${names(ordered)}. Every row, column ` +
        `and box that meets the loop meets it exactly twice, so ${a} and ${b} could alternate around it in two ` +
        `ways. ${names(roof)} carry the extra digit ${c}; if none of them took it, every loop cell would be ` +
        `down to {${a}, ${b}} and the puzzle would have two answers. So ${c} is true in one of ${names(roof)}, ` +
        `and every ${c} that sees all of them is eliminated. ${BECAUSE}`,
    };
  }

  return null;
};

// ---------------------------------------------------------------------------
// The registry the gate reads
// ---------------------------------------------------------------------------

/**
 * Every technique in this family, by name. logicEngine builds its own maps
 * from this one, which is what makes the guard impossible to forget: a
 * technique added here is gated by being here, not by anyone remembering to
 * add its name to a list somewhere else.
 *
 * In teaching order, which is also the order the hint path tries them in.
 */
export const UNIQUENESS_FINDERS = {
  'Unique Rectangle Type 1': findUniqueRectangle,
  'Unique Rectangle Type 2': findURType2,
  'Unique Rectangle Type 3': findURType3,
  'Unique Rectangle Type 4': findURType4,
  'Unique Rectangle Type 5': findURType5,
  'Unique Rectangle Type 6': findURType6,
  'Hidden Unique Rectangle': findHiddenUniqueRectangle,
  'Avoidable Rectangle Type 1': findAvoidableRectangle1,
  'Avoidable Rectangle Type 2': findAvoidableRectangle2,
  'BUG+1': findBUGPlus1,
  'BUG+2': findBUGPlus2,
  'BUG+3': findBUGPlus3,
  'Unique Loop': findUniqueLoop,
};

/** The names, in teaching order. */
export const UNIQUENESS_TECHNIQUE_NAMES = Object.keys(UNIQUENESS_FINDERS);
