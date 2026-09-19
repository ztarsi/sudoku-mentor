// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { applyTheme, readThemeChoice, resolveTheme, writeThemeChoice, THEME_KEY } from '../theme';
import { DEFAULT_COLORS, PAPER_COLORS, normalizeColorPrefs, serializeColorPrefs } from '@/components/sudoku/colors';

beforeEach(() => {
  window.localStorage.clear();
  delete document.documentElement.dataset.theme;
});

describe('theme choice', () => {
  it('defaults to dark and remembers a valid choice only', () => {
    expect(readThemeChoice()).toBe('dark');
    writeThemeChoice('paper');
    expect(readThemeChoice()).toBe('paper');
    window.localStorage.setItem(THEME_KEY, 'neon');
    expect(readThemeChoice()).toBe('dark');
  });

  it('resolves "system" from the device preference', () => {
    expect(resolveTheme('dark', true)).toBe('dark');
    expect(resolveTheme('paper', false)).toBe('paper');
    expect(resolveTheme('system', true)).toBe('paper');
    expect(resolveTheme('system', false)).toBe('dark');
  });

  it('paints the document', () => {
    const meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.appendChild(meta);
    applyTheme('paper');
    expect(document.documentElement.dataset.theme).toBe('paper');
    expect(document.documentElement.style.colorScheme).toBe('light');
    expect(meta.getAttribute('content')).toBe('#f4f1ea');
    applyTheme('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');
    meta.remove();
  });
});

describe('colour preferences', () => {
  it('reads a legacy flat set as the dark colours and keeps the local theme', () => {
    const prefs = normalizeColorPrefs({ ...DEFAULT_COLORS, cellBg: '#000000' }, 'paper');
    expect(prefs.theme).toBe('paper');
    expect(prefs.colors.dark.cellBg).toBe('#000000');
    expect(prefs.colors.paper).toEqual(PAPER_COLORS);
  });

  it('takes the account theme when it has one and fills missing colours per theme', () => {
    const prefs = normalizeColorPrefs({ theme: 'system', paper: { cellBg: '#fffff0' } }, 'dark');
    expect(prefs.theme).toBe('system');
    expect(prefs.colors.paper.cellBg).toBe('#fffff0');
    expect(prefs.colors.paper.gridLines).toBe(PAPER_COLORS.gridLines);
    expect(prefs.colors.dark).toEqual(DEFAULT_COLORS);
  });

  it('round-trips through the account shape', () => {
    const prefs = normalizeColorPrefs({ theme: 'paper', dark: DEFAULT_COLORS, paper: PAPER_COLORS });
    expect(normalizeColorPrefs(serializeColorPrefs(prefs))).toEqual(prefs);
  });
});
