// Counts for the Techniques panel, computed off the input path.
//
// The rule from the panel-at-scale spec: no count is computed while the
// player is entering digits unless the panel is open and that technique is
// visible, and a count that is not known yet says so rather than showing
// the number from the previous board.
//
// So: a new grid drops every count immediately (never a stale number), work
// starts only after the board has been still for a moment, and a further
// change cancels it. The work runs in a worker where there is one
// (countPass.js, #126), so every tier is counted this way, the dearest
// included, and nothing is left behind a button.
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
import { startCountPass } from './countPass';

const NO_COUNTS = /** @type {Record<string, number>} */ ({});

/**
 * @param {any[] | null} grid the board as it stands
 * @param {{ enabled?: boolean, paused?: boolean, groups?: { tier: string, names: string[] }[],
 *   uniqueness?: string }} options
 *   enabled     false (panel closed, or No Assist) computes nothing at all
 *   paused      true while a what-if search runs: nothing new is started,
 *               and the pass starts again when it ends
 *   groups      the tiers whose counts are worth having, easiest first.
 *               Each tier is counted whole; the pass stops after the first
 *               one that has an instance, because nothing harder is worth
 *               counting while an easier move is on the board (#128). One
 *               group counts everything in it, which is the old behaviour.
 *   uniqueness  what is known about the puzzle's answer count; the
 *               uniqueness family counts nothing without it
 */
export const useTechniqueCounts = (grid, options = {}) => {
  const { enabled = false, paused = false, groups = [], uniqueness } = options;
  // One state object, so a count can never outlive the grid it describes.
  // The board's own pass and a tier the player asked for each say whether
  // they are still counting, so one finishing does not speak for the other.
  const [state, setState] = useState(
    /** @type {{ grid: any, counts: Record<string, number>, passCounting: boolean, tierCounting: boolean }} */
    ({ grid: null, counts: NO_COUNTS, passCounting: false, tierCounting: false })
  );
  const stateRef = useRef(state);
  stateRef.current = state;

  // A key the effect can compare, so it does not re-run on every render
  // just because the caller built a fresh array; the groups themselves come
  // through a ref, so a technique's name may hold any character it likes.
  const groupsKey = JSON.stringify(groups);
  const groupsRef = useRef(groups);
  groupsRef.current = groups;

  useEffect(() => {
    if (!enabled || !grid) {
      setState({ grid: null, counts: NO_COUNTS, passCounting: false, tierCounting: false });
      return undefined;
    }
    // Standing aside for the what-if search: the pass is stopped, what it
    // had counted stays, and nothing claims to be counting meanwhile.
    if (paused) {
      setState((prev) => (prev.grid === grid ? { ...prev, passCounting: false } : prev));
      return undefined;
    }
    // On the same board (the pass resuming after a search), what is already
    // counted stays and only the rest is counted. The gate is applied to
    // what is known first: a tier that already has something is the last
    // one worth finishing.
    const prev = stateRef.current;
    const known = prev.grid === grid ? prev.counts : NO_COUNTS;
    const wanted = [];
    for (const group of groupsRef.current) {
      const missing = group.names.filter((name) => typeof known[name] !== 'number');
      if (missing.length > 0) wanted.push({ tier: group.tier, names: missing });
      if (group.names.some((name) => known[name] > 0)) break;
    }
    setState({
      grid,
      counts: known,
      passCounting: wanted.length > 0,
      tierCounting: prev.grid === grid && prev.tierCounting,
    });
    if (wanted.length === 0) return undefined;
    return startCountPass(grid, wanted, {
      uniqueness,
      gate: true,
      onCount: (name, count) =>
        setState((p) => (p.grid === grid ? { ...p, counts: { ...p.counts, [name]: count } } : p)),
      onDone: () => setState((p) => (p.grid === grid ? { ...p, passCounting: false } : p)),
    });
  }, [grid, enabled, paused, groupsKey, uniqueness]);

  /** Count one technique now, because the player asked for it. */
  const countNow = useCallback(
    (name) => {
      if (!grid) return 0;
      const count = findAllTechniqueInstances(grid, name, { uniqueness }).length;
      setState((prev) =>
        prev.grid === grid
          ? { ...prev, counts: { ...prev.counts, [name]: count } }
          : { grid, counts: { [name]: count }, passCounting: false, tierCounting: false }
      );
      return count;
    },
    [grid, uniqueness]
  );

  /**
   * Count a whole tier now, in spite of the gate, because the player asked.
   * It goes the same way as the pass (off the main thread where it can),
   * with no wait first, and its counts arrive as the pass's do. Asking
   * again, or the board changing, drops the one before.
   */
  const tierRun = useRef(/** @type {null | (() => void)} */ (null));
  useEffect(() => () => tierRun.current?.(), [grid]);
  const countTier = useCallback(
    (/** @type {string[]} */ wanted) => {
      if (!grid || wanted.length === 0) return;
      tierRun.current?.();
      setState((prev) =>
        prev.grid === grid
          ? { ...prev, tierCounting: true }
          : { grid, counts: NO_COUNTS, passCounting: false, tierCounting: true }
      );
      tierRun.current = startCountPass(grid, [{ tier: 'asked', names: wanted }], {
        uniqueness,
        gate: false,
        delayMs: 0,
        onCount: (name, count) =>
          setState((prev) =>
            prev.grid === grid ? { ...prev, counts: { ...prev.counts, [name]: count } } : prev
          ),
        onDone: () => {
          tierRun.current = null;
          setState((prev) => (prev.grid === grid ? { ...prev, tierCounting: false } : prev));
        },
      });
    },
    [grid, uniqueness]
  );

  return {
    // Counts describe this grid or they are not shown at all.
    counts: state.grid === grid ? state.counts : NO_COUNTS,
    counting: state.grid === grid && (state.passCounting || state.tierCounting),
    countNow,
    countTier,
  };
};
