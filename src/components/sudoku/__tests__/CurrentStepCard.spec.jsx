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

  it('nothing left: says so and can still show a single', () => {
    const onShowSingle = vi.fn();
    const { getByText, getByRole } = show({ nothingLeft: true, onShowSingle });
    expect(getByText('Every remaining cell is a single.')).toBeTruthy();
    fireEvent.click(getByRole('button', { name: 'Show me one anyway' }));
    expect(onShowSingle).toHaveBeenCalled();
  });
});
