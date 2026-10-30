// @vitest-environment jsdom
// What the counts cost the player.
//
// The rule from the panel-at-scale spec: no count is computed while the
// player is entering digits unless the panel is open and that technique is
// visible; entering a digit must not stutter; and a count that is not known
// yet says so rather than showing the number from the previous board.
//
// The detector is mocked here so the test can say exactly how many
// full-grid scans a keystroke causes - which is the thing that has to stay
// at zero as the catalog grows from sixteen techniques to fifty-odd.
//
// And which detectors run at all (#128). Counting is easiest-tier-first and
// stops at the first tier with an instance: a harder technique counted
// while an easier move is on the board is a number that is four times out
// of five about patterns the easier move will destroy. The player can still
// ask for a tier by hand.
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act, cleanup } from '@testing-library/react';

const scans = [];
vi.mock('../logicEngine', () => ({
  findAllTechniqueInstances: (grid, technique) => {
    scans.push(technique);
    return grid.instances?.[technique] ?? [];
  },
}));

const { useTechniqueCounts } = await import('../useTechniqueCounts');

const NAMES = ['Naked Single', 'Hidden Single', 'X-Wing'];
// Two tiers, easiest first, as the panel hands them over.
const GROUPS = [
  { tier: 'Basic', names: ['Naked Single', 'Hidden Single'] },
  { tier: 'Expert', names: ['X-Wing'] },
];

let latest = null;
function Probe({ grid, enabled, groups = GROUPS }) {
  latest = useTechniqueCounts(grid, { enabled, groups });
  return null;
}

const board = (instances = {}) => ({ instances });

beforeEach(() => {
  scans.length = 0;
  latest = null;
  vi.useFakeTimers();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

// The panel schedules its work for after the paint; let it happen.
const settle = () => act(() => { vi.advanceTimersByTime(1000); });

describe('counting techniques on the board', () => {
  it('computes nothing at all while the panel is closed', () => {
    const grid = board({ 'X-Wing': [1, 2] });
    render(<Probe grid={grid} enabled={false} />);
    settle();
    expect(scans).toEqual([]);
    expect(latest.counts).toEqual({});
    expect(latest.counting).toBe(false);
  });

  it('computes nothing in the render that follows a change', () => {
    const grid = board({ 'Naked Single': [1] });
    render(<Probe grid={grid} enabled />);
    // The frame the player is waiting for does no detector work at all.
    expect(scans).toEqual([]);
    expect(latest.counts).toEqual({});
    expect(latest.counting).toBe(true);
  });

  it('fills the counts in once the board has been still for a moment', () => {
    // Nothing easier applies, so every tier is worth counting.
    const grid = board({ 'X-Wing': [1, 2] });
    render(<Probe grid={grid} enabled />);
    settle();
    expect(scans.sort()).toEqual([...NAMES].sort());
    expect(latest.counts).toEqual({ 'Naked Single': 0, 'Hidden Single': 0, 'X-Wing': 2 });
    expect(latest.counting).toBe(false);
  });

  it('stops at the first tier that has something, and counts no harder one', () => {
    const grid = board({ 'Naked Single': [1], 'X-Wing': [1, 2] });
    render(<Probe grid={grid} enabled />);
    settle();
    // The whole of Basic, because the tier is the unit; nothing after it.
    expect(scans.sort()).toEqual(['Hidden Single', 'Naked Single']);
    expect(latest.counts).toEqual({ 'Naked Single': 1, 'Hidden Single': 0 });
    // And it says it has finished: a tier held back is not a tier pending.
    expect(latest.counting).toBe(false);
  });

  it('goes on to the next tier when the easier one is empty', () => {
    const grid = board({ 'X-Wing': [1] });
    render(<Probe grid={grid} enabled />);
    settle();
    expect(scans.sort()).toEqual([...NAMES].sort());
    expect(latest.counts['X-Wing']).toBe(1);
  });

  it('counts a tier the player asks for in spite of the gate', () => {
    const grid = board({ 'Naked Single': [1], 'X-Wing': [1, 2] });
    render(<Probe grid={grid} enabled />);
    settle();
    expect(latest.counts['X-Wing']).toBeUndefined();

    scans.length = 0;
    act(() => { latest.countTier(['X-Wing']); });
    expect(scans).toEqual(['X-Wing']);
    expect(latest.counts).toEqual({ 'Naked Single': 1, 'Hidden Single': 0, 'X-Wing': 2 });
  });

  it('does no work for a board the player has already changed', () => {
    const { rerender } = render(<Probe grid={board({ 'X-Wing': [1] })} enabled />);
    // A burst of digits: each change arrives before the previous count starts
    for (let i = 0; i < 12; i++) {
      act(() => {
        rerender(<Probe grid={board({ 'X-Wing': [1] })} enabled />);
        vi.advanceTimersByTime(20);
      });
    }
    expect(scans, 'a burst of digits should cost no detector runs').toEqual([]);
    settle();
    // Only the board the player stopped on is counted, and only once.
    expect(scans.sort()).toEqual([...NAMES].sort());
  });

  it('never shows a count from the previous board', () => {
    const first = board({ 'X-Wing': [1, 2, 3] });
    const { rerender } = render(<Probe grid={first} enabled />);
    settle();
    expect(latest.counts['X-Wing']).toBe(3);

    // The player places a digit: the old counts are gone immediately, not
    // after the new ones arrive.
    act(() => { rerender(<Probe grid={board({ 'X-Wing': [1] })} enabled />); });
    expect(latest.counts).toEqual({});
    expect(latest.counting).toBe(true);
    settle();
    expect(latest.counts['X-Wing']).toBe(1);
  });

  it('counts one technique on the spot when the player asks', () => {
    const grid = board({ 'BUG+1': [1] });
    render(<Probe grid={grid} enabled={false} />);
    let count;
    act(() => { count = latest.countNow('BUG+1'); });
    expect(count).toBe(1);
    expect(scans).toEqual(['BUG+1']);
    expect(latest.counts).toEqual({ 'BUG+1': 1 });
  });

  it('takes the counts a scan produced', () => {
    const grid = board({});
    render(<Probe grid={grid} enabled={false} />);
    act(() => { latest.recordCounts({ 'ALS-XZ': 4 }); });
    expect(latest.counts).toEqual({ 'ALS-XZ': 4 });
    expect(scans).toEqual([]);
    // and drops them when the board changes
    cleanup();
  });

  it('counts only the techniques it was asked for', () => {
    render(<Probe grid={board({})} enabled groups={[{ tier: 'Expert', names: ['X-Wing'] }]} />);
    settle();
    expect(scans).toEqual(['X-Wing']);
  });
});

// The hook can only stop at a tier boundary if it is given tiers. This is
// the wiring: flatten the groups into one list and every test above still
// passes while the panel quietly goes back to counting everything.
describe('the panel asks for the tiers in ladder order', () => {
  const noop = () => {};
  const panel = async (grid) => {
    const { default: LogicPanel } = await import('../LogicPanel');
    window.localStorage.setItem('sudoku-mentor:techniques-open', '1');
    return render(
      <LogicPanel
        currentStep={null}
        grid={grid}
        uniqueness="one"
        noAssistMode={false}
        onHighlightTechnique={noop}
        onNextStep={noop}
        onApplyStep={noop}
        onCancelHintSearch={noop}
        onAssistUsed={noop}
        onNextPuzzle={noop}
        onShowSingle={noop}
        getElapsedSeconds={() => 0}
      />
    );
  };

  it('runs the Basic detectors and stops, when a single is on the board', async () => {
    await panel(board({ 'Naked Single': [1], 'X-Wing': [1, 2], 'X-Cycle': [1] }));
    settle();
    // Two detectors for a board where twenty-two would have run, and the
    // nineteen harder ones would have been counting patterns the single is
    // about to destroy.
    expect(scans).toEqual(['Naked Single', 'Hidden Single']);
  });

  it('works down the ladder while every tier it tries is empty', async () => {
    await panel(board({ 'X-Wing': [1] }));
    settle();
    // Basic, Intermediate, Advanced and then the Expert tier that has it.
    expect(scans.slice(0, 2)).toEqual(['Naked Single', 'Hidden Single']);
    expect(scans).toContain('X-Wing');
    expect(scans.length).toBeGreaterThan(10);
    // and nothing from the tiers that are only ever counted on request
    expect(scans).not.toContain('X-Cycle');
  });
});
