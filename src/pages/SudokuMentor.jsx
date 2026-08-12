import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import SudokuGrid from '@/components/sudoku/SudokuGrid';
import DigitFilter from '@/components/sudoku/DigitFilter';
import LogicPanel from '@/components/sudoku/LogicPanel';
import ControlBar from '@/components/sudoku/ControlBar';
import UnifiedPuzzleLoader from '@/components/sudoku/UnifiedPuzzleLoader';
import ColorSettings from '@/components/sudoku/ColorSettings';
import CompletionModal from '@/components/sudoku/CompletionModal';
import MobileDrawer from '@/components/sudoku/MobileDrawer';
import { findNextLogicStep } from '@/components/sudoku/logicEngine';
import {
  buildRemovalMap,
  buildFocusedCandidates,
  clearHighlightFlags,
  stampStepHighlights,
} from '@/components/sudoku/stepHighlights';
import {
  fetchAllPuzzleEntries,
  pickRandomPuzzleEntry,
} from '@/components/sudoku/puzzleSources';
import { useSudokuGame } from '@/hooks/useSudokuGame';
import { useSudokuPlayer } from '@/hooks/useSudokuPlayer';
import { base44 } from '@/api/base44Client';
import { AnimatePresence, motion } from 'framer-motion';
import { createPageUrl } from '@/utils';

export default function SudokuMentor() {
  const [selectedCell, setSelectedCell] = useState(null);
  const [focusedDigit, setFocusedDigit] = useState(null);
  const [focusedCandidates, setFocusedCandidates] = useState(null); // { digit: color } map
  const [removalCandidates, setRemovalCandidates] = useState(null); // Map of cellIndex -> Set of digits to remove
  const [currentStep, setCurrentStep] = useState(null);
  const [showPuzzleLoader, setShowPuzzleLoader] = useState(false);
  const [highlightedDigit, setHighlightedDigit] = useState(null);
  const [candidateMode, setCandidateMode] = useState(false);
  const [showColorSettings, setShowColorSettings] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);
  const [completionStats, setCompletionStats] = useState({ timeInSeconds: 0, errorCount: 0 });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [chainPlaybackIndex, setChainPlaybackIndex] = useState(0);
  const [showAppInfo, setShowAppInfo] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [showCopyConfirmation, setShowCopyConfirmation] = useState(false);
  const [noAssistMode, setNoAssistMode] = useState(false);
  const [showNoAssistModal, setShowNoAssistModal] = useState(false);
  const [noAssistStartTime, setNoAssistStartTime] = useState(null);
  const [candidatesVisible, setCandidatesVisible] = useState(true);

  const errorAudioRef = useRef(null);

  // Values the onSolved callback needs that live outside the game hook
  const noAssistRef = useRef({ noAssistMode, noAssistStartTime });
  noAssistRef.current = { noAssistMode, noAssistStartTime };

  const playerRef = useRef(null);

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

      const { noAssistMode: na, noAssistStartTime: naStart } = noAssistRef.current;
      const user = playerRef.current?.user;
      if (na && naStart && user && puzzleName && puzzleDifficulty) {
        const noAssistTime = Math.floor((Date.now() - naStart) / 1000);
        base44.entities.SolveRecord.create({
          puzzle_name: puzzleName,
          difficulty: puzzleDifficulty,
          time_seconds: noAssistTime,
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

  // Touch-first devices get the dedicated mobile page. Feature detection
  // (coarse pointer + narrow viewport) instead of user-agent sniffing.
  useEffect(() => {
    const isTouchDevice =
      window.matchMedia('(pointer: coarse)').matches && window.innerWidth < 1024;
    if (isTouchDevice) {
      window.location.href = createPageUrl('SudokuMentorMobile');
    }
  }, []);

  const clearHighlights = useCallback(() => {
    game.setGrid((prev) => clearHighlightFlags(prev));
    setCurrentStep(null);
    setFocusedCandidates(null);
    setRemovalCandidates(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.setGrid]);

  const handleCellClick = useCallback(
    (cellIndex) => {
      setSelectedCell(cellIndex);

      // If clicking a solved cell, highlight all instances of that number
      const clickedValue = game.grid[cellIndex].value;
      if (clickedValue !== null) {
        setHighlightedDigit((prev) => (prev === clickedValue ? null : clickedValue));
      } else {
        setHighlightedDigit(null);
      }

      clearHighlights();
    },
    [game.grid, clearHighlights]
  );

  const handleDigitFilter = useCallback(
    (digit) => {
      setFocusedDigit((prev) => (prev === digit ? null : digit));
      clearHighlights();
    },
    [clearHighlights]
  );

  // Put a step into "presented" state: current step, candidate colors,
  // removal marks. Shared by the hint flow and the technique browser.
  const presentStep = useCallback(
    (step) => {
      setCurrentStep(step);
      setFocusedDigit(null);
      setRemovalCandidates(buildRemovalMap(step));
      setFocusedCandidates(buildFocusedCandidates(step, game.grid, colors));
    },
    [game.grid, colors]
  );

  const highlightSteps = useCallback(
    (steps) => {
      game.setGrid((prev) => stampStepHighlights(prev, steps));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [game.setGrid]
  );

  const handleNextStep = useCallback(async () => {
    if (noAssistMode) return; // Block hints in no assist mode
    setChainPlaybackIndex(0); // Reset playback for new hint

    let step = findNextLogicStep(game.grid, null);
    if (!step) {
      // No regular techniques found - search for forcing chains automatically
      const { findForcingChain, findHypothesis } = await import(
        '@/components/sudoku/forcingChainEngine'
      );
      step = findForcingChain(game.grid, 100) || findHypothesis(game.grid, 100);
    }

    if (step) {
      presentStep(step);
      highlightSteps([step]);
    }
  }, [game.grid, noAssistMode, presentStep, highlightSteps]);

  const handleApplyStep = useCallback(() => {
    if (noAssistMode) return; // Block apply in no assist mode
    if (!currentStep) return;

    game.applyStep(currentStep);
    setCurrentStep(null);
    setFocusedDigit(null);
    setHighlightedDigit(null);
    setRemovalCandidates(null);
    setFocusedCandidates(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, noAssistMode, game.applyStep]);

  const handleHighlightTechnique = useCallback(
    (instances) => {
      if (instances.length > 0) {
        presentStep(instances[0]);
      }
      highlightSteps(instances);
    },
    [presentStep, highlightSteps]
  );

  const handleUndo = useCallback(() => {
    if (!game.canUndo) return;
    game.undo();
    clearHighlights();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.canUndo, game.undo, clearHighlights]);

  const handleRedo = useCallback(() => {
    if (!game.canRedo) return;
    game.redo();
    clearHighlights();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.canRedo, game.redo, clearHighlights]);

  const handleClearGrid = useCallback(() => {
    if (game.solvedCount > 0 && !window.confirm('Clear the entire grid?')) return;
    game.clearGrid();
    setCurrentStep(null);
    setFocusedCandidates(null);
    setRemovalCandidates(null);
    setHighlightedDigit(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.solvedCount, game.clearGrid]);

  const handleLoadPuzzle = useCallback(
    (puzzle, puzzleMeta = null) => {
      const result = game.loadPuzzle(puzzle, puzzleMeta);
      if (!result.ok && result.reason === 'no-solution') {
        alert('This puzzle has no valid solution!');
        return;
      }
      if (noAssistRef.current.noAssistMode) {
        setNoAssistStartTime(Date.now());
      }
      setShowPuzzleLoader(false);
      setCurrentStep(null);
      setFocusedCandidates(null);
      setRemovalCandidates(null);
      setHighlightedDigit(null);
      setChainPlaybackIndex(0);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [game.loadPuzzle]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Disable shortcuts when any modal is open
      const isModalOpen =
        showPuzzleLoader ||
        showColorSettings ||
        showCompletion ||
        drawerOpen ||
        showAccountMenu ||
        showAppInfo ||
        showCopyConfirmation;
      if (isModalOpen) return;

      // Shift key toggles candidate mode
      if (e.key === 'Shift' && !e.repeat) {
        setCandidateMode(true);
      }

      // Arrow key navigation
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
          setSelectedCell(0); // Start at top-left if no cell selected
        }
        return;
      }

      // Hint shortcut (H key) - disabled in no assist mode
      if (e.key.toLowerCase() === 'h' && !e.ctrlKey && !e.metaKey && !noAssistMode) {
        e.preventDefault();
        handleNextStep();
        return;
      }

      // Apply step (A key) - disabled in no assist mode
      if (e.key.toLowerCase() === 'a' && !e.ctrlKey && !e.metaKey && currentStep && !noAssistMode) {
        e.preventDefault();
        handleApplyStep();
        return;
      }

      // Undo (Z or Ctrl+Z)
      if (e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
        return;
      }

      // Redo (Shift+Z or Ctrl+Shift+Z / Ctrl+Y)
      if (
        (e.key.toLowerCase() === 'z' && e.shiftKey) ||
        (e.key.toLowerCase() === 'y' && (e.ctrlKey || e.metaKey))
      ) {
        e.preventDefault();
        handleRedo();
        return;
      }

      if (e.key >= '1' && e.key <= '9') {
        const digit = parseInt(e.key);

        // Focus digit mode (Ctrl/Cmd + digit)
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          handleDigitFilter(digit);
          return;
        }

        // Candidate mode (Shift + digit) - check selected cell exists and is empty
        if (e.shiftKey && selectedCell !== null) {
          e.preventDefault();
          const cell = game.grid[selectedCell];
          if (!cell.isFixed && cell.value === null) {
            game.handleToggleCandidate(selectedCell, digit);
          }
          return;
        }

        // Regular input
        if (selectedCell !== null && !game.grid[selectedCell].isFixed) {
          e.preventDefault();
          game.handleCellInput(selectedCell, digit);
        }
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        // Don't interfere with input fields
        if (
          document.activeElement.tagName === 'INPUT' ||
          document.activeElement.tagName === 'TEXTAREA'
        ) {
          return;
        }
        e.preventDefault();
        if (selectedCell !== null && !game.grid[selectedCell].isFixed) {
          game.handleCellInput(selectedCell, null);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setFocusedDigit(null);
        setSelectedCell(null);
        setHighlightedDigit(null);
        clearHighlights();
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
    currentStep,
    noAssistMode,
    handleNextStep,
    handleApplyStep,
    handleUndo,
    handleRedo,
    handleDigitFilter,
    handleClearGrid,
    clearHighlights,
    showPuzzleLoader,
    showColorSettings,
    showCompletion,
    drawerOpen,
    showAccountMenu,
    showAppInfo,
    showCopyConfirmation,
  ]);

  const handleCopyPuzzle = () => {
    // Copy the puzzle givens (0 for empty/solved-by-player cells)
    const puzzleString = game.grid.map((cell) => (cell.isFixed ? cell.value : 0)).join('');
    navigator.clipboard.writeText(puzzleString);
    setShowCopyConfirmation(true);
    setTimeout(() => setShowCopyConfirmation(false), 2000);
  };

  const handlePrintPuzzle = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Pop-up blocked - allow pop-ups to print the puzzle.');
      return;
    }
    const puzzleGrid = game.grid.map((cell) => (cell.isFixed ? cell.value : 0));

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${game.puzzleName || 'Sudoku Puzzle'}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            padding: 20px;
          }
          .container { text-align: center; }
          h1 { margin-bottom: 10px; }
          .difficulty { color: #666; margin-bottom: 20px; }
          .grid {
            display: inline-grid;
            grid-template-columns: repeat(9, 40px);
            gap: 0;
            border: 3px solid #000;
          }
          .cell {
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
            font-weight: bold;
            border: 1px solid #999;
          }
          .cell:nth-child(9n+3), .cell:nth-child(9n+6) { border-right: 2px solid #000; }
          .cell:nth-child(n+19):nth-child(-n+27), .cell:nth-child(n+46):nth-child(-n+54) { border-bottom: 2px solid #000; }
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>${game.puzzleName || 'Sudoku Puzzle'}</h1>
          ${game.puzzleDifficulty ? `<div class="difficulty">Difficulty: ${game.puzzleDifficulty}</div>` : ''}
          <div class="grid">
            ${puzzleGrid.map((val) => `<div class="cell">${val || ''}</div>`).join('')}
          </div>
        </div>
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 250);
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

  // Calculate ghost grid for chain visualization
  const ghostGrid = useMemo(() => {
    if (!currentStep?.chain || !Array.isArray(currentStep.chain)) {
      return game.grid;
    }

    const placementSteps = currentStep.chain.filter((s) => s.action === 'place');
    const visibleSteps = placementSteps.slice(0, chainPlaybackIndex + 1);

    return game.grid.map((cell, idx) => {
      const ghostStep = visibleSteps.find((s) => s.cell === idx);
      if (ghostStep) {
        return { ...cell, ghostValue: ghostStep.value };
      }
      return cell;
    });
  }, [game.grid, currentStep, chainPlaybackIndex]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Error sound */}
      <audio ref={errorAudioRef} src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIF2i777edTRALUKXi8LljHAU2jdTwzIUsBS2Ayv=="  preload="auto"></audio>

      {/* Header */}
      <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-700/60 sticky top-0 z-50 safe-area-inset-top">
        <div className="max-w-7xl mx-auto px-2 lg:px-8 py-2 lg:py-4">
          <div className="flex items-center justify-between">
            {/* Logo and Puzzle Info - Desktop */}
            <div className="hidden lg:flex items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
                  <span className="text-white font-bold text-lg">9</span>
                </div>
                <h1 className="text-xl font-semibold text-white tracking-tight">Sudoku Mentor</h1>
              </div>

              {/* Puzzle Info */}
              {game.puzzleName ? (
                <div className="flex items-center gap-3">
                  <p className="text-lg font-medium text-white whitespace-nowrap" title={game.puzzleName}>
                    {game.puzzleName.length > 20 ? game.puzzleName.slice(0, 20) + '...' : game.puzzleName}
                  </p>
                  {game.puzzleDifficulty && (
                    <span className="px-3 py-1 bg-slate-800 rounded-full text-sm capitalize text-slate-300">{game.puzzleDifficulty}</span>
                  )}
                  {player.bestTime && (
                    <span className="px-3 py-1 bg-emerald-900/50 border border-emerald-600/30 rounded-full text-sm text-emerald-400 flex items-center gap-1.5" title="Your best no-assist time">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {Math.floor(player.bestTime / 60)}:{String(player.bestTime % 60).padStart(2, '0')}
                    </span>
                  )}
                  {noAssistMode && (
                    <span className="px-3 py-1 bg-red-600 rounded-full text-sm font-medium text-white">No Assist</span>
                  )}
                </div>
              ) : (
                <p className="text-base text-slate-400">Learn logic-based solving</p>
              )}
            </div>

            {/* Narrow screens - just icon */}
            <div className="lg:hidden flex items-center gap-2">
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
              {noAssistMode && (
                <div className="px-2 py-1 bg-red-600 rounded-full flex items-center gap-1" title="No Assist Mode">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 lg:gap-4">
              {/* Progress - desktop only */}
              <div className="hidden lg:flex items-center gap-2 bg-slate-800 rounded-full px-4 py-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                <span className="text-base text-slate-300">{game.progress}% Complete</span>
              </div>

              {/* Color settings */}
              <button
                onClick={() => setShowColorSettings(true)}
                className="p-2 bg-slate-800 text-slate-300 rounded-lg lg:rounded-xl hover:bg-slate-700 transition-all duration-200 flex items-center justify-center"
                title="Color Settings"
              >
                <svg className="w-4 h-4 lg:w-5 lg:h-5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                </svg>
              </button>

              {/* Desktop-only buttons */}
              <button
                onClick={() => setShowAppInfo(true)}
                className="hidden lg:block p-2 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 transition-all duration-200"
                title="About Sudoku Mentor"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
              <button
                onClick={() => {
                  if (!noAssistMode) {
                    setShowNoAssistModal(true);
                  } else {
                    setNoAssistMode(false);
                    setNoAssistStartTime(null);
                  }
                }}
                className={`hidden lg:block p-2 rounded-xl transition-all duration-200 ${
                  noAssistMode
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
                title={noAssistMode ? "Disable No Assist Mode" : "Enable No Assist Mode"}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </button>
              <button
                onClick={() => setCandidatesVisible(!candidatesVisible)}
                className={`hidden lg:block p-2 rounded-xl transition-all duration-200 ${
                  candidatesVisible
                    ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                }`}
                title={candidatesVisible ? "Hide Candidates" : "Show Candidates"}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {candidatesVisible ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  )}
                </svg>
              </button>
              <button
                onClick={handlePrintPuzzle}
                className="hidden lg:block p-2 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 transition-all duration-200"
                title="Print Puzzle"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
              </button>
              <button
                onClick={handleCopyPuzzle}
                className="hidden lg:block p-2 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 transition-all duration-200"
                title="Copy Puzzle"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
              <button
                onClick={() => setShowPuzzleLoader(true)}
                className="p-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg lg:rounded-xl transition-all duration-200 flex items-center justify-center"
                title="Load Puzzle"
              >
                <svg className="w-4 h-4 lg:w-5 lg:h-5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </button>

              {/* Account Menu */}
              <div className="relative">
                {user ? (
                  <>
                    <button
                      onClick={() => setShowAccountMenu(!showAccountMenu)}
                      className="p-2 bg-slate-800 text-slate-300 rounded-lg lg:rounded-xl hover:bg-slate-700 transition-all duration-200 flex items-center justify-center"
                      title={user.email}
                    >
                      <svg className="w-4 h-4 lg:w-5 lg:h-5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    className="px-3 lg:px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg lg:rounded-xl transition-all duration-200 font-medium text-sm"
                  >
                    Sign In
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 lg:pb-8 pt-16 lg:pt-8">
        <div className="grid lg:grid-cols-[1fr,380px] gap-8">
          {/* Left Column - Grid & Controls */}
          <div className="space-y-6">
            {/* Control Bar (fixed top bar below lg; hidden on desktop) */}
            <ControlBar
              onNextStep={handleNextStep}
              onApplyStep={handleApplyStep}
              onUndo={handleUndo}
              onRedo={handleRedo}
              onClear={handleClearGrid}
              onOpenDrawer={() => setDrawerOpen(true)}
              hasStep={currentStep !== null}
              canUndo={game.canUndo}
              canRedo={game.canRedo}
            />

            {/* Sudoku Grid */}
            <div className="flex justify-center">
              <SudokuGrid
                grid={ghostGrid}
                selectedCell={selectedCell}
                focusedDigit={focusedDigit}
                focusedCandidates={focusedCandidates}
                removalCandidates={removalCandidates}
                highlightedDigit={highlightedDigit}
                validationErrors={game.validationErrors}
                candidateMode={candidateMode}
                candidatesVisible={candidatesVisible}
                colors={colors}
                currentStep={currentStep}
                playbackIndex={chainPlaybackIndex}
                onCellClick={handleCellClick}
                onCellInput={game.handleCellInput}
                onToggleCandidate={game.handleToggleCandidate}
              />
            </div>

            {/* Digit Filter */}
            <DigitFilter
              focusedDigit={focusedDigit}
              onDigitClick={handleDigitFilter}
              grid={game.grid}
            />
          </div>

          {/* Right Column - Logic Panel (Desktop only) */}
          <div className="hidden lg:block">
            <LogicPanel
              currentStep={currentStep}
              focusedDigit={focusedDigit}
              grid={game.grid}
              noAssistMode={noAssistMode}
              onApplyStep={handleApplyStep}
              onNextStep={handleNextStep}
              onChainPlaybackChange={setChainPlaybackIndex}
              chainPlaybackIndex={chainPlaybackIndex}
              onHighlightTechnique={handleHighlightTechnique}
            />
          </div>
        </div>
      </main>

      {/* Drawer with the Logic Panel for narrow screens */}
      <MobileDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <LogicPanel
          currentStep={currentStep}
          focusedDigit={focusedDigit}
          grid={game.grid}
          noAssistMode={noAssistMode}
          onApplyStep={handleApplyStep}
          onNextStep={handleNextStep}
          onChainPlaybackChange={setChainPlaybackIndex}
          chainPlaybackIndex={chainPlaybackIndex}
          onHighlightTechnique={(instances) => {
            handleHighlightTechnique(instances);
            setDrawerOpen(false);
          }}
        />
      </MobileDrawer>

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

      {/* App Info Modal */}
      <AnimatePresence>
        {showAppInfo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowAppInfo(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 rounded-2xl shadow-2xl border border-slate-700 w-full max-w-lg overflow-hidden"
            >
              <div className="p-6 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
                    <span className="text-white font-bold text-xl">9</span>
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold text-white">Sudoku Mentor</h2>
                    <p className="text-slate-400">Learn logic-based solving</p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-4 text-slate-300">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">What is this?</h3>
                  <p className="text-sm leading-relaxed">
                    Sudoku Mentor is an intelligent solving assistant that teaches you human-style techniques.
                    Instead of just giving answers, it shows you the logical reasoning behind each step.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">How to use</h3>
                  <ul className="text-sm space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="text-blue-400 mt-1">•</span>
                      <span><strong className="text-white">Load a puzzle</strong> from the library, upload an image, or enter manually</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-400 mt-1">•</span>
                      <span><strong className="text-white">Click Hint</strong> to discover the next logical technique available</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-400 mt-1">•</span>
                      <span><strong className="text-white">Learn techniques</strong> by reading explanations and seeing highlighted cells</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-400 mt-1">•</span>
                      <span><strong className="text-white">Apply steps</strong> or solve manually using keyboard shortcuts</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-400 mt-1">•</span>
                      <span><strong className="text-white">Browse techniques</strong> in the hierarchy panel to see what's possible</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-blue-950/30 border border-blue-800/30 rounded-lg p-3">
                  <p className="text-sm text-blue-200">
                    <strong>Pro tip:</strong> Use the keyboard shortcuts panel to speed up your solving!
                  </p>
                </div>
              </div>

              <div className="p-6 pt-0">
                <button
                  onClick={() => setShowAppInfo(false)}
                  className="w-full py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
                >
                  Got it, let's solve!
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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

      {/* No Assist Mode Modal */}
      <AnimatePresence>
        {showNoAssistModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowNoAssistModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 rounded-2xl shadow-2xl border border-slate-700 w-full max-w-lg overflow-hidden"
            >
              <div className="p-6 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center shadow-lg shadow-red-500/25">
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold text-white">No Assist Mode</h2>
                    <p className="text-slate-400">Challenge yourself</p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-4 text-slate-300">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">What gets disabled:</h3>
                  <ul className="text-sm space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="text-red-400 mt-1">✕</span>
                      <span><strong className="text-white">Hints</strong> - No logical step suggestions</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-400 mt-1">✕</span>
                      <span><strong className="text-white">Technique Hierarchy</strong> - Pattern browser hidden</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-400 mt-1">✕</span>
                      <span><strong className="text-white">Auto-Solve</strong> - No automated solving</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-400 mt-1">✕</span>
                      <span><strong className="text-white">Keyboard Shortcuts</strong> - H and A keys disabled</span>
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">What you can still use:</h3>
                  <ul className="text-sm space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="text-green-400 mt-1">✓</span>
                      <span><strong className="text-white">Focus Mode</strong> - Digit highlighting remains available</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-400 mt-1">✓</span>
                      <span><strong className="text-white">Candidate Mode</strong> - Manual pencil marks still work</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-400 mt-1">✓</span>
                      <span><strong className="text-white">Undo/Redo</strong> - Mistake recovery enabled</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-blue-950/30 border border-blue-800/30 rounded-lg p-3">
                  <p className="text-sm text-blue-200">
                    <strong>Timer & Records:</strong> Your solve time will be tracked and saved to your account when you complete the puzzle!
                  </p>
                </div>
              </div>

              <div className="p-6 pt-0 flex gap-3">
                <button
                  onClick={() => setShowNoAssistModal(false)}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setNoAssistMode(true);
                    setNoAssistStartTime(Date.now());
                    setShowNoAssistModal(false);
                  }}
                  className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                >
                  Enable No Assist
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
