// What-if search (forcing chains, then hypothesis) as a cancellable,
// off-main-thread call.
//
//   const search = searchWhatIf(grid, depth, { timeBudgetMs });
//   search.promise.then((step) => ...);   // step | null
//   search.cancel();                       // rejects with { cancelled: true }
//   a search past its time budget rejects with { timedOut: true }
//
// Every search gets its own worker (the module is small), so cancelling
// one search - the only way to stop a synchronous search is to terminate
// its worker - never kills another caller's search. Where workers are
// unavailable (tests, very old browsers) the search runs on the main
// thread in a macrotask.

/** Depth for the hint button: enough for library puzzles, never a freeze. */
export const HINT_SEARCH_DEPTH = 20;
/** Time budgets (ms): the hint gives up quickly; the panel's deeper search waits longer. */
export const HINT_TIME_BUDGET_MS = 5000;
export const DEEP_TIME_BUDGET_MS = 30000;

let nextId = 1;
const pending = new Map();

const workersSupported = () =>
  typeof Worker !== 'undefined' && typeof URL !== 'undefined' && typeof import.meta.url === 'string';

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
 * @param {{ timeBudgetMs?: number }} [options]
 * @returns {{ promise: Promise<any>, cancel: () => void }}
 */
export function searchWhatIf(grid, depth, { timeBudgetMs } = {}) {
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
          pending.delete(id);
          const deadline = typeof timeBudgetMs === 'number' ? Date.now() + timeBudgetMs : Infinity;
          resolve(findForcingChain(grid, depth, deadline) || findHypothesis(grid, depth, deadline) || null);
        } catch (error) {
          pending.delete(id);
          reject(error && error.timedOut ? { timedOut: true } : error);
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

  let worker = null;
  const settle = () => {
    pending.delete(id);
    worker?.terminate();
    worker = null;
  };
  const promise = new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    try {
      worker = new Worker(new URL('./whatIf.worker.js', import.meta.url), { type: 'module' });
      worker.onmessage = (event) => {
        const { step, error, timedOut } = event.data || {};
        if (!pending.has(id)) return;
        settle();
        if (timedOut) reject({ timedOut: true });
        else if (error) reject(new Error(error));
        else resolve(step ?? null);
      };
      worker.onerror = (event) => {
        if (!pending.has(id)) return;
        settle();
        reject(new Error(event?.message || 'What-if search failed'));
      };
      worker.postMessage({ id, grid: serializeGrid(grid), depth, timeBudgetMs });
    } catch (error) {
      settle();
      reject(error);
    }
  });

  return {
    promise,
    cancel: () => {
      const entry = pending.get(id);
      if (!entry) return;
      settle();
      entry.reject({ cancelled: true });
    },
  };
}

/** True for the rejection value a cancelled search produces. */
export const isCancelled = (reason) => !!reason && typeof reason === 'object' && reason.cancelled === true;

/** True for the rejection value a search past its time budget produces. */
export const isTimedOut = (reason) => !!reason && typeof reason === 'object' && reason.timedOut === true;
