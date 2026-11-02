// Run a queue of short jobs without blocking the frame the player is
// waiting for.
//
// The Techniques panel and the library both need a pile of pure, cheap
// detector runs whose results are nice to have but never urgent. Running
// them in the render that follows a keystroke is what made the board
// stutter. These helpers do the same work after the paint, a slice at a
// time, and hand back a cancel function so a new board drops the work for
// the old one instead of finishing it.

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

/** Schedule the next slice for whenever the browser is not busy. */
const nextSlice = (fn) => {
  if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
    const id = window.requestIdleCallback(fn, { timeout: 200 });
    return () => window.cancelIdleCallback(id);
  }
  const id = setTimeout(fn, 0);
  return () => clearTimeout(id);
};

/**
 * Run `jobs` in slices, calling `onResult(key, value)` as each finishes.
 *
 * @param {{ key: string, run: () => any }[]} jobs
 * @param {(key: string, value: any) => void} onResult
 * @param {{ delayMs?: number, budgetMs?: number, onDone?: () => void }} [options]
 *   delayMs   how long to wait before the first slice. Long enough that a
 *             burst of digits never starts any work at all.
 *   budgetMs  how much work one slice may do before yielding.
 * @returns {() => void} cancel; safe to call more than once.
 */
export const runInSlices = (jobs, onResult, options = {}) => {
  const { delayMs = 150, budgetMs = 6, onDone } = options;
  const queue = [...jobs];
  let cancelled = false;
  let cancelScheduled = null;

  const slice = () => {
    cancelScheduled = null;
    const started = now();
    while (!cancelled && queue.length > 0) {
      const job = queue.shift();
      onResult(job.key, job.run());
      if (now() - started >= budgetMs) break;
    }
    if (cancelled) return;
    if (queue.length > 0) {
      cancelScheduled = nextSlice(slice);
    } else if (onDone) {
      onDone();
    }
  };

  if (queue.length === 0) {
    if (onDone) onDone();
    return () => {};
  }

  const first = setTimeout(slice, delayMs);
  cancelScheduled = () => clearTimeout(first);

  return () => {
    cancelled = true;
    if (cancelScheduled) cancelScheduled();
    cancelScheduled = null;
  };
};

/**
 * Drive a set of longer tasks to completion in slices.
 *
 * Each task does as much as it can in the time it is given and says
 * whether it is finished, so a job too long for one frame (a puzzle's solve
 * path, say) is spread over several instead of blocking the page.
 *
 * @param {{ key: string, advance: (budgetMs: number) => boolean, result: () => any }[]} tasks
 * @param {(key: string, value: any) => void} onResult called as each finishes
 * @param {{ delayMs?: number, budgetMs?: number, onDone?: () => void }} [options]
 * @returns {() => void} cancel; safe to call more than once.
 */
export const advanceInSlices = (tasks, onResult, options = {}) => {
  const { delayMs = 0, budgetMs = 60, onDone } = options;
  const queue = [...tasks];
  let cancelled = false;
  let cancelScheduled = null;

  const slice = () => {
    cancelScheduled = null;
    const task = queue[0];
    if (task && task.advance(budgetMs)) {
      queue.shift();
      onResult(task.key, task.result());
    }
    if (cancelled) return;
    if (queue.length > 0) {
      cancelScheduled = nextSlice(slice);
    } else if (onDone) {
      onDone();
    }
  };

  if (queue.length === 0) {
    if (onDone) onDone();
    return () => {};
  }

  const first = setTimeout(slice, delayMs);
  cancelScheduled = () => clearTimeout(first);

  return () => {
    cancelled = true;
    if (cancelScheduled) cancelScheduled();
    cancelScheduled = null;
  };
};
