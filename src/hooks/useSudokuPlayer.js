import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { bestNoAssistTime, createSolveRecord, saveColors as persistColors } from '@/api/playerData';
import { toast } from '@/components/ui/use-toast';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { applyTheme, readThemeChoice, resolveTheme, writeThemeChoice } from '@/lib/theme';

import { DEFAULT_COLORS, PAPER_COLORS, defaultColorsFor, normalizeColorPrefs, serializeColorPrefs } from '@/components/sudoku/colors';

export { DEFAULT_COLORS };

/**
 * Shared account-facing state: current user, the theme and the persisted
 * board colours (one set per theme), and the best no-assist time for the
 * current puzzle. All async effects are cancellation-guarded so late
 * responses can't overwrite newer state.
 */
export function useSudokuPlayer(puzzleName) {
  const [user, setUser] = useState(null);
  const [prefs, setPrefs] = useState(() => ({
    theme: readThemeChoice(),
    colors: { dark: { ...DEFAULT_COLORS }, paper: { ...PAPER_COLORS } },
  }));
  const [bestTime, setBestTime] = useState(null);
  const [bestTimeVersion, setBestTimeVersion] = useState(0);

  // The theme in force: the choice, or the device's preference when the
  // choice is "system". Painted on the document whenever it changes.
  const prefersLight = useMediaQuery('(prefers-color-scheme: light)');
  const theme = resolveTheme(prefs.theme, prefersLight);
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // The signed-in user comes from AuthContext, so there is one source of
  // truth and no second request. The account's theme and colours win over
  // the local copy when they arrive, and the local copy follows.
  const { user: authUser } = useAuth();
  useEffect(() => {
    setUser(authUser ?? null);
    if (authUser?.sudoku_colors) {
      const next = normalizeColorPrefs(authUser.sudoku_colors, readThemeChoice());
      setPrefs(next);
      writeThemeChoice(next.theme);
    }
  }, [authUser]);

  const persist = useCallback(
    async (next, failureTitle) => {
      setPrefs(next);
      if (!user) return;
      try {
        await persistColors(user, serializeColorPrefs(next));
      } catch (error) {
        console.error('Failed to save preferences:', error);
        toast({
          title: failureTitle,
          description: 'It applies for this visit, but could not be saved to your account.',
          variant: 'destructive',
        });
      }
    },
    [user]
  );

  // The current theme's five colours; saving edits that theme's set.
  const colors = prefs.colors[theme] || defaultColorsFor(theme);
  const saveColors = useCallback(
    (newColors) => persist({ ...prefs, colors: { ...prefs.colors, [theme]: newColors } }, 'Colours not saved'),
    [persist, prefs, theme]
  );

  const setThemeChoice = useCallback(
    (choice) => {
      writeThemeChoice(choice);
      return persist({ ...prefs, theme: choice }, 'Theme not saved');
    },
    [persist, prefs]
  );

  // Best no-assist time for the current puzzle
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user || !puzzleName) {
        setBestTime(null);
        return;
      }
      try {
        const best = await bestNoAssistTime(user, puzzleName);
        if (!cancelled) setBestTime(best);
      } catch (error) {
        console.error('Failed to load best time:', error);
        if (!cancelled) setBestTime(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, puzzleName, bestTimeVersion]);

  // Call after saving a new solve record so the badge refreshes
  const refreshBestTime = useCallback(() => setBestTimeVersion((v) => v + 1), []);

  // Record a clean solve for the signed-in player; the badge refreshes on
  // success and the player hears about a failure instead of losing it
  // silently.
  const saveSolveRecord = useCallback(
    async (record) => {
      if (!user) return false;
      try {
        await createSolveRecord(user, record);
        setBestTimeVersion((v) => v + 1);
        return true;
      } catch (error) {
        console.error('Failed to save solve record:', error);
        toast({
          title: 'Solve time not saved',
          description: 'Your time could not be recorded. Check your connection and try another puzzle.',
          variant: 'destructive',
        });
        return false;
      }
    },
    [user]
  );

  return {
    user,
    colors,
    saveColors,
    defaultColors: defaultColorsFor(theme),
    theme,
    themeChoice: prefs.theme,
    setThemeChoice,
    bestTime,
    refreshBestTime,
    saveSolveRecord,
  };
}
