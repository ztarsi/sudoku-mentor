// @vitest-environment jsdom
// The reference, which is where browsing the catalog lives now (#122).
//
// The panel beside the board is a column as wide as a line of text, read
// while a puzzle waits. Sixty-one names do not belong in it, and the three
// rounds of this issue were three attempts to make them fit: shorten the
// list, then shorten it again, then print "none here" nine times. The
// catalog is not a thing a player reads while playing, so it moved to a
// dialog that has the width for columns and is opened on purpose.
//
// What this file holds to: the reference carries the whole ladder, it opens
// where the panel sent it, it marks what is on the board without printing a
// line per technique that is not, and nothing is lost on the way - every
// technique's own reference is still a click from it, and a single
// technique can still be counted on its own, from the surface about it.
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, cleanup, within, act } from '@testing-library/react';
import TechniqueBrowser from '../panel/TechniqueBrowser';
import TechniqueModal from '../TechniqueModal';
import { TECHNIQUES, TIERS } from '../techniqueCatalog';

const base = {
  browse: {},
  counts: {},
  noAssistMode: false,
  uniqueness: 'one',
  onSelectTechnique: () => {},
  onClose: () => {},
};
const browser = (props) => render(<TechniqueBrowser {...base} {...props} />);
// The name each row shows, without the "also called" line under it.
const names = (view) =>
  Array.from(view.container.querySelectorAll('[title^="How "]')).map(
    (el) => el.querySelector('span > span')?.textContent ?? el.textContent
  );
const tierSize = (level) => TECHNIQUES.filter((tech) => tech.tier === level).length;

afterEach(() => cleanup());

describe('the reference, opened to browse', () => {
  it('is closed until the panel asks for it', () => {
    const view = browser({ browse: null });
    expect(view.container.querySelector('[role="dialog"]')).toBeNull();
  });

  it('carries the whole ladder, tier by tier, in teaching order', () => {
    const view = browser({});
    expect(names(view)).toHaveLength(TECHNIQUES.length);
    const headings = Array.from(view.container.querySelectorAll('h3')).map((el) => el.textContent);
    expect(headings).toEqual(TIERS.map((tier) => tier.level));
    expect(view.getByText(`Showing ${TECHNIQUES.length} techniques.`)).toBeTruthy();
  });

  it('opens at the tier the panel sent it to', () => {
    const view = browser({ browse: { tier: 'Expert' } });
    expect(names(view)).toHaveLength(tierSize('Expert'));
    expect(view.getByRole('button', { name: 'Expert' }).getAttribute('aria-pressed')).toBe('true');
    expect(view.queryByText('Naked Single')).toBeNull();
    // and the whole ladder is one press away again
    fireEvent.click(view.getByRole('button', { name: 'All tiers' }));
    expect(names(view)).toHaveLength(TECHNIQUES.length);
  });

  it('opens at the query the panel was filtering on', () => {
    const view = browser({ browse: { query: 'sword' } });
    expect(/** @type {HTMLInputElement} */ (view.getByLabelText('Search the reference')).value).toBe(
      'sword'
    );
    expect(names(view)).toEqual(['Swordfish', 'Finned Swordfish', 'Sashimi Fish']);
  });

  it('finds a technique by any of its names, and says when nothing matches', () => {
    const view = browser({});
    const box = view.getByLabelText('Search the reference');
    fireEvent.change(box, { target: { value: 'colouring' } });
    expect(view.getByText('X-Cycle')).toBeTruthy();
    fireEvent.change(box, { target: { value: 'zzz' } });
    expect(view.getByText('No technique by that name.')).toBeTruthy();
    expect(names(view)).toHaveLength(0);
  });

  it('marks what is on the board and counts it once, without a line for the rest', () => {
    const view = browser({ counts: { 'X-Wing': 2, Swordfish: 1, Jellyfish: 0 } });
    expect(view.getByTestId('reference-summary').textContent).toContain(
      '2 are on your board right now'
    );
    expect(view.getByText('2 here')).toBeTruthy();
    expect(view.getByText('1 here')).toBeTruthy();
    // The disease this dialog exists to cure does not follow it here.
    expect(view.queryByText('none here')).toBeNull();
    expect(view.queryByText('not counted yet')).toBeNull();
  });

  it('counts nothing in No Assist, and still lists everything to read', () => {
    const view = browser({ noAssistMode: true, counts: { 'X-Wing': 2 } });
    expect(view.getByTestId('reference-summary').textContent).toContain('No Assist is on');
    expect(view.queryByText('2 here')).toBeNull();
    expect(names(view)).toHaveLength(TECHNIQUES.length);
  });

  it('says nothing about the uniqueness family on a grid that cannot use it', () => {
    const view = browser({ uniqueness: 'many', counts: { 'Unique Rectangle Type 1': 3 } });
    // A count that could not have been measured is not shown as one.
    expect(view.queryByText('3 here')).toBeNull();
    expect(view.getByText('Unique Rect. 1')).toBeTruthy();
  });

  it('is one click from any technique’s own reference', () => {
    const onSelectTechnique = vi.fn();
    const view = browser({ browse: { tier: 'Ultimate' }, onSelectTechnique });
    fireEvent.click(view.getByText('BUG+1'));
    expect(onSelectTechnique).toHaveBeenCalledWith('BUG+1');
  });

  it('closes on Escape, and lands the player in the search box when it opens', async () => {
    const onClose = vi.fn();
    const view = browser({ onClose });
    // Dialogs focus themselves a frame after they mount.
    await act(() => new Promise((resolve) => requestAnimationFrame(() => resolve(undefined))));
    expect(document.activeElement).toBe(view.getByLabelText('Search the reference'));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});

describe('one technique’s reference', () => {
  const modal = (props) =>
    render(<TechniqueModal technique="X-Wing" uniqueness="one" onClose={() => {}} {...props} />);

  it('says what the board it was opened from has of it', () => {
    expect(modal({ count: 2 }).getByText('On your board right now: 2 to find.')).toBeTruthy();
    cleanup();
    expect(modal({ count: 0 }).getByText('Not on your board right now.')).toBeTruthy();
  });

  it('counts this one on its own, where the panel used to carry a button per row', () => {
    const onCount = vi.fn();
    const view = modal({ count: undefined, onCount });
    expect(view.getByText('Not counted on your board yet.')).toBeTruthy();
    fireEvent.click(view.getByRole('button', { name: 'Count it' }));
    expect(onCount).toHaveBeenCalledWith('X-Wing');
  });

  it('offers no counting in No Assist, and still reads', () => {
    const view = modal({ noAssistMode: true, onCount: () => {} });
    expect(view.getByText(/No Assist is on/)).toBeTruthy();
    expect(view.queryByRole('button', { name: 'Count it' })).toBeNull();
    expect(view.getByRole('heading', { name: 'X-Wing' })).toBeTruthy();
  });

  it('says why a uniqueness technique cannot be counted on this grid', () => {
    const view = modal({
      technique: 'Unique Rectangle Type 1',
      uniqueness: 'many',
      onCount: () => {},
    });
    expect(view.getByText(/Not available on this board: needs one answer/)).toBeTruthy();
    expect(view.queryByRole('button', { name: 'Count it' })).toBeNull();
  });
});

// The whole path, through the orchestrator that owns both surfaces: a
// technique that is not on the board has no row in the panel any more, and
// its reference is still there to be read.
describe('from the panel to the reference and back', () => {
  const noop = () => {};

  beforeEach(() => {
    window.localStorage.clear();
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
  });
  afterEach(() => vi.useRealTimers());

  const show = async () => {
    const { default: LogicPanel } = await import('../LogicPanel');
    return render(
      <LogicPanel
        currentStep={null}
        grid={{ board: Symbol('grid') }}
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

  it('opens the reference at the tier, then the technique, then closes back', async () => {
    const view = await show();
    fireEvent.click(view.getByRole('button', { name: /Techniques/ }));
    fireEvent.click(view.getByRole('button', { name: /^Expert/ }));

    // The tier's one line, and the reference behind it.
    fireEvent.click(view.getByRole('button', { name: /Browse the Expert tier/ }));
    const dialog = view.getByRole('dialog', { name: 'Technique reference' });
    expect(within(dialog).getByRole('button', { name: 'Expert' }).getAttribute('aria-pressed')).toBe(
      'true'
    );

    // A technique with no row in the panel, read in two presses from it.
    fireEvent.click(within(dialog).getByText('Swordfish'));
    expect(view.getByRole('heading', { name: 'Swordfish' })).toBeTruthy();

    // Closing the lesson leaves the reference open behind it, as it was.
    fireEvent.click(view.getByRole('button', { name: 'Got it!' }));
    expect(view.queryByRole('heading', { name: 'Swordfish' })).toBeNull();
    expect(view.getByRole('dialog', { name: 'Technique reference' })).toBeTruthy();
  });
});
