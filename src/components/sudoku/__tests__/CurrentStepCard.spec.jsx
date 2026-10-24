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

  // A set-based step (#73) walks the same way, but its links are not a
  // chain's: a Death Blossom takes one case for each number its stem could
  // be, and the card must not label a case "at least one of these two".
  it('a set step: one case per line, labelled as a case, under the deduction heading', () => {
    const blossom = {
      technique: 'Death Blossom',
      digit: 8,
      stemCell: 0,
      zDigit: 8,
      baseCells: [0, 27, 36, 8, 44],
      targetCells: [40],
      placement: null,
      eliminations: [{ cell: 40, digit: 8 }],
      subsetDigits: [2, 4, 8],
      explanation: 'Death Blossom on stem R1C1.',
      chainClosed: false,
      chainNodes: [
        { cells: [0], cell: 0, digit: null, digits: [2, 4], kind: 'cell', label: 'stem', truth: null, endpoint: false, linkToNext: null, linkVia: null, linkUnit: null, linkSet: null },
        { cells: [36], cell: 36, digit: 8, digits: null, kind: 'cell', label: null, truth: true, endpoint: true, linkToNext: null, linkVia: null, linkUnit: null, linkSet: null },
        { cells: [44], cell: 44, digit: 8, digits: null, kind: 'cell', label: null, truth: true, endpoint: true, linkToNext: null, linkVia: null, linkUnit: null, linkSet: null },
      ],
      chainLinks: [
        { from: 0, to: 1, type: 'case', via: 'stem', digit: 2, unit: { type: 'column', index: 0, name: 'column 1' }, set: { cells: [27, 36], digits: [2, 3, 8] } },
        { from: 0, to: 2, type: 'case', via: 'stem', digit: 4, unit: { type: 'column', index: 8, name: 'column 9' }, set: { cells: [8, 44], digits: [3, 4, 8] } },
      ],
    };
    const { getByText, getAllByText, queryByText, container } = show({ currentStep: blossom });
    expect(getByText('Death Blossom')).toBeTruthy();
    expect(container.querySelector('h3 + p')?.textContent).toBe('Ultimate');
    expect(container.querySelector('[data-tone="found"]')).not.toBeNull();
    expect(queryByText('Reasoning by trial')).toBeNull();
    // Walkable, as a case list rather than as a chain of links.
    expect(getByText('The argument, step by step:')).toBeTruthy();
    expect(getAllByText('if this, then')).toHaveLength(2);
    expect(queryByText('at least one')).toBeNull();
    expect(queryByText('at most one')).toBeNull();
    expect(container.textContent).toContain('If R1C1 is 2');
    expect(container.textContent).toContain('Link 1 of 2');
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
