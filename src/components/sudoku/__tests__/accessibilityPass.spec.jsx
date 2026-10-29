// @vitest-environment jsdom
// The rest of the review's accessibility pass (issue #109), after the hint
// fix in PR #110.
//
// Five of its items were fixed in that pull request and measured clean on a
// production build at 1440x900 and 390x844 in both themes: the menu holds
// the keyboard, library rows are named, the Techniques list is not a live
// region, the onboarding dismiss has 44x44 of hit area, and both contrast
// failures are gone. The menu and the hint had regression tests; the other
// four did not, so they are here. The measurements are quoted where a
// jsdom test cannot take them itself, because jsdom has no layout and no
// painted colour.
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import palette from 'tailwindcss/colors';
import Callout from '../Callout';
import PuzzleLibrary from '../PuzzleLibrary';
import TechniquePanel from '../panel/TechniquePanel';
import { TECHNIQUES } from '../techniqueCatalog';
import { PRIMARY_GRADIENT, BADGE_GRADIENT } from '@/lib/brandGradient';

afterEach(() => cleanup());

describe('a library row is named by its puzzle, not by its grid', () => {
  const showLibrary = () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
      <QueryClientProvider client={client}>
        <PuzzleLibrary embedded onClose={() => {}} onSelectPuzzle={() => {}} />
      </QueryClientProvider>
    );
  };

  it('leads with the name and the clue count, and never with the 81 digits', () => {
    const view = showLibrary();
    const row = view.getByRole('button', { name: /^Gentle Start/ });
    const name = row.getAttribute('aria-label');
    // The defect: the accessible name came from the preview grid, so it
    // began "53··7····6··195····98····6·8···" - eighty-one digit and "dot"
    // tokens before the puzzle's name, five times a shelf.
    expect(name.startsWith('Gentle Start, 30 clues given')).toBe(true);
    expect(name).not.toMatch(/\d{6}/);
  });

  it('hides the preview grid from the reader: it is a picture of the puzzle', () => {
    const view = showLibrary();
    const row = view.getByRole('button', { name: /^Gentle Start/ });
    const preview = row.querySelector('[aria-hidden="true"].grid-cols-9');
    expect(preview).not.toBeNull();
    // All eighty-one cells are inside the hidden picture, so none of them
    // reaches the accessible name.
    expect(preview.children.length).toBe(81);
  });
});

describe('the Techniques list is a list, not a status message', () => {
  const base = {
    expanded: true, onToggleExpanded: () => {}, noAssistMode: false, counts: {},
    counting: false, searchingForcingChain: false, onSelectTechnique: () => {},
    onHighlight: () => {}, onCount: () => {}, onUltimateScan: () => {},
    onWhatIfSearch: () => {}, onShowInfo: () => {},
  };
  const show = (props) => render(<TechniquePanel {...base} {...props} />);
  const liveText = (view) =>
    Array.from(view.container.querySelectorAll('[aria-live]:not([aria-live="off"])'))
      .map((el) => (el.textContent || '').trim())
      .join(' ')
      .trim();

  it('says nothing when a tier opens or closes', () => {
    const view = show({ counts: { 'Hidden Single': 2, 'Pointing Pair': 6 } });
    // The defect was one aria-live region holding 536 characters of the
    // whole ladder, re-announced on every expand: "Hidden SingleBasic(2)
    // Pointing PairIntermediate...". A count that changes is not a status.
    expect(liveText(view)).toBe('');
    fireEvent.click(view.getByRole('button', { name: /^Basic/ }));
    expect(liveText(view)).toBe('');
    fireEvent.click(view.getByRole('button', { name: /^Basic/ }));
    expect(liveText(view)).toBe('');
  });

  it('still announces a Scan, which is a status message', () => {
    const total = TECHNIQUES.filter((tech) => tech.tier === 'Ultimate').length;
    const view = show({
      scan: { grid: null, total, done: total, running: false, cancelled: false, found: ['X-Cycle'] },
    });
    fireEvent.click(view.getByRole('button', { name: /^Ultimate/ }));
    // What #112 added on the Scan path must survive a change made for this
    // issue: one announcement, once the answer is known.
    const said = Array.from(view.container.querySelectorAll('[role="status"]'))
      .map((el) => el.textContent)
      .join(' ');
    expect(said).toContain('X-Cycle');
  });
});

describe('the onboarding dismiss is big enough to hit', () => {
  it('keeps a 14px glyph inside 44x44 of hit area', () => {
    const view = render(<Callout onDismiss={() => {}}>Stuck? Ask for a hint.</Callout>);
    const dismiss = view.getByRole('button', { name: 'Got it' });
    // Measured at 22x22 at every viewport, under the 24x24 that WCAG 2.2 AA
    // asks for in 2.5.8, and it sits over the board: a thumb that misses it
    // places a digit. The box stays 22x22 and an invisible 44x44 pseudo
    // element centred on it takes the taps. Measured on a production build
    // at 1440x900 and 390x844: nine probes on a 44x44 square all answer as
    // the dismiss, and elementsFromPoint finds no control under any of them,
    // so the bigger target steals nothing.
    expect(dismiss.className).toContain('before:h-11');
    expect(dismiss.className).toContain('before:w-11');
    expect(dismiss.className).toContain('before:-translate-x-1/2');
    expect(dismiss.className).toContain('before:-translate-y-1/2');
    // The glyph itself does not grow: a bigger x in the callout is not the fix.
    expect(dismiss.querySelector('svg').getAttribute('class')).toContain('w-3.5');
  });
});

// 1.4.3 asks 4.5:1 of normal text. The page background is a gradient, so
// the sum is taken against both ends of it, in both themes: the paper theme
// turns every shade over (50 <-> 950) and `text-white` into ink, exactly as
// tailwind.config.js builds the two palettes.
describe('white text on the header blues carries its contrast', () => {
  const INK = '#17150f';
  const hexToRgb = (hex) => {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const channel = (c) => (c / 255 <= 0.03928 ? c / 255 / 12.92 : ((c / 255 + 0.055) / 1.055) ** 2.4);
  const luminance = ([r, g, b]) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  const ratio = (a, b) => {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  };
  /** What a Tailwind shade paints in a theme, the way the config builds it. */
  const shade = (scale, level, theme) =>
    hexToRgb(palette[scale][theme === 'paper' ? 1000 - level : level]);
  const text = (theme) => (theme === 'paper' ? hexToRgb(INK) : [255, 255, 255]);
  /** Every colour stop a gradient class list names. */
  const stops = (classes) =>
    classes.match(/(?:from|to|via)-([a-z]+)-(\d+)/g).map((token) => {
      const [, scale, level] = token.match(/(?:from|to|via)-([a-z]+)-(\d+)/);
      return { token, scale, level: Number(level) };
    });

  for (const [what, classes] of [['Load puzzle', PRIMARY_GRADIENT], ['the app badge', BADGE_GRADIENT]]) {
    for (const theme of ['dark', 'paper']) {
      it(`${what} clears 4.5:1 at every stop in ${theme}`, () => {
        const measured = stops(classes).map((stop) => ({
          token: stop.token,
          contrast: +ratio(text(theme), shade(stop.scale, stop.level, theme)).toFixed(2),
        }));
        expect(measured.length).toBeGreaterThan(1);
        for (const { token, contrast } of measured) {
          expect(contrast, `${token} in ${theme}`).toBeGreaterThanOrEqual(4.5);
        }
      });
    }
  }

  it('agrees with what the browser measured on the production build', () => {
    // from-blue-600 and to-indigo-600, the two ends of the primary button:
    // 5.17 and 6.29 in dark, 7.18 and 6.12 in paper, taken off the painted
    // page. The sum above has to land on the same numbers or it is not
    // measuring the product.
    const [from, to] = stops(PRIMARY_GRADIENT);
    expect(+ratio(text('dark'), shade(from.scale, from.level, 'dark')).toFixed(2)).toBe(5.17);
    expect(+ratio(text('dark'), shade(to.scale, to.level, 'dark')).toFixed(2)).toBe(6.29);
    expect(+ratio(text('paper'), shade(from.scale, from.level, 'paper')).toFixed(2)).toBe(7.18);
    expect(+ratio(text('paper'), shade(to.scale, to.level, 'paper')).toFixed(2)).toBe(6.12);
  });
});
