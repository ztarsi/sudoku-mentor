// Web Worker: runs the what-if search off the main thread so the page
// stays responsive. Forcing proofs first, then the trial fallback; how
// deep it may go is the engine's own stated limit, not a parameter.
//
// Message in:  { id, grid, timeBudgetMs }
// Message out: { id, step } | { id, timedOut: true } | { id, error }
import { findWhatIfStep } from './forcingChainEngine';

self.onmessage = (event) => {
  const { id, grid, timeBudgetMs } = event.data || {};
  const deadline = typeof timeBudgetMs === 'number' ? Date.now() + timeBudgetMs : Infinity;
  try {
    self.postMessage({ id, step: findWhatIfStep(grid, { deadline }) });
  } catch (error) {
    if (error && error.timedOut) self.postMessage({ id, timedOut: true });
    else self.postMessage({ id, error: error instanceof Error ? error.message : String(error) });
  }
};
