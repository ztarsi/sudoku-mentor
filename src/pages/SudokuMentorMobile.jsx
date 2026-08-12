import React, { useState, useCallback, useEffect, useRef } from 'react';
import SudokuGrid from '@/components/sudoku/SudokuGrid';
import UnifiedPuzzleLoader from '@/components/sudoku/UnifiedPuzzleLoader';
import ColorSettings from '@/components/sudoku/ColorSettings';
import CompletionModal from '@/components/sudoku/CompletionModal';
import CandidateNumpad from '@/components/sudoku/CandidateNumpad';
import {
  fetchAllPuzzleEntries,
  pickRandomPuzzleEntry,
} from '@/components/sudoku/puzzleSources';
import { useSudokuGame } from '@/hooks/useSudokuGame';
import { useSudokuPlayer } from '@/hooks/useSudokuPlayer';
import { base44 } from '@/api/base44Client';
import { AnimatePresence, motion } from 'framer-motion';
import { Undo2, Eraser } from 'lucide-react';
import { toast } from "@/components/ui/use-toast";

export default function SudokuMentorMobile() {
  const [selectedCell, setSelectedCell] = useState(null);
  const [focusedDigit, setFocusedDigit] = useState(null);
  const [showPuzzleLoader, setShowPuzzleLoader] = useState(false);
  const [highlightedDigit, setHighlightedDigit] = useState(null);
  const [candidateMode, setCandidateMode] = useState(false);
  const [showColorSettings, setShowColorSettings] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);
  const [completionStats, setCompletionStats] = useState({ timeInSeconds: 0, errorCount: 0 });
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [showCopyConfirmation, setShowCopyConfirmation] = useState(false);

  const errorAudioRef = useRef(null);
  const playerRef = useRef(null);

  // The mobile page is always no-assist: every solve is recorded.
  const game = useSudokuGame({
    onWrongInput: () => {
      if (errorAudioRef.current) {
        errorAudioRef.current.currentTime = 0;
        errorAudioRef.current.play();
      }
    },
    onSolved: ({ timeInSeconds, errorCount, puzzleName, puzzleDifficulty }) => {
      setCompletionStats({ timeInSeconds, errorCount });
      setShowCompletion(true);

      const user = playerRef.current?.user;
      if (user && puzzleName && puzzleDifficulty) {
        base44.entities.SolveRecord.create({
          puzzle_name: puzzleName,
          difficulty: puzzleDifficulty,
          time_seconds: timeInSeconds,
          no_assist: true,
          error_count: errorCount,
        })
          .then(() => playerRef.current?.refreshBestTime())
          .catch((err) => console.error('Failed to save solve record:', err));
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
      if (focusedDigit !== null) {
        const cell = game.grid[cellIndex];
        if (!cell.isFixed) {
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

  const handleDigitSelect = useCallback(
    (digit) => {
      if (focusedDigit === digit) {
        setFocusedDigit(null);
        setHighlightedDigit(null);
      } else {
        setFocusedDigit(digit);
        setHighlightedDigit(digit);
      }
    },
    [focusedDigit]
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

  const handleLoadPuzzle = useCallback(
    (puzzle, puzzleMeta = null) => {
      // Mobile starts with a bare grid - players add their own pencil marks
      const result = game.loadPuzzle(puzzle, puzzleMeta, { withCandidates: false });
      if (!result.ok && result.reason === 'no-solution') {
        toast({ title: 'Invalid puzzle', description: 'This puzzle has no valid solution.', variant: 'destructive' });
        return;
      }
      setShowPuzzleLoader(false);
      setHighlightedDigit(null);
      setFocusedDigit(null);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [game.loadPuzzle]
  );

  // Keyboard shortcuts (external keyboards on tablets, dev convenience)
  useEffect(() => {
    const handleKeyDown = (e) => {
      const isModalOpen =
        showPuzzleLoader || showColorSettings || showCompletion || showAccountMenu || showCopyConfirmation;
      if (isModalOpen) return;

      if (e.key === 'Shift' && !e.repeat) {
        setCandidateMode(true);
      }

      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        if (selectedCell !== null) {
          const row = Math.floor(selectedCell / 9);
          const col = selectedCell % 9;
          let newRow = row;
          let newCol = col;

          if (e.key === 'ArrowUp') newRow = Math.max(0, row - 1);
          if (e.key === 'ArrowDown') newRow = Math.min(8, row + 1);
          if (e.key === 'ArrowLeft') newCol = Math.max(0, col - 1);
          if (e.key === 'ArrowRight') newCol = Math.min(8, col + 1);

          setSelectedCell(newRow * 9 + newCol);
        } else {
          setSelectedCell(0);
        }
        return;
      }

      if (e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        handleDigitSelect(parseInt(e.key));
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
          return;
        }
        e.preventDefault();
        handleEraseCell();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setFocusedDigit(null);
        setHighlightedDigit(null);
        setSelectedCell(null);
      } else if (e.key.toLowerCase() === 'z' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        game.undo();
      } else if (e.key.toLowerCase() === 'c' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        handleClearGrid();
      }
    };

    const handleKeyUp = (e) => {
      if (e.key === 'Shift') {
        setCandidateMode(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [
    selectedCell,
    game,
    handleDigitSelect,
    handleEraseCell,
    handleClearGrid,
    showPuzzleLoader,
    showColorSettings,
    showCompletion,
    showAccountMenu,
    showCopyConfirmation,
  ]);

  const handleCopyPuzzle = () => {
    const puzzleString = game.grid.map((cell) => (cell.isFixed ? cell.value : 0)).join('');
    navigator.clipboard.writeText(puzzleString);
    setShowCopyConfirmation(true);
    setTimeout(() => setShowCopyConfirmation(false), 2000);
  };

  // Load a random puzzle on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const entries = await fetchAllPuzzleEntries();
        const entry = pickRandomPuzzleEntry(entries);
        if (entry && !cancelled) {
          handleLoadPuzzle(entry.puzzle, { name: entry.name, difficulty: entry.difficulty });
        }
      } catch (error) {
        console.error('Failed to load random puzzle:', error);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Error sound */}
      <audio ref={errorAudioRef} src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIF2i777edTRALUKXi8LljHAU2jdTwzIUsBS2Ayv=="  preload="auto"></audio>

      {/* Header */}
      <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-700/60 sticky top-0 z-50 safe-area-inset-top">
        <div className="max-w-7xl mx-auto px-2 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">9</span>
              </div>
              {game.puzzleName && (
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium text-white truncate max-w-[120px]">{game.puzzleName}</span>
                  {game.puzzleDifficulty && (
                    <span className="px-2 py-0.5 bg-slate-800 rounded-full text-xs capitalize text-slate-300">{game.puzzleDifficulty}</span>
                  )}
                </div>
              )}
              <div className="px-2 py-1 bg-red-600 rounded-full flex items-center gap-1" title="No Assist Mode">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowColorSettings(true)}
                className="p-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-all duration-200 flex items-center justify-center"
                title="Color Settings"
              >
                <svg className="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                </svg>
              </button>
              <button
                onClick={() => setShowPuzzleLoader(true)}
                className="p-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg transition-all duration-200 flex items-center justify-center"
                title="Load Puzzle"
              >
                <svg className="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </button>

              <div className="relative">
                {user ? (
                  <>
                    <button
                      onClick={() => setShowAccountMenu(!showAccountMenu)}
                      className="p-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-all duration-200 flex items-center justify-center"
                      title={user.email}
                    >
                      <svg className="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </button>

                    {showAccountMenu && (
                      <div className="absolute right-0 mt-2 w-56 bg-slate-800 rounded-lg shadow-xl border border-slate-700 overflow-hidden z-50">
                        <div className="px-4 py-3 border-b border-slate-700">
                          <p className="text-sm text-slate-400">Signed in as</p>
                          <p className="text-sm font-medium text-white truncate">{user.email}</p>
                        </div>
                        <button
                          onClick={() => {
                            base44.auth.logout();
                            setShowAccountMenu(false);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 transition-colors"
                        >
                          Sign out
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <button
                    onClick={() => base44.auth.redirectToLogin(window.location.href)}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-all duration-200 font-medium text-sm"
                  >
                    Sign In
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex flex-col h-[calc(100vh-56px)]">
        {/* Sudoku Grid */}
        <div className="pt-5">
          <SudokuGrid
            grid={game.grid}
            selectedCell={selectedCell}
            focusedDigit={null}
            focusedCandidates={focusedDigit ? { [focusedDigit]: colors.focusDigit || '#fbbf24' } : null}
            removalCandidates={null}
            highlightedDigit={highlightedDigit}
            validationErrors={game.validationErrors}
            candidateMode={candidateMode}
            candidatesVisible={true}
            colors={colors}
            currentStep={null}
            playbackIndex={0}
            onCellClick={handleCellClick}
            onCellInput={game.handleCellInput}
            onToggleCandidate={game.handleToggleCandidate}
          />
        </div>

        {/* Mobile Controls - Fixed Bottom */}
        <div className="fixed left-0 right-0 bg-slate-900/95 backdrop-blur-md border-t border-slate-700 z-40" style={{ bottom: '20px' }}>
          {/* Mode toggle + undo/erase */}
          <div className="flex items-center gap-2 px-2 py-2 border-b border-slate-800">
            <button
              onClick={() => setCandidateMode(false)}
              className={`flex-1 py-2 rounded-lg font-medium text-sm transition-all ${
                !candidateMode
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              Solve
            </button>
            <button
              onClick={() => setCandidateMode(true)}
              className={`flex-1 py-2 rounded-lg font-medium text-sm transition-all ${
                candidateMode
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              Candidate
            </button>
            <button
              onClick={game.undo}
              disabled={!game.canUndo}
              className={`p-2.5 rounded-lg transition-all ${
                game.canUndo
                  ? 'bg-slate-800 text-slate-300 active:bg-slate-700'
                  : 'bg-slate-800 text-slate-700'
              }`}
              title="Undo"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleEraseCell}
              disabled={selectedCell === null || game.grid[selectedCell]?.isFixed}
              className={`p-2.5 rounded-lg transition-all ${
                selectedCell !== null && !game.grid[selectedCell]?.isFixed
                  ? 'bg-slate-800 text-red-400 active:bg-red-950'
                  : 'bg-slate-800 text-slate-700'
              }`}
              title="Erase cell"
            >
              <Eraser className="w-4 h-4" />
            </button>
          </div>

          {/* Digit Input */}
          <div className="py-1.5 px-1">
            <div className="flex gap-1 justify-between">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(digit => {
                const digitCount = game.grid.filter(cell => cell.value === digit).length;
                const isComplete = digitCount >= 9;
                const isSelected = focusedDigit === digit;

                return (
                  <button
                    key={digit}
                    onClick={() => handleDigitSelect(digit)}
                    disabled={isComplete && !candidateMode}
                    className={`
                      relative flex-shrink-0 w-9 h-9 rounded-lg font-semibold text-sm
                      transition-all duration-200
                      ${isComplete && !candidateMode
                        ? 'bg-emerald-900/40 text-emerald-600 cursor-not-allowed'
                        : isSelected
                          ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg'
                          : 'bg-slate-800 text-slate-300 active:bg-slate-700'
                      }
                    `}
                  >
                    {digit}
                    {isComplete && !candidateMode && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full flex items-center justify-center text-[7px] text-white">
                        ✓
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </main>

      {/* Candidate Numpad - bottom sheet for mobile candidate entry */}
      <CandidateNumpad
        isOpen={candidateMode && selectedCell !== null}
        selectedCell={selectedCell}
        grid={game.grid}
        onToggleCandidate={(digit) => game.handleToggleCandidate(selectedCell, digit)}
        onClose={() => setCandidateMode(false)}
        colors={colors}
        focusedDigit={focusedDigit}
        removalCandidates={null}
      />

      {/* Unified Puzzle Loader Modal */}
      <UnifiedPuzzleLoader
        isOpen={showPuzzleLoader}
        onClose={() => setShowPuzzleLoader(false)}
        onPuzzleLoaded={handleLoadPuzzle}
      />

      {/* Color Settings Modal */}
      {showColorSettings && (
        <ColorSettings
          colors={colors}
          onColorsChange={player.saveColors}
          onClose={() => setShowColorSettings(false)}
        />
      )}

      {/* Completion Modal */}
      <CompletionModal
        isOpen={showCompletion}
        onClose={() => setShowCompletion(false)}
        stats={completionStats}
      />

      {/* Click outside to close account menu */}
      {showAccountMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowAccountMenu(false)}
        />
      )}

      {/* Copy Confirmation Toast */}
      <AnimatePresence>
        {showCopyConfirmation && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50 bg-slate-800 text-white px-6 py-3 rounded-lg shadow-xl border border-slate-700"
          >
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="font-medium">Puzzle copied to clipboard!</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
