// @vitest-environment jsdom
// The Techniques list at full coverage (technique-panel-at-scale spec):
// what applies to this board first, the whole ladder below it collapsed and
// remembered, a way to find a technique by name, and counts that are never
// stale and never guessed.
//
// And it opens short (#114): the count in a line, at most three rows,
// hardest first, the rest behind a disclosure that says how many there are.
// Twelve rows in teaching order was the defect.
//
// A tier opens the same way (#122): rows for what is on the board, then one
// line for everything else. Nine rows reading "none here" and thirty-three
// buttons reading "Count" were the defect that round, and the rule that
// came out of it is that nothing beside the board enumerates absence or
// repeats one action per row. Reading the ladder end to end belongs to the
// reference dialog, which this panel is the door to.
import React from 'react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, fireEvent, cleanup, within } from '@testing-library/react';
import TechniquePanel from '../panel/TechniquePanel';
import { TECHNIQUES, TIERS, UNIQUENESS_TECHNIQUES } from '../techniqueCatalog';

const base = {
  expanded: true,
  onToggleExpanded: () => {},
  noAssistMode: false,
  counts: {},
  counting: false,
  searchingForcingChain: false,
  onSelectTechnique: () => {},
  onHighlight: () => {},
  onBrowse: () => {},
  onCountTier: () => {},
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

// The rows of the short view, in the order the player reads them. Every
// technique row titles its name button "How <name> works".
const appliesRows = (view) =>
  within(view.getByTestId('applies-rows'))
    .getAllByTitle(/^How .+ works$/)
    .map((button) => button.textContent);

// How many techniques a tier holds, and the rows a tier is showing: a tier
// row names its technique, exactly as the short view's rows do.
const tierSize = (level) => TECHNIQUES.filter((tech) => tech.tier === level).length;
const openTier = (view, level) => {
  fireEvent.click(view.getByRole('button', { name: new RegExp(`^${level}`) }));
  return view;
};
const tierRows = (view, level) => {
  const header = view.getByRole('button', { name: new RegExp(`^${level}`) });
  const body = header.nextElementSibling;
  return body
    ? within(body)
        .queryAllByTitle(/^How .+ works$/)
        .map((button) => button.textContent)
    : [];
};

describe('the Techniques list', () => {
  it('shows nothing but its own heading while collapsed', () => {
    const view = show({ expanded: false });
    expect(view.getByText('Techniques')).toBeTruthy();
    expect(view.queryByText('On this board')).toBeNull();
    expect(view.queryByLabelText('Find a technique by name')).toBeNull();
    expect(view.queryByText('Naked Single')).toBeNull();
  });

  it('answers what applies in a line, before any row', () => {
    const view = show({ counts: { 'X-Wing': 1, 'Hidden Single': 3, 'Naked Pair': 0 } });
    const applies = section(view, 'On this board');
    // The count is the answer, in one line, so the rows are never the only
    // way to learn how much is here.
    expect(within(applies).getByText(/2 techniques apply here/)).toBeTruthy();
    // Both are on screen, so the line does not also name the easiest
    expect(within(applies).queryByText(/The easiest is/)).toBeNull();
    // The counts are still there, and a technique with none is not
    expect(within(applies).getByText('(3)')).toBeTruthy();
    expect(within(applies).getByText('(1)')).toBeTruthy();
    expect(within(applies).queryByText('Naked Pair')).toBeNull();
  });

  it('names the easiest in the line when the rows have no room for it', () => {
    const view = show({
      counts: { 'Naked Single': 1, 'Hidden Single': 1, 'X-Wing': 1, Swordfish: 1 },
    });
    const applies = section(view, 'On this board');
    expect(within(applies).getByText(/4 techniques apply here/)).toBeTruthy();
    expect(within(applies).getByText(/The easiest is/)).toBeTruthy();
    // Naked Single is the easiest and has no row of its own
    expect(appliesRows(view)).not.toContain('Naked Single');
    expect(within(applies).getByRole('button', { name: 'Naked Single' })).toBeTruthy();
  });

  it('leads the rows with the hardest applicable technique, not the easiest', () => {
    // Teaching ranks: Naked Single 0, Hidden Single 1, X-Wing 11,
    // Swordfish 12. The easiest is what the hint card is about to hand the
    // player, so the rows start at the other end of the ladder.
    const view = show({
      counts: { 'Naked Single': 1, 'Hidden Single': 1, 'X-Wing': 1, Swordfish: 1 },
    });
    expect(appliesRows(view)).toEqual(['Swordfish', 'X-Wing', 'Hidden Single']);
  });

  it('opens short however much applies: three rows, never twelve', () => {
    const everything = Object.fromEntries(TECHNIQUES.map((tech) => [tech.name, 2]));
    const view = show({ counts: everything, uniqueness: 'one' });
    expect(appliesRows(view)).toHaveLength(3);
    expect(within(section(view, 'On this board')).getByText(
      new RegExp(`${TECHNIQUES.length} techniques apply here`)
    )).toBeTruthy();
  });

  it('says how many it is holding back, and shows them when asked', () => {
    const view = show({
      counts: { 'Naked Single': 1, 'Hidden Single': 1, 'X-Wing': 1, Swordfish: 1 },
    });
    // Hidden rows are visibly hidden: the control carries the count.
    const more = view.getByRole('button', { name: /Show all 4/ });
    expect(more.getAttribute('aria-expanded')).toBe('false');

    fireEvent.click(more);
    expect(appliesRows(view)).toEqual(['Swordfish', 'X-Wing', 'Hidden Single', 'Naked Single']);
    const fewer = view.getByRole('button', { name: /Show fewer/ });
    expect(fewer.getAttribute('aria-expanded')).toBe('true');

    fireEvent.click(fewer);
    expect(appliesRows(view)).toHaveLength(3);
  });

  it('offers no disclosure when nothing is hidden', () => {
    const view = show({ counts: { 'X-Wing': 1, Swordfish: 1, 'Naked Single': 1 } });
    expect(appliesRows(view)).toHaveLength(3);
    expect(view.queryByRole('button', { name: /Show all/ })).toBeNull();
  });

  it('counts one applicable technique in words that fit one, and gives it the row', () => {
    const view = show({ counts: { 'X-Wing': 2 } });
    const applies = section(view, 'On this board');
    expect(within(applies).getByText('1 technique applies here.')).toBeTruthy();
    expect(within(applies).queryByText(/The easiest is/)).toBeNull();
    expect(appliesRows(view)).toEqual(['X-Wing']);
  });

  it('opens the lesson for the technique the line names', () => {
    const onSelectTechnique = vi.fn();
    const view = show({
      counts: { 'Naked Single': 1, 'Hidden Single': 1, 'X-Wing': 1, Swordfish: 1 },
      onSelectTechnique,
    });
    fireEvent.click(
      within(section(view, 'On this board')).getByRole('button', { name: 'Naked Single' })
    );
    expect(onSelectTechnique).toHaveBeenCalledWith('Naked Single');
  });

  it('opens short again on a new board, rather than as the last one was left', () => {
    const view = show({ counts: { 'Naked Single': 1, 'Hidden Single': 1, 'X-Wing': 1, Swordfish: 1 } });
    fireEvent.click(view.getByRole('button', { name: /Show all 4/ }));
    expect(appliesRows(view)).toHaveLength(4);

    // A board change drops every count at once (useTechniqueCounts)
    view.rerender(<TechniquePanel {...base} counts={{}} counting />);
    view.rerender(<TechniquePanel {...base} counts={{ 'Naked Single': 1, 'Hidden Single': 1, 'X-Wing': 1, Swordfish: 1 }} />);
    expect(appliesRows(view)).toHaveLength(3);
    expect(view.getByRole('button', { name: /Show all 4/ })).toBeTruthy();
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
      expect(header.textContent).toContain(`${tierSize(tier.level)} technique`);
    }
    // Collapsed means nothing of the tier is on screen
    expect(view.queryByText('Swordfish')).toBeNull();
    expect(view.queryByText(/not counted yet/)).toBeNull();

    openTier(view, 'Expert');
    expect(view.getByRole('button', { name: /^Expert/ }).getAttribute('aria-expanded')).toBe('true');
    // and only that tier
    expect(view.getByRole('button', { name: /^Ultimate/ }).getAttribute('aria-expanded')).toBe('false');
  });

  it('opens a tier to what is on the board, and one line for the rest', () => {
    const view = show({ uniqueness: 'one', counts: { Swordfish: 2, 'X-Wing': 0, Jellyfish: 0 } });
    openTier(view, 'Expert');
    // The two it has a count for, and no row for the nine it does not:
    // nine rows reading "none here" was the defect (#122).
    expect(tierRows(view, 'Expert')).toEqual(['Swordfish']);
    expect(view.getByText(`${tierSize('Expert') - 1} others: 2 none here, 8 not counted yet`)).toBeTruthy();
    expect(view.queryByText('X-Wing')).toBeNull();
  });

  it('says it in one line when a whole tier is counted and empty', () => {
    const counted = Object.fromEntries(
      TECHNIQUES.filter((tech) => tech.tier === 'Expert').map((tech) => [tech.name, 0])
    );
    const view = show({ uniqueness: 'one', counts: counted });
    openTier(view, 'Expert');
    expect(tierRows(view, 'Expert')).toEqual([]);
    expect(view.getByText(`${tierSize('Expert')} techniques, none here`)).toBeTruthy();
    // One line, and no more: the count of the line is the whole assertion.
    expect(view.queryAllByText(/none here/)).toHaveLength(1);
  });

  it('opens the reference at the tier, for a player who wants to read it', () => {
    const onBrowse = vi.fn();
    const view = show({ uniqueness: 'one', counts: { Swordfish: 2 }, onBrowse });
    openTier(view, 'Expert');
    fireEvent.click(view.getByRole('button', { name: /Browse the Expert tier/ }));
    expect(onBrowse).toHaveBeenCalledWith({ tier: 'Expert' });
  });

  it('offers the whole reference from the ladder, rather than being it', () => {
    const onBrowse = vi.fn();
    const view = show({ onBrowse });
    fireEvent.click(view.getByRole('button', { name: `Browse all ${TECHNIQUES.length}` }));
    expect(onBrowse).toHaveBeenCalledWith({});
  });

  it('remembers which tiers the player left open', () => {
    const openState = (view, level) =>
      view.getByRole('button', { name: new RegExp(`^${level}`) }).getAttribute('aria-expanded');

    const first = show({});
    openTier(first, 'Ultimate');
    expect(openState(first, 'Ultimate')).toBe('true');
    cleanup();

    const second = show({});
    expect(openState(second, 'Ultimate')).toBe('true');
    expect(openState(second, 'Expert')).toBe('false');
    cleanup();

    // and closing one is remembered too
    const third = show({});
    openTier(third, 'Ultimate');
    cleanup();
    expect(openState(show({}), 'Ultimate')).toBe('false');
  });

  it('shows how many of a tier apply without opening it', () => {
    const view = show({ counts: { 'X-Wing': 2, Swordfish: 1, 'XY-Wing': 0 } });
    expect(view.getByRole('button', { name: /^Expert/ }).textContent).toContain('2 here');
  });
});

// The panel used to count every tier at once and show the numbers. Four
// fifths of the harder ones were about patterns the easier move destroys,
// so the harder tiers now say why they are not counted instead (#128).
describe('counting the easiest tier first', () => {
  // Every technique in these tiers counted and empty, so the gate is where
  // the test puts it rather than wherever the first zero happens to be.
  const emptyThrough = (...levels) =>
    Object.fromEntries(
      TECHNIQUES.filter((tech) => levels.includes(tech.tier)).map((tech) => [tech.name, 0])
    );

  it('says why, once, in plain words, for the whole ladder', () => {
    const view = show({ uniqueness: 'one', counts: { 'Naked Single': 2 } });
    // Once, above the tiers. Four tiers open was four copies of this
    // sentence, which is the disease in a new costume.
    expect(
      view.getAllByText('There are still singles on this board, so nothing harder is counted.')
    ).toHaveLength(1);
    for (const level of ['Intermediate', 'Advanced', 'Expert', 'Ultimate']) openTier(view, level);
    expect(
      view.getAllByText('There are still singles on this board, so nothing harder is counted.')
    ).toHaveLength(1);
  });

  it('marks the tiers it is holding back, in their headers', () => {
    const view = show({ uniqueness: 'one', counts: { 'Naked Single': 2 } });
    expect(view.getByRole('button', { name: /^Expert/ }).textContent).toContain('not counted');
    expect(view.getByRole('button', { name: /^Basic/ }).textContent).not.toContain('not counted');
    openTier(view, 'Expert');
    // The line in the body is the way in, with no number it does not have
    // and no "not counted yet" the header has just said.
    expect(view.getByText(`Read any of the ${tierSize('Expert')}`)).toBeTruthy();
    expect(view.queryByText(/not counted yet/)).toBeNull();
  });

  it('names the tier that is holding it back when it is not the singles', () => {
    // The rule is "no easier tier", not "no singles": a board can have an
    // Advanced technique and no Basic one.
    const counts = { ...emptyThrough('Basic', 'Intermediate'), 'Naked Pair': 1 };
    const view = show({ uniqueness: 'one', counts });
    expect(
      view.getByText('There are still Advanced techniques on this board, so nothing harder is counted.')
    ).toBeTruthy();
    expect(view.getByRole('button', { name: /^Expert/ }).textContent).toContain('not counted');
  });

  it('counts the tier that has something, and every tier easier than it', () => {
    const counts = { ...emptyThrough('Basic', 'Intermediate'), 'Naked Pair': 1 };
    const view = show({ uniqueness: 'one', counts });
    openTier(view, 'Intermediate');
    openTier(view, 'Advanced');
    // Counted and empty says so; the tier with something shows its rows.
    expect(view.getByText(`${tierSize('Intermediate')} techniques, none here`)).toBeTruthy();
    expect(tierRows(view, 'Advanced')).toEqual(['Naked Pair']);
  });

  it('lets the player ask for a held-back tier anyway', () => {
    const onCountTier = vi.fn();
    const view = show({ uniqueness: 'one', counts: { 'Naked Single': 2 }, onCountTier });
    openTier(view, 'Expert');
    fireEvent.click(view.getByRole('button', { name: 'Count anyway' }));
    expect(onCountTier).toHaveBeenCalledWith('Expert');
  });

  it('offers the scan tier one way to ask, not two', () => {
    const view = show({ uniqueness: 'one', counts: { 'Naked Single': 2 } });
    openTier(view, 'Ultimate');
    // Scan is already the way to count this tier in spite of the gate, so
    // the tier gains no second button under it.
    expect(view.getByRole('button', { name: /Scan this board/ })).toBeTruthy();
    expect(view.queryByRole('button', { name: 'Count anyway' })).toBeNull();
    expect(view.getByText(/cost too much to count while you play/)).toBeTruthy();
  });

  it('keeps the numbers of a tier the player counted in spite of the gate', () => {
    const counts = { 'Naked Single': 2, ...emptyThrough('Ultimate'), 'X-Cycle': 3 };
    const view = show({ uniqueness: 'one', counts });
    openTier(view, 'Ultimate');
    expect(tierRows(view, 'Ultimate')).toEqual(['X-Cycle']);
    expect(view.getByRole('button', { name: /^Ultimate/ }).textContent).not.toContain('not counted');
    // and what it found is at the top with everything else on the board
    expect(appliesRows(view)).toContain('X-Cycle');
  });

  it('holds nothing back when nothing easier applies', () => {
    const counts = emptyThrough('Basic', 'Intermediate', 'Advanced', 'Expert');
    const view = show({ uniqueness: 'one', counts });
    expect(view.queryByText(/nothing harder is counted/)).toBeNull();
    expect(view.getByRole('button', { name: /^Ultimate/ }).textContent).not.toContain('not counted');
    openTier(view, 'Ultimate');
    expect(view.getByText(/cost too much to count while you play/)).toBeTruthy();
  });

  it('says nothing about a gate in No Assist, where nothing is counted', () => {
    const view = show({ noAssistMode: true, counts: { 'Naked Single': 2 } });
    openTier(view, 'Expert');
    expect(view.queryByText(/nothing harder is counted/)).toBeNull();
    expect(view.queryByRole('button', { name: 'Count anyway' })).toBeNull();
    expect(view.getByText(`Read any of the ${tierSize('Expert')}`)).toBeTruthy();
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
  it('offers one way to count a tier, never one per technique', () => {
    const view = show({ uniqueness: 'one', counts: {} });
    for (const tier of TIERS) openTier(view, tier.level);
    // Thirty-three "Count" buttons inside a tier that already has one
    // "Scan this board" was the defect (#122).
    expect(view.queryAllByRole('button', { name: 'Count' })).toHaveLength(0);
    expect(view.queryAllByRole('button', { name: /Scan this board/ })).toHaveLength(1);
    expect(view.queryAllByRole('button', { name: /^Search$/ })).toHaveLength(2);
  });

  it('says "none here" for a counted technique with no instances, never a number', () => {
    const view = show({ counts: { 'X-Wing': 0 } });
    fireEvent.change(view.getByLabelText('Find a technique by name'), { target: { value: 'x-wing' } });
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
    const view = show({ counts: { 'BUG+1': 0 }, uniqueness: 'one', onSelectTechnique });
    // Not on the board, so not a row in its tier - and still one action
    // away by name, which is what the find box is for.
    fireEvent.change(view.getByLabelText('Find a technique by name'), { target: { value: 'bug+1' } });
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
    expect(view.getByRole('button', { name: /^Search$/ })).toBeTruthy();
    // Search finds these; it does not count them, and the tier says so in
    // the one line it spends on them.
    expect(view.getByText(`${tierSize('Forcing')} techniques, found by Search`)).toBeTruthy();
  });

  // The honesty line, in the panel: the proofs and the trial are two tiers,
  // and the what-if wording belongs to the trial alone (#75).
  it('keeps the what-if wording for the trial tier alone', () => {
    const view = show({});
    fireEvent.click(view.getByRole('button', { name: /^What-if/ }));
    expect(view.getByText(/assumes one candidate and erases it if the board breaks/)).toBeTruthy();
    expect(view.getByText('1 technique, found by Search')).toBeTruthy();
  });
});

describe('No Assist', () => {
  it('counts nothing and offers no scan, but still lets the player read', () => {
    const onSelectTechnique = vi.fn();
    const view = show({ noAssistMode: true, counts: { 'X-Wing': 3 }, onSelectTechnique });
    expect(view.getByText(/No Assist is on, so nothing here is counted/)).toBeTruthy();
    expect(view.queryByText('On this board')).toBeNull();
    expect(view.queryByText('(3)')).toBeNull();
    openTier(view, 'Expert');
    // Nothing is counted, so the tier has nothing of this board to show:
    // its size, and the way to read it.
    expect(tierRows(view, 'Expert')).toEqual([]);
    expect(view.getByText(`Read any of the ${tierSize('Expert')}`)).toBeTruthy();
    expect(view.queryByRole('button', { name: 'Count' })).toBeNull();
    expect(view.queryByRole('button', { name: /Scan this board/ })).toBeNull();
    // Reading how a technique works is not assistance, so the reference
    // stays one tap away even here.
    fireEvent.change(view.getByLabelText('Find a technique by name'), { target: { value: 'x-wing' } });
    fireEvent.click(view.getByText('X-Wing'));
    expect(onSelectTechnique).toHaveBeenCalledWith('X-Wing');
  });

  it('a chain lesson is still one click away in No Assist', () => {
    // Reading how a technique works is not assistance: the reference
    // stays reachable while counts, Scan and Search stay off (#67).
    const onSelectTechnique = vi.fn();
    const view = show({ noAssistMode: true, onSelectTechnique });
    fireEvent.change(view.getByLabelText('Find a technique by name'), {
      target: { value: 'continuous loop' },
    });
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
    // How many of them cannot be used here, once: thirteen rows reading
    // "not available here" is the same defect as nine reading "none here".
    const blocked = TECHNIQUES.filter(
      (tech) => tech.tier === 'Ultimate' && UNIQUENESS_TECHNIQUES.includes(tech.name)
    ).length;
    expect(view.getByText(new RegExp(`${blocked} not available here`))).toBeTruthy();
    expect(view.queryAllByText('not available here')).toHaveLength(0);
    // And the rest of the tier is counted as usual (twice over: once under
    // "On this board" and once in the tier itself).
    expect(view.getAllByText('(2)').length).toBeGreaterThan(0);
  });

  it('can still be read about: reading is not assistance', () => {
    const picked = [];
    const view = openUltimate(show({ uniqueness: 'many', onSelectTechnique: (n) => picked.push(n) }));
    fireEvent.change(view.getByLabelText('Find a technique by name'), {
      target: { value: 'unique rectangle type 1' },
    });
    fireEvent.click(view.getByRole('button', { name: 'Unique Rect. 1' }));
    expect(picked).toEqual(['Unique Rectangle Type 1']);
  });

  it('say nothing at all in No Assist, where the whole list is inert', () => {
    const view = openUltimate(show({ uniqueness: 'many', noAssistMode: true }));
    expect(view.queryByText(/not available here/)).toBeNull();
    expect(view.queryByText(/more than one answer/)).toBeNull();
    expect(view.getByText(`Read any of the ${tierSize('Ultimate')}`)).toBeTruthy();
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

  it('spends no row on a technique that is only being counted', () => {
    const view = openUltimate(show({ scan: running(2), uniqueness: 'one' }));
    // One progress line for the tier, and nothing per technique: neither a
    // row saying it is counting nor a button offering to count it (#122).
    expect(view.getByTestId('scan-progress').textContent).toContain(`2 of ${SCAN_TOTAL}`);
    expect(tierRows(view, 'Ultimate')).toEqual([]);
    expect(view.queryByText('counting…')).toBeNull();
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
