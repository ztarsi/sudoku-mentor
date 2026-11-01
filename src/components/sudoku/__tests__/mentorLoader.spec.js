// The mentor arrives after the board (#91): the loader hands out one
// download, reports the engine only once it is here, and lets a failed
// download be tried again.
import { describe, it, expect } from 'vitest';
import { loadLogicEngine, loadedLogicEngine } from '../mentorLoader';

describe('mentor loader', () => {
  it('reports nothing until the engine has arrived, then the module itself', async () => {
    expect(loadedLogicEngine()).toBeNull();
    const first = loadLogicEngine();
    expect(loadLogicEngine()).toBe(first); // one download, shared
    const engine = await first;
    expect(typeof engine.findNextLogicStep).toBe('function');
    expect(loadedLogicEngine()).toBe(engine);
  });

  it('keeps the grid operations reachable from the engine for older callers', async () => {
    const engine = await loadLogicEngine();
    const ops = await import('../gridOps');
    for (const name of ['generateCandidates', 'eliminateCandidatesFromPeers', 'applyLogicStep', 'onlySinglesRemain']) {
      expect(engine[name]).toBe(ops[name]);
    }
  });
});
