import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  generateCandidates,
  applyLogicStep,
  eliminateCandidatesFromPeers,
} from '@/components/sudoku/logicEngine';
import { solveSudoku } from '@/components/sudoku/solver';

export const createEmptyGrid = () =>
  Array(81)
    .fill(null)
    .map((_, index) => ({
      cellIndex: index,
      value: null,
      isFixed: false,
      candidates: [],
      isHighlighted: false,
      highlightColor: null,
      isBaseCell: false,
      isTargetCell: false,
    }));

const computeConflicts = (grid) => {
  const errors = [];
  grid.forEach((cell, index) => {
    if (!cell.value) return;
    const row = Math.floor(index / 9);
    const col = index % 9;
    const boxStartRow = Math.floor(row / 3) * 3;
    const boxStartCol = Math.floor(col / 3) * 3;

    const conflicts = (indices) =>
      indices.some((idx) => idx !== index && grid[idx].value === cell.value);

    const rowIdx = Array.from({ length: 9 }, (_, c) => row * 9 + c);
    const colIdx = Array.from({ length: 9 }, (_, r) => r * 9 + col);
    const boxIdx = [];
    for (let r = boxStartRow; r < boxStartRow + 3; r++) {
      for (let c = boxStartCol; c < boxStartCol + 3; c++) {
        boxIdx.push(r * 9 + c);
      }
    }

    if (conflicts(rowIdx) || conflicts(colIdx) || conflicts(boxIdx)) {
      errors.push(index);
    }
  });
  return errors;
};

/**
 * Shared Sudoku game state: grid, solution, undo/redo history, input
 * validation, error counting, and latched completion detection.
 *
 * Both the desktop and mobile pages render thin layouts over this hook.
 *
 * Callbacks:
 * - onWrongInput(cellIndex, digit): input rejected against the solution
 * - onSolved({ timeInSeconds, errorCount, puzzleName, puzzleDifficulty }):
 *   fired exactly once per loaded puzzle when the grid is complete+correct
 *
 * @param {{ onSolved?: Function, onWrongInput?: Function }} [callbacks]
 */
export function useSudokuGame({ onSolved, onWrongInput } = {}) {
  const [grid, setGrid] = useState(createEmptyGrid);
  const [solution, setSolution] = useState(null);
  const [history, setHistory] = useState({ stack: [], index: -1 });
  const [errorCount, setErrorCount] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [puzzleName, setPuzzleName] = useState(null);
  const [puzzleDifficulty, setPuzzleDifficulty] = useState(null);
  const [startTime, setStartTime] = useState(null);

  // Keep callbacks fresh without retriggering effects
  const onSolvedRef = useRef(onSolved);
  onSolvedRef.current = onSolved;
  const onWrongInputRef = useRef(onWrongInput);
  onWrongInputRef.current = onWrongInput;

  // Guard against overlapping loads (e.g. auto-load on mount racing a user
  // picking a puzzle): only the latest load may commit state.
  const loadSeq = useRef(0);

  // Derived from the current grid, so it can never validate a stale one.
  const validationErrors = useMemo(() => computeConflicts(grid), [grid]);

  // Commit a player-visible move: set the grid and push a snapshot,
  // truncating any redo tail. Never called from inside a setState updater,
  // so StrictMode double-invocation cannot corrupt the history.
  const commit = useCallback((newGrid) => {
    setGrid(newGrid);
    setHistory((h) => {
      const stack = h.stack.slice(0, h.index + 1);
      stack.push(newGrid);
      return { stack, index: stack.length - 1 };
    });
  }, []);

  const handleCellInput = useCallback(
    (cellIndex, value) => {
      const cell = grid[cellIndex];
      if (!cell || cell.isFixed) return;

      // Reject inputs that contradict the known solution
      if (solution && value !== null && solution[cellIndex].value !== value) {
        setErrorCount((c) => c + 1);
        onWrongInputRef.current?.(cellIndex, value);
        return;
      }

      const newGrid = [...grid];
      newGrid[cellIndex] = {
        ...cell,
        value,
        candidates: value ? [] : cell.candidates,
      };
      commit(
        value ? eliminateCandidatesFromPeers(newGrid, cellIndex, value) : newGrid
      );
    },
    [grid, solution, commit]
  );

  const handleToggleCandidate = useCallback(
    (cellIndex, candidate) => {
      const cell = grid[cellIndex];
      if (!cell || cell.isFixed || cell.value !== null) return;

      const has = cell.candidates.includes(candidate);
      const newGrid = [...grid];
      newGrid[cellIndex] = {
        ...cell,
        candidates: has
          ? cell.candidates.filter((c) => c !== candidate)
          : [...cell.candidates, candidate].sort((a, b) => a - b),
      };
      commit(newGrid);
    },
    [grid, commit]
  );

  // Apply a logic-engine step (placement and/or eliminations) as one
  // undoable move.
  const applyStep = useCallback(
    (step) => {
      if (!step) return;
      let newGrid = applyLogicStep(grid, step);
      if (step.placement) {
        newGrid = eliminateCandidatesFromPeers(
          newGrid,
          step.placement.cell,
          step.placement.digit
        );
      }
      commit(newGrid);
    },
    [grid, commit]
  );

  const canUndo = history.index > 0;
  const canRedo = history.index < history.stack.length - 1;

  const undo = useCallback(() => {
    if (history.index <= 0) return;
    setGrid(history.stack[history.index - 1]);
    setHistory({ ...history, index: history.index - 1 });
  }, [history]);

  const redo = useCallback(() => {
    if (history.index >= history.stack.length - 1) return;
    setGrid(history.stack[history.index + 1]);
    setHistory({ ...history, index: history.index + 1 });
  }, [history]);

  /**
   * Load a puzzle (array of 81 ints, 0 = empty). Synchronous - the solver
   * runs in milliseconds. Returns { ok, reason? }.
   */
  const loadPuzzle = useCallback((puzzle, meta = null, { withCandidates = true } = {}) => {
    const seq = ++loadSeq.current;

    const newGrid = createEmptyGrid();
    puzzle.forEach((value, index) => {
      if (value !== 0) {
        newGrid[index] = { ...newGrid[index], value, isFixed: true };
      }
    });

    const solved = solveSudoku(newGrid);
    if (!solved) return { ok: false, reason: 'no-solution' };
    if (seq !== loadSeq.current) return { ok: false, reason: 'superseded' };

    const startGrid = withCandidates ? generateCandidates(newGrid) : newGrid;
    setSolution(solved);
    setGrid(startGrid);
    setHistory({ stack: [startGrid], index: 0 });
    setErrorCount(0);
    setCompleted(false);
    setPuzzleName(meta?.name ?? null);
    setPuzzleDifficulty(meta?.difficulty ?? null);
    setStartTime(Date.now());
    return { ok: true };
  }, []);

  const clearGrid = useCallback(() => {
    loadSeq.current++;
    const empty = createEmptyGrid();
    setGrid(empty);
    setSolution(null);
    setHistory({ stack: [empty], index: 0 });
    setErrorCount(0);
    setCompleted(false);
    setPuzzleName(null);
    setPuzzleDifficulty(null);
    setStartTime(null);
  }, []);

  // Latched completion detection: fires onSolved exactly once per load.
  // Without the latch, any later grid-identity change (highlight stamping,
  // Escape) re-opened the completion modal and saved duplicate records.
  useEffect(() => {
    if (completed || !solution || !startTime) return;
    const isSolved = grid.every(
      (cell, idx) => cell.value !== null && cell.value === solution[idx].value
    );
    if (!isSolved) return;

    setCompleted(true);
    onSolvedRef.current?.({
      timeInSeconds: Math.floor((Date.now() - startTime) / 1000),
      errorCount,
      puzzleName,
      puzzleDifficulty,
    });
  }, [grid, solution, startTime, completed, errorCount, puzzleName, puzzleDifficulty]);

  const solvedCount = useMemo(
    () => grid.filter((c) => c.value !== null).length,
    [grid]
  );

  return {
    grid,
    setGrid, // raw setter for non-undoable visual updates (highlights)
    solution,
    validationErrors,
    errorCount,
    completed,
    puzzleName,
    puzzleDifficulty,
    startTime,
    solvedCount,
    progress: Math.round((solvedCount / 81) * 100),
    handleCellInput,
    handleToggleCandidate,
    applyStep,
    undo,
    redo,
    canUndo,
    canRedo,
    loadPuzzle,
    clearGrid,
  };
}
