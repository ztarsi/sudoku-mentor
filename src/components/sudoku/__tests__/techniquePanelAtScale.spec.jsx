// @vitest-environment jsdom
// The Techniques panel against a catalog three times today's size.
//
// Issue #114 is what happens when a component is designed against the data
// we had and shipped against the data we built: "list everything that
// applies" was reasonable at sixteen techniques and a wall at sixty-one.
// Issue #122 is the same disease one level down: the default view was fixed,
// and then a tier expanded to nine rows reading "none here" and thirty-three
// buttons reading "Count".
//
// So this file renders the panel against a catalog of 183 and asserts the
// invariant the quality bar now carries: what a player sees beside the board
// is a function of the board, never of the catalog. The arithmetic in
// `the invariant` names only the board; the catalog's size appears in it
// nowhere, which is the whole point. The adversarial cases - a huge count,
// one item, and nothing at all - are the ones the panel was never tried
// against.
import React from 'react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, fireEvent, cleanup, within } from '@testing-library/react';

// A catalog of 183: today's sixty-one, and 122 more spread over every tier
// in proportion, each one counted the way its tier is counted. Nothing else
// about the ladder changes, so a difference in what the panel shows is a
// difference the size caused.
vi.mock('../techniqueCatalog', async (importOriginal) => {
  const actual = /** @type {any} */ (await importOriginal());
  const extra = [];
  for (const tier of actual.TIERS) {
    const mine = actual.TECHNIQUES.filter((tech) => tech.tier === tier.level);
    for (let i = 0; i < mine.length * 2; i += 1) {
      extra.push({
        name: `Synthetic ${tier.level} ${i + 1}`,
        tier: tier.level,
        count: mine[0].count,
        description: `A stand-in for the technique we have not written yet, number ${i + 1}.`,
      });
    }
  }
  const TECHNIQUES = [...actual.TECHNIQUES, ...extra];
  return {
    ...actual,
    TECHNIQUES,
    // The real one closes over the real list; a search at this scale has to
    // see the synthetic names too, or the cap on matches is never tried.
    matchTechniques: (query) => {
      const needle = (query || '').trim().toLowerCase();
      if (!needle) return TECHNIQUES;
      return TECHNIQUES.filter((tech) =>
        [tech.name, tech.short, tech.formal, ...(tech.aliases ?? [])]
          .filter(Boolean)
          .some((term) => term.toLowerCase().includes(needle))
      );
    },
  };
});

const { TECHNIQUES, TIERS, UNIQUENESS_TECHNIQUES } = await import('../techniqueCatalog');
const TechniquePanel = (await import('../panel/TechniquePanel')).default;

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
const rows = (view) =>
  within(view.getByTestId('applies-rows'))
    .getAllByTitle(/^How .+ works$/)
    .map((button) => button.textContent);
const appliesSection = (view) => view.getByText('On this board').parentElement;
const openTier = (view, level) =>
  fireEvent.click(view.getByRole('button', { name: new RegExp(`^${level}`) }));
// Every technique named anywhere in the panel: the short view's rows, the
// easiest named in its line, and every row inside an open tier.
const namedTechniques = (view) =>
  Array.from(view.container.querySelectorAll('[title^="How "]')).map((el) => el.textContent);
const tierSummaries = (view) =>
  Array.from(view.container.querySelectorAll('[aria-label*="in the reference"]')).map(
    (el) => el.textContent
  );

beforeEach(() => window.localStorage.clear());
afterEach(() => cleanup());

describe('a catalog of a hundred and eighty-three', () => {
  it('is three times the one the panel was designed for', () => {
    // The guard on this whole file: if the mock stops working, every
    // assertion below becomes a test of today's sixty-one instead.
    expect(TECHNIQUES.length).toBe(183);
    expect(TECHNIQUES.length).toBe(61 * 3);
  });

  it('opens the same length as it does at sixty-one', () => {
    const everything = Object.fromEntries(TECHNIQUES.map((tech) => [tech.name, 1]));
    const view = show({ counts: everything, uniqueness: 'one' });
    expect(rows(view)).toHaveLength(3);
    expect(within(appliesSection(view)).getByText(/183 techniques apply here/)).toBeTruthy();
  });

  it('still says how many it is holding back', () => {
    const everything = Object.fromEntries(TECHNIQUES.map((tech) => [tech.name, 1]));
    const view = show({ counts: everything, uniqueness: 'one' });
    expect(view.getByRole('button', { name: /Show all 183/ })).toBeTruthy();
  });

  it('loses none of them: every one is reachable, counted and clickable', () => {
    const onHighlight = vi.fn();
    const everything = Object.fromEntries(TECHNIQUES.map((tech) => [tech.name, 4]));
    const view = show({ counts: everything, uniqueness: 'one', onHighlight });
    fireEvent.click(view.getByRole('button', { name: /Show all 183/ }));
    expect(rows(view)).toHaveLength(183);
    // and the count on each of them still shows its instances
    fireEvent.click(within(view.getByTestId('applies-rows')).getAllByText('(4)')[0]);
    expect(onHighlight).toHaveBeenCalled();
  });

  it('keeps the ladder below it collapsed, so the tiers do not grow either', () => {
    const view = show({ counts: {}, uniqueness: 'one' });
    const ultimate = view.getByRole('button', { name: /^Ultimate/ });
    expect(ultimate.getAttribute('aria-expanded')).toBe('false');
    // The tier says its size rather than spending a row on each name
    const size = TECHNIQUES.filter((tech) => tech.tier === 'Ultimate').length;
    expect(size).toBeGreaterThan(90);
    expect(ultimate.textContent).toContain(`${size} techniques`);
    expect(view.queryByText('Synthetic Ultimate 1')).toBeNull();
  });

  it('does not let a Scan reopen the wall by a second route', () => {
    // A scan of the Ultimate tier at this size finds forty things. They are
    // counts like any other, so the short view caps them like any other.
    const found = TECHNIQUES.filter((tech) => tech.tier === 'Ultimate').slice(0, 40);
    const counts = Object.fromEntries(found.map((tech) => [tech.name, 2]));
    const view = show({
      counts,
      uniqueness: 'one',
      scan: {
        grid: null,
        total: found.length,
        done: found.length,
        running: false,
        cancelled: false,
        found: found.map((tech) => tech.name),
      },
    });
    expect(rows(view)).toHaveLength(3);
    expect(within(appliesSection(view)).getByText(/40 techniques apply here/)).toBeTruthy();
  });

  it('caps the find box too, and hands the rest to the reference', () => {
    const onBrowse = vi.fn();
    const view = show({ counts: {}, uniqueness: 'one', onBrowse });
    fireEvent.change(view.getByLabelText('Find a technique by name'), {
      target: { value: 'synthetic' },
    });
    // 122 names match. Five rows, and one line to the surface that has the
    // width for the rest.
    expect(namedTechniques(view)).toHaveLength(5);
    fireEvent.click(view.getByRole('button', { name: /All 122 in the reference/ }));
    expect(onBrowse).toHaveBeenCalledWith({ query: 'synthetic' });
  });
});

// The test that is meant to stop a fourth round of this. Every number in it
// comes from the board; none of them comes from the catalog, which is three
// times the size the panel was built against and would be the first thing
// to move if a row had crept back in.
describe('the invariant: what the player sees is a function of the board', () => {
  // Six techniques on the board, spread over four tiers, which is a
  // realistic Medium puzzle part-solved.
  const BOARD = {
    'Naked Single': 3,
    'Hidden Single': 1,
    'Naked Pair': 2,
    'X-Wing': 1,
    Swordfish: 1,
    'X-Cycle': 2,
  };
  const ON_BOARD = Object.keys(BOARD).length;
  const PREVIEW_ROWS = 3;

  const everyTierOpen = (props) => {
    const view = show({ counts: BOARD, uniqueness: 'one', ...props });
    for (const tier of TIERS) openTier(view, tier.level);
    return view;
  };

  it('names exactly the techniques on the board, and no others', () => {
    const view = everyTierOpen();
    // The short view's three rows, the easiest named in its line, and one
    // row per applicable technique in the tier it belongs to. Six on the
    // board; a hundred and seventy-seven absent ones are named nowhere.
    expect(namedTechniques(view)).toHaveLength(PREVIEW_ROWS + 1 + ON_BOARD);
    const absent = TECHNIQUES.filter((tech) => !BOARD[tech.name]).map((tech) => tech.name);
    for (const name of absent) expect(view.queryByText(name)).toBeNull();
  });

  it('spends one line per tier on everything it is not showing', () => {
    const view = everyTierOpen();
    expect(tierSummaries(view)).toHaveLength(TIERS.length);
    // And the line is a quantity, not a list: nothing in it is a technique
    // name, whether it is reporting the board or offering the reading.
    for (const line of tierSummaries(view)) {
      expect(line).toMatch(/^(\d+ (other|technique)s?([,:]|$)|Read (any of the|the other) \d+$)/);
    }
  });

  it('offers one way to count each tier, however many techniques it holds', () => {
    const view = everyTierOpen();
    expect(view.queryAllByRole('button', { name: 'Count' })).toHaveLength(0);
    expect(view.queryAllByRole('button', { name: /Scan this board/ })).toHaveLength(1);
    expect(view.queryAllByRole('button', { name: /^Search$/ })).toHaveLength(2);
  });

  it('enumerates absence nowhere: not once per technique, not once per tier', () => {
    const view = everyTierOpen();
    // "none here" survives only as a row the player asked for by name, and
    // as the count inside a tier's one line.
    expect(view.queryAllByText('none here')).toHaveLength(0);
    expect(view.queryAllByText('not counted yet')).toHaveLength(0);
  });

  it('holds when the board is empty and when the catalog is all there is', () => {
    const view = show({ counts: {}, uniqueness: 'one' });
    for (const tier of TIERS) openTier(view, tier.level);
    expect(namedTechniques(view)).toHaveLength(0);
    expect(tierSummaries(view)).toHaveLength(TIERS.length);
  });

  it('holds while a Scan of ninety-nine techniques is running', () => {
    const total = TECHNIQUES.filter((tech) => tech.tier === 'Ultimate').length;
    const view = everyTierOpen({
      scan: { grid: null, total, done: 12, running: true, cancelled: false, found: null },
    });
    expect(namedTechniques(view)).toHaveLength(PREVIEW_ROWS + 1 + ON_BOARD);
    expect(view.queryAllByTestId('scan-progress')).toHaveLength(1);
    expect(view.queryByText('counting…')).toBeNull();
  });

  it('holds on a grid where a third of the catalog cannot be used at all', () => {
    const view = everyTierOpen({ uniqueness: 'many' });
    const blocked = TECHNIQUES.filter((tech) => UNIQUENESS_TECHNIQUES.includes(tech.name)).length;
    expect(blocked).toBeGreaterThan(10);
    // The reason once, the number once, and not a row each.
    expect(view.getAllByText(/more than one answer/)).toHaveLength(1);
    expect(view.queryAllByText('not available here')).toHaveLength(0);
    expect(view.getByText(new RegExp(`${blocked} not available here`))).toBeTruthy();
  });
});

describe('the cases the panel was never tried against', () => {
  it('a huge count on a single technique reads as a number, not as a layout', () => {
    const view = show({ counts: { 'Naked Single': 9999 }, uniqueness: 'one' });
    const applies = appliesSection(view);
    expect(within(applies).getByText('1 technique applies here.')).toBeTruthy();
    const count = within(applies).getByTitle('Show 9999 instances on the board');
    expect(count.textContent).toContain('9999');
    // One row, so a four-digit count cannot push anything off the panel
    expect(rows(view)).toHaveLength(1);
  });

  it('zero of everything says so in a line, and offers no disclosure', () => {
    const counts = Object.fromEntries(TECHNIQUES.map((tech) => [tech.name, 0]));
    const view = show({ counts, uniqueness: 'one', counting: false });
    const applies = appliesSection(view);
    expect(within(applies).getByText(/Nothing counted so far applies here/)).toBeTruthy();
    expect(view.queryByTestId('applies-rows')).toBeNull();
    expect(view.queryByRole('button', { name: /Show all/ })).toBeNull();
  });

  it('a tier of exactly one says so in the singular', () => {
    const view = show({ counts: {}, uniqueness: 'one' });
    openTier(view, 'What-if');
    const size = TECHNIQUES.filter((tech) => tech.tier === 'What-if').length;
    expect(view.getByText(`${size} techniques, found by Search`)).toBeTruthy();
    // and a tier with one of its techniques on the board says "1 other"
    cleanup();
    const one = show({ counts: { 'Naked Single': 1 }, uniqueness: 'one' });
    openTier(one, 'Basic');
    expect(one.getByText(/^\d+ others?, not counted yet$/)).toBeTruthy();
  });

  it('nothing counted at all says it is still looking, rather than reading as empty', () => {
    const view = show({ counts: {}, counting: true, uniqueness: 'one' });
    expect(within(appliesSection(view)).getByText('Checking the board…')).toBeTruthy();
    expect(view.queryByRole('button', { name: /Show all/ })).toBeNull();
  });

  it('a scan that finds nothing at this size is still one line', () => {
    const total = TECHNIQUES.filter((tech) => tech.tier === 'Ultimate').length;
    const view = show({
      counts: {},
      uniqueness: 'one',
      scan: { grid: null, total, done: total, running: false, cancelled: false, found: [] },
    });
    openTier(view, 'Ultimate');
    expect(view.getByTestId('scan-result').textContent).toBe(
      'Nothing in this tier applies to this board.'
    );
    expect(view.queryAllByTestId('scan-result')).toHaveLength(1);
  });
});
