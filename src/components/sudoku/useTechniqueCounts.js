// Counts for the Techniques panel, computed off the input path.
//
// The rule from the panel-at-scale spec: no count is computed while the
// player is entering digits unless the panel is open and that technique is
// visible, and a count that is not known yet says so rather than showing
// the number from the previous board.
//
// So: a new grid drops every count immediately (never a stale number), work
// starts only after the board has been still for a moment, and it runs in
// slices that a further change cancels. A count the player asks for by
// tapping is computed there and then, because they are waiting for it.
import { useCallback, useEffect, useState } from 'react';
import { findAllTechniqueInstances } from './logicEngine';
import { runInSlices } from './sliceRunner';

const NO_COUNTS = /** @type {Record<string, number>} */ ({});

/**
 * @param {any[] | null} grid the board as it stands
 * @param {{ enabled?: boolean, names?: string[] }} options
 *   enabled  false (panel closed, or No Assist) computes nothing at all
 *   names    the techniques whose counts are worth having, in any order
 */
export const useTechniqueCounts = (grid, options = {}) => {
  const { enabled = false, names = [] } = options;
  // One state object, so a count can never outlive the grid it describes.
  const [state, setState] = useState(
    /** @type {{ grid: any, counts: Record<string, number>, counting: boolean }} */
    ({ grid: null, counts: NO_COUNTS, counting: false })
  );

  // Joined, so the effect does not re-run on every render just because the
  // caller built a fresh array.
  const namesKey = names.join('|');

  useEffect(() => {
    if (!enabled || !grid) {
      setState({ grid: null, counts: NO_COUNTS, counting: false });
      return undefined;
    }
    const wanted = namesKey ? namesKey.split('|') : [];
    setState({ grid, counts: NO_COUNTS, counting: wanted.length > 0 });
    return runInSlices(
      wanted.map((name) => ({ key: name, run: () => findAllTechniqueInstances(grid, name).length })),
      (name, count) =>
        setState((prev) =>
          prev.grid === grid ? { ...prev, counts: { ...prev.counts, [name]: count } } : prev
        ),
      {
        onDone: () =>
          setState((prev) => (prev.grid === grid ? { ...prev, counting: false } : prev)),
      }
    );
  }, [grid, enabled, namesKey]);

  /** Count one technique now, because the player asked for it. */
  const countNow = useCallback(
    (name) => {
      if (!grid) return 0;
      const count = findAllTechniqueInstances(grid, name).length;
      setState((prev) =>
        prev.grid === grid
          ? { ...prev, counts: { ...prev.counts, [name]: count } }
          : { grid, counts: { [name]: count }, counting: false }
      );
      return count;
    },
    [grid]
  );

  /** Record counts someone else computed (the Ultimate scan) for this grid. */
  const recordCounts = useCallback(
    (/** @type {Record<string, number>} */ found) => {
      setState((prev) =>
        prev.grid === grid
          ? { ...prev, counts: { ...prev.counts, ...found } }
          : { grid, counts: { ...found }, counting: false }
      );
    },
    [grid]
  );

  return {
    // Counts describe this grid or they are not shown at all.
    counts: state.grid === grid ? state.counts : NO_COUNTS,
    counting: state.grid === grid && state.counting,
    countNow,
    recordCounts,
  };
};
