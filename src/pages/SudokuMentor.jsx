import React, { useState, useCallback, useEffect, useRef, useMemo, Suspense } from 'react';
import SudokuGrid from '@/components/sudoku/SudokuGrid';
import DigitStrip from '@/components/sudoku/DigitStrip';
import LogicPanel from '@/components/sudoku/LogicPanel';
import LessonSheet, { SIDE_SHEET_WIDTH } from '@/components/sudoku/LessonSheet';
import HeaderMenu from '@/components/sudoku/HeaderMenu';
import ConfirmDialog from '@/components/sudoku/ConfirmDialog';
import AccountMenu from '@/components/sudoku/AccountMenu';
import KeyboardShortcutsDialog from '@/components/sudoku/panel/KeyboardShortcutsDialog';
import { playErrorTone } from '@/components/sudoku/errorSound';
import { resolveShortcut, isTypingTarget } from '@/components/sudoku/keyboardShortcuts';
import { findNextLogicStep, onlySinglesRemain } from '@/components/sudoku/logicEngine';
import { searchWhatIf, isCancelled, isTimedOut, HINT_SEARCH_DEPTH, HINT_TIME_BUDGET_MS } from '@/components/sudoku/whatIfSearch';
import {
  buildRemovalMap,
  buildFocusedCandidates,
} from '@/components/sudoku/stepHighlights';
import { markOnboarded, fetchAllPuzzleEntries, pickNextOnShelf, shelfAbove } from '@/components/sudoku/puzzleSources';
import HowToPlayDialog from '@/components/sudoku/HowToPlayDialog';
import Callout from '@/components/sudoku/Callout';
import {
  startOnboarding,
  onFirstPlacement,
  onHintDelay,
  onHintAsked,
  onStepShown,
  onStepCleared,
  dismissPrompt,
  visiblePrompts,
  HINT_PROMPT_DELAY_MS,
} from '@/lib/onboarding';
import { FolderOpen, HelpCircle, Keyboard, Palette, Printer, Copy, Trash2, Info, Moon, Sun, MonitorSmartphone } from 'lucide-react';
import { useSudokuGame } from '@/hooks/useSudokuGame';
import { useSudokuPlayer } from '@/hooks/useSudokuPlayer';
import { usePuzzleBootstrap } from '@/hooks/usePuzzleBootstrap';
import { useArrangement } from '@/hooks/useArrangement';
import { useDialog } from '@/hooks/useDialog';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from "@/components/ui/use-toast";

// Dialogs that carry their own weight (OCR, colour presets, confetti) load
// on first open rather than with the page.
const UnifiedPuzzleLoader = React.lazy(() => import('@/components/sudoku/UnifiedPuzzleLoader'));
const ColorSettings = React.lazy(() => import('@/components/sudoku/ColorSettings'));
const CompletionModal = React.lazy(() => import('@/components/sudoku/CompletionModal'));

const LESSON_PINNED_KEY = 'sudoku-mentor:lesson-pinned';
const readLessonPinned = () => {
  try {
    return window.localStorage.getItem(LESSON_PINNED_KEY) === '1';
  } catch {
    return false;
  }
};
const writeLessonPinned = (pinned) => {
  try {
    window.localStorage.setItem(LESSON_PINNED_KEY, pinned ? '1' : '0');
  } catch {
    // remembering is a courtesy
  }
};

/** Every cell a step touches, for keeping them in view above a bottom sheet. */
const stepCells = (step) => {
  const cells = [
    ...(step?.placement ? [step.placement.cell] : []),
    ...(Array.isArray(step?.targetCells) ? step.targetCells : []),
    ...(Array.isArray(step?.baseCells) ? step.baseCells : []),
  ].filter((c) => typeof c === 'number');
  return [...new Set(cells)];
};

const HINT_PROMPT = 'Stuck? Ask for a hint.';
const CARD_PROMPT = 'Apply it, or place the digit yourself to practise.';

const formatClock = (seconds) => {
  const s = Math.max(0, Math.floor(seconds || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const rest = s % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
    : `${m}:${String(rest).padStart(2, '0')}`;
};

export default function SudokuMentor() {
  const [selectedCell, setSelectedCell] = useState(null);
  const [focusedDigit, setFocusedDigit] = useState(null);
  const [focusedCandidates, setFocusedCandidates] = useState(null); // { digit: color } map
  const [removalCandidates, setRemovalCandidates] = useState(null); // Map of cellIndex -> Set of digits to remove
  const [currentStep, setCurrentStep] = useState(null);
  const [highlightedSteps, setHighlightedSteps] = useState([]);
  const [showPuzzleLoader, setShowPuzzleLoader] = useState(false);
  const [highlightedDigit, setHighlightedDigit] = useState(null);
  // Pencil marks: the strip's toggle is sticky; Shift adds to it while held.
  const [pencilMode, setPencilMode] = useState(false);
  const [shiftHeld, setShiftHeld] = useState(false);
  const candidateMode = pencilMode || shiftHeld;
  const [showColorSettings, setShowColorSettings] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);
  const [completionStats, setCompletionStats] = useState({ timeInSeconds: 0, errorCount: 0 });
  // Where the lesson lives depends on the width (one-adaptive-page spec):
  // a column, a side sheet, a bottom sheet, or nowhere on a phone.
  const { arrangement, lesson, stripFixed, touch: touchInput } = useArrangement();
  const phone = arrangement === 'phone';
  const sheetMode = lesson === 'side' || lesson === 'bottom';
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetPinned, setSheetPinned] = useState(readLessonPinned);
  const [sheetHeight, setSheetHeight] = useState(0);
  const [headerHeight, setHeaderHeight] = useState(56);
  const [bottomBarHeight, setBottomBarHeight] = useState(0);
  const headerRef = useRef(null);
  const bottomBarRef = useRef(null);
  // The board's height budget: what is left between its top and the strip
  // (issue #55). Measured, so board and strip share the viewport on every
  // width instead of the strip falling below the fold.
  const boardAreaRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const stripCardRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const [boardMax, setBoardMax] = useState(null);
  const [chainPlaybackIndex, setChainPlaybackIndex] = useState(0);
  const [showAppInfo, setShowAppInfo] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  // What this puzzle taught: one entry per presented hint, marked when the
  // mentor applied it or the player placed the digit themselves.
  const [lessonLog, setLessonLog] = useState([]);
  const [nothingLeft, setNothingLeft] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [noAssistMode, setNoAssistMode] = useState(false);
  // The phone keeps No Assist on for now (founder decision, 18 Sep 2026):
  // no lesson fits, so every phone solve is timed and hint-free.
  const effectiveNoAssist = noAssistMode || phone;
  const [showNoAssistModal, setShowNoAssistModal] = useState(false);
  const appInfoDialog = useDialog({ open: showAppInfo, onClose: () => setShowAppInfo(false) });
  const noAssistDialog = useDialog({ open: showNoAssistModal, onClose: () => setShowNoAssistModal(false) });
  const [candidatesVisible, setCandidatesVisible] = useState(true);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  // The first visit's three in-context prompts; null for a returning visitor.
  const [onboarding, setOnboarding] = useState(null);

  const [srAnnouncement, setSrAnnouncement] = useState('');

  // Values the onSolved callback needs that live outside the game hook
  const noAssistRef = useRef({ noAssistMode: effectiveNoAssist });
  noAssistRef.current = { noAssistMode: effectiveNoAssist };

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
  const { user, colors, themeChoice, setThemeChoice } = player;

  // The sticky header and the fixed strip bar are measured so the sheets
  // sit between them and scroll padding keeps the hint's cells in view.
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return undefined;
    setHeaderHeight(Math.ceil(el.getBoundingClientRect().height));
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) setHeaderHeight(Math.ceil(entry.contentRect.height));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const el = bottomBarRef.current;
    if (!stripFixed || !el) {
      setBottomBarHeight(0);
      return undefined;
    }
    setBottomBarHeight(Math.ceil(el.getBoundingClientRect().height));
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) setBottomBarHeight(Math.ceil(entry.contentRect.height));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [stripFixed]);

  useEffect(() => {
    const measure = () => {
      const area = boardAreaRef.current;
      if (!area || typeof window === 'undefined') return;
      const top = area.getBoundingClientRect().top + window.scrollY;
      const stripRoom = stripFixed
        ? bottomBarHeight + 12
        : (stripCardRef.current?.getBoundingClientRect().height ?? 130) + 16 + 16;
      // The board card's own padding, plus a little slack so the page never scrolls.
      const chrome = stripFixed ? 8 : 24 + 8;
      const room = window.innerHeight - top - stripRoom - chrome;
      setBoardMax(Math.max(320, Math.floor(room)));
    };
    measure();
    window.addEventListener('resize', measure);
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    if (observer && stripCardRef.current) observer.observe(stripCardRef.current);
    if (observer && headerRef.current) observer.observe(headerRef.current);
    return () => {
      window.removeEventListener('resize', measure);
      observer?.disconnect();
    };
  }, [stripFixed, bottomBarHeight, arrangement]);

  // The No Assist clock: in the header switch, and in the phone's status strip.
  const [clock, setClock] = useState(0);
  useEffect(() => {
    if (!effectiveNoAssist) return undefined;
    const tick = () => setClock(game.getElapsedSeconds?.() ?? 0);
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveNoAssist, game.getElapsedSeconds]);

  // Toasts sit above the fixed strip bar, never over the board.
  useEffect(() => {
    document.documentElement.style.setProperty('--bottom-bar-height', `${bottomBarHeight}px`);
    return () => {
      document.documentElement.style.removeProperty('--bottom-bar-height');
    };
  }, [bottomBarHeight]);

  const clearHighlights = useCallback(() => {
    setHighlightedSteps([]);
    setCurrentStep(null);
    setFocusedCandidates(null);
    setRemovalCandidates(null);
    setNothingLeft(false);
  }, []);

  const handleCellClick = useCallback(
    (cellIndex, { selectOnly = false } = {}) => {
      setSelectedCell(cellIndex);
      clearHighlights();

      const cell = game.grid[cellIndex];
      // Digit-first: an armed digit goes into the empty cell that was tapped
      // (or toggles as a pencil mark). The digit stays armed. Right after a
      // dialog closed the click only selects (issue #53).
      if (focusedDigit !== null && !selectOnly && !cell.isFixed && cell.value === null) {
        if (candidateMode) game.handleToggleCandidate(cellIndex, focusedDigit);
        else game.handleCellInput(cellIndex, focusedDigit);
        setHighlightedDigit(null);
        return;
      }

      // If clicking a solved cell, highlight all instances of that number
      const clickedValue = cell.value;
      if (clickedValue !== null) {
        setHighlightedDigit((prev) => (prev === clickedValue ? null : clickedValue));
      } else {
        setHighlightedDigit(null);
      }
    },
    [game, focusedDigit, candidateMode, clearHighlights]
  );

  // The strip: cell-first when an editable cell is selected (the digit goes
  // straight in), digit-first otherwise (the digit is armed for the next
  // cell taps, and highlighted on the board meanwhile).
  const handleDigitSelect = useCallback(
    (digit) => {
      clearHighlights();
      const cell = selectedCell !== null ? game.grid[selectedCell] : null;
      if (cell && !cell.isFixed && cell.value === null) {
        if (candidateMode) game.handleToggleCandidate(selectedCell, digit);
        else game.handleCellInput(selectedCell, digit);
        return;
      }
      setFocusedDigit((prev) => (prev === digit ? null : digit));
    },
    [game, selectedCell, candidateMode, clearHighlights]
  );

  const handleErase = useCallback(() => {
    if (selectedCell === null) return;
    const cell = game.grid[selectedCell];
    if (cell.isFixed) return;
    game.handleCellInput(selectedCell, null);
  }, [game, selectedCell]);

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
      setNothingLeft(false);
      setSheetOpen(true);
      setLessonLog((log) => [
        ...log,
        { id: log.length + 1, technique: step.technique, placement: step.placement, byPlayer: null },
      ]);
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

  const handleNextStep = useCallback(async (force = false) => {
    if (effectiveNoAssist) return; // Block hints in no assist mode
    if (hintSearchRef.current) return; // a search is already running
    setChainPlaybackIndex(0); // Reset playback for new hint
    setSheetOpen(true); // the lesson sheet, where the lesson is not a column
    setOnboarding(onHintAsked);

    const gridAtStart = game.grid;
    let step = findNextLogicStep(game.logicGrid, null);
    // Only singles left (issue #54): every empty cell on the player's board
    // shows one pencil mark, and this puzzle has already taught at least one
    // single. Until both hold, singles are lessons like any other technique.
    // "Show me the next one" asks with force and gets a normal hint.
    const taughtASingle = lessonLog.some((e) => e.technique === 'Naked Single' || e.technique === 'Hidden Single');
    if (
      step &&
      !force &&
      (step.technique === 'Naked Single' || step.technique === 'Hidden Single') &&
      taughtASingle &&
      candidatesVisible &&
      onlySinglesRemain(game.grid)
    ) {
      setNothingLeft(true);
      game.noteAssistUsed();
      return;
    }
    if (!step) {
      // No regular technique applies: what-if search, off the main thread.
      const search = searchWhatIf(game.logicGrid, HINT_SEARCH_DEPTH, { timeBudgetMs: HINT_TIME_BUDGET_MS });
      hintSearchRef.current = search;
      setSearchingHint(true);
      try {
        step = await search.promise;
      } catch (error) {
        if (isTimedOut(error)) {
          toast({ title: 'No quick hint', description: `The what-if search ran out of time (${HINT_TIME_BUDGET_MS / 1000} s). The Search button under Techniques looks longer and deeper.` });
        } else if (!isCancelled(error)) {
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
        toast({ title: 'No hint found', description: `No technique or what-if chain within ${HINT_SEARCH_DEPTH} steps. Try the Search button under Techniques for a deeper look.` });
        return;
      }
    }

    if (step) {
      presentStep(step);
      highlightSteps([step]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.grid, game.logicGrid, game.noteAssistUsed, effectiveNoAssist, presentStep, highlightSteps, lessonLog, candidatesVisible]);
  const gridRef = useRef(game.grid);
  gridRef.current = game.grid;

  // The strip's Hint button: reopen a closed sheet that still holds a
  // lesson rather than logging the same hint twice.
  const handleHintButton = useCallback(() => {
    if (currentStep && !sheetOpen) {
      setSheetOpen(true);
      return;
    }
    handleNextStep();
  }, [currentStep, sheetOpen, handleNextStep]);

  const handlePinnedChange = useCallback((pinned) => {
    setSheetPinned(pinned);
    writeLessonPinned(pinned);
  }, []);

  // A sheet that is not pinned closes on its own once there is nothing to
  // show: the lesson was applied, the board was touched, a new puzzle
  // loaded. The solved card keeps it open.
  useEffect(() => {
    if (!sheetMode || sheetPinned) return;
    if (currentStep === null && !searchingHint && !nothingLeft && !game.completed) setSheetOpen(false);
  }, [sheetMode, sheetPinned, currentStep, searchingHint, nothingLeft, game.completed]);
  useEffect(() => {
    if (sheetMode && game.completed) setSheetOpen(true);
  }, [sheetMode, game.completed]);

  // A bottom sheet covers the lower part of the page: pad the document so
  // the board can scroll clear of it, and bring the hint's cells into view.
  const bottomSheetHeight = lesson === 'bottom' ? sheetHeight : 0;
  useEffect(() => {
    if (lesson !== 'bottom' || !sheetOpen) return undefined;
    const root = document.documentElement;
    root.style.scrollPaddingTop = `${headerHeight + 8}px`;
    root.style.scrollPaddingBottom = `${bottomBarHeight + bottomSheetHeight + 8}px`;
    return () => {
      root.style.scrollPaddingTop = '';
      root.style.scrollPaddingBottom = '';
    };
  }, [lesson, sheetOpen, headerHeight, bottomBarHeight, bottomSheetHeight]);
  useEffect(() => {
    if (lesson !== 'bottom' || !sheetOpen || !currentStep || bottomSheetHeight === 0) return;
    const cells = stepCells(currentStep);
    if (cells.length === 0) return;
    const byRow = [...cells].sort((a, b) => Math.floor(a / 9) - Math.floor(b / 9));
    // Bottom-most first, then top-most: 'nearest' plus the scroll padding
    // set above leaves both between the header and the sheet.
    document.getElementById(`sudoku-cell-${byRow[byRow.length - 1]}`)?.scrollIntoView({ block: 'nearest' });
    document.getElementById(`sudoku-cell-${byRow[0]}`)?.scrollIntoView({ block: 'nearest' });
  }, [lesson, sheetOpen, currentStep, bottomSheetHeight]);

  useEffect(() => {
    if (hintSearchRef.current) cancelHintSearch();
  }, [game.grid, cancelHintSearch]);

  const handleApplyStep = useCallback(() => {
    if (effectiveNoAssist) return; // Block apply in no assist mode
    if (!currentStep) return;

    if (game.applyStep(currentStep)) {
      setLessonLog((log) => log.map((e, i) => (i === log.length - 1 && e.byPlayer === null ? { ...e, byPlayer: false } : e)));
    }
    setCurrentStep(null);
    setHighlightedSteps([]);
    setFocusedDigit(null);
    setHighlightedDigit(null);
    setRemovalCandidates(null);
    setFocusedCandidates(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, effectiveNoAssist, game.applyStep]);

  // The player placed the digit the last hint pointed at: theirs, not the mentor's.
  useEffect(() => {
    setLessonLog((log) => {
      const last = log[log.length - 1];
      if (!last || last.byPlayer !== null || !last.placement) return log;
      const cell = game.grid[last.placement.cell];
      if (cell && cell.value === last.placement.digit) {
        return log.map((e, i) => (i === log.length - 1 ? { ...e, byPlayer: true } : e));
      }
      return log;
    });
  }, [game.grid]);

  // Solved card actions: another puzzle on this shelf, or the shelf above.
  const handleNextPuzzle = useCallback(
    async (kind) => {
      const current = game.puzzleDifficulty || 'easy';
      const shelf = kind === 'above' ? shelfAbove(current) || current : current;
      const entries = await fetchAllPuzzleEntries(playerRef.current?.user ?? null);
      const entry = pickNextOnShelf(entries, shelf, game.puzzleName);
      if (entry) handleLoadPuzzle(entry.puzzle, { name: entry.name, difficulty: entry.difficulty });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [game.puzzleDifficulty, game.puzzleName]
  );

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

  const doClearGrid = useCallback(() => {
    setShowClearConfirm(false);
    game.clearGrid();
    setCurrentStep(null);
    setHighlightedSteps([]);
    setFocusedCandidates(null);
    setRemovalCandidates(null);
    setHighlightedDigit(null);
    setNothingLeft(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.clearGrid]);
  const handleClearGrid = useCallback(() => {
    if (game.solvedCount > 0) setShowClearConfirm(true);
    else doClearGrid();
  }, [game.solvedCount, doClearGrid]);

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
      setLessonLog([]);
      setNothingLeft(false);
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
        showAppInfo ||
        showClearConfirm ||
        showHowToPlay ||
        !!document.querySelector('[role="dialog"]');
      if (isModalOpen) return;

      // Holding Shift switches to candidate mode for mouse clicks too
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
          if (effectiveNoAssist) return;
          e.preventDefault();
          handleNextStep();
          return;
        case 'apply':
          if (effectiveNoAssist || !currentStep) return;
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
        case 'shortcuts':
          e.preventDefault();
          setShowShortcuts(true);
          return;
        default:
          return;
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
    // Shift released while the window was not focused never sends keyup.
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

  const handleCopyPuzzle = () => {
    // Copy the puzzle givens (0 for empty/solved-by-player cells)
    const puzzleString = game.grid.map((cell) => (cell.isFixed ? cell.value : 0)).join('');
    const write = navigator.clipboard?.writeText
      ? navigator.clipboard.writeText(puzzleString)
      : Promise.reject(new Error('Clipboard unavailable'));
    write
      .then(() => {
        toast({ title: 'Puzzle copied', description: 'The givens are on your clipboard as 81 digits.' });
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
    // No modal on arrival: the board is live at once and the three ideas
    // arrive as prompts, each on the control it concerns, once.
    onFirstVisit: () => {
      markOnboarded();
      setOnboarding(startOnboarding());
    },
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

  // The first visit's prompts: which are on screen now, and what moves them on.
  const prompts = visiblePrompts(onboarding, { hasStep: currentStep !== null, canHint: !effectiveNoAssist && !phone });
  // The first digit the player placed (givens do not count).
  const playerPlaced = useMemo(() => game.grid.some((c) => !c.isFixed && c.value !== null), [game.grid]);
  useEffect(() => {
    if (onboarding && playerPlaced) setOnboarding(onFirstPlacement);
  }, [onboarding, playerPlaced]);
  useEffect(() => {
    if (!onboarding || onboarding.hint !== 'pending') return undefined;
    const id = setTimeout(() => setOnboarding(onHintDelay), HINT_PROMPT_DELAY_MS);
    return () => clearTimeout(id);
  }, [onboarding]);
  useEffect(() => {
    setOnboarding(currentStep ? onStepShown : onStepCleared);
  }, [currentStep]);
  const boardPrompt = prompts.board ? (
    <div className="flex justify-center">
      <Callout arrow="down" onDismiss={() => setOnboarding((s) => dismissPrompt(s, 'board'))} testId="prompt-board">
        {touchInput ? 'Pick a digit, then tap cells' : 'Tap a cell, then a digit'}
      </Callout>
    </div>
  ) : null;

  const board = (
    <div className="flex justify-center" ref={boardAreaRef}>
      <SudokuGrid
        maxSize={boardMax}
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
  );

  // The digit strip: one input model on every width. Where the lesson is a
  // sheet, Hint lives on the strip too.
  const strip = (
    <DigitStrip
      grid={game.grid}
      focusedDigit={focusedDigit}
      onDigitSelect={handleDigitSelect}
      pencilMode={pencilMode}
      onPencilModeChange={setPencilMode}
      onUndo={handleUndo}
      onRedo={handleRedo}
      onErase={handleErase}
      canUndo={game.canUndo}
      canRedo={game.canRedo}
      canErase={
        selectedCell !== null &&
        !game.grid[selectedCell].isFixed &&
        (game.grid[selectedCell].value !== null || game.grid[selectedCell].candidates.length > 0)
      }
      rejected={game.rejectedInput}
      touch={touchInput}
      marksVisible={candidatesVisible}
      onMarksVisibleChange={setCandidatesVisible}
      inline={arrangement === 'wide'}
      hint={
        sheetMode
          ? {
              onClick: handleHintButton,
              disabled: effectiveNoAssist,
              searching: searchingHint,
              onCancel: cancelHintSearch,
              prompt: prompts.hint ? { text: HINT_PROMPT, onDismiss: () => setOnboarding((s) => dismissPrompt(s, 'hint')) } : null,
            }
          : null
      }
    />
  );
  const stripCard = (
    <div ref={stripCardRef} className="bg-slate-900/90 backdrop-blur-sm rounded-2xl shadow-lg shadow-black/50 p-2 sm:p-3 border border-slate-700">
      {strip}
    </div>
  );

  // Progress and errors on every width, in the quiet style the phone had.
  const statusStrip = (
    <div className="flex items-center justify-between gap-3 text-xs sm:text-sm text-slate-400 px-1" data-testid="status-strip">
      <span>
        {game.progress}% complete · {game.errorCount === 0 ? 'No errors' : `${game.errorCount} error${game.errorCount === 1 ? '' : 's'}`}
      </span>
      {phone && (
        <span className="flex items-center gap-2 shrink-0" aria-live="off">
          <span className="text-red-300 font-medium">No Assist: timed, no hints</span>
          <span className="tabular-nums text-slate-200" aria-label="Time">{formatClock(clock)}</span>
        </span>
      )}
    </div>
  );

  // One lesson panel, rendered in the column or in the sheet.
  const lessonPanel = phone ? null : (
    <LogicPanel
      currentStep={currentStep}
      grid={game.logicGrid}
      onAssistUsed={game.noteAssistUsed}
      noAssistMode={effectiveNoAssist}
      onNextStep={() => handleNextStep()}
      onApplyStep={handleApplyStep}
      solved={game.completed ? completionStats : null}
      lessonLog={lessonLog}
      onNextPuzzle={handleNextPuzzle}
      canGoUp={shelfAbove(game.puzzleDifficulty || 'easy') !== null}
      nothingLeft={nothingLeft}
      onShowSingle={() => handleNextStep(true)}
      getElapsedSeconds={game.getElapsedSeconds}
      hintPrompt={lesson === 'column' && prompts.hint ? { text: HINT_PROMPT, onDismiss: () => setOnboarding((s) => dismissPrompt(s, 'hint')) } : null}
      cardPrompt={prompts.card ? { text: CARD_PROMPT, onDismiss: () => setOnboarding((s) => dismissPrompt(s, 'card')) } : null}
      searchingHint={searchingHint}
      onCancelHintSearch={cancelHintSearch}
      onChainPlaybackChange={setChainPlaybackIndex}
      chainPlaybackIndex={chainPlaybackIndex}
      onHighlightTechnique={handleHighlightTechnique}
    />
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Screen-reader announcements (rejected inputs) */}
      <div aria-live="polite" role="status" className="sr-only">
        {srAnnouncement}
      </div>

      {/* Header: where you are, how you are doing, one primary action,
          everything secondary behind the menu (header-and-menu spec) */}
      <header ref={headerRef} className="bg-slate-900/90 backdrop-blur-md border-b border-slate-700/60 sticky top-0 z-50 safe-area-inset-top">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-2 lg:py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 lg:gap-4 min-w-0">
              <div className="flex items-center gap-3 shrink-0">
                <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-lg lg:rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
                  <span className="text-white font-bold text-sm lg:text-lg">9</span>
                </div>
                {arrangement === 'wide' && (
                  <h1 className="text-xl font-semibold text-white tracking-tight whitespace-nowrap">Sudoku Mentor</h1>
                )}
              </div>

              {game.puzzleName ? (
                <button
                  type="button"
                  onClick={() => setShowPuzzleLoader(true)}
                  className="flex items-center gap-2 min-w-0 rounded-lg px-2 py-1 hover:bg-slate-800 transition-colors text-left"
                  title="Change puzzle"
                  aria-label={`${game.puzzleName}${game.puzzleDifficulty ? `, ${game.puzzleDifficulty}` : ''}. Change puzzle`}
                >
                  <span className="text-sm lg:text-lg font-medium text-white truncate max-w-[110px] sm:max-w-[200px] lg:max-w-[260px]">
                    {game.puzzleName}
                  </span>
                  {game.puzzleDifficulty && (
                    <span className="px-2 py-0.5 bg-slate-800 rounded-full text-xs lg:text-sm capitalize text-slate-300 shrink-0">{game.puzzleDifficulty}</span>
                  )}
                  {player.bestTime && !phone && (
                    <span className="hidden sm:flex px-2 py-0.5 bg-emerald-900/50 border border-emerald-600/30 rounded-full text-xs lg:text-sm text-emerald-400 items-center gap-1 shrink-0" title="Your best No Assist time">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      best {formatClock(player.bestTime)}
                    </span>
                  )}
                </button>
              ) : (
                <p className="hidden lg:block text-base text-slate-400">Learn logic-based solving</p>
              )}
            </div>

            <div className="flex items-center gap-2 lg:gap-3 shrink-0">
              {!phone && (
                <button
                  type="button"
                  role="switch"
                  aria-checked={noAssistMode}
                  onClick={() => {
                    if (!noAssistMode) setShowNoAssistModal(true);
                    else setNoAssistMode(false);
                  }}
                  title="No Assist: hints off, every solve timed and recorded"
                  className={`flex items-center gap-2 px-2.5 py-2 rounded-lg lg:rounded-xl text-sm font-medium transition-colors ${
                    noAssistMode ? 'bg-red-600/90 text-white hover:bg-red-600' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`relative w-8 h-4 rounded-full transition-colors shrink-0 ${noAssistMode ? 'bg-white/90' : 'bg-slate-600'}`}
                  >
                    <span
                      className={`absolute top-0.5 w-3 h-3 rounded-full transition-all ${
                        noAssistMode ? 'left-[18px] bg-red-600' : 'left-0.5 bg-slate-300'
                      }`}
                    />
                  </span>
                  <span className="whitespace-nowrap">No Assist: {noAssistMode ? 'on' : 'off'}</span>
                  {noAssistMode && <span className="tabular-nums text-xs opacity-90" aria-label="Time">{formatClock(clock)}</span>}
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowPuzzleLoader(true)}
                className="px-2.5 lg:px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white rounded-lg lg:rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5 font-medium text-sm"
                title="Load puzzle" aria-label="Load Puzzle"
              >
                <FolderOpen className="w-4 h-4 lg:w-5 lg:h-5 pointer-events-none" aria-hidden="true" />
                <span className="whitespace-nowrap">{arrangement === 'wide' ? 'Load puzzle' : 'Load'}</span>
              </button>

              <AccountMenu user={user} />
              <HeaderMenu
                items={[
                  { id: 'how', label: 'How to play', icon: HelpCircle, onSelect: () => setShowHowToPlay(true) },
                  { id: 'keys', label: 'Keyboard shortcuts', icon: Keyboard, hint: '?', onSelect: () => setShowShortcuts(true) },
                  null,
                  { heading: 'Theme' },
                  { id: 'theme-dark', label: 'Dark', icon: Moon, checked: themeChoice === 'dark', onSelect: () => setThemeChoice('dark') },
                  { id: 'theme-paper', label: 'Paper', icon: Sun, checked: themeChoice === 'paper', onSelect: () => setThemeChoice('paper') },
                  { id: 'theme-system', label: 'Match my device', icon: MonitorSmartphone, checked: themeChoice === 'system', onSelect: () => setThemeChoice('system') },
                  { id: 'colours', label: 'Colours', icon: Palette, onSelect: () => setShowColorSettings(true) },
                  null,
                  { id: 'print', label: 'Print puzzle', icon: Printer, onSelect: handlePrintPuzzle },
                  { id: 'copy', label: 'Copy puzzle', icon: Copy, onSelect: handleCopyPuzzle },
                  { id: 'clear', label: 'Clear the board', icon: Trash2, danger: true, onSelect: handleClearGrid },
                  null,
                  { id: 'about', label: 'About Sudoku Mentor', icon: Info, onSelect: () => setShowAppInfo(true) },
                ]}
              />
            </div>
          </div>
        </div>
      </header>

      <main
        className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-4 pb-4 transition-[padding] duration-300"
        style={{
          paddingRight: lesson === 'side' && sheetOpen ? SIDE_SHEET_WIDTH + 16 : undefined,
          paddingBottom: stripFixed ? bottomBarHeight + bottomSheetHeight + 16 : undefined,
        }}
      >
        {lesson === 'column' ? (
          <div className={`grid gap-6 xl:gap-8 ${arrangement === 'wide' ? 'grid-cols-[1fr,380px]' : 'grid-cols-[1fr,300px]'}`}>
            <div className="space-y-4 min-w-0">
              {statusStrip}
              {boardPrompt}
              {board}
              {stripCard}
            </div>
            <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pr-1 min-w-0">
              {lessonPanel}
            </div>
          </div>
        ) : (
          <div className="mx-auto w-full max-w-[600px] space-y-4">
            {statusStrip}
            {boardPrompt}
            {board}
            {!stripFixed && stripCard}
          </div>
        )}
      </main>

      {/* Stacked and phone: the strip is a fixed bar under the thumbs */}
      {stripFixed && (
        <div
          ref={bottomBarRef}
          className="fixed left-0 right-0 bottom-0 bg-slate-900/95 backdrop-blur-md border-t border-slate-700 z-40"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="px-2 pt-1 pb-1.5">{strip}</div>
        </div>
      )}

      {/* Medium without room for two columns, and stacked: the lesson is a sheet */}
      {sheetMode && (
        <LessonSheet
          side={lesson === 'side' ? 'right' : 'bottom'}
          open={sheetOpen}
          pinned={sheetPinned}
          onPinnedChange={handlePinnedChange}
          onClose={() => setSheetOpen(false)}
          topOffset={headerHeight}
          bottomOffset={bottomBarHeight}
          onHeightChange={lesson === 'bottom' ? setSheetHeight : undefined}
        >
          {lessonPanel}
        </LessonSheet>
      )}

      <KeyboardShortcutsDialog open={showShortcuts} onClose={() => setShowShortcuts(false)} />

      <HowToPlayDialog open={showHowToPlay} variant={touchInput ? 'mobile' : 'desktop'} onClose={() => setShowHowToPlay(false)} />

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
            defaults={player.defaultColors}
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

      <ConfirmDialog
        open={showClearConfirm}
        title="Clear the board?"
        body="Every digit and pencil mark you placed goes; the givens stay. Undo cannot bring them back."
        confirmLabel="Clear the board"
        onConfirm={doClearGrid}
        onCancel={() => setShowClearConfirm(false)}
      />

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
                      <span><strong className="text-white">Techniques</strong> - The technique browser and its counts are hidden</span>
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
                      <span><strong className="text-white">Digit highlighting on the strip</strong> - Pick a digit to see where it is</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-400 mt-1">✓</span>
                      <span><strong className="text-white">Pencil marks</strong> - Your own pencil marks still work</span>
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
