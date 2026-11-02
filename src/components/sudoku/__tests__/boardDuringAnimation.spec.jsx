// @vitest-environment jsdom
// While the animation plays, it owns the picture (#97).
//
// Everything the board draws for a step at rest - the highlighted cells,
// the marks the step is about, the chain it stands on and above all the red
// marks it is about to erase - stands down while the animation is running.
// An animation that opens on its own answer has nothing left to show, and
// that is the one way this feature can be useless while still working.
import React from 'react';
import { describe, it, expect, afterEach, beforeAll } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';
import SudokuGrid from '../SudokuGrid';
import { setHintAnimation } from '../hintAnimation';
import { buildRemovalMap } from '../stepHighlights';
import { DEFAULT_COLORS } from '../colors';

// jsdom has neither a ResizeObserver nor a layout, and the board measures
// itself with both to size its overlays. A fixed 450px board is all this
// needs; without it every overlay sits out at zero size.
beforeAll(() => {
  globalThis.ResizeObserver = /** @type {any} */ (class {
    constructor(callback) { this.callback = callback; }
    observe() { this.callback([{ contentRect: { width: 450 } }]); }
    unobserve() {}
    disconnect() {}
  });
  Element.prototype.getBoundingClientRect = /** @type {any} */ (() => ({
    width: 450, height: 450, top: 0, left: 0, right: 450, bottom: 450, x: 0, y: 0,
  }));
});

const emptyCell = (i) => ({
  cellIndex: i, value: null, isFixed: false, candidates: [1, 2, 5],
  isHighlighted: false, highlightColor: null, isBaseCell: false, isTargetCell: false,
});
const grid = Array.from({ length: 81 }, (_, i) => emptyCell(i));

const step = {
  technique: 'X-Chain',
  digit: 5,
  baseCells: [0, 2],
  targetCells: [20],
  placement: null,
  eliminations: [{ cell: 20, digit: 5 }],
  explanation: 'An X-Chain on 5.',
  chainClosed: false,
  chainNodes: [
    { cells: [0], cell: 0, digit: 5, kind: 'candidate', truth: null, endpoint: true, linkToNext: 'strong', linkVia: 'unit', linkUnit: { name: 'row 1' }, linkSet: null },
    { cells: [2], cell: 2, digit: 5, kind: 'candidate', truth: null, endpoint: true, linkToNext: null, linkVia: null, linkUnit: null, linkSet: null },
  ],
};

const frames = [
  { caption: 'Look at the 5s.', regions: [], lines: [], rings: [{ cell: 0, color: '#3b82f6' }], crosses: [], ghosts: [], place: null },
  { caption: 'So erase it.', regions: [], lines: [], rings: [], crosses: [20], ghosts: [], place: null },
];

const board = () => (
  <SudokuGrid
    grid={grid}
    selectedCell={null}
    focusedDigit={null}
    focusedCandidates={{ 5: DEFAULT_COLORS.focusDigit }}
    removalCandidates={buildRemovalMap(step)}
    highlightedDigit={null}
    validationErrors={[]}
    candidateMode={false}
    candidatesVisible
    colors={DEFAULT_COLORS}
    currentStep={step}
    highlightedSteps={[step]}
    maxSize={450}
    onCellClick={() => {}}
    onCellInput={() => {}}
    onToggleCandidate={() => {}}
  />
);

/**
 * The pencil marks the step itself draws. The board fills a mark it is
 * about and writes it in black over the fill, so a black mark is one the
 * step has claimed - the ones it erases among them.
 */
const stepMarks = (container) =>
  [...container.querySelectorAll('[style]')].filter(
    (el) => /** @type {HTMLElement} */ (el).style.color === 'rgb(0, 0, 0)'
  ).length;

afterEach(() => {
  cleanup();
  setHintAnimation(null);
});

describe('the board while an animation plays', () => {
  it('shows the step at rest when nothing is playing', () => {
    const { container } = render(board());
    expect(stepMarks(container)).toBeGreaterThan(0);
    expect(container.querySelector('[data-testid="chain-overlay"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="hint-animation-overlay"]')).toBeNull();
  });

  it('gives the answer away no longer, once the animation owns the picture', () => {
    const { container } = render(board());
    act(() => setHintAnimation({ frames, index: 0, playing: false }));
    // The red marks are gone: the animation reaches them in its own time.
    expect(stepMarks(container)).toBe(0);
    // So is the step's own chain, which would draw the whole proof at once.
    expect(container.querySelector('[data-testid="chain-overlay"]')).toBeNull();
    // And the animation's own picture is there instead.
    expect(container.querySelector('[data-testid="hint-animation-overlay"]')).not.toBeNull();
  });

  it('hands the picture back when the animation closes', () => {
    const { container } = render(board());
    act(() => setHintAnimation({ frames, index: 0, playing: false }));
    act(() => setHintAnimation(null));
    expect(stepMarks(container)).toBeGreaterThan(0);
    expect(container.querySelector('[data-testid="chain-overlay"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="hint-animation-overlay"]')).toBeNull();
  });
});
