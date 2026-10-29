// @vitest-environment jsdom
// The Techniques panel against a catalog twice today's size.
//
// Issue #114 is what happens when a component is designed against the data
// we had and shipped against the data we built: "list everything that
// applies" was reasonable at sixteen techniques and a wall at sixty-one.
// The fix is only a fix if it holds at a hundred, so this file renders the
// panel against a catalog of 121 and asserts that what the player opens
// does not grow with it. The adversarial cases the panel has to survive -
// a huge count, and nothing at all - are the two the panel was never tried
// against.
import React from 'react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, fireEvent, cleanup, within } from '@testing-library/react';

// A catalog of 121: today's, plus sixty more in the tier that already holds
// the most. Nothing else about the ladder changes, so a difference in what
// the panel shows is a difference the size caused.
vi.mock('../techniqueCatalog', async (importOriginal) => {
  const actual = /** @type {any} */ (await importOriginal());
  const extra = Array.from({ length: 60 }, (_, i) => ({
    name: `Synthetic Technique ${i + 1}`,
    tier: 'Ultimate',
    count: actual.COUNT_SCAN,
    description: `A stand-in for the sixty-first technique onwards, number ${i + 1}.`,
  }));
  return { ...actual, TECHNIQUES: [...actual.TECHNIQUES, ...extra] };
});

const { TECHNIQUES } = await import('../techniqueCatalog');
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
  onCount: () => {},
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

beforeEach(() => window.localStorage.clear());
afterEach(() => cleanup());

describe('a catalog of a hundred and twenty-one', () => {
  it('is bigger than the one the panel was designed for', () => {
    // The guard on this whole file: if the mock stops working, every
    // assertion below becomes a test of today's sixty-one instead.
    expect(TECHNIQUES.length).toBe(121);
  });

  it('opens the same length as it does at sixty-one', () => {
    const everything = Object.fromEntries(TECHNIQUES.map((tech) => [tech.name, 1]));
    const view = show({ counts: everything, uniqueness: 'one' });
    expect(rows(view)).toHaveLength(3);
    expect(within(appliesSection(view)).getByText(/121 techniques apply here/)).toBeTruthy();
  });

  it('still says how many it is holding back', () => {
    const everything = Object.fromEntries(TECHNIQUES.map((tech) => [tech.name, 1]));
    const view = show({ counts: everything, uniqueness: 'one' });
    expect(view.getByRole('button', { name: /Show all 121/ })).toBeTruthy();
  });

  it('loses none of them: every one is reachable, counted and clickable', () => {
    const onHighlight = vi.fn();
    const everything = Object.fromEntries(TECHNIQUES.map((tech) => [tech.name, 4]));
    const view = show({ counts: everything, uniqueness: 'one', onHighlight });
    fireEvent.click(view.getByRole('button', { name: /Show all 121/ }));
    expect(rows(view)).toHaveLength(121);
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
    expect(size).toBeGreaterThan(60);
    expect(ultimate.textContent).toContain(`${size} techniques`);
    expect(view.queryByText('Synthetic Technique 1')).toBeNull();
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
});

describe('the two cases the panel was never tried against', () => {
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
    fireEvent.click(view.getByRole('button', { name: /^Ultimate/ }));
    expect(view.getByTestId('scan-result').textContent).toBe(
      'Nothing in this tier applies to this board.'
    );
    expect(view.queryAllByTestId('scan-result')).toHaveLength(1);
  });
});
