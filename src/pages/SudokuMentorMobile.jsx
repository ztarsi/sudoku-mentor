import React, { useState, useCallback, useEffect, useRef, Suspense } from 'react';
import SudokuGrid from '@/components/sudoku/SudokuGrid';
import DigitStrip from '@/components/sudoku/DigitStrip';
import AccountMenu from '@/components/sudoku/AccountMenu';
import { playErrorTone } from '@/components/sudoku/errorSound';
import { resolveShortcut, isTypingTarget } from '@/components/sudoku/keyboardShortcuts';
import { markOnboarded } from '@/components/sudoku/puzzleSources';
import WelcomeTour from '@/components/sudoku/WelcomeTour';
import { useSudokuGame } from '@/hooks/useSudokuGame';
import { useSudokuPlayer } from '@/hooks/useSudokuPlayer';
import { usePuzzleBootstrap } from '@/hooks/usePuzzleBootstrap';
import { toast } from "@/components/ui/use-toast";

const UnifiedPuzzleLoader = React.lazy(() => import('@/components/sudoku/UnifiedPuzzleLoader'));
const ColorSettings = React.lazy(() => import('@/components/sudoku/ColorSettings'));
const CompletionModal = React.lazy(() => import('@/components/sudoku/CompletionModal'));

export default function SudokuMentorMobile() {
  const [selectedCell, setSelectedCell] = useState(null);
  const [focusedDigit, setFocusedDigit] = useState(null);
  const [showPuzzleLoader, setShowPuzzleLoader] = useState(false);
  const [highlightedDigit, setHighlightedDigit] = useState(null);
  // Pencil marks: the strip's toggle is sticky; Shift (external keyboard) adds to it while held.
  const [pencilMode, setPencilMode] = useState(false);
  const [shiftHeld, setShiftHeld] = useState(false);
  const candidateMode = pencilMode || shiftHeld;
  const [showColorSettings, setShowColorSettings] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);
  const [completionStats, setCompletionStats] = useState({ timeInSeconds: 0, errorCount: 0 });
  const [showTour, setShowTour] = useState(false);

  const [srAnnouncement, setSrAnnouncement] = useState('');
  const playerRef = useRef(null);

  // The bottom bar grows when the pencil-mark pad opens; the page keeps
  // exactly that much room below the grid so nothing hides behind it.
  const bottomBarRef = useRef(null);
  const [bottomBarHeight, setBottomBarHeight] = useState(140);
  useEffect(() => {
    const el = bottomBarRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) setBottomBarHeight(Math.ceil(entry.contentRect.height));
    });
    observer.observe(el);
    setBottomBarHeight(Math.ceil(el.getBoundingClientRect().height));
    return () => observer.disconnect();
  }, []);

  // The mobile page is always no-assist: every solve is recorded.
  const game = useSudokuGame({
    persistKey: 'sudoku-mentor:game',
    onWrongInput: (cellIndex, digit) => {
      playErrorTone();
      setSrAnnouncement(
        `${digit} conflicts with the solution at row ${Math.floor(cellIndex / 9) + 1}, column ${(cellIndex % 9) + 1}`
      );
    },
    onSolved: ({ timeInSeconds, errorCount, hintsUsed, assistUsed, puzzleName, puzzleDifficulty }) => {
      setCompletionStats({ timeInSeconds, errorCount });
      setShowCompletion(true);

      // The mobile page has no hints, but a game resumed from the desktop
      // page may have used some: only clean solves are recorded.
      const user = playerRef.current?.user;
      if (user && hintsUsed === 0 && !assistUsed && puzzleName && puzzleDifficulty) {
        playerRef.current?.saveSolveRecord({
          puzzle_name: puzzleName,
          difficulty: puzzleDifficulty,
          time_seconds: timeInSeconds,
          no_assist: true,
          error_count: errorCount,
        });
      }
    },
  });

  const player = useSudokuPlayer(game.puzzleName);
  playerRef.current = player;
  const { user, colors } = player;

  const handleCellClick = useCallback(
    (cellIndex) => {
      setSelectedCell(cellIndex);

      // Digit-first input: if a digit is selected in the bottom bar, apply it
      // to an EMPTY cell. A tap on a filled cell just looks at it; it is
      // not an attempt to overwrite, so it is never counted as a mistake.
      if (focusedDigit !== null) {
        const cell = game.grid[cellIndex];
        if (!cell.isFixed && cell.value === null) {
          if (candidateMode) {
            game.handleToggleCandidate(cellIndex, focusedDigit);
          } else {
            game.handleCellInput(cellIndex, focusedDigit);
          }
        }
      }
    },
    [game, focusedDigit, candidateMode]
  );

  // The ninth copy of a digit is placed: nothing is left to do with it, so
  // drop the selection instead of turning every next tap into an error.
  useEffect(() => {
    if (focusedDigit === null || candidateMode) return;
    const count = game.grid.filter((cell) => cell.value === focusedDigit).length;
    if (count >= 9) {
      setFocusedDigit(null);
      setHighlightedDigit(null);
    }
  }, [game.grid, focusedDigit, candidateMode]);

  // The strip: cell-first when an editable cell is selected (the digit goes
  // straight in), digit-first otherwise (armed for the next cell taps).
  const handleDigitSelect = useCallback(
    (digit) => {
      const cell = selectedCell !== null ? game.grid[selectedCell] : null;
      if (cell && !cell.isFixed && cell.value === null) {
        if (candidateMode) game.handleToggleCandidate(selectedCell, digit);
        else game.handleCellInput(selectedCell, digit);
        return;
      }
      if (focusedDigit === digit) {
        setFocusedDigit(null);
        setHighlightedDigit(null);
      } else {
        setFocusedDigit(digit);
        setHighlightedDigit(digit);
      }
    },
    [game, selectedCell, candidateMode, focusedDigit]
  );

  const handleEraseCell = useCallback(() => {
    if (selectedCell !== null && !game.grid[selectedCell].isFixed) {
      game.handleCellInput(selectedCell, null);
    }
  }, [game, selectedCell]);

  const handleClearGrid = useCallback(() => {
    if (game.solvedCount > 0 && !window.confirm('Clear the entire grid?')) return;
    game.clearGrid();
    setHighlightedDigit(null);
    setFocusedDigit(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.solvedCount, game.clearGrid]);

  const markUserLoadRef = useRef(() => {});
  const handleLoadPuzzle = useCallback(
    (puzzle, puzzleMeta = null) => {
      // Mobile starts with a bare grid - players add their own pencil marks
      const result = game.loadPuzzle(puzzle, puzzleMeta, { withCandidates: false });
      if (!result.ok && result.reason === 'no-solution') {
        toast({ title: 'Invalid puzzle', description: 'This puzzle has no valid solution.', variant: 'destructive' });
        return;
      }
      if (!result.ok && result.reason === 'multiple-solutions') {
        toast({ title: 'Not a proper Sudoku', description: 'This puzzle has more than one solution. Check the givens and try again.', variant: 'destructive' });
        return;
      }
      markUserLoadRef.current();
      setShowPuzzleLoader(false);
      setHighlightedDigit(null);
      setFocusedDigit(null);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [game.loadPuzzle]
  );

  // Keyboard shortcuts (external keyboards on tablets, dev convenience)
  // One listener for the page's lifetime; it reads the latest handlers
  // and state through a ref instead of re-subscribing on every change.
  const keyHandlersRef = useRef({ onKeyDown: (_e) => {}, onKeyUp: (_e) => {} });
  keyHandlersRef.current.onKeyDown = (e) => {
    if (isTypingTarget(e.target)) return;
    const isModalOpen =
      showPuzzleLoader || showColorSettings || showCompletion || showTour ||
      !!document.querySelector('[role="dialog"]');
    if (isModalOpen) return;

    if (e.key === 'Shift' && !e.repeat) {
      setShiftHeld(true);
      return;
    }

    const action = resolveShortcut(e, { hasSelection: selectedCell !== null });
    if (!action) return;

    switch (action.type) {
      case 'move': {
        e.preventDefault();
        if (selectedCell === null) {
          setSelectedCell(0);
          return;
        }
        const row = Math.floor(selectedCell / 9);
        const col = selectedCell % 9;
        const next = {
          up: [Math.max(0, row - 1), col],
          down: [Math.min(8, row + 1), col],
          left: [row, Math.max(0, col - 1)],
          right: [row, Math.min(8, col + 1)],
        }[action.direction];
        setSelectedCell(next[0] * 9 + next[1]);
        return;
      }
      // The phone is digit-first: a bare digit always picks the digit, and
      // the next tap (or an already selected cell) places it.
      case 'focus-digit':
      case 'input':
        e.preventDefault();
        handleDigitSelect(action.digit);
        return;
      case 'toggle-candidate': {
        e.preventDefault();
        if (selectedCell === null) return;
        const cell = game.grid[selectedCell];
        if (!cell.isFixed && cell.value === null) {
          game.handleToggleCandidate(selectedCell, action.digit);
        }
        return;
      }
      case 'clear-cell':
        e.preventDefault();
        handleEraseCell();
        return;
      case 'escape':
        e.preventDefault();
        setFocusedDigit(null);
        setHighlightedDigit(null);
        setSelectedCell(null);
        return;
      case 'undo':
        e.preventDefault();
        game.undo();
        return;
      case 'redo':
        e.preventDefault();
        game.redo();
        return;
      case 'clear-grid':
        e.preventDefault();
        handleClearGrid();
        return;
      default:
        return; // hint / apply: the phone page has no hints
    }
  };

  keyHandlersRef.current.onKeyUp = (e) => {
      if (e.key === 'Shift') {
        setShiftHeld(false);
      }
    };

  useEffect(() => {
    const handleKeyDown = (e) => keyHandlersRef.current.onKeyDown(e);
    const handleKeyUp = (e) => keyHandlersRef.current.onKeyUp(e);
    const handleBlur = () => setShiftHeld(false);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);


  // On mount: resume a saved game; otherwise a gentle starter puzzle for
  // first-time visitors (plus the welcome tour); otherwise a random one.
  const { markUserLoad } = usePuzzleBootstrap({
    restoreSavedGame: game.restoreSavedGame,
    loadPuzzle: handleLoadPuzzle,
    user,
    onResumed: () => toast({ title: 'Resumed your puzzle', description: 'Picked up where you left off. Load a new one any time.' }),
    onFirstVisit: () => setShowTour(true),
  });
  markUserLoadRef.current = markUserLoad;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Screen-reader announcements (rejected inputs) */}
      <div aria-live="polite" role="status" className="sr-only">
        {srAnnouncement}
      </div>

      {/* Header */}
      <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-700/60 sticky top-0 z-50 safe-area-inset-top">
        <div className="max-w-7xl mx-auto px-2 py-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0">
                <span className="text-white font-bold text-sm">9</span>
              </div>
              {game.puzzleName && (
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-sm font-medium text-white truncate">{game.puzzleName}</span>
                  {game.puzzleDifficulty && (
                    <span className="px-2 py-0.5 bg-slate-800 rounded-full text-xs capitalize text-slate-300 shrink-0">{game.puzzleDifficulty}</span>
                  )}
                </div>
              )}
              <div className="px-2 py-1 bg-red-600 rounded-full flex items-center gap-1 shrink-0" title="No Assist Mode" aria-label="No assist mode: every solve is timed">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setShowColorSettings(true)}
                className="p-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-all duration-200 flex items-center justify-center"
                title="Color Settings" aria-label="Color Settings"
              >
                <svg className="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                </svg>
              </button>
              <button
                onClick={() => setShowPuzzleLoader(true)}
                className="p-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg transition-all duration-200 flex items-center justify-center"
                title="Load Puzzle" aria-label="Load Puzzle"
              >
                <svg className="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </button>

              <AccountMenu user={user} />
            </div>
          </div>
        </div>
      </header>

      <main
        className="flex flex-col min-h-[calc(100vh-56px)] px-3"
        style={{ paddingBottom: bottomBarHeight + 12 }}
      >
        {/* Progress strip */}
        <div className="flex items-center justify-between text-xs text-slate-400 py-2">
          <span>{game.progress}% complete</span>
          <span>{game.errorCount === 0 ? 'No errors' : `${game.errorCount} error${game.errorCount === 1 ? '' : 's'}`}</span>
        </div>

        {/* Sudoku Grid - centered in the space above the controls */}
        <div className="flex-1 flex items-start justify-center">
          <SudokuGrid
            grid={game.grid}
            selectedCell={selectedCell}
            focusedDigit={focusedDigit}
            focusedCandidates={null}
            removalCandidates={null}
            highlightedDigit={highlightedDigit}
            validationErrors={game.validationErrors}
            candidateMode={candidateMode}
            candidatesVisible={true}
            colors={colors}
            currentStep={null}
            playbackIndex={0}
            rejectedInput={game.rejectedInput}
            onCellClick={handleCellClick}
            onCellInput={game.handleCellInput}
            onToggleCandidate={game.handleToggleCandidate}
          />
        </div>

        {/* Mobile Controls - Fixed Bottom */}
        <div
          ref={bottomBarRef}
          className="fixed left-0 right-0 bottom-0 bg-slate-900/95 backdrop-blur-md border-t border-slate-700 z-40"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="px-2 pt-1 pb-1.5">
            <DigitStrip
              touch
              grid={game.grid}
              focusedDigit={focusedDigit}
              onDigitSelect={handleDigitSelect}
              pencilMode={pencilMode}
              onPencilModeChange={setPencilMode}
              onUndo={game.undo}
              onRedo={game.redo}
              onErase={handleEraseCell}
              canUndo={game.canUndo}
              canRedo={game.canRedo}
              canErase={
                selectedCell !== null &&
                !game.grid[selectedCell].isFixed &&
                (game.grid[selectedCell].value !== null || game.grid[selectedCell].candidates.length > 0)
              }
              rejected={game.rejectedInput}
            />
          </div>
        </div>
      </main>

      <WelcomeTour
        open={showTour}
        variant="mobile"
        onClose={() => {
          markOnboarded();
          setShowTour(false);
        }}
      />

      {/* Unified Puzzle Loader Modal */}
      {showPuzzleLoader && (
        <Suspense fallback={null}>
          <UnifiedPuzzleLoader
            user={user}
            isOpen={showPuzzleLoader}
            onClose={() => setShowPuzzleLoader(false)}
            onPuzzleLoaded={handleLoadPuzzle}
          />
        </Suspense>
      )}

      {/* Color Settings Modal */}
      {showColorSettings && (
        <Suspense fallback={null}>
          <ColorSettings
            colors={colors}
            onColorsChange={player.saveColors}
            onClose={() => setShowColorSettings(false)}
          />
        </Suspense>
      )}

      {/* Completion Modal */}
      {showCompletion && (
        <Suspense fallback={null}>
          <CompletionModal
            isOpen={showCompletion}
            onClose={() => setShowCompletion(false)}
            stats={completionStats}
          />
        </Suspense>
      )}

    </div>
  );
}
