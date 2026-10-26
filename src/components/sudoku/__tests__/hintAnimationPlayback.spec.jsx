// @vitest-environment jsdom
// The one playback there is (#97): the controls under the board, and what
// they do when the player has asked their system for less motion.
import React from 'react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, fireEvent, cleanup, act } from '@testing-library/react';
import HintAnimationControls from '../HintAnimationControls';
import HintAnimationOverlay from '../HintAnimationOverlay';
import HintAnimator from '../panel/HintAnimator';
import { setHintAnimation, startHintAnimation } from '../hintAnimation';

/** Tell the page whether the player has asked for less motion. */
const setReducedMotion = (reduce) => {
  window.matchMedia = /** @type {any} */ ((query) => ({
    matches: query.includes('prefers-reduced-motion') ? reduce : false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
  }));
};

const frames = [
  { caption: 'First, look at the 5s.', regions: [], lines: [], rings: [{ cell: 0, color: '#3b82f6' }], crosses: [], ghosts: [], place: null },
  { caption: 'Then follow the link.', regions: [], lines: [{ from: 0, to: 2, color: '#facc15' }], rings: [], crosses: [], ghosts: [], place: null },
  { caption: 'So erase the 5 there.', regions: [], lines: [], rings: [], crosses: [20], ghosts: [], place: null },
];

const chainStep = {
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

const single = {
  technique: 'Naked Single', digit: 4, baseCells: [5], targetCells: [5],
  placement: { cell: 5, digit: 4 }, eliminations: [], explanation: 'Only one mark left.',
};

beforeEach(() => setReducedMotion(false));
afterEach(() => {
  cleanup();
  setHintAnimation(null);
  vi.useRealTimers();
});

describe('the controls under the board', () => {
  it('say nothing while nothing is playing', () => {
    const { container } = render(<HintAnimationControls />);
    expect(container.firstChild).toBeNull();
  });

  it('show the caption, the count, and one set of controls', () => {
    act(() => startHintAnimation(frames));
    const { container, getByRole } = render(<HintAnimationControls />);
    expect(container.textContent).toContain('First, look at the 5s.');
    expect(container.textContent).toContain('Step 1 of 3');
    expect(getByRole('button', { name: 'Previous' }).hasAttribute('disabled')).toBe(true);
    for (const label of ['Previous', 'Next', 'Show result', 'Close animation']) {
      expect(container.querySelectorAll(`[aria-label="${label}"]`), label).toHaveLength(1);
    }
    // One play control, whichever way round it reads.
    expect(container.querySelectorAll('[aria-label="Play"], [aria-label="Pause"]')).toHaveLength(1);
  });

  it('steps forward and back, jumps to the result, and closes', () => {
    act(() => startHintAnimation(frames));
    const { container, getByRole } = render(<HintAnimationControls />);
    fireEvent.click(getByRole('button', { name: 'Next' }));
    expect(container.textContent).toContain('Then follow the link.');
    fireEvent.click(getByRole('button', { name: 'Previous' }));
    expect(container.textContent).toContain('First, look at the 5s.');
    fireEvent.click(getByRole('button', { name: 'Show result' }));
    expect(container.textContent).toContain('So erase the 5 there.');
    expect(container.textContent).toContain('Step 3 of 3');
    // At the end, Play becomes Replay rather than a dead button.
    expect(getByRole('button', { name: 'Replay' })).toBeTruthy();
    fireEvent.click(getByRole('button', { name: 'Close animation' }));
    expect(container.firstChild).toBeNull();
  });

  it('plays by itself, a frame at a time', () => {
    vi.useFakeTimers();
    act(() => startHintAnimation(frames));
    const { container } = render(<HintAnimationControls />);
    expect(container.textContent).toContain('Step 1 of 3');
    act(() => { vi.advanceTimersByTime(3500); });
    expect(container.textContent).toContain('Step 2 of 3');
    act(() => { vi.advanceTimersByTime(3500); });
    expect(container.textContent).toContain('Step 3 of 3');
    // And stops at the end rather than looping round.
    act(() => { vi.advanceTimersByTime(3500 * 3); });
    expect(container.textContent).toContain('Step 3 of 3');
  });
});

// A feature whose whole job is motion has to be usable by someone who has
// asked their system for less of it: the frames still change, nothing
// moves on its own, and nothing starts without being asked.
describe('when the player has asked for less motion', () => {
  it('does not start playing by itself', () => {
    setReducedMotion(true);
    vi.useFakeTimers();
    // The card and the controls together, the way the page has them: the
    // animator unmounting is what clears an animation, so it stays put.
    const { container, getByRole } = render(
      <>
        <HintAnimator step={chainStep} grid={null} level="simple" />
        <HintAnimationControls />
      </>
    );
    fireEvent.click(getByRole('button', { name: /Animate on the board/ }));
    expect(container.textContent).toContain('Step 1 of');
    act(() => { vi.advanceTimersByTime(3500 * 4); });
    // Still on the first frame: nothing advanced on its own.
    expect(container.textContent).toContain('Step 1 of');
    expect(getByRole('button', { name: 'Play' })).toBeTruthy();
  });

  it('still changes frame when the player asks', () => {
    setReducedMotion(true);
    act(() => startHintAnimation(frames, { reducedMotion: true }));
    const { container, getByRole } = render(<HintAnimationControls />);
    fireEvent.click(getByRole('button', { name: 'Next' }));
    expect(container.textContent).toContain('Then follow the link.');
    fireEvent.click(getByRole('button', { name: 'Next' }));
    expect(container.textContent).toContain('So erase the 5 there.');
  });

  it('draws the whole frame on the board, transitions or not', () => {
    setReducedMotion(true);
    act(() => startHintAnimation(frames, { reducedMotion: true }));
    const { container } = render(<HintAnimationOverlay size={450} />);
    const svg = container.querySelector('[data-testid="hint-animation-overlay"]');
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute('data-frame')).toBe('0');
    expect(container.querySelectorAll('circle').length).toBeGreaterThan(0);
  });
});

describe('the animate button', () => {
  it('is offered for a proof of more than one step', () => {
    const { container } = render(<HintAnimator step={chainStep} grid={null} level="simple" />);
    expect(container.querySelector('button')?.textContent).toContain('Animate on the board');
  });

  it('is not offered for a single', () => {
    const { container } = render(<HintAnimator step={single} grid={null} level="simple" />);
    expect(container.querySelector('button')).toBeNull();
  });

  it('gives way to the board once it is playing', () => {
    const { container } = render(<HintAnimator step={chainStep} grid={null} level="simple" />);
    fireEvent.click(container.querySelector('button'));
    expect(container.textContent).toContain('Playing on the board');
    expect(container.querySelector('button')).toBeNull();
  });

  it('builds its captions at the level the card is showing', () => {
    const show = (level) => {
      const view = render(
        <>
          <HintAnimator step={chainStep} grid={null} level={level} />
          <HintAnimationControls />
        </>
      );
      fireEvent.click(view.getByRole('button', { name: /Animate on the board/ }));
      const opening = view.container.textContent;
      fireEvent.click(view.getByRole('button', { name: 'Next' }));
      const link = view.container.textContent;
      cleanup();
      setHintAnimation(null);
      return { opening, link };
    };
    const beginner = show('simple');
    const expert = show('detailed');
    expect(expert.link).not.toBe(beginner.link);
    // The beginner reads the link as a sentence; the expert reads the same
    // link in the standard notation.
    expect(beginner.link).toContain('the only two places for 5 are R1C1 and R1C3');
    expect(expert.link).toContain('(5)R1C1 = (5)R1C3');
  });
});
