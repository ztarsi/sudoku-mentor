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

let latest = null;
function Probe({ grid, enabled, names = NAMES }) {
  latest = useTechniqueCounts(grid, { enabled, names });
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
    const grid = board({ 'Naked Single': [1], 'X-Wing': [1, 2] });
    render(<Probe grid={grid} enabled />);
    settle();
    expect(scans.sort()).toEqual([...NAMES].sort());
    expect(latest.counts).toEqual({ 'Naked Single': 1, 'Hidden Single': 0, 'X-Wing': 2 });
    expect(latest.counting).toBe(false);
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
    render(<Probe grid={board({})} enabled names={['X-Wing']} />);
    settle();
    expect(scans).toEqual(['X-Wing']);
  });
});
