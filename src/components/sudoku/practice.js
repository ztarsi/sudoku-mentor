// Practice mode (#139): the rules, kept apart from the page so they can be
// tested on their own.

import { PRACTICE_INDEX } from './practiceIndex';

/** How many practice positions a technique has: 0 when it cannot be practised. */
export const practiceCount = (technique) => PRACTICE_INDEX[technique] ?? 0;

/** The positions themselves, loaded only when a player starts practising. */
export const loadDrills = async (technique) => {
  const { PRACTICE_DRILLS } = await import('./practiceDrills');
  return PRACTICE_DRILLS[technique] ?? [];
};

/**
 * Whether the player's board shows one instance of the technique carried
 * out: its digit placed, or every pencil mark it rules out erased. An
 * erasure counts as done when the mark is gone from a cell still open; a
 * cell the player has since filled with a different digit has lost it too.
 * Legal moves that belong to no instance are allowed and not praised.
 *
 * @param {any[]} instances what the technique proves on the drill's board
 * @param {any[]} grid the player's board now
 */
export const drillFound = (instances, grid) =>
  instances.some((step) => {
    if (step.placement) return grid[step.placement.cell]?.value === step.placement.digit;
    const erasures = step.eliminations ?? [];
    if (erasures.length === 0) return false;
    return erasures.every(({ cell, digit }) => {
      const now = grid[cell];
      if (!now) return false;
      return now.value !== null ? now.value !== digit : !now.candidates.includes(digit);
    });
  });

// "the", not "a": technique names include plurals ("Remote Pairs") and
// names that want "an" ("XY-Wing" is said "ex-why"), and "the" reads right
// for every one of them.

/** The line above the board: what to do, and the truth about the board. */
export const practiceLine = (technique, drill) =>
  drill.next
    ? `Find the ${technique} on this board.`
    : `Find the ${technique} on this board. An easier move is also here; this drill is about the ${technique}.`;

/** What the line says once the player has carried the technique out. */
export const foundLine = (technique) => `Found it: you carried out the ${technique}.`;
