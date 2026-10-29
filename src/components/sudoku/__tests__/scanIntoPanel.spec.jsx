// @vitest-environment jsdom
// Pressing Scan: where the answer goes, and what it costs (issue #105).
//
// Scan used to open a dialog over the board, tick thirty-three rows over at
// 100 ms each and leave the player to scroll past twenty-one of them reading
// "0 found". Three of the four seconds they waited were that pacing. The
// counts were already flowing into the Techniques panel through
// recordCounts, so the dialog was a second, worse copy of an answer the
// player already had, drawn on top of the board it described.
//
// What this file holds to is therefore about the orchestrator rather than
// about the copy (techniquePanel.spec.jsx covers that): no dialog opens,
// nothing is paced for the look of it, every count reaches the panel, the
// board changing still invalidates the run, and the press that asked for
// the scan keeps focus - which is the accessibility rule #109 set on the
// hint path and this path has to follow.
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act, cleanup, fireEvent, within } from '@testing-library/react';

// The detectors are mocked: this file is about what the panel does with
// counts, not about what the counts are. Each one is recorded, so a run the
// board has invalidated can be told from one that finished.
//
// `detectorCost` is how long one mocked detector takes. At zero the whole
// pass fits in a single slice, which is the point of the first tests: the
// work is the only thing the player waits for. A test that has to interrupt
// a scan sets it over the slice budget, so one slice runs one detector and
// the run can be stopped between two of them.
const detectorRuns = [];
const detectorCost = { ms: 0 };
let instances = {};
vi.mock('../logicEngine', () => ({
  findAllTechniqueInstances: (grid, technique) => {
    detectorRuns.push(technique);
    const until = performance.now() + detectorCost.ms;
    while (performance.now() < until) { /* the cost of a real detector */ }
    return Array.from({ length: instances[technique] ?? 0 }, (_, i) => ({ technique, i }));
  },
}));

const { default: LogicPanel } = await import('../LogicPanel');
const { SCAN_TECHNIQUES } = await import('../techniqueCatalog');
const { UNIQUENESS_ONE } = await import('../uniqueness');

// A grid this file never looks inside: identity is all the panel uses it
// for, and a fresh object is a fresh board.
const board = () => ({ board: Symbol('grid') });

const noop = () => {};
const panel = (props = {}) => (
  <LogicPanel
    currentStep={null}
    grid={board()}
    uniqueness={UNIQUENESS_ONE}
    noAssistMode={false}
    onHighlightTechnique={noop}
    onNextStep={noop}
    onApplyStep={noop}
    onCancelHintSearch={noop}
    onAssistUsed={noop}
    onNextPuzzle={noop}
    onShowSingle={noop}
    getElapsedSeconds={() => 0}
    {...props}
  />
);
const show = (props = {}) => render(panel(props));

/** Open the Techniques list, then the Ultimate tier, and press Scan. */
const pressScan = (view) => {
  fireEvent.click(view.getByRole('button', { name: /Techniques/ }));
  fireEvent.click(view.getByRole('button', { name: /^Ultimate/ }));
  const scan = view.getByRole('button', { name: /Scan this board/ });
  scan.focus();
  fireEvent.click(scan);
  return scan;
};

/** Run one slice of whatever is queued. */
const slice = () =>
  act(() => {
    vi.advanceTimersByTime(1);
  });

/**
 * Let every slice the scan queued run to the end.
 *
 * One millisecond per slice, and never enough of them in total to reach the
 * 150 ms the live counts wait before they start: this file measures the
 * scan's own pass, and a live count joining in would be another detector in
 * the record.
 */
const drain = () => {
  for (let i = 0; i < SCAN_TECHNIQUES.length + 5; i++) slice();
};

const section = (view, heading) => view.getByText(heading).parentElement;

beforeEach(() => {
  detectorRuns.length = 0;
  detectorCost.ms = 0;
  instances = {};
  window.localStorage.clear();
  // The clock is faked; the stopwatch the slice runner budgets against is
  // not, so a detector that costs something really does cost it.
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
});
afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

describe('pressing Scan', () => {
  it('opens no dialog: the board it describes stays on screen', () => {
    const view = show();
    pressScan(view);
    drain();
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(document.querySelector('[aria-modal="true"]')).toBeNull();
    expect(view.queryByText(/Scanning Ultimate Techniques/)).toBeNull();
  });

  it('waits for the detectors and for nothing else', () => {
    const view = show();
    pressScan(view);
    // The old pass slept 100 ms before each technique: thirty-three of them
    // could not finish inside 3300 ms, let alone one millisecond. These
    // detectors cost nothing, so the whole pass is one slice and the only
    // thing the player waits for is the work.
    slice();
    expect(detectorRuns).toEqual(SCAN_TECHNIQUES);
    expect(view.queryByTestId('scan-progress')).toBeNull();
    expect(view.getByTestId('scan-result')).toBeTruthy();
  });

  it('puts what it found at the top of the panel, beside the live counts', () => {
    instances = { 'X-Cycle': 2, 'ALS-XZ': 1 };
    const view = show();
    pressScan(view);
    drain();
    const applies = section(view, 'On this board');
    expect(within(applies).getByText('(2)')).toBeTruthy();
    expect(within(applies).getByText('(1)')).toBeTruthy();
    expect(view.getByTestId('scan-result').textContent).toContain(
      `2 of ${SCAN_TECHNIQUES.length} apply to this board`
    );
  });

  it('says nothing found in one line when nothing is there', () => {
    const view = show();
    pressScan(view);
    drain();
    expect(view.getByTestId('scan-result').textContent).toBe(
      'Nothing in this tier applies to this board.'
    );
    expect(view.queryByText(/0 found/)).toBeNull();
  });

  it('keeps focus on the button the player pressed', () => {
    const view = show();
    const scan = pressScan(view);
    drain();
    // The dialog used to take focus and hand it back on close; with no
    // dialog, focus must still never end up on <body> (#109).
    expect(document.activeElement).toBe(scan);
    expect(document.activeElement).not.toBe(document.body);
  });

  it('is invalidated by the board changing under it, as it always was', () => {
    instances = { 'X-Cycle': 2 };
    detectorCost.ms = 8; // over the slice budget, so the run can be caught part-way
    const grid = board();
    const view = show({ grid });
    pressScan(view);
    slice();
    const ranBefore = detectorRuns.length;
    expect(ranBefore).toBeGreaterThan(0);
    expect(ranBefore).toBeLessThan(SCAN_TECHNIQUES.length);

    view.rerender(panel({ grid: board() }));
    drain();

    // Nothing more was counted for the board the player has left, and no
    // result is claimed for the board they are now on.
    expect(detectorRuns.length).toBe(ranBefore);
    expect(view.queryByTestId('scan-result')).toBeNull();
    expect(view.queryByTestId('scan-progress')).toBeNull();
  });

  it('stops when the player cancels, and keeps what it had found', () => {
    instances = Object.fromEntries(SCAN_TECHNIQUES.map((name) => [name, 1]));
    detectorCost.ms = 8;
    const view = show();
    pressScan(view);
    slice();
    const ranBefore = detectorRuns.length;
    fireEvent.click(view.getByRole('button', { name: /Cancel/ }));
    drain();

    expect(detectorRuns.length).toBe(ranBefore);
    const result = view.getByTestId('scan-result').textContent;
    expect(result).toContain(`Stopped at ${ranBefore} of ${SCAN_TECHNIQUES.length}`);
    expect(result).toContain('so far');
    expect(within(section(view, 'On this board')).getAllByText('(1)').length).toBe(ranBefore);
  });
});
