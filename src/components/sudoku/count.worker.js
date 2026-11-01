// Web Worker: the Techniques panel's counts, off the main thread (#126).
// See countPass.js for why, and for the main-thread fallback.
//
// Message in:  { type: 'count', id, grid, groups, uniqueness, gate }
//              { type: 'cancel', id }
// Message out: { id, name, count } per technique, then { id, done: true }
//              ({ id, done: true, error } when a detector threw)
//
// Several passes may be under way at once (the board's own pass, and a
// tier the player asked to count anyway); each yields between detectors,
// so they take turns and a cancel is heard at the next boundary. A pass
// that must stop sooner than that is stopped by terminating the worker,
// which countPass does when nothing else is running in it.
import { findAllTechniqueInstances } from './logicEngine';

const active = new Set();
const yieldToMessages = () => new Promise((resolve) => setTimeout(resolve, 0));

const run = async ({ id, grid, groups, uniqueness, gate }) => {
  active.add(id);
  try {
    let found = false;
    for (const group of groups) {
      for (const name of group.names) {
        if (!active.has(id)) return;
        const count = findAllTechniqueInstances(grid, name, { uniqueness }).length;
        if (!active.has(id)) return;
        if (count > 0) found = true;
        self.postMessage({ id, name, count });
        await yieldToMessages();
      }
      // The end of a tier that had something: nothing harder is counted on
      // this board while an easier move is on it (#128).
      if (gate && found) break;
    }
    if (active.has(id)) self.postMessage({ id, done: true });
  } catch (error) {
    // One detector failing ends this pass, with what it had counted kept,
    // rather than leaving the panel saying it is still counting.
    if (active.has(id)) self.postMessage({ id, done: true, error: error instanceof Error ? error.message : String(error) });
  } finally {
    active.delete(id);
  }
};

self.onmessage = (event) => {
  const message = event.data || {};
  if (message.type === 'cancel') active.delete(message.id);
  else if (message.type === 'count') run(message);
};
