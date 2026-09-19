/**
 * Two complete themes, dark and paper (paper-theme spec), plus "match my
 * device". The choice is remembered in localStorage so it applies before
 * sign-in resolves; a signed-in player's account copy wins when it arrives.
 *
 * The palette itself lives in tailwind.config.js: every slate and accent
 * shade is a CSS variable that `[data-theme="paper"]` redefines, so the
 * same class names paint both themes.
 */
export const THEME_KEY = 'sudoku-mentor:theme';
export const THEME_CHOICES = ['dark', 'paper', 'system'];
export const DEFAULT_THEME_CHOICE = 'dark';

const THEME_COLOR = { dark: '#0f172a', paper: '#f4f1ea' };

export const isThemeChoice = (value) => THEME_CHOICES.includes(value);

export const readThemeChoice = () => {
  try {
    const value = window.localStorage.getItem(THEME_KEY);
    return isThemeChoice(value) ? value : DEFAULT_THEME_CHOICE;
  } catch {
    return DEFAULT_THEME_CHOICE;
  }
};

export const writeThemeChoice = (choice) => {
  try {
    window.localStorage.setItem(THEME_KEY, choice);
  } catch {
    // remembering is a courtesy
  }
};

/** The theme a choice resolves to, given whether the device prefers light. */
export const resolveTheme = (choice, prefersLight = false) => {
  if (choice === 'paper') return 'paper';
  if (choice === 'system') return prefersLight ? 'paper' : 'dark';
  return 'dark';
};

/** Paint the document: the palette switch, the form-control scheme, the browser chrome colour. */
export const applyTheme = (theme) => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = theme === 'paper' ? 'light' : 'dark';
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', THEME_COLOR[theme] || THEME_COLOR.dark);
};
