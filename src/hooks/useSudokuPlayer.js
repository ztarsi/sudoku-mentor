import { useState, useCallback, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { bestNoAssistTime, createSolveRecord, saveColors as persistColors } from '@/api/playerData';
import { toast } from '@/components/ui/use-toast';

export const DEFAULT_COLORS = {
  focusDigit: '#fbbf24',
  candidate: '#ffffff',
  cellNumber: '#60a5fa',
  gridLines: '#ffffff',
  cellBg: '#020617',
};

/**
 * Shared account-facing state: current user, persisted color settings, and
 * the best no-assist time for the current puzzle. All async effects are
 * cancellation-guarded so late responses can't overwrite newer state.
 */
export function useSudokuPlayer(puzzleName) {
  const [user, setUser] = useState(null);
  const [colors, setColors] = useState(DEFAULT_COLORS);
  const [bestTime, setBestTime] = useState(null);
  const [bestTimeVersion, setBestTimeVersion] = useState(0);

  // Load user and their saved colors once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const currentUser = await base44.auth.me();
        if (cancelled) return;
        setUser(currentUser);
        if (currentUser?.sudoku_colors) {
          setColors(currentUser.sudoku_colors);
        }
      } catch {
        if (!cancelled) setUser(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Persist color changes to the account (if signed in)
  const saveColors = useCallback(
    async (newColors) => {
      setColors(newColors);
      if (!user) return;
      try {
        await persistColors(user, newColors);
      } catch (error) {
        console.error('Failed to save colors:', error);
        toast({
          title: 'Colours not saved',
          description: 'They apply for this visit, but could not be saved to your account.',
          variant: 'destructive',
        });
      }
    },
    [user]
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

  return { user, colors, saveColors, bestTime, refreshBestTime, saveSolveRecord };
}
