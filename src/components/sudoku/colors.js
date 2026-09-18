// The one place the app's default colours live. The player hook starts
// from these, "Reset to defaults" restores these, and every fallback in the
// grid reads these, so a new player and a reset player see the same board.
export const DEFAULT_COLORS = Object.freeze({
  focusDigit: '#fbbf24',
  candidate: '#ffffff',
  cellNumber: '#60a5fa',
  gridLines: '#ffffff',
  cellBg: '#020617',
});

/** Fill any missing keys from the defaults. */
export const withDefaultColors = (colors) => ({ ...DEFAULT_COLORS, ...(colors || {}) });
