// The one place the app's default board colours live, per theme. The
// player hook starts from these, "Reset to defaults" restores the current
// theme's set, and every fallback in the grid reads the dark set, so a new
// player and a reset player see the same board.
/** @typedef {{ focusDigit: string, candidate: string, cellNumber: string, gridLines: string, cellBg: string }} BoardColors */

/** @type {Readonly<BoardColors>} */
export const DEFAULT_COLORS = Object.freeze({
  focusDigit: '#fbbf24',
  candidate: '#ffffff',
  cellNumber: '#60a5fa',
  gridLines: '#ffffff',
  cellBg: '#020617',
});

// Paper: a white board on a cream page, givens in ink, player digits in a
// clearly different blue, and the focus colours dark enough to read on white.
/** @type {Readonly<BoardColors>} */
export const PAPER_COLORS = Object.freeze({
  focusDigit: '#d97706',
  candidate: '#fde68a',
  cellNumber: '#1d4ed8',
  gridLines: '#1c1917',
  cellBg: '#ffffff',
});

export const defaultColorsFor = (theme) => (theme === 'paper' ? PAPER_COLORS : DEFAULT_COLORS);

/** Fill any missing keys from the defaults. */
export const withDefaultColors = (colors, theme = 'dark') => ({ ...defaultColorsFor(theme), ...(colors || {}) });

const isFlatColorSet = (value) => !!value && typeof value === 'object' && 'focusDigit' in value;

/**
 * The account's colour preferences, in the shape the app keeps:
 * `{ theme, colors: { dark, paper } }`. Accounts from before the paper
 * theme hold a flat set of five colours; those are the dark colours.
 *
 * @param {any} raw            the stored value (may be missing or legacy)
 * @param {string} fallbackTheme the local choice to keep when the account has none
 */
export const normalizeColorPrefs = (raw, fallbackTheme = 'dark') => {
  if (isFlatColorSet(raw)) {
    return { theme: fallbackTheme, colors: { dark: withDefaultColors(raw, 'dark'), paper: { ...PAPER_COLORS } } };
  }
  const theme = ['dark', 'paper', 'system'].includes(raw?.theme) ? raw.theme : fallbackTheme;
  return {
    theme,
    colors: {
      dark: withDefaultColors(raw?.dark, 'dark'),
      paper: withDefaultColors(raw?.paper, 'paper'),
    },
  };
};

/** The shape saved to the account: theme plus both colour sets. */
export const serializeColorPrefs = (prefs) => ({ theme: prefs.theme, dark: prefs.colors.dark, paper: prefs.colors.paper });
