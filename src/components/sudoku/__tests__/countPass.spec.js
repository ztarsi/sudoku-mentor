// The background count pass (#126): where the panel's counts are computed.
//
// Two routes, one behaviour. Where workers exist the pass runs in one
// long-lived worker (count.worker.js), so no detector, however dear, can
// stutter the board; that is what retired the Scan button. Where they do
// not, or the worker fails to load, the same pass runs on the main thread
// in slices. Either way: tiers are counted easiest first, a gated pass
// stops after the first tier with something in it (#128), a cancelled pass
// says nothing more, and a result for a board the player has left is
// dropped.
//
// The detectors are mocked: this file is about the pass, not the counts.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const runs = [];
vi.mock('../logicEngine', () => ({
  findAllTechniqueInstances: (grid, technique) => {
    runs.push(technique);
    return Array.from({ length: grid.instances?.[technique] ?? 0 }, (_, i) => i);
  },
}));

const GROUPS = [
  { tier: 'Basic', names: ['Naked Single', 'Hidden Single'] },
  { tier: 'Expert', names: ['X-Wing'] },
  { tier: 'Ultimate', names: ['X-Cycle', 'ALS-XZ'] },
];
/** @returns {any} a grid this file never looks inside but for its instances */
const board = (instances = {}) => ({ instances, map: () => [] });

/** A pass's callbacks, recorded. */
const recorder = () => {
  const counts = {};
  const done = vi.fn();
  return { counts, done, onCount: (name, count) => { counts[name] = count; }, onDone: done };
};

beforeEach(() => {
  runs.length = 0;
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.resetModules();
});

const settle = () => vi.advanceTimersByTime(1000);

describe('the pass on the main thread, where there is no worker', () => {
  // Node has no Worker, which is exactly the fallback's situation.
  const load = async () => (await import('../countPass')).startCountPass;

  it('counts tier by tier and stops after the first tier with something in it', async () => {
    const startCountPass = await load();
    const r = recorder();
    startCountPass(board({ 'X-Wing': 1, 'X-Cycle': 2 }), GROUPS, { onCount: r.onCount, onDone: r.onDone });
    settle();
    // Basic was empty, Expert had the X-Wing: the whole of Expert, and
    // nothing of Ultimate, where the X-Cycle a single X-Wing may undo is.
    expect(runs).toEqual(['Naked Single', 'Hidden Single', 'X-Wing']);
    expect(r.counts).toEqual({ 'Naked Single': 0, 'Hidden Single': 0, 'X-Wing': 1 });
    expect(r.done).toHaveBeenCalledTimes(1);
  });

  it('counts every name it is given when it is not gated', async () => {
    const startCountPass = await load();
    const r = recorder();
    startCountPass(board({ 'Naked Single': 1 }), GROUPS, { gate: false, onCount: r.onCount, onDone: r.onDone });
    settle();
    expect(runs).toEqual(GROUPS.flatMap((group) => group.names));
    expect(r.done).toHaveBeenCalledTimes(1);
  });

  it('waits for the board to be still before doing anything', async () => {
    const startCountPass = await load();
    const r = recorder();
    startCountPass(board(), GROUPS, { delayMs: 150, onCount: r.onCount, onDone: r.onDone });
    vi.advanceTimersByTime(100);
    expect(runs).toEqual([]);
    settle();
    expect(runs.length).toBeGreaterThan(0);
  });

  it('says nothing at all once cancelled', async () => {
    const startCountPass = await load();
    const r = recorder();
    const cancel = startCountPass(board({ 'X-Cycle': 1 }), GROUPS, { onCount: r.onCount, onDone: r.onDone });
    cancel();
    cancel(); // safe twice
    settle();
    expect(runs).toEqual([]);
    expect(r.counts).toEqual({});
    expect(r.done).not.toHaveBeenCalled();
  });

  it('finishes at once when there is nothing to count', async () => {
    const startCountPass = await load();
    const r = recorder();
    startCountPass(board(), [{ tier: 'Basic', names: [] }], { onCount: r.onCount, onDone: r.onDone });
    expect(r.done).toHaveBeenCalledTimes(1);
    settle();
    expect(runs).toEqual([]);
  });
});

describe('the pass in a worker', () => {
  // A stand-in for the browser's Worker, speaking count.worker.js's
  // protocol: { type: 'count' | 'cancel', id, ... } in, { id, name, count }
  // and { id, done: true } out. The test plays the worker's side.
  let workers;
  class FakeWorker {
    constructor(url, options) {
      this.url = String(url);
      this.options = options;
      this.sent = [];
      this.terminated = false;
      this.onmessage = null;
      this.onerror = null;
      workers.push(this);
    }
    postMessage(message) { this.sent.push(message); }
    terminate() { this.terminated = true; }
    reply(data) { this.onmessage?.({ data }); }
  }
  const load = async () => {
    workers = [];
    vi.stubGlobal('Worker', FakeWorker);
    vi.resetModules();
    return (await import('../countPass')).startCountPass;
  };

  it('hands the pass to the worker, as plain data, after the board is still', async () => {
    const startCountPass = await load();
    const r = recorder();
    const grid = [{ value: null, isFixed: false, candidates: [1, 2], highlightColor: 'red' }];
    startCountPass(grid, GROUPS, { uniqueness: 'one', onCount: r.onCount, onDone: r.onDone });
    expect(workers).toHaveLength(0); // nothing before the wait
    settle();
    expect(workers).toHaveLength(1);
    expect(workers[0].url).toContain('count.worker');
    const [message] = workers[0].sent;
    expect(message).toMatchObject({ type: 'count', groups: GROUPS, uniqueness: 'one', gate: true });
    expect(message.grid).toEqual([{ value: null, isFixed: false, candidates: [1, 2] }]);
    // and nothing ran on the main thread
    expect(runs).toEqual([]);

    workers[0].reply({ id: message.id, name: 'Naked Single', count: 3 });
    workers[0].reply({ id: message.id, done: true });
    expect(r.counts).toEqual({ 'Naked Single': 3 });
    expect(r.done).toHaveBeenCalledTimes(1);
  });

  it('keeps one worker for every pass, rather than one each', async () => {
    const startCountPass = await load();
    startCountPass(board(), GROUPS, { onCount: () => {} });
    settle();
    startCountPass(board(), GROUPS, { onCount: () => {} });
    settle();
    expect(workers).toHaveLength(1);
    expect(workers[0].sent.filter((m) => m.type === 'count')).toHaveLength(2);
  });

  it('stops a lone pass at once by ending the worker, and the next pass gets a new one', async () => {
    const startCountPass = await load();
    const r = recorder();
    const cancel = startCountPass(board(), GROUPS, { onCount: r.onCount, onDone: r.onDone });
    settle();
    const { id } = workers[0].sent[0];
    cancel();
    // Nothing else was running in it, so it is terminated rather than told:
    // a cancel message would wait for the detector under way to finish.
    expect(workers[0].terminated).toBe(true);
    // Anything already on its way is dropped: that board is gone.
    workers[0].reply({ id, name: 'X-Cycle', count: 2 });
    workers[0].reply({ id, done: true });
    expect(r.counts).toEqual({});
    expect(r.done).not.toHaveBeenCalled();
    startCountPass(board(), GROUPS, { onCount: () => {} });
    settle();
    expect(workers).toHaveLength(2);
  });

  it('tells the worker to drop one pass when another is still running in it', async () => {
    const startCountPass = await load();
    const r = recorder();
    const tier = recorder();
    const cancel = startCountPass(board(), GROUPS, { onCount: r.onCount, onDone: r.onDone });
    startCountPass(board(), GROUPS, { delayMs: 0, gate: false, onCount: tier.onCount, onDone: tier.onDone });
    settle();
    // The tier pass has no wait, so it reaches the worker first; tell them
    // apart by the gate, which only the board's own pass has.
    const { id } = workers[0].sent.find((m) => m.gate === true);
    const { id: tierId } = workers[0].sent.find((m) => m.gate === false);
    cancel();
    // The other pass is still using the worker, so it is not terminated;
    // the cancelled pass stops at the next detector boundary.
    expect(workers[0].terminated).toBe(false);
    expect(workers[0].sent.at(-1)).toEqual({ type: 'cancel', id });
    workers[0].reply({ id, name: 'X-Cycle', count: 2 });
    workers[0].reply({ id: tierId, name: 'X-Cycle', count: 3 });
    expect(r.counts).toEqual({});
    expect(tier.counts).toEqual({ 'X-Cycle': 3 });
  });

  it('ends a pass whose detector threw, keeping what it had counted', async () => {
    const startCountPass = await load();
    const r = recorder();
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    startCountPass(board(), GROUPS, { onCount: r.onCount, onDone: r.onDone });
    settle();
    const { id } = workers[0].sent[0];
    workers[0].reply({ id, name: 'X-Cycle', count: 1 });
    workers[0].reply({ id, done: true, error: 'boom' });
    expect(r.counts).toEqual({ 'X-Cycle': 1 });
    expect(r.done).toHaveBeenCalledTimes(1);
    expect(errors).toHaveBeenCalled();
    errors.mockRestore();
  });

  it('never posts a pass that was cancelled before the board went still', async () => {
    const startCountPass = await load();
    const cancel = startCountPass(board(), GROUPS, { onCount: () => {} });
    cancel();
    settle();
    expect(workers).toHaveLength(0);
  });

  it('keeps one pass from hearing another pass\'s counts', async () => {
    const startCountPass = await load();
    const first = recorder();
    const second = recorder();
    startCountPass(board(), GROUPS, { onCount: first.onCount, onDone: first.onDone });
    settle();
    startCountPass(board(), GROUPS, { onCount: second.onCount, onDone: second.onDone });
    settle();
    const [a, b] = workers[0].sent.map((m) => m.id);
    workers[0].reply({ id: b, name: 'X-Wing', count: 1 });
    expect(first.counts).toEqual({});
    expect(second.counts).toEqual({ 'X-Wing': 1 });
    expect(a).not.toBe(b);
  });

  it('falls back to the main thread when the worker fails, and the counts still arrive', async () => {
    const startCountPass = await load();
    const r = recorder();
    startCountPass(board({ 'X-Wing': 2 }), GROUPS, { onCount: r.onCount, onDone: r.onDone });
    settle();
    expect(runs).toEqual([]);
    // Offline before the worker's code was cached, say.
    workers[0].onerror({ preventDefault: () => {} });
    expect(workers[0].terminated).toBe(true);
    settle();
    expect(runs).toEqual(['Naked Single', 'Hidden Single', 'X-Wing']);
    expect(r.counts['X-Wing']).toBe(2);
    expect(r.done).toHaveBeenCalledTimes(1);

    // And later passes go straight to the main thread, not to a new worker.
    const later = recorder();
    startCountPass(board({ 'Naked Single': 1 }), GROUPS, { onCount: later.onCount, onDone: later.onDone });
    settle();
    expect(workers).toHaveLength(1);
    expect(later.counts['Naked Single']).toBe(1);
  });
});
