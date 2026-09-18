// Web Worker: runs the what-if search (forcing chains, then hypothesis)
// off the main thread so the page stays responsive during a deep search.
//
// Message in:  { id, grid, depth, timeBudgetMs }
// Message out: { id, step } | { id, timedOut: true } | { id, error }
import { findForcingChain, findHypothesis } from './forcingChainEngine';

self.onmessage = (event) => {
  const { id, grid, depth, timeBudgetMs } = event.data || {};
  const deadline = typeof timeBudgetMs === 'number' ? Date.now() + timeBudgetMs : Infinity;
  try {
    const step = findForcingChain(grid, depth, deadline) || findHypothesis(grid, depth, deadline);
    self.postMessage({ id, step: step || null });
  } catch (error) {
    if (error && error.timedOut) self.postMessage({ id, timedOut: true });
    else self.postMessage({ id, error: error instanceof Error ? error.message : String(error) });
  }
};
