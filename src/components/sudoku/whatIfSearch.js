// What-if search (forcing chains, then hypothesis) as a cancellable,
// off-main-thread call.
//
//   const search = searchWhatIf(grid, depth);
//   search.promise.then((step) => ...);   // step | null
//   search.cancel();                       // rejects with { cancelled: true }
//
// One worker serves all callers. Cancelling terminates it (the only way to
// stop a synchronous search) and rejects every pending request; the next
// search starts a fresh worker. Where workers are unavailable (tests,
// very old browsers) the search runs on the main thread in a macrotask.

/** Depth for the hint button: enough for library puzzles, never a freeze. */
export const HINT_SEARCH_DEPTH = 20;

let worker = null;
let nextId = 1;
const pending = new Map();

const rejectAll = (reason) => {
  for (const [, entry] of pending) entry.reject(reason);
  pending.clear();
};

const workersSupported = () =>
  typeof Worker !== 'undefined' && typeof URL !== 'undefined' && typeof import.meta.url === 'string';

const getWorker = () => {
  if (worker) return worker;
  worker = new Worker(new URL('./whatIf.worker.js', import.meta.url), { type: 'module' });
  worker.onmessage = (event) => {
    const { id, step, error } = event.data || {};
    const entry = pending.get(id);
    if (!entry) return;
    pending.delete(id);
    if (error) entry.reject(new Error(error));
    else entry.resolve(step ?? null);
  };
  worker.onerror = (event) => {
    const error = new Error(event?.message || 'What-if search failed');
    rejectAll(error);
    worker?.terminate();
    worker = null;
  };
  return worker;
};

// Plain data only: the grid crosses a structured-clone boundary.
const serializeGrid = (grid) =>
  grid.map((cell) => ({
    value: cell.value,
    isFixed: !!cell.isFixed,
    candidates: [...cell.candidates],
  }));

/**
 * @param {Array<{value: number|null, isFixed?: boolean, candidates: number[]}>} grid
 * @param {number} depth
 * @returns {{ promise: Promise<any>, cancel: () => void }}
 */
export function searchWhatIf(grid, depth) {
  const id = nextId++;
  let cancelled = false;

  if (!workersSupported()) {
    let timer = null;
    const promise = new Promise((resolve, reject) => {
      timer = setTimeout(async () => {
        if (cancelled) return;
        try {
          const { findForcingChain, findHypothesis } = await import('./forcingChainEngine');
          if (cancelled) return;
          resolve(findForcingChain(grid, depth) || findHypothesis(grid, depth) || null);
        } catch (error) {
          reject(error);
        }
      }, 0);
      pending.set(id, { resolve, reject });
    });
    return {
      promise,
      cancel: () => {
        cancelled = true;
        if (timer) clearTimeout(timer);
        const entry = pending.get(id);
        pending.delete(id);
        entry?.reject({ cancelled: true });
      },
    };
  }

  const promise = new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    try {
      getWorker().postMessage({ id, grid: serializeGrid(grid), depth });
    } catch (error) {
      pending.delete(id);
      reject(error);
    }
  });

  return {
    promise,
    cancel: () => {
      if (!pending.has(id)) return;
      // Terminating is the only way to interrupt a running search; every
      // other pending request dies with it and is told so.
      rejectAll({ cancelled: true });
      worker?.terminate();
      worker = null;
    },
  };
}

/** True for the rejection value a cancelled search produces. */
export const isCancelled = (reason) => !!reason && typeof reason === 'object' && reason.cancelled === true;
