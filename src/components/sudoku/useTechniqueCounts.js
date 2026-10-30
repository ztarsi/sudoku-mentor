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
//
// And it counts easiest first, stopping at the first tier that has
// anything (#128). Measured over all 1303 board states on the library's
// solve paths: where a single is available, 81% of the Ultimate instances
// counted alongside it are gone once the player plays the single, and 83%
// of what is there afterwards was not there before. A count of a harder
// technique taken over an easier one is four-fifths wrong, so it is not
// taken. That it also skips the expensive work on 89% of board states is
// the smaller half of the reason.
import { useCallback, useEffect, useRef, useState } from 'react';
import { findAllTechniqueInstances } from './logicEngine';
import { runInSlices } from './sliceRunner';

const NO_COUNTS = /** @type {Record<string, number>} */ ({});

/**
 * @param {any[] | null} grid the board as it stands
 * @param {{ enabled?: boolean, groups?: { tier: string, names: string[] }[],
 *   uniqueness?: string }} options
 *   enabled     false (panel closed, or No Assist) computes nothing at all
 *   groups      the tiers whose counts are worth having, easiest first.
 *               Each tier is counted whole; the pass stops after the first
 *               one that has an instance, because nothing harder is worth
 *               counting while an easier move is on the board (#128). One
 *               group counts everything in it, which is the old behaviour.
 *   uniqueness  what is known about the puzzle's answer count; the
 *               uniqueness family counts nothing without it
 */
export const useTechniqueCounts = (grid, options = {}) => {
  const { enabled = false, groups = [], uniqueness } = options;
  // One state object, so a count can never outlive the grid it describes.
  const [state, setState] = useState(
    /** @type {{ grid: any, counts: Record<string, number>, counting: boolean }} */
    ({ grid: null, counts: NO_COUNTS, counting: false })
  );

  // A key the effect can compare, so it does not re-run on every render
  // just because the caller built a fresh array; the groups themselves come
  // through a ref, so a technique's name may hold any character it likes.
  const groupsKey = JSON.stringify(groups);
  const groupsRef = useRef(groups);
  groupsRef.current = groups;

  useEffect(() => {
    if (!enabled || !grid) {
      setState({ grid: null, counts: NO_COUNTS, counting: false });
      return undefined;
    }
    const wanted = groupsRef.current.filter((group) => group.names.length > 0);
    const jobs = wanted.flatMap((group) =>
      group.names.map((name, index) => ({
        key: name,
        last: index === group.names.length - 1,
        run: () => findAllTechniqueInstances(grid, name, { uniqueness }).length,
      }))
    );
    // The last technique of each tier: where the decision to go on is made.
    const tierEnds = new Set(jobs.filter((job) => job.last).map((job) => job.key));
    setState({ grid, counts: NO_COUNTS, counting: jobs.length > 0 });

    // Set once the pass is under way, so the tier that has something can
    // stop the ones after it. The first slice is scheduled rather than run,
    // so this is always assigned before any result arrives.
    let stop = /** @type {null | (() => void)} */ (null);
    let found = false;
    const done = () =>
      setState((prev) => (prev.grid === grid ? { ...prev, counting: false } : prev));

    stop = runInSlices(
      jobs,
      (name, count) => {
        if (count > 0) found = true;
        setState((prev) =>
          prev.grid === grid ? { ...prev, counts: { ...prev.counts, [name]: count } } : prev
        );
        // The end of a tier that had something: nothing harder is counted
        // on this board until the player clears it.
        if (found && tierEnds.has(name)) {
          stop?.();
          done();
        }
      },
      { onDone: done }
    );
    return stop;
  }, [grid, enabled, groupsKey, uniqueness]);

  /** Count one technique now, because the player asked for it. */
  const countNow = useCallback(
    (name) => {
      if (!grid) return 0;
      const count = findAllTechniqueInstances(grid, name, { uniqueness }).length;
      setState((prev) =>
        prev.grid === grid
          ? { ...prev, counts: { ...prev.counts, [name]: count } }
          : { grid, counts: { [name]: count }, counting: false }
      );
      return count;
    },
    [grid, uniqueness]
  );

  /**
   * Count a whole tier now, because the player asked for it in spite of the
   * gate. One state change for the lot, so a tier of eleven detectors is
   * one render rather than eleven.
   */
  const countTier = useCallback(
    (/** @type {string[]} */ wanted) => {
      if (!grid || wanted.length === 0) return;
      const found = /** @type {Record<string, number>} */ ({});
      for (const name of wanted) {
        found[name] = findAllTechniqueInstances(grid, name, { uniqueness }).length;
      }
      setState((prev) =>
        prev.grid === grid
          ? { ...prev, counts: { ...prev.counts, ...found } }
          : { grid, counts: found, counting: false }
      );
    },
    [grid, uniqueness]
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
    countTier,
    recordCounts,
  };
};
