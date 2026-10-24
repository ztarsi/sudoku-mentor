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

  // A chain is a deduction, not a trial, and its proof is a sequence the
  // player steps through rather than a wall of text (#67).
  const chainStep = {
    technique: 'Skyscraper',
    digit: 5,
    baseCells: [4, 0, 54, 59],
    targetCells: [14, 23],
    placement: null,
    eliminations: [{ cell: 14, digit: 5 }, { cell: 23, digit: 5 }],
    explanation: 'Alternating inference chain (5)R1C5 = (5)R1C1 - (5)R7C1 = (5)R7C6',
    chainNotation: '(5)R1C5 = (5)R1C1 - (5)R7C1 = (5)R7C6',
    chainClosed: false,
    chainNodes: [
      { cells: [4], cell: 4, digit: 5, kind: 'cell', truth: false, endpoint: true, linkToNext: 'strong', linkVia: 'unit', linkUnit: { type: 'row', index: 0, name: 'row 1' }, linkSet: null },
      { cells: [0], cell: 0, digit: 5, kind: 'cell', truth: true, endpoint: false, linkToNext: 'weak', linkVia: 'unit', linkUnit: { type: 'column', index: 0, name: 'column 1' }, linkSet: null },
      { cells: [54], cell: 54, digit: 5, kind: 'cell', truth: false, endpoint: false, linkToNext: 'strong', linkVia: 'unit', linkUnit: { type: 'row', index: 6, name: 'row 7' }, linkSet: null },
      { cells: [59], cell: 59, digit: 5, kind: 'cell', truth: true, endpoint: true, linkToNext: null, linkVia: null, linkUnit: null, linkSet: null },
    ],
  };

  it('a chain: the deduction heading and tone, never the what-if one', () => {
    const { getByText, queryByText, container } = show({ currentStep: chainStep });
    expect(getByText('Skyscraper')).toBeTruthy();
    // The tier, in the heading - 'Expert' is also the explanation toggle,
    // so look for it where the card states the technique's tier.
    expect(container.querySelector('h3 + p')?.textContent).toBe('Expert');
    expect(queryByText('Reasoning by trial')).toBeNull();
    expect(container.querySelector('[data-tone="found"]')).not.toBeNull();
    expect(container.querySelector('[data-tone="whatif"]')).toBeNull();
  });

  it('a chain: one line per link, each labelled by what it proves', () => {
    const { getByText, getAllByText, container } = show({ currentStep: chainStep });
    expect(getByText('The chain, link by link:')).toBeTruthy();
    expect(getAllByText('at least one')).toHaveLength(2);
    expect(getAllByText('at most one')).toHaveLength(1);
    expect(container.textContent).toContain('Link 1 of 3');
  });

  it('a chain: the player can step through it link by link', () => {
    const onChainPlaybackChange = vi.fn();
    const { getByRole } = show({ currentStep: chainStep, onChainPlaybackChange });
    fireEvent.click(getByRole('button', { name: 'Next chain link' }));
    expect(onChainPlaybackChange).toHaveBeenCalledWith(1);
    expect(getByRole('button', { name: 'Previous chain link' }).hasAttribute('disabled')).toBe(true);
    fireEvent.click(getByRole('button', { name: 'Walk the chain' }));
  });

  it('a continuous loop says it is a loop', () => {
    const loop = {
      ...chainStep,
      technique: 'Continuous Loop',
      chainClosed: true,
      chainNodes: chainStep.chainNodes.map((n, i) =>
        i === 3 ? { ...n, linkToNext: 'weak', linkVia: 'cell', endpoint: false } : { ...n, endpoint: false }
      ),
    };
    const { getByText, container } = show({ currentStep: loop });
    expect(getByText('Round the loop:')).toBeTruthy();
    expect(container.textContent).toContain('Link 1 of 4');
  });

  // A colouring's proof is a network, so the card walks the run of links
  // that decides it and ends on what the two ends prove (#82).
  const colouringStep = {
    technique: 'X-Cycle',
    digit: 5,
    baseCells: [0, 2, 20],
    targetCells: [0, 20],
    placement: null,
    eliminations: [{ cell: 0, digit: 5 }, { cell: 20, digit: 5 }],
    explanation: 'Simple coloring on digit 5.',
    chainColouring: true,
    colorRule: 'wrap',
    colorWitness: [{ cell: 0, digit: 5 }, { cell: 20, digit: 5 }],
    colorGroups: [[2], [0, 20]],
    chainNodes: [
      { cells: [0], cell: 0, digit: 5, kind: 'candidate', color: 1, truth: null, endpoint: true, linkToNext: 'strong', linkVia: 'unit', linkUnit: { name: 'row 1' }, linkSet: null },
      { cells: [2], cell: 2, digit: 5, kind: 'candidate', color: 2, truth: null, endpoint: false, linkToNext: 'strong', linkVia: 'unit', linkUnit: { name: 'column 3' }, linkSet: null },
      { cells: [20], cell: 20, digit: 5, kind: 'candidate', color: 1, truth: null, endpoint: true, linkToNext: null, linkVia: null, linkUnit: null, linkSet: null },
    ],
  };

  it('a colouring: the same walk as a chain, one line per link and one for the clash', () => {
    const { getByText, getAllByText, container } = show({ currentStep: colouringStep });
    expect(getByText('How the colouring spreads:')).toBeTruthy();
    expect(getAllByText('exactly one')).toHaveLength(2);
    expect(getAllByText('so that colour is out')).toHaveLength(1);
    expect(container.textContent).toContain('Step 1 of 3');
    expect(container.textContent).toContain('the only two places for 5 are R1C1 and R1C3');
    expect(container.textContent).toContain('have come out the same colour');
  });

  it('a colouring: the player can step through it', () => {
    const onChainPlaybackChange = vi.fn();
    const { getByRole } = show({ currentStep: colouringStep, onChainPlaybackChange });
    fireEvent.click(getByRole('button', { name: 'Next chain link' }));
    expect(onChainPlaybackChange).toHaveBeenCalledWith(1);
    fireEvent.click(getByRole('button', { name: 'Walk the colouring' }));
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
