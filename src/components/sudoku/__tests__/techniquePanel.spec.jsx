// @vitest-environment jsdom
// The Techniques list at full coverage (technique-panel-at-scale spec):
// what applies to this board first, the whole ladder below it collapsed and
// remembered, a way to find a technique by name, and counts that are never
// stale and never guessed.
import React from 'react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, fireEvent, cleanup, within } from '@testing-library/react';
import TechniquePanel from '../panel/TechniquePanel';
import { TECHNIQUES, TIERS } from '../techniqueCatalog';

const base = {
  expanded: true,
  onToggleExpanded: () => {},
  noAssistMode: false,
  counts: {},
  counting: false,
  searchingForcingChain: false,
  onSelectTechnique: () => {},
  onHighlight: () => {},
  onCount: () => {},
  onUltimateScan: () => {},
  onWhatIfSearch: () => {},
  onShowInfo: () => {},
};
const show = (props) => render(<TechniquePanel {...base} {...props} />);

beforeEach(() => window.localStorage.clear());
afterEach(() => cleanup());

const section = (view, heading) => {
  const label = view.getByText(heading);
  return label.parentElement;
};

describe('the Techniques list', () => {
  it('shows nothing but its own heading while collapsed', () => {
    const view = show({ expanded: false });
    expect(view.getByText('Techniques')).toBeTruthy();
    expect(view.queryByText('On this board')).toBeNull();
    expect(view.queryByLabelText('Find a technique by name')).toBeNull();
    expect(view.queryByText('Naked Single')).toBeNull();
  });

  it('leads with what applies to this board, in teaching order', () => {
    const view = show({ counts: { 'X-Wing': 1, 'Hidden Single': 3, 'Naked Pair': 0 } });
    const applies = section(view, 'On this board');
    const names = within(applies).getAllByRole('button')
      .map((b) => b.textContent)
      .filter((t) => TECHNIQUES.some((tech) => (tech.short || tech.name) === t));
    // Teaching order, not the order the counts arrived in
    expect(names).toEqual(['Hidden Single', 'X-Wing']);
    // The count is shown, and a technique with none is not in this section
    expect(within(applies).getByText('(3)')).toBeTruthy();
    expect(within(applies).getByText('(1)')).toBeTruthy();
    expect(within(applies).queryByText('Naked Pair')).toBeNull();
  });

  it('is short: it never repeats the whole ladder at the top', () => {
    const view = show({ counts: { 'Hidden Single': 2 } });
    const applies = section(view, 'On this board');
    expect(within(applies).queryByText('Swordfish')).toBeNull();
    expect(within(applies).queryByText('BUG+1')).toBeNull();
  });

  it('says it is still looking rather than showing nothing', () => {
    const view = show({ counts: {}, counting: true });
    expect(within(section(view, 'On this board')).getByText('Checking the board…')).toBeTruthy();
  });

  it('says plainly when nothing counted applies', () => {
    const view = show({ counts: { 'Naked Single': 0, 'X-Wing': 0 }, counting: false });
    expect(within(section(view, 'On this board')).getByText(/Nothing counted so far applies/)).toBeTruthy();
  });

  it('keeps every tier collapsed, with its size, until the player opens one', () => {
    const view = show({});
    for (const tier of TIERS) {
      const header = view.getByRole('button', { name: new RegExp(`^${tier.level}`) });
      expect(header.getAttribute('aria-expanded')).toBe('false');
      const size = TECHNIQUES.filter((t) => t.tier === tier.level).length;
      expect(header.textContent).toContain(`${size} technique`);
    }
    // Collapsed means the names are not on screen
    expect(view.queryByText('Swordfish')).toBeNull();

    fireEvent.click(view.getByRole('button', { name: /^Expert/ }));
    expect(view.getByText('Swordfish')).toBeTruthy();
    expect(view.getByRole('button', { name: /^Expert/ }).getAttribute('aria-expanded')).toBe('true');
    // and only that tier
    expect(view.queryByText('BUG+1')).toBeNull();
  });

  it('remembers which tiers the player left open', () => {
    const first = show({});
    fireEvent.click(first.getByRole('button', { name: /^Ultimate/ }));
    expect(first.getByText('ALS-XZ')).toBeTruthy();
    cleanup();

    const second = show({});
    expect(second.getByText('ALS-XZ')).toBeTruthy();
    expect(second.queryByText('Swordfish')).toBeNull();
    cleanup();

    // and closing one is remembered too
    const third = show({});
    fireEvent.click(third.getByRole('button', { name: /^Ultimate/ }));
    cleanup();
    expect(show({}).queryByText('ALS-XZ')).toBeNull();
  });

  it('shows how many of a tier apply without opening it', () => {
    const view = show({ counts: { 'X-Wing': 2, Swordfish: 1, 'XY-Wing': 0 } });
    expect(view.getByRole('button', { name: /^Expert/ }).textContent).toContain('2 here');
  });
});

describe('finding a technique by name', () => {
  it('filters the list on part of a name, without opening a tier', () => {
    const view = show({});
    fireEvent.change(view.getByLabelText('Find a technique by name'), { target: { value: 'sword' } });
    // The whole family, not just the plain fish: the finned form, and the
    // sashimi form that lists "sashimi swordfish" among its names.
    expect(view.getByText('3 techniques match')).toBeTruthy();
    expect(view.getByText('Swordfish')).toBeTruthy();
    expect(view.getByText('Finned Swordfish')).toBeTruthy();
    expect(view.queryByText('Naked Single')).toBeNull();
    // The ladder and the applies-now section stand aside while filtering
    expect(view.queryByText('On this board')).toBeNull();
  });

  it('finds a technique by the name a guide would use for it', () => {
    const view = show({});
    fireEvent.change(view.getByLabelText('Find a technique by name'), { target: { value: 'colouring' } });
    expect(view.getByText('X-Cycle')).toBeTruthy();
  });

  it('says so when a name matches nothing, and clears back to the ladder', () => {
    const view = show({});
    const box = view.getByLabelText('Find a technique by name');
    fireEvent.change(box, { target: { value: 'zzz' } });
    expect(view.getByText('No technique by that name')).toBeTruthy();
    fireEvent.click(view.getByLabelText('Clear the search'));
    expect(view.getByText('On this board')).toBeTruthy();
  });
});

describe('counts the player can trust', () => {
  it('offers to count a technique whose count is not known yet', () => {
    const onCount = vi.fn();
    const view = show({ counts: {}, onCount });
    fireEvent.click(view.getByRole('button', { name: /^Expert/ }));
    const row = view.getByText('X-Wing').closest('div');
    const button = within(row.parentElement).getAllByRole('button', { name: 'Count' })[0];
    expect(button.getAttribute('title')).toMatch(/Not counted yet/);
    fireEvent.click(button);
    expect(onCount).toHaveBeenCalled();
  });

  it('says "none here" for a counted technique with no instances, never a number', () => {
    const view = show({ counts: { 'X-Wing': 0 } });
    fireEvent.click(view.getByRole('button', { name: /^Expert/ }));
    expect(view.getAllByText('none here').length).toBeGreaterThan(0);
    expect(view.queryByText('(0)')).toBeNull();
  });

  it('shows the instances when the count is tapped', () => {
    const onHighlight = vi.fn();
    const view = show({ counts: { 'X-Wing': 2 }, onHighlight });
    fireEvent.click(within(section(view, 'On this board')).getByText('(2)'));
    expect(onHighlight).toHaveBeenCalledWith('X-Wing');
  });
});

describe('the reference dialog, and Scan', () => {
  it('is reachable for a technique that does not apply to this board', () => {
    const onSelectTechnique = vi.fn();
    const view = show({ counts: { 'BUG+1': 0 }, onSelectTechnique });
    fireEvent.click(view.getByRole('button', { name: /^Ultimate/ }));
    fireEvent.click(view.getByText('BUG+1'));
    expect(onSelectTechnique).toHaveBeenCalledWith('BUG+1');
  });

  it('is reachable for a technique whose count is unknown', () => {
    const onSelectTechnique = vi.fn();
    const view = show({ counts: {}, onSelectTechnique });
    fireEvent.change(view.getByLabelText('Find a technique by name'), { target: { value: 'escargot-ish' } });
    fireEvent.change(view.getByLabelText('Find a technique by name'), { target: { value: 'hypothesis' } });
    fireEvent.click(view.getByText('Hypothesis Mode'));
    expect(onSelectTechnique).toHaveBeenCalledWith('Hypothesis Mode');
  });

  it('says what Scan is about to do before it runs', () => {
    const onUltimateScan = vi.fn();
    const view = show({ onUltimateScan });
    fireEvent.click(view.getByRole('button', { name: /^Ultimate/ }));
    const scan = view.getByRole('button', { name: /Scan this board/ });
    expect(view.getByText(/Scan runs every one of them on the board as it stands now/)).toBeTruthy();
    fireEvent.click(scan);
    expect(onUltimateScan).toHaveBeenCalled();
  });

  it('says what the Search finds for the Forcing tier before it runs', () => {
    const view = show({});
    fireEvent.click(view.getByRole('button', { name: /^Forcing/ }));
    expect(view.getByText(/A proof by cases, which is why these are deductions and not guesses/)).toBeTruthy();
    expect(view.getByRole('button', { name: /Search/ })).toBeTruthy();
  });

  // The honesty line, in the panel: the proofs and the trial are two tiers,
  // and the what-if wording belongs to the trial alone (#75).
  it('keeps the what-if wording for the trial tier alone', () => {
    const view = show({});
    fireEvent.click(view.getByRole('button', { name: /^What-if/ }));
    expect(view.getByText(/assumes one candidate and erases it if the board breaks/)).toBeTruthy();
    expect(view.getByText('Hypothesis Mode')).toBeTruthy();
  });
});

describe('No Assist', () => {
  it('counts nothing and offers no scan, but still lets the player read', () => {
    const onCount = vi.fn();
    const onSelectTechnique = vi.fn();
    const view = show({ noAssistMode: true, counts: { 'X-Wing': 3 }, onCount, onSelectTechnique });
    expect(view.getByText(/No Assist is on, so nothing here is counted/)).toBeTruthy();
    expect(view.queryByText('On this board')).toBeNull();
    expect(view.queryByText('(3)')).toBeNull();
    fireEvent.click(view.getByRole('button', { name: /^Expert/ }));
    expect(view.getByText('X-Wing')).toBeTruthy();
    expect(view.queryByRole('button', { name: 'Count' })).toBeNull();
    expect(view.queryByRole('button', { name: /Scan this board/ })).toBeNull();
    expect(onCount).not.toHaveBeenCalled();
    // Reading how a technique works is not assistance, so the reference
    // dialog stays one tap away even here.
    fireEvent.click(view.getByText('X-Wing'));
    expect(onSelectTechnique).toHaveBeenCalledWith('X-Wing');
  });

  it('a chain lesson is still one click away in No Assist', () => {
    // Reading how a technique works is not assistance: the reference dialog
    // stays reachable while counts, Scan and Search stay off (#67).
    const onSelectTechnique = vi.fn();
    const view = show({ noAssistMode: true, onSelectTechnique });
    fireEvent.click(view.getByRole('button', { name: /^Ultimate/ }));
    fireEvent.click(view.getByRole('button', { name: 'Continuous Loop' }));
    expect(onSelectTechnique).toHaveBeenCalledWith('Continuous Loop');
    expect(view.queryByRole('button', { name: /Scan this board/ })).toBeNull();
  });
});

describe('the techniques that need the puzzle to have one answer', () => {
  const openUltimate = (view) => {
    fireEvent.click(view.getByRole('button', { name: /^Ultimate/ }));
    return view;
  };

  it('are shown as unavailable, with the reason, when it has more than one', () => {
    const view = openUltimate(show({ uniqueness: 'many', counts: { 'X-Cycle': 2 } }));
    // The reason, once, above the tier's rows.
    expect(view.getByText(/more than one answer/)).toBeTruthy();
    // Every one of them says so, rather than reading as "no pattern here".
    expect(view.getAllByText('not available here').length).toBeGreaterThan(5);
    // And the rest of the tier is counted as usual (twice over: once under
    // "On this board" and once in the tier itself).
    expect(view.getAllByText('(2)').length).toBeGreaterThan(0);
  });

  it('can still be read about: reading is not assistance', () => {
    const picked = [];
    const view = openUltimate(show({ uniqueness: 'many', onSelectTechnique: (n) => picked.push(n) }));
    fireEvent.click(view.getByRole('button', { name: 'Unique Rect. 1' }));
    expect(picked).toEqual(['Unique Rectangle Type 1']);
  });

  it('say nothing at all in No Assist, where the whole list is inert', () => {
    const view = openUltimate(show({ uniqueness: 'many', noAssistMode: true }));
    expect(view.queryByText('not available here')).toBeNull();
    expect(view.queryByText(/more than one answer/)).toBeNull();
    expect(view.getByRole('button', { name: 'Unique Rect. 1' })).toBeTruthy();
  });

  it('are counted like anything else once the puzzle is known to have one', () => {
    const view = openUltimate(show({ uniqueness: 'one', counts: { 'Unique Rectangle Type 2': 1 } }));
    expect(view.queryByText('not available here')).toBeNull();
    expect(view.getAllByText('(1)').length).toBeGreaterThan(0);
  });
});

// A Scan reports into this panel, which is the whole of issue #105: the
// counts are about the board, so the board stays on screen and the answer
// arrives where the live counts already are. What the panel owes the player
// is three things that do not grow with the catalog - rows that say they
// are counting, one line of progress with a way to stop it, and one line
// saying what was found - plus one announcement when the answer is known.
describe('a Scan, reported in the panel rather than over the board', () => {
  const SCAN_TOTAL = TECHNIQUES.filter((tech) => tech.tier === 'Ultimate').length;
  const openUltimate = (view) => {
    fireEvent.click(view.getByRole('button', { name: /^Ultimate/ }));
    return view;
  };
  const running = (done = 0) => ({
    grid: null, total: SCAN_TOTAL, done, running: true, cancelled: false, found: null,
  });
  const finished = (found, extra = {}) => ({
    grid: null, total: SCAN_TOTAL, done: SCAN_TOTAL, running: false, cancelled: false, found, ...extra,
  });
  const liveRegion = (view) =>
    Array.from(view.container.querySelectorAll('[role="status"]'))
      .map((el) => el.textContent)
      .join(' ')
      .trim();

  it('shows one line of progress for the whole tier, not one row each', () => {
    const view = openUltimate(show({ scan: running(12) }));
    expect(view.getByTestId('scan-progress').textContent).toContain(`12 of ${SCAN_TOTAL}`);
    // The defect was thirty-three rows of progress. One line, and no more.
    expect(view.queryAllByTestId('scan-progress').length).toBe(1);
  });

  it('turns Scan into the way to stop it, on the same button', () => {
    const onUltimateScan = vi.fn();
    const view = openUltimate(show({ scan: running(5), onUltimateScan }));
    const cancel = view.getByRole('button', { name: /Cancel/ });
    expect(cancel.getAttribute('aria-busy')).toBe('true');
    expect(view.queryByRole('button', { name: /Scan this board/ })).toBeNull();
    fireEvent.click(cancel);
    expect(onUltimateScan).toHaveBeenCalled();
  });

  it('says the rows are counting instead of asking the player to pay twice', () => {
    const view = openUltimate(show({ scan: running(2) }));
    expect(view.getAllByText('counting…').length).toBeGreaterThan(5);
    // Count is what an uncounted row offers when nothing is on its way.
    expect(view.queryByRole('button', { name: 'Count' })).toBeNull();
  });

  it('keeps the counts that have already arrived, and offers to show them', () => {
    const onHighlight = vi.fn();
    const view = openUltimate(show({ scan: running(3), counts: { 'X-Cycle': 2 }, onHighlight }));
    // In the tier, and at the top under "On this board", with the
    // click-to-highlight that already works there.
    expect(view.getAllByText('(2)').length).toBeGreaterThan(1);
    fireEvent.click(within(section(view, 'On this board')).getByText('(2)'));
    expect(onHighlight).toHaveBeenCalledWith('X-Cycle');
  });

  it('says nothing found in one line, not twenty-one rows of zero', () => {
    const view = openUltimate(show({ scan: finished([]) }));
    const result = view.getByTestId('scan-result');
    expect(result.textContent).toBe('Nothing in this tier applies to this board.');
    expect(view.queryAllByTestId('scan-result').length).toBe(1);
    expect(view.queryByText('0 found')).toBeNull();
    // And it is said out loud once, rather than not at all (#109).
    expect(liveRegion(view)).toBe('Scan finished. Nothing in the Ultimate tier applies to this board.');
  });

  it('points at the answer rather than restating it, when there is one', () => {
    const view = openUltimate(show({ scan: finished(['X-Cycle', 'ALS-XZ']), counts: { 'X-Cycle': 2, 'ALS-XZ': 1 } }));
    expect(view.getByTestId('scan-result').textContent).toContain(`2 of ${SCAN_TOTAL} apply to this board`);
    expect(liveRegion(view)).toBe(
      `Scan finished. 2 of ${SCAN_TOTAL} Ultimate techniques apply to this board: X-Cycle, ALS-XZ. ` +
        'They are listed under On this board, at the top of the Techniques panel.'
    );
  });

  it('says where a cancelled scan got to, and keeps what it found', () => {
    const view = openUltimate(show({ scan: finished(['X-Cycle'], { done: 9, cancelled: true }) }));
    const result = view.getByTestId('scan-result').textContent;
    expect(result).toContain(`Stopped at 9 of ${SCAN_TOTAL}`);
    expect(result).toContain(`1 of ${SCAN_TOTAL} applies to this board so far`);
    expect(liveRegion(view)).toContain(`Scan stopped at 9 of ${SCAN_TOTAL}.`);
  });

  it('announces nothing while it is still running: the result is the message', () => {
    expect(liveRegion(openUltimate(show({ scan: running(12) })))).toBe('');
  });

  it('counts as checking the board, so the top of the panel does not read as empty', () => {
    const view = openUltimate(show({ scan: running(1) }));
    expect(within(section(view, 'On this board')).getByText('Checking the board…')).toBeTruthy();
  });

  it('does not tell the player to scan a tier they have just scanned', () => {
    const view = openUltimate(show({ scan: finished([]) }));
    const applies = section(view, 'On this board');
    expect(within(applies).queryByText(/Scan the Ultimate tier/)).toBeNull();
    expect(within(applies).getByText(/the tier you scanned included/)).toBeTruthy();
  });

  // What a Scan finds goes to the top of the panel, which pushes the tier
  // the player pressed Scan in down the page: 700 px of it at 1440x900,
  // measured, which takes the progress line and the Cancel with it. The
  // line stays where the player can see it instead.
  it('keeps its own line in view while the answer grows above it', () => {
    const scrolled = [];
    const original = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function scrollIntoView(options) {
      scrolled.push({ text: this.textContent, options });
    };
    try {
      // The tier is open before the scan starts: its Scan button is the
      // only way to start one.
      const view = openUltimate(show({}));
      view.rerender(<TechniquePanel {...base} scan={running(1)} />);
      expect(scrolled.at(-1).text).toContain(`1 of ${SCAN_TOTAL}`);
      // Only when it has gone: a line still on screen is not moved.
      expect(scrolled.at(-1).options).toEqual({ block: 'nearest' });

      // Every count that arrives can push it further down, so every one of
      // them brings it back.
      view.rerender(<TechniquePanel {...base} scan={running(2)} />);
      expect(scrolled.at(-1).text).toContain(`2 of ${SCAN_TOTAL}`);

      view.rerender(<TechniquePanel {...base} scan={finished(['X-Cycle'])} />);
      expect(scrolled.at(-1).text).toContain(`1 of ${SCAN_TOTAL} applies to this board`);
    } finally {
      Element.prototype.scrollIntoView = original;
    }
  });

  it('scrolls nothing when no scan has been asked for', () => {
    const scrolled = [];
    const original = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = () => scrolled.push(1);
    try {
      openUltimate(show({ counts: { 'X-Cycle': 2 } }));
      expect(scrolled).toEqual([]);
    } finally {
      Element.prototype.scrollIntoView = original;
    }
  });

  it('says nothing about a scan in No Assist, where nothing is counted', () => {
    const view = openUltimate(show({ scan: running(4), noAssistMode: true }));
    expect(view.queryByTestId('scan-progress')).toBeNull();
    expect(view.queryByText('counting…')).toBeNull();
  });
});
