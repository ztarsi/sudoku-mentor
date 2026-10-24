// The single-solution guard.
//
// Every technique in the uniqueness family - the Unique Rectangles, the
// Avoidable Rectangles, the BUG variants, the unique loops - rests on one
// fact about the puzzle: it has exactly one answer. The argument is always
// the same shape. "If this cell were that digit, the puzzle would have two
// answers; a proper Sudoku has one; so it is not that digit." On a grid
// that really does have two answers the same argument produces a wrong
// hint, confidently. One wrong hint costs more trust than a hundred right
// ones earn, so this module is the gate those techniques pass through.
//
// The rules, from docs/specs/uniqueness-techniques.md:
//
//   - The count is established ONCE per puzzle, from the givens, and
//     remembered with the puzzle. Never per hint.
//   - A library puzzle is vetted, so its answer is known in advance.
//   - More than one answer: say so plainly, keep playing, switch the
//     uniqueness family off for that grid. Everything else still works.
//   - A count that does not finish inside its budget leaves uniqueness
//     off. The mentor does not guess.
//   - No uniqueness hint may ever fire on a grid whose count is unknown.
//
// The default is therefore `UNIQUENESS_UNKNOWN`: a caller that never
// establishes anything gets a mentor with the family switched off, which
// is the safe direction to fail in.
import { countSolutionsWithin } from './solver';

/** Exactly one answer: the uniqueness family is sound here. */
export const UNIQUENESS_ONE = 'one';
/** Two or more answers: the family is switched off for this grid. */
export const UNIQUENESS_MANY = 'many';
/** No answer at all: nothing to be unique about. */
export const UNIQUENESS_NONE = 'none';
/** Not established, or the count ran out of budget. */
export const UNIQUENESS_UNKNOWN = 'unknown';

/**
 * How much search the count may spend before it gives up. Counting to two
 * on a proper puzzle takes a few thousand nodes; the budget is here so a
 * pathological grid - a photo that read as nine givens, say - answers
 * "unknown" in milliseconds instead of hanging the page.
 */
export const UNIQUENESS_NODE_BUDGET = 300_000;

/**
 * Establish how many answers a puzzle has, from its givens.
 *
 * @param {number[] | {value: number|null}[]} givens 81 digits (0 empty), or cells
 * @param {{ maxNodes?: number }} [options]
 * @returns {{ state: string, solutions: number|null }} `solutions` is 1, 2
 *   ("two or more": the count stops there), 0, or null when unknown.
 */
export const establishUniqueness = (givens, options = {}) => {
  const { maxNodes = UNIQUENESS_NODE_BUDGET } = options;
  if (!givens || givens.length !== 81) return { state: UNIQUENESS_UNKNOWN, solutions: null };
  const { count, complete, conflict } = countSolutionsWithin(givens, { cap: 2, maxNodes });
  if (conflict) return { state: UNIQUENESS_NONE, solutions: 0 };
  if (!complete) return { state: UNIQUENESS_UNKNOWN, solutions: null };
  if (count === 0) return { state: UNIQUENESS_NONE, solutions: 0 };
  if (count === 1) return { state: UNIQUENESS_ONE, solutions: 1 };
  return { state: UNIQUENESS_MANY, solutions: 2 };
};

/**
 * The one question the engines ask. True only for a grid established as
 * having exactly one answer; anything else, including an unknown count,
 * keeps the uniqueness family silent.
 */
export const uniquenessAllowed = (state) => state === UNIQUENESS_ONE;

/**
 * Why the uniqueness family is off, in the player's words, or null when it
 * is on. The Techniques list shows this instead of a row of zeroes: a count
 * of none reads as "there is no pattern here", which would be a lie when
 * the truth is "these techniques cannot be used on this grid at all".
 */
export const uniquenessNote = (state) => {
  switch (state) {
    case UNIQUENESS_ONE:
      return null;
    case UNIQUENESS_MANY:
      return 'This grid has more than one answer, so the techniques that depend on there being only one are switched off for it. Every other technique still works.';
    case UNIQUENESS_NONE:
      return 'This grid has no answer at all, so the techniques that depend on there being exactly one are switched off for it.';
    default:
      return 'This grid has not been checked for having a single answer, so the techniques that depend on one are switched off for it.';
  }
};

/** One short line for a chip or a tooltip. */
export const uniquenessShortNote = (state) => {
  switch (state) {
    case UNIQUENESS_ONE:
      return null;
    case UNIQUENESS_MANY:
      return 'needs one answer; this grid has more than one';
    case UNIQUENESS_NONE:
      return 'needs one answer; this grid has none';
    default:
      return 'needs one answer; not established for this grid';
  }
};
