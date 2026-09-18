import React, { useState, useCallback, useEffect, useRef, useMemo, Suspense } from 'react';
import SudokuGrid from '@/components/sudoku/SudokuGrid';
import DigitFilter from '@/components/sudoku/DigitFilter';
import LogicPanel from '@/components/sudoku/LogicPanel';
import ControlBar from '@/components/sudoku/ControlBar';
import MobileDrawer from '@/components/sudoku/MobileDrawer';
import AccountMenu from '@/components/sudoku/AccountMenu';
import { playErrorTone } from '@/components/sudoku/errorSound';
import { resolveShortcut, isTypingTarget } from '@/components/sudoku/keyboardShortcuts';
import { findNextLogicStep } from '@/components/sudoku/logicEngine';
import { searchWhatIf, isCancelled, HINT_SEARCH_DEPTH } from '@/components/sudoku/whatIfSearch';
import {
  buildRemovalMap,
  buildFocusedCandidates,
} from '@/components/sudoku/stepHighlights';
import { markOnboarded } from '@/components/sudoku/puzzleSources';
import WelcomeTour from '@/components/sudoku/WelcomeTour';
import { FolderOpen } from 'lucide-react';
import { useSudokuGame } from '@/hooks/useSudokuGame';
import { useSudokuPlayer } from '@/hooks/useSudokuPlayer';
import { usePuzzleBootstrap } from '@/hooks/usePuzzleBootstrap';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useDialog } from '@/hooks/useDialog';
import { AnimatePresence, motion } from 'framer-motion';
import { createPageUrl } from '@/utils';
import { toast } from "@/components/ui/use-toast";

// Dialogs that carry their own weight (OCR, colour presets, confetti) load
// on first open rather than with the page.
const UnifiedPuzzleLoader = React.lazy(() => import('@/components/sudoku/UnifiedPuzzleLoader'));
const ColorSettings = React.lazy(() => import('@/components/sudoku/ColorSettings'));
const CompletionModal = React.lazy(() => import('@/components/sudoku/CompletionModal'));

export default function SudokuMentor() {
  const [selectedCell, setSelectedCell] = useState(null);
  const [focusedDigit, setFocusedDigit] = useState(null);
  const [focusedCandidates, setFocusedCandidates] = useState(null); // { digit: color } map
  const [removalCandidates, setRemovalCandidates] = useState(null); // Map of cellIndex -> Set of digits to remove
  const [currentStep, setCurrentStep] = useState(null);
  const [highlightedSteps, setHighlightedSteps] = useState([]);
  const [showPuzzleLoader, setShowPuzzleLoader] = useState(false);
  const [highlightedDigit, setHighlightedDigit] = useState(null);
  const [candidateMode, setCandidateMode] = useState(false);
  const [showColorSettings, setShowColorSettings] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);
  const [completionStats, setCompletionStats] = useState({ timeInSeconds: 0, errorCount: 0 });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [chainPlaybackIndex, setChainPlaybackIndex] = useState(0);
  const [showAppInfo, setShowAppInfo] = useState(false);
  const [showCopyConfirmation, setShowCopyConfirmation] = useState(false);
  const [noAssistMode, setNoAssistMode] = useState(false);
  const [showNoAssistModal, setShowNoAssistModal] = useState(false);
  const appInfoDialog = useDialog({ open: showAppInfo, onClose: () => setShowAppInfo(false) });
  const noAssistDialog = useDialog({ open: showNoAssistModal, onClose: () => setShowNoAssistModal(false) });
  const [candidatesVisible, setCandidatesVisible] = useState(true);
  const [showTour, setShowTour] = useState(false);

  const [srAnnouncement, setSrAnnouncement] = useState('');

  // Values the onSolved callback needs that live outside the game hook
  const noAssistRef = useRef({ noAssistMode });
  noAssistRef.current = { noAssistMode };

  // Touch-first devices get the dedicated mobile page (decided once, before
  // any puzzle is loaded, so this page never writes a saved game the mobile
  // page then "resumes").
  const [redirecting] = useState(
    () => typeof window !== 'undefined'
      && window.matchMedia('(pointer: coarse)').matches
      && window.innerWidth < 1024
  );

  const playerRef = useRef(null);

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

      // A clean solve: No Assist on at the finish AND nothing assisted at
      // any point on this puzzle - no hint, no live technique counts, no
      // scan, no search. Time is play time.
      const { noAssistMode: na } = noAssistRef.current;
      const user = playerRef.current?.user;
      if (na && hintsUsed === 0 && !assistUsed && user && puzzleName && puzzleDifficulty) {
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

  useEffect(() => {
    if (redirecting) window.location.href = createPageUrl('SudokuMentorMobile');
  }, [redirecting]);

  const isLargeScreen = useMediaQuery('(min-width: 1024px)');

  const clearHighlights = useCallback(() => {
    setHighlightedSteps([]);
    setCurrentStep(null);
    setFocusedCandidates(null);
    setRemovalCandidates(null);
  }, []);

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
      game.noteHintUsed();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [game.grid, game.noteHintUsed, colors]
  );

  const highlightSteps = useCallback((steps) => {
    setHighlightedSteps(steps);
  }, []);

  // What-if search runs in a worker; the page shows a spinner and a
  // Cancel button meanwhile, and a result for a grid that has since
  // changed is dropped.
  const [searchingHint, setSearchingHint] = useState(false);
  const hintSearchRef = useRef(null);
  const cancelHintSearch = useCallback(() => {
    hintSearchRef.current?.cancel();
    hintSearchRef.current = null;
    setSearchingHint(false);
  }, []);
  useEffect(() => () => hintSearchRef.current?.cancel(), []);

  const handleNextStep = useCallback(async () => {
    if (noAssistMode) return; // Block hints in no assist mode
    if (hintSearchRef.current) return; // a search is already running
    setChainPlaybackIndex(0); // Reset playback for new hint

    const gridAtStart = game.grid;
    let step = findNextLogicStep(game.logicGrid, null);
    if (!step) {
      // No regular technique applies: what-if search, off the main thread.
      const search = searchWhatIf(game.logicGrid, HINT_SEARCH_DEPTH);
      hintSearchRef.current = search;
      setSearchingHint(true);
      try {
        step = await search.promise;
      } catch (error) {
        if (!isCancelled(error)) {
          console.error('What-if search failed', error);
          toast({ title: 'Hint search failed', description: String(error?.message || error), variant: 'destructive' });
        }
        return;
      } finally {
        if (hintSearchRef.current === search) {
          hintSearchRef.current = null;
          setSearchingHint(false);
        }
      }
      // The board moved on while the worker ran: this result is for a grid
      // the player no longer has.
      if (gridRef.current !== gridAtStart) return;
      if (!step) {
        toast({ title: 'No hint found', description: `No technique or what-if chain within ${HINT_SEARCH_DEPTH} steps. Try the Search button in the Technique Hierarchy for a deeper look.` });
        return;
      }
    }

    if (step) {
      presentStep(step);
      highlightSteps([step]);
    }
  }, [game.grid, game.logicGrid, noAssistMode, presentStep, highlightSteps]);
  const gridRef = useRef(game.grid);
  gridRef.current = game.grid;

  useEffect(() => {
    if (hintSearchRef.current) cancelHintSearch();
  }, [game.grid, cancelHintSearch]);

  const handleApplyStep = useCallback(() => {
    if (noAssistMode) return; // Block apply in no assist mode
    if (!currentStep) return;

    game.applyStep(currentStep);
    setCurrentStep(null);
    setHighlightedSteps([]);
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
    setHighlightedSteps([]);
    setFocusedCandidates(null);
    setRemovalCandidates(null);
    setHighlightedDigit(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.solvedCount, game.clearGrid]);

  const markUserLoadRef = useRef(() => {});
  const handleLoadPuzzle = useCallback(
    (puzzle, puzzleMeta = null) => {
      const result = game.loadPuzzle(puzzle, puzzleMeta);
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
      setCurrentStep(null);
      setHighlightedSteps([]);
      setFocusedCandidates(null);
      setRemovalCandidates(null);
      setHighlightedDigit(null);
      setChainPlaybackIndex(0);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [game.loadPuzzle]
  );

  // Keyboard shortcuts
  // One listener for the page's lifetime; it reads the latest handlers
  // and state through a ref instead of re-subscribing on every change.
  const keyHandlersRef = useRef({ onKeyDown: (_e) => {}, onKeyUp: (_e) => {} });
  keyHandlersRef.current.onKeyDown = (e) => {
      // Typing in a text field is never a shortcut.
      if (isTypingTarget(e.target)) return;

      // Any open dialog owns the keyboard: the page-level flags plus the
      // dialogs the logic panel opens on its own (technique info, scans).
      const isModalOpen =
        showPuzzleLoader ||
        showColorSettings ||
        showCompletion ||
        drawerOpen ||
        showAppInfo ||
        showCopyConfirmation ||
        showTour ||
        !!document.querySelector('[role="dialog"]');
      if (isModalOpen) return;

      // Holding Shift switches to candidate mode for mouse clicks too
      if (e.key === 'Shift' && !e.repeat) {
        setCandidateMode(true);
        return;
      }

      const action = resolveShortcut(e, { hasSelection: selectedCell !== null });
      if (!action) return;

      switch (action.type) {
        case 'move': {
          e.preventDefault();
          if (selectedCell === null) {
            setSelectedCell(0); // Start at top-left if no cell selected
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
        case 'hint':
          if (noAssistMode) return;
          e.preventDefault();
          handleNextStep();
          return;
        case 'apply':
          if (noAssistMode || !currentStep) return;
          e.preventDefault();
          handleApplyStep();
          return;
        case 'undo':
          e.preventDefault();
          handleUndo();
          return;
        case 'redo':
          e.preventDefault();
          handleRedo();
          return;
        case 'focus-digit':
          e.preventDefault();
          handleDigitFilter(action.digit);
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
        case 'input':
          if (selectedCell !== null && !game.grid[selectedCell].isFixed) {
            e.preventDefault();
            game.handleCellInput(selectedCell, action.digit);
          }
          return;
        case 'clear-cell':
          e.preventDefault();
          if (selectedCell !== null && !game.grid[selectedCell].isFixed) {
            game.handleCellInput(selectedCell, null);
          }
          return;
        case 'escape':
          e.preventDefault();
          setFocusedDigit(null);
          setSelectedCell(null);
          setHighlightedDigit(null);
          clearHighlights();
          return;
        case 'clear-grid':
          e.preventDefault();
          handleClearGrid();
          return;
        default:
          return;
      }
    };

  keyHandlersRef.current.onKeyUp = (e) => {
      if (e.key === 'Shift') {
        setCandidateMode(false);
      }
    };

  useEffect(() => {
    const handleKeyDown = (e) => keyHandlersRef.current.onKeyDown(e);
    const handleKeyUp = (e) => keyHandlersRef.current.onKeyUp(e);
    // Shift released while the window was not focused never sends keyup.
    const handleBlur = () => setCandidateMode(false);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  const handleCopyPuzzle = () => {
    // Copy the puzzle givens (0 for empty/solved-by-player cells)
    const puzzleString = game.grid.map((cell) => (cell.isFixed ? cell.value : 0)).join('');
    const write = navigator.clipboard?.writeText
      ? navigator.clipboard.writeText(puzzleString)
      : Promise.reject(new Error('Clipboard unavailable'));
    write
      .then(() => {
        setShowCopyConfirmation(true);
        setTimeout(() => setShowCopyConfirmation(false), 2000);
      })
      .catch(() => {
        toast({ title: 'Could not copy', description: `Copy this by hand: ${puzzleString}`, variant: 'destructive' });
      });
  };

  const handlePrintPuzzle = () => {
    // Anything user-provided goes through escapeHtml: the print page is a
    // same-origin document built from a template string.
    const escapeHtml = (value) =>
      String(value ?? '').replace(/[&<>"']/g, (ch) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
      })[ch]);
    const safeName = escapeHtml(game.puzzleName || 'Sudoku Puzzle');
    const safeDifficulty = escapeHtml(game.puzzleDifficulty || '');
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({ title: 'Pop-up blocked', description: 'Allow pop-ups for this site to print the puzzle.' });
      return;
    }
    const puzzleGrid = game.grid.map((cell) => (cell.isFixed ? cell.value : 0));

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${safeName}</title>
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
          <h1>${safeName}</h1>
          ${safeDifficulty ? `<div class="difficulty">Difficulty: ${safeDifficulty}</div>` : ''}
          <div class="grid">
            ${puzzleGrid.map((val) => `<div class="cell">${Number(val) || ''}</div>`).join('')}
          </div>
        </div>
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 250);
  };

  // On mount: resume a saved game; otherwise a gentle starter puzzle for
  // first-time visitors (plus the welcome tour); otherwise a random one.
  // A puzzle the player loads meanwhile always wins over the random pick.
  const { markUserLoad } = usePuzzleBootstrap({
    restoreSavedGame: game.restoreSavedGame,
    loadPuzzle: handleLoadPuzzle,
    user,
    enabled: !redirecting,
    onResumed: () => toast({ title: 'Resumed your puzzle', description: 'Picked up where you left off. Load a new one any time.' }),
    onFirstVisit: () => setShowTour(true),
  });
  markUserLoadRef.current = markUserLoad;

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
      {/* Screen-reader announcements (rejected inputs) */}
      <div aria-live="polite" role="status" className="sr-only">
        {srAnnouncement}
      </div>

      {/* Header */}
      <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-700/60 sticky top-0 z-50 safe-area-inset-top">
        <div className="max-w-7xl mx-auto px-2 lg:px-8 py-2 lg:py-4">
          <div className="flex items-center justify-between">
            {/* Logo and Puzzle Info - Desktop */}
            <div className="hidden lg:flex items-center gap-6 min-w-0">
              <div className="flex items-center gap-3 shrink-0">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
                  <span className="text-white font-bold text-lg">9</span>
                </div>
                <h1 className="text-xl font-semibold text-white tracking-tight whitespace-nowrap">Sudoku Mentor</h1>
              </div>

              {/* Puzzle Info */}
              {game.puzzleName ? (
                <div className="flex items-center gap-3 min-w-0">
                  <p className="text-lg font-medium text-white truncate max-w-[260px]" title={game.puzzleName}>
                    {game.puzzleName}
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

            <div className="flex items-center gap-2 lg:gap-3 shrink-0">
              {/* Progress - desktop only */}
              <div className="hidden xl:flex items-center gap-2 bg-slate-800 rounded-full px-4 py-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                <span className="text-base text-slate-300 whitespace-nowrap">{game.progress}% Complete</span>
              </div>

              {/* Color settings */}
              <button
                onClick={() => setShowColorSettings(true)}
                className="p-2 bg-slate-800 text-slate-300 rounded-lg lg:rounded-xl hover:bg-slate-700 transition-all duration-200 flex items-center justify-center"
                title="Color Settings" aria-label="Color Settings"
              >
                <svg className="w-4 h-4 lg:w-5 lg:h-5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                </svg>
              </button>

              {/* Desktop-only buttons */}
              <button
                onClick={() => setShowAppInfo(true)}
                className="hidden lg:block p-2 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 transition-all duration-200"
                title="About Sudoku Mentor" aria-label="About Sudoku Mentor"
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
                  }
                }}
                className={`hidden lg:block p-2 rounded-xl transition-all duration-200 ${
                  noAssistMode
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
                title={noAssistMode ? "Disable No Assist Mode" : "Enable No Assist Mode"}
                aria-label={noAssistMode ? "Disable No Assist Mode" : "Enable No Assist Mode"}
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
                aria-label={candidatesVisible ? "Hide candidates" : "Show candidates"}
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
                title="Print Puzzle" aria-label="Print Puzzle"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
              </button>
              <button
                onClick={handleCopyPuzzle}
                className="hidden lg:block p-2 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 transition-all duration-200"
                title="Copy Puzzle" aria-label="Copy Puzzle"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
              <button
                onClick={() => setShowPuzzleLoader(true)}
                className="px-2.5 lg:px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white rounded-lg lg:rounded-xl transition-all duration-200 flex items-center justify-center gap-2 font-medium text-sm"
                title="Load Puzzle" aria-label="Load Puzzle"
              >
                <FolderOpen className="w-4 h-4 lg:w-5 lg:h-5 pointer-events-none" />
                <span className="hidden lg:inline whitespace-nowrap">Load puzzle</span>
              </button>

              <AccountMenu user={user} />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-28 lg:pb-8 pt-6 lg:pt-8">
        <div className="grid lg:grid-cols-[1fr,380px] gap-8">
          {/* Left Column - Grid & Controls */}
          <div className="space-y-6">
            {/* Action bar (fixed bottom bar below lg; hidden on desktop) */}
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
              hintsDisabled={noAssistMode}
              searching={searchingHint}
              onCancelSearch={cancelHintSearch}
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
                highlightedSteps={highlightedSteps}
                playbackIndex={chainPlaybackIndex}
                rejectedInput={game.rejectedInput}
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

          {/* Right Column - Logic Panel (one instance; it lives in the
              drawer below the desktop breakpoint) */}
          {isLargeScreen && (
            <div>
              <LogicPanel
                currentStep={currentStep}
                focusedDigit={focusedDigit}
                grid={game.logicGrid}
                onAssistUsed={game.noteAssistUsed}
                noAssistMode={noAssistMode}
                onApplyStep={handleApplyStep}
                onNextStep={handleNextStep}
                searchingHint={searchingHint}
                onCancelHintSearch={cancelHintSearch}
                onChainPlaybackChange={setChainPlaybackIndex}
                chainPlaybackIndex={chainPlaybackIndex}
                onHighlightTechnique={handleHighlightTechnique}
              />
            </div>
          )}
        </div>
      </main>

      {/* Drawer with the Logic Panel for narrow screens */}
      {!isLargeScreen && (
        <MobileDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)}>
          <LogicPanel
            currentStep={currentStep}
            focusedDigit={focusedDigit}
            grid={game.logicGrid}
            onAssistUsed={game.noteAssistUsed}
            noAssistMode={noAssistMode}
            onApplyStep={handleApplyStep}
            onNextStep={handleNextStep}
            searchingHint={searchingHint}
            onCancelHintSearch={cancelHintSearch}
            onChainPlaybackChange={setChainPlaybackIndex}
            chainPlaybackIndex={chainPlaybackIndex}
            onHighlightTechnique={(instances) => {
              handleHighlightTechnique(instances);
              setDrawerOpen(false);
            }}
          />
        </MobileDrawer>
      )}

      <WelcomeTour
        open={showTour}
        variant="desktop"
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
              ref={appInfoDialog.ref}
              {...appInfoDialog.props}
              aria-label="About Sudoku Mentor"
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
              ref={noAssistDialog.ref}
              {...noAssistDialog.props}
              aria-label="No Assist Mode"
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
