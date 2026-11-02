// The Techniques panel's counts, off the main thread (#126).
//
// One pass counts the board's techniques tier by tier, easiest first, and
// (when gated) stops after the first tier that has anything, because a
// count of a harder technique taken while an easier move is on the board is
// four times out of five a count of patterns that will not survive the move
// (#128).
//
// Where workers exist, the pass runs in one long-lived worker
// (count.worker.js), so no detector can stutter the board, however dear it
// is: that is what retired the Scan button and its "too dear to count
// while you play" note. The worker checks between detectors whether its
// pass is still wanted, so a board change stops it within one detector, and
// a result for a board the player has left is dropped here as well as
// there. Where workers do not exist (tests, very old browsers), or the
// worker fails to load (offline before it was cached), the same pass runs
// on the main thread in slices, as it did before.
//
//   const cancel = startCountPass(grid, groups, { uniqueness, gate, delayMs, onCount, onDone });

import { findAllTechniqueInstances } from './logicEngine';
import { runInSlices } from './sliceRunner';
import { serializeGrid, workersSupported } from './workerSupport';

let worker = null;
let workerBroken = false;
let nextId = 1;
const listeners = new Map(); // id -> { onCount, onDone, fallback }

const canUseWorker = () => !workerBroken && workersSupported();

const getWorker = () => {
  if (worker) return worker;
  worker = new Worker(new URL('./count.worker.js', import.meta.url), { type: 'module' });
  worker.onmessage = (event) => {
    const { id, name, count, done, error } = event.data || {};
    const listener = listeners.get(id);
    if (!listener) return; // cancelled, or superseded: this board is gone
    if (done) {
      if (error) console.error('Counting techniques failed', error);
      listeners.delete(id);
      listener.onDone?.();
    } else {
      listener.onCount(name, count);
    }
  };
  worker.onerror = (event) => {
    // The worker could not load or crashed. Every pass still wanted runs on
    // the main thread instead, and later ones go straight there.
    event.preventDefault?.();
    workerBroken = true;
    worker?.terminate();
    worker = null;
    const stranded = [...listeners.values()];
    listeners.clear();
    for (const listener of stranded) listener.fallback();
  };
  return worker;
};

/** The pass on the main thread, in slices: the fallback, and what tests run. */
const countInSlices = (grid, groups, { uniqueness, gate, delayMs, onCount, onDone }) => {
  const jobs = groups.flatMap((group) =>
    group.names.map((name, index) => ({ name, last: index === group.names.length - 1 }))
  );
  // The last technique of each tier: where the decision to go on is made.
  const tierEnds = new Set(jobs.filter((job) => job.last).map((job) => job.name));
  let found = false;
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    onDone?.();
  };
  // Assigned before any result can arrive: the first slice is scheduled,
  // never run inline.
  let stop = /** @type {null | (() => void)} */ (null);
  stop = runInSlices(
    jobs.map(({ name }) => ({ key: name, run: () => findAllTechniqueInstances(grid, name, { uniqueness }).length })),
    (name, count) => {
      if (count > 0) found = true;
      onCount(name, count);
      if (gate && found && tierEnds.has(name)) {
        stop?.();
        finish();
      }
    },
    { delayMs, onDone: finish }
  );
  return () => stop?.();
};

/**
 * Count `groups` (tiers, easiest first) on `grid`.
 *
 * @param {any[]} grid
 * @param {{ tier: string, names: string[] }[]} groups
 * @param {{ uniqueness?: string, gate?: boolean, delayMs?: number,
 *   onCount: (name: string, count: number) => void, onDone?: () => void }} options
 *   gate     stop after the first tier with an instance (#128)
 *   delayMs  how long the board must be still before any work starts, so a
 *            burst of digits starts none
 * @returns {() => void} cancel; safe to call more than once. After it, no
 *   callback fires.
 */
export function startCountPass(grid, groups, options) {
  const { uniqueness, gate = true, delayMs = 150, onCount, onDone } = options;
  const wanted = groups.filter((group) => group.names.length > 0);
  let cancelled = false;
  const guarded = {
    uniqueness,
    gate,
    delayMs,
    onCount: (name, count) => { if (!cancelled) onCount(name, count); },
    onDone: () => { if (!cancelled) onDone?.(); },
  };
  if (wanted.length === 0) {
    guarded.onDone();
    return () => { cancelled = true; };
  }

  if (!canUseWorker()) {
    const stop = countInSlices(grid, wanted, guarded);
    return () => {
      cancelled = true;
      stop();
    };
  }

  const id = nextId++;
  let stopFallback = null;
  const timer = setTimeout(() => {
    if (cancelled) return;
    listeners.set(id, {
      onCount: guarded.onCount,
      onDone: guarded.onDone,
      fallback: () => {
        if (!cancelled) stopFallback = countInSlices(grid, wanted, { ...guarded, delayMs: 0 });
      },
    });
    try {
      getWorker().postMessage({ type: 'count', id, grid: serializeGrid(grid), groups: wanted, uniqueness, gate });
    } catch {
      listeners.get(id)?.fallback();
      listeners.delete(id);
    }
  }, delayMs);

  return () => {
    if (cancelled) return;
    cancelled = true;
    clearTimeout(timer);
    stopFallback?.();
    if (!listeners.delete(id)) return;
    // A cancel is heard between detectors, and one dear detector on a slow
    // phone can take a while. When nothing else is using the worker, it is
    // terminated instead, so the work stops at once: a board change gets
    // its counts sooner, and a what-if search is not sharing the cores.
    if (listeners.size === 0) {
      worker?.terminate();
      worker = null;
    } else {
      worker?.postMessage({ type: 'cancel', id });
    }
  };
}
