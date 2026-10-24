// @vitest-environment jsdom
// One designed card per situation (hint-card-states spec).
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import CurrentStepCard from '../panel/CurrentStepCard';

const noop = () => {};
const base = {
  currentStep: null, grid: null, noAssistMode: false, onNextStep: noop, onApplyStep: noop,
  onSelectTechnique: noop, chainPlaybackIndex: 0, onChainPlaybackChange: noop, isPlayingChain: false, onToggleChainPlayback: noop,
};
const show = (props) => render(<CurrentStepCard {...base} {...props} />);
afterEach(() => cleanup());

describe('CurrentStepCard states', () => {
  it('idle: one line and the Hint button', () => {
    const onNextStep = vi.fn();
    const { getByText, getByRole } = show({ onNextStep });
    expect(getByText('Stuck? Ask for a hint.')).toBeTruthy();
    fireEvent.click(getByRole('button', { name: 'Get a hint' }));
    expect(onNextStep).toHaveBeenCalled();
  });

  it('found: technique and tier as the heading, every digit as a chip, Apply and Next hint, legend from this hint', () => {
    const onApplyStep = vi.fn();
    const step = {
      technique: 'Naked Pair', digit: 1, pairDigits: [1, 2], baseCells: [3, 4], targetCells: [5], placement: null,
      eliminations: [{ cell: 5, digit: 1 }, { cell: 5, digit: 2 }], explanation: 'x', unit: { type: 'row', index: 0, name: 'row 1' },
    };
    const { getByText, getAllByLabelText, getByRole, container } = show({ currentStep: step, onApplyStep });
    expect(getByText('Naked Pair')).toBeTruthy();
    expect(getByText('Advanced')).toBeTruthy();
    expect(getAllByLabelText(/^digit \d$/).map((e) => e.textContent)).toEqual(['1', '2']);
    expect(getAllByLabelText(/^erases \d$/).map((e) => e.textContent)).toEqual(['−1', '−2']);
    fireEvent.click(getByRole('button', { name: 'Apply' }));
    expect(onApplyStep).toHaveBeenCalled();
    expect(getByRole('button', { name: 'Next hint' })).toBeTruthy();
    expect(container.textContent).toContain('R1C4 means row 1, column 4.');
    expect(container.querySelector('[data-tone="found"]')).not.toBeNull();
  });

  it('a uniqueness step: the rectangle is drawn as a rectangle, odd corner apart', () => {
    const cells = [0, 3, 9, 12]; // R1C1, R1C4, R2C1, R2C4
    const grid = Array.from({ length: 81 }, (_, i) => ({
      value: null,
      candidates: cells.includes(i) ? (i === 12 ? [1, 2, 3] : [1, 2]) : [4, 5],
    }));
    const step = {
      technique: 'Unique Rectangle Type 1',
      digit: null,
      baseCells: cells,
      rectangle: { corners: cells, floor: [0, 3, 9], roof: [12] },
      pairDigits: [1, 2],
      targetCells: [12],
      placement: null,
      eliminations: [{ cell: 12, digit: 1 }, { cell: 12, digit: 2 }],
      explanation: 'x',
    };
    const { getByText, container } = show({ currentStep: step, grid });
    // All four corners, named, with their marks
    for (const name of ['R1C1', 'R1C4', 'R2C1', 'R2C4']) expect(getByText(name)).toBeTruthy();
    expect(getByText('1 2 3')).toBeTruthy();
    expect(getByText(/the one in amber is the odd one out/)).toBeTruthy();
    // The odd corner is drawn apart from the three that match
    const amber = container.querySelectorAll('.border-amber-600\\/70');
    expect(amber.length).toBe(1);
  });

  it('a unique loop: the ring, in the order it closes', () => {
    const loop = [0, 3, 12, 15, 24, 18];
    const grid = Array.from({ length: 81 }, (_, i) => ({
      value: null,
      candidates: loop.includes(i) ? (i === 15 ? [1, 2, 3] : [1, 2]) : [4, 5],
    }));
    const step = {
      technique: 'Unique Loop',
      digit: null,
      baseCells: loop,
      loopCells: loop,
      pairDigits: [1, 2],
      targetCells: [15],
      placement: null,
      eliminations: [{ cell: 15, digit: 1 }, { cell: 15, digit: 2 }],
      explanation: 'x',
    };
    const { getByText, container } = show({ currentStep: step, grid });
    expect(getByText(/The ring closes back on itself/)).toBeTruthy();
    expect(container.textContent).toContain('R1C1');
    expect(container.textContent).toContain('R3C1');
  });

  it('what-if: a visibly different heading and tone', () => {
    const step = {
      technique: 'Hypothesis Mode', digit: 8, baseCells: [0], targetCells: [40], contradictionCell: 40, contradictoryDigit: 3,
      placement: { cell: 0, digit: 8 }, eliminations: [], chain: [{ action: 'place', cell: 0, value: 3, reason: 'Initial assumption' }], explanation: 'x',
    };
    const { getByText, container } = show({ currentStep: step });
    expect(getByText('Reasoning by trial')).toBeTruthy();
    expect(getByText(/No named technique applies/)).toBeTruthy();
    expect(container.querySelector('[data-tone="whatif"]')).not.toBeNull();
  });

  it('searching: the wait and a Cancel button', () => {
    const onCancelSearch = vi.fn();
    const { getByText, getByRole } = show({ searching: true, onCancelSearch });
    expect(getByText('Looking for a what-if chain...')).toBeTruthy();
    fireEvent.click(getByRole('button', { name: 'Cancel' }));
    expect(onCancelSearch).toHaveBeenCalled();
  });

  it('No Assist: the clock and the reason', () => {
    const { getByText } = show({ noAssistMode: true, getElapsedSeconds: () => 125 });
    expect(getByText('2:05')).toBeTruthy();
    expect(getByText('Hints are off in No Assist.')).toBeTruthy();
  });

  it('solved: techniques used, the ones the player placed, and the next-puzzle actions', () => {
    const onNextPuzzle = vi.fn();
    const lessonLog = [
      { id: 1, technique: 'Naked Single', placement: { cell: 0, digit: 1 }, byPlayer: true },
      { id: 2, technique: 'Naked Single', placement: { cell: 1, digit: 2 }, byPlayer: false },
      { id: 3, technique: 'X-Wing', placement: null, byPlayer: null },
    ];
    const { getByText, getByRole } = show({ solved: { timeInSeconds: 61, errorCount: 0 }, lessonLog, onNextPuzzle });
    expect(getByText('Solved')).toBeTruthy();
    expect(getByText('1:01 · no errors')).toBeTruthy();
    expect(getByText('Naked Single ×2')).toBeTruthy();
    expect(getByText(/you placed 1 of 2 yourself/)).toBeTruthy();
    expect(getByText('X-Wing')).toBeTruthy();
    fireEvent.click(getByRole('button', { name: /Next puzzle on this shelf/ }));
    expect(onNextPuzzle).toHaveBeenCalledWith('same');
    fireEvent.click(getByRole('button', { name: 'Try the shelf above' }));
    expect(onNextPuzzle).toHaveBeenCalledWith('above');
  });

  it('solved on the top shelf has no "shelf above"', () => {
    const { queryByRole } = show({ solved: { timeInSeconds: 1, errorCount: 2 }, lessonLog: [], canGoUp: false });
    expect(queryByRole('button', { name: 'Try the shelf above' })).toBeNull();
  });

  it('only singles left: says the marks say the rest and still shows the next one', () => {
    const onShowSingle = vi.fn();
    const { getByText, getByRole } = show({ nothingLeft: true, onShowSingle });
    expect(getByText('Only singles left')).toBeTruthy();
    expect(getByText('Every empty cell now shows a single pencil mark; write them in to finish.')).toBeTruthy();
    fireEvent.click(getByRole('button', { name: 'Show me the next one' }));
    expect(onShowSingle).toHaveBeenCalled();
  });
});
