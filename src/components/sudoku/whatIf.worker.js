// Web Worker: runs the what-if search (forcing chains, then hypothesis)
// off the main thread so the page stays responsive during a deep search.
//
// Message in:  { id, grid, depth }
// Message out: { id, step } or { id, error }
import { findForcingChain, findHypothesis } from './forcingChainEngine';

self.onmessage = (event) => {
  const { id, grid, depth } = event.data || {};
  try {
    const step = findForcingChain(grid, depth) || findHypothesis(grid, depth);
    self.postMessage({ id, step: step || null });
  } catch (error) {
    self.postMessage({ id, error: error instanceof Error ? error.message : String(error) });
  }
};
