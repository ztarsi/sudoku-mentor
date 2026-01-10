import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import SudokuGrid from '@/components/sudoku/SudokuGrid';
import DigitFilter from '@/components/sudoku/DigitFilter';
import LogicPanel from '@/components/sudoku/LogicPanel';
import ControlBar from '@/components/sudoku/ControlBar';
import UnifiedPuzzleLoader from '@/components/sudoku/UnifiedPuzzleLoader';
import ColorSettings from '@/components/sudoku/ColorSettings';
import CompletionModal from '@/components/sudoku/CompletionModal';
import MobileDrawer from '@/components/sudoku/MobileDrawer';
import LoadingModal from '@/components/sudoku/LoadingModal';
import { generateCandidates, findNextLogicStep, applyLogicStep, eliminateCandidatesFromPeers } from '@/components/sudoku/logicEngine';
import { solveSudoku } from '@/components/sudoku/solver';
import { base44 } from '@/api/base44Client';
import { AnimatePresence, motion } from 'framer-motion';
import { PUZZLES } from '@/components/sudoku/PuzzleLibrary';

const createEmptyGrid = () => {
  return Array(81).fill(null).map((_, index) => ({
    cellIndex: index,
    value: null,
    isFixed: false,
    candidates: [],
    isHighlighted: false,
    highlightColor: null,
    isBaseCell: false,
    isTargetCell: false
  }));
};

export default function SudokuMentor() {
  const [grid, setGrid] = useState(createEmptyGrid());
  const [selectedCell, setSelectedCell] = useState(null);
  const [focusedDigit, setFocusedDigit] = useState(null);
  const [focusedCandidates, setFocusedCandidates] = useState(null); // { digit: color } map
  const [removalCandidates, setRemovalCandidates] = useState(null); // Map of cellIndex -> Set of digits to remove
  const [currentStep, setCurrentStep] = useState(null);
  const [stepHistory, setStepHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showPuzzleLoader, setShowPuzzleLoader] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);
  const [highlightedDigit, setHighlightedDigit] = useState(null);
  const [solution, setSolution] = useState(null);
  const [candidateMode, setCandidateMode] = useState(false);
  const [showColorSettings, setShowColorSettings] = useState(false);
  const [colors, setColors] = useState({
    focusDigit: '#fbbf24',
    candidate: '#ffffff',
    cellNumber: '#60a5fa',
    gridLines: '#ffffff',
    cellBg: '#020617',
  });
  const [startTime, setStartTime] = useState(null);
  const [errorCount, setErrorCount] = useState(0);
  const [showCompletion, setShowCompletion] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState(0);
  const [chainPlaybackIndex, setChainPlaybackIndex] = useState(0);
  const [showAppInfo, setShowAppInfo] = useState(false);
  const [user, setUser] = useState(null);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [showCopyConfirmation, setShowCopyConfirmation] = useState(false);
  const [currentPuzzleName, setCurrentPuzzleName] = useState(null);
  const [currentPuzzleDifficulty, setCurrentPuzzleDifficulty] = useState(null);
  const [noAssistMode, setNoAssistMode] = useState(false);
  const [showNoAssistModal, setShowNoAssistModal] = useState(false);
  const [noAssistStartTime, setNoAssistStartTime] = useState(null);
  const [bestTime, setBestTime] = useState(null);
  const [candidatesVisible, setCandidatesVisible] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile on mount and enable no-assist mode for mobile
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile && !noAssistMode) {
        setNoAssistMode(true);
        setNoAssistStartTime(Date.now());
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const errorAudioRef = useRef(null);

  const loadingStages = [
    'Loading puzzle...',
    'Validating solution...',
    'Generating candidates...',
    'Ready to solve!'
  ];

  const handleCellClick = useCallback((cellIndex) => {
    setSelectedCell(cellIndex);
    
    // If clicking a solved cell, highlight all instances of that number
    const clickedValue = grid[cellIndex].value;
    if (clickedValue !== null) {
      setHighlightedDigit(prev => prev === clickedValue ? null : clickedValue);
    } else {
      setHighlightedDigit(null);
    }
    
    clearHighlights();
  }, [grid]);

  const handleCellInput = useCallback((cellIndex, value) => {
    // If solution exists and value doesn't match, play error sound and reject
    if (solution && value !== null && solution[cellIndex].value !== value) {
      if (errorAudioRef.current) {
        errorAudioRef.current.currentTime = 0;
        errorAudioRef.current.play();
      }
      setErrorCount(prev => prev + 1);
      return; // Block invalid input
    }
    
    setGrid(prev => {
      const newGrid = [...prev];
      const cell = { ...newGrid[cellIndex] };

      if (!cell.isFixed) {
        cell.value = value;
        cell.candidates = value ? [] : cell.candidates;
        newGrid[cellIndex] = cell;

        // Save to history
        setStepHistory(h => [...h.slice(0, historyIndex + 1), { grid: prev, action: 'input' }]);
        setHistoryIndex(i => i + 1);

        // If placing a value, eliminate it from peers
        if (value) {
          return eliminateCandidatesFromPeers(newGrid, cellIndex, value);
        }
      }

      return newGrid;
    });
    validateGrid();
  }, [historyIndex, solution]);

  const handleToggleCandidate = useCallback((cellIndex, candidate) => {
    const cell = grid[cellIndex];
    
    // Only toggle if cell is empty and not fixed
    if (cell.isFixed || cell.value !== null) {
      return;
    }
    
    setGrid(prev => {
      const newGrid = [...prev];
      const updatedCell = { ...newGrid[cellIndex] };
      
      const candidateIdx = updatedCell.candidates.indexOf(candidate);
      if (candidateIdx >= 0) {
        // Remove candidate
        updatedCell.candidates = updatedCell.candidates.filter(c => c !== candidate);
      } else {
        // Add candidate
        updatedCell.candidates = [...updatedCell.candidates, candidate].sort((a, b) => a - b);
      }
      
      newGrid[cellIndex] = updatedCell;
      return newGrid;
    });
    
    // Save to history
    setStepHistory(h => [...h.slice(0, historyIndex + 1), { grid, action: 'toggle_candidate' }]);
    setHistoryIndex(i => i + 1);
    
    // Clear any highlights
    clearHighlights();
  }, [grid, historyIndex]);

  const handleDigitFilter = useCallback((digit) => {
    setFocusedDigit(prev => prev === digit ? null : digit);
    clearHighlights();
  }, []);

  const clearHighlights = () => {
    setGrid(prev => prev.map(cell => ({
      ...cell,
      isHighlighted: false,
      highlightColor: null,
      isBaseCell: false,
      isTargetCell: false
    })));
    setCurrentStep(null);
    setFocusedCandidates(null);
    setRemovalCandidates(null);
  };

  const handleNextStep = useCallback(async () => {
    if (noAssistMode) return; // Block hints in no assist mode
    setChainPlaybackIndex(0); // Reset playback for new hint
    const step = findNextLogicStep(grid, null);
    if (step) {
      setCurrentStep(step);

      // Clear focus digit for all techniques to prevent global highlighting interference
      setFocusedDigit(null);

      // Build removal candidates map
      if (step.eliminations && step.eliminations.length > 0) {
        const removalMap = {};
        step.eliminations.forEach(({ cell, digit }) => {
          if (!removalMap[cell]) {
            removalMap[cell] = new Set();
          }
          removalMap[cell].add(digit);
        });
        setRemovalCandidates(removalMap);
      } else {
        setRemovalCandidates(null);
      }

      // Highlight relevant candidates based on technique type
      const multiCandidateTechniques = ['Naked Pair', 'Hidden Pair', 'Naked Triple'];
      if (multiCandidateTechniques.includes(step.technique) && step.baseCells) {
        // Multi-candidate techniques: extract all candidates and assign colors
        const candidatesInvolved = new Set();
        step.baseCells.forEach(cellIdx => {
          grid[cellIdx].candidates.forEach(c => candidatesInvolved.add(c));
        });

        const colorPalette = [
          colors.focusDigit || '#10b981',
          '#3b82f6',
          '#f59e0b',
          '#ef4444',
          '#8b5cf6'
        ];
        const candidateColorMap = {};
        Array.from(candidatesInvolved).forEach((digit, idx) => {
          candidateColorMap[digit] = colorPalette[idx % colorPalette.length];
        });
        setFocusedCandidates(candidateColorMap);
      } else if (step.technique === 'ALS-XZ' && step.xDigit && step.zDigit) {
        // ALS-XZ: highlight x and z digits
        setFocusedCandidates({
          [step.xDigit]: '#f59e0b',
          [step.zDigit]: '#a855f7'
        });
      } else if (step.digit) {
        // Single-digit techniques: highlight that digit
        setFocusedCandidates({
          [step.digit]: colors.focusDigit || '#10b981'
        });
      } else {
        setFocusedCandidates(null);
      }
      
      setGrid(prev => {
        const newGrid = prev.map(cell => ({
          ...cell,
          isHighlighted: false,
          highlightColor: null,
          isBaseCell: false,
          isTargetCell: false,
          isUnitCell: false
        }));

        // For Hidden/Naked Singles, highlight the entire unit
        if ((step.technique === 'Hidden Single' || step.technique === 'Naked Single') && step.baseCells?.[0] !== undefined) {
          const cellIdx = step.baseCells[0];
          const row = Math.floor(cellIdx / 9);
          const col = cellIdx % 9;
          const box = Math.floor(row / 3) * 3 + Math.floor(col / 3);

          // Determine which unit to highlight based on the step explanation
          let unitCells = [];
          if (step.explanation.includes('row')) {
            // Highlight the row
            for (let c = 0; c < 9; c++) {
              unitCells.push(row * 9 + c);
            }
          } else if (step.explanation.includes('column')) {
            // Highlight the column
            for (let r = 0; r < 9; r++) {
              unitCells.push(r * 9 + col);
            }
          } else if (step.explanation.includes('box')) {
            // Highlight the box
            const boxStartRow = Math.floor(row / 3) * 3;
            const boxStartCol = Math.floor(col / 3) * 3;
            for (let r = boxStartRow; r < boxStartRow + 3; r++) {
              for (let c = boxStartCol; c < boxStartCol + 3; c++) {
                unitCells.push(r * 9 + c);
              }
            }
          }

          unitCells.forEach(idx => {
            newGrid[idx] = {
              ...newGrid[idx],
              isUnitCell: true
            };
          });
        }

        // Highlight base cells
        step.baseCells?.forEach(idx => {
          newGrid[idx] = {
            ...newGrid[idx],
            isHighlighted: true,
            isBaseCell: true,
            highlightColor: 'blue'
          };
        });

        // Highlight target cells (elimination cells)
        step.targetCells?.forEach(idx => {
          newGrid[idx] = {
            ...newGrid[idx],
            isHighlighted: true,
            isTargetCell: true,
            highlightColor: 'red'
          };
        });

        return newGrid;
      });
    } else {
      // No regular techniques found - search for forcing chains automatically
      const { findForcingChain, findHypothesis } = await import('@/components/sudoku/forcingChainEngine');
      
      let result = findForcingChain(grid, 100);
      if (!result) {
        result = findHypothesis(grid, 100);
      }
      
      if (result) {
        setCurrentStep(result);
        
        setGrid(prev => {
          const newGrid = prev.map(cell => ({
            ...cell,
            isHighlighted: false,
            highlightColor: null,
            isBaseCell: false,
            isTargetCell: false,
            isUnitCell: false
          }));

          // Highlight base cells
          result.baseCells?.forEach(idx => {
            newGrid[idx] = {
              ...newGrid[idx],
              isHighlighted: true,
              isBaseCell: true,
              highlightColor: 'blue'
            };
          });

          // Highlight target cells
          result.targetCells?.forEach(idx => {
            newGrid[idx] = {
              ...newGrid[idx],
              isHighlighted: true,
              isTargetCell: true,
              highlightColor: 'red'
            };
          });

          return newGrid;
        });
      }
    }
  }, [grid, focusedDigit]);

  const handleApplyStep = useCallback(() => {
    if (noAssistMode) return; // Block apply in no assist mode
    if (currentStep) {
      setStepHistory(h => [...h.slice(0, historyIndex + 1), { grid, action: currentStep.technique }]);
      setHistoryIndex(i => i + 1);
      
      const newGrid = applyLogicStep(grid, currentStep);
      
      // If a value was placed, eliminate it from peers (preserves existing eliminations)
      const finalGrid = currentStep.placement 
        ? eliminateCandidatesFromPeers(newGrid, currentStep.placement.cell, currentStep.placement.digit)
        : newGrid;
      setGrid(finalGrid);
      
      setCurrentStep(null);
      setFocusedDigit(null);
      setHighlightedDigit(null);
      setRemovalCandidates(null);
      clearHighlights();
    }
  }, [currentStep, grid, historyIndex, noAssistMode]);

  const handleUndo = useCallback(() => {
    if (historyIndex >= 0) {
      setGrid(stepHistory[historyIndex].grid);
      setHistoryIndex(i => i - 1);
      clearHighlights();
    }
  }, [historyIndex, stepHistory]);

  const handleRedo = useCallback(() => {
    if (historyIndex < stepHistory.length - 1) {
      setHistoryIndex(i => i + 1);
      // Reapply the action (currently not replaying, just moving index)
      // TODO: Re-apply the action from history to the grid. For now, it just goes back/forward to saved grid states.
    }
  }, [historyIndex, stepHistory]);

  const handleClearGrid = useCallback(() => {
    setStepHistory(h => [...h, { grid, action: 'clear' }]);
    setHistoryIndex(i => i + 1);
    setGrid(createEmptyGrid());
    setSolution(null);
    clearHighlights();
    setValidationErrors([]);
  }, [grid]);

  const handleLoadPuzzle = useCallback(async (puzzle, puzzleMeta = null) => {
    setIsLoading(true);
    setLoadingStage(0);
    
    // Store puzzle metadata
    if (puzzleMeta) {
      setCurrentPuzzleName(puzzleMeta.name);
      setCurrentPuzzleDifficulty(puzzleMeta.difficulty);
    } else {
      setCurrentPuzzleName(null);
      setCurrentPuzzleDifficulty(null);
    }
    
    // Reset no assist timer if in no assist mode
    if (noAssistMode) {
      setNoAssistStartTime(Date.now());
    }
    
    // Stage 1: Loading puzzle
    await new Promise(resolve => setTimeout(resolve, 300));
    const newGrid = createEmptyGrid();
    puzzle.forEach((value, index) => {
      if (value !== 0) {
        newGrid[index] = {
          ...newGrid[index],
          value,
          isFixed: true,
          candidates: []
        };
      }
    });
    
    // Stage 2: Validating solution
    setLoadingStage(1);
    await new Promise(resolve => setTimeout(resolve, 400));
    const solved = solveSudoku(newGrid);
    if (!solved) {
      setIsLoading(false);
      alert('This puzzle has no valid solution!');
      return;
    }
    setSolution(solved);
    
    // Stage 3: Generating candidates
    setLoadingStage(2);
    await new Promise(resolve => setTimeout(resolve, 300));
    const gridWithCandidates = generateCandidates(newGrid);
    
    // Stage 4: Ready!
    setLoadingStage(3);
    await new Promise(resolve => setTimeout(resolve, 200));
    
    setGrid(gridWithCandidates);
    setShowPuzzleLoader(false);
    clearHighlights();
    setStepHistory([]);
    setHistoryIndex(-1);
    setValidationErrors([]);
    setHighlightedDigit(null);
    setStartTime(Date.now());
    setErrorCount(0);
    setIsLoading(false);
  }, []);

  const validateGrid = useCallback(() => {
    const errors = [];
    grid.forEach((cell, index) => {
      if (cell.value) {
        const row = Math.floor(index / 9);
        const col = index % 9;
        const box = Math.floor(row / 3) * 3 + Math.floor(col / 3);
        
        // Check row
        for (let c = 0; c < 9; c++) {
          const checkIdx = row * 9 + c;
          if (checkIdx !== index && grid[checkIdx].value === cell.value) {
            errors.push(index);
            break;
          }
        }
        
        // Check column
        for (let r = 0; r < 9; r++) {
          const checkIdx = r * 9 + col;
          if (checkIdx !== index && grid[checkIdx].value === cell.value) {
            if (!errors.includes(index)) errors.push(index);
            break;
          }
        }
        
        // Check box
        const boxStartRow = Math.floor(row / 3) * 3;
        const boxStartCol = Math.floor(col / 3) * 3;
        for (let r = boxStartRow; r < boxStartRow + 3; r++) {
          for (let c = boxStartCol; c < boxStartCol + 3; c++) {
            const checkIdx = r * 9 + c;
            if (checkIdx !== index && grid[checkIdx].value === cell.value) {
              if (!errors.includes(index)) errors.push(index);
              break;
            }
          }
        }
      }
    });
    setValidationErrors(errors);
  }, [grid]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Disable shortcuts when any modal is open
      const isModalOpen = showPuzzleLoader || showColorSettings || showCompletion || 
                          drawerOpen || showAccountMenu || showAppInfo || showCopyConfirmation;
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
      if ((e.key.toLowerCase() === 'z' && !e.ctrlKey && !e.metaKey) || (e.key.toLowerCase() === 'z' && (e.ctrlKey || e.metaKey))) {
        e.preventDefault();
        if (historyIndex >= 0) {
          handleUndo();
        }
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
          const cell = grid[selectedCell];
          if (!cell.isFixed && cell.value === null) {
            handleToggleCandidate(selectedCell, digit);
          }
          return;
        }
        
        // Regular input
        if (selectedCell !== null && !grid[selectedCell].isFixed) {
          e.preventDefault();
          handleCellInput(selectedCell, digit);
        }
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        // Don't interfere with input fields
        if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
          return;
        }
        e.preventDefault();
        if (selectedCell !== null && !grid[selectedCell].isFixed) {
          handleCellInput(selectedCell, null);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setFocusedDigit(null);
        setSelectedCell(null);
        setHighlightedDigit(null);
        clearHighlights();
      } else if (e.key === 'c' && (e.ctrlKey || e.metaKey)) {
        // Allow default copy
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
    }, [selectedCell, grid, candidateMode, currentStep, historyIndex, handleCellInput, handleToggleCandidate, handleDigitFilter, handleClearGrid, handleNextStep, handleApplyStep, handleUndo, showPuzzleLoader, showColorSettings, showCompletion, drawerOpen, showAccountMenu, showAppInfo, showCopyConfirmation, noAssistMode]);

  // Check if puzzle is complete
  useEffect(() => {
    if (!solution || !startTime) return;

    const isSolved = grid.every((cell, idx) => 
      cell.value !== null && cell.value === solution[idx].value
    );

    if (isSolved && solvedCount === 81) {
      const timeInSeconds = Math.floor((Date.now() - startTime) / 1000);
      setShowCompletion(true);
      
      // Save solve record if in no assist mode
      if (noAssistMode && noAssistStartTime && user && currentPuzzleName && currentPuzzleDifficulty) {
        const noAssistTime = Math.floor((Date.now() - noAssistStartTime) / 1000);
        base44.entities.SolveRecord.create({
          puzzle_name: currentPuzzleName,
          difficulty: currentPuzzleDifficulty,
          time_seconds: noAssistTime,
          no_assist: true,
          error_count: errorCount
        }).catch(err => console.error('Failed to save solve record:', err));
      }
    }
  }, [grid, solution, startTime, noAssistMode, noAssistStartTime, user, currentPuzzleName, currentPuzzleDifficulty, errorCount]);

  const handleCopyPuzzle = () => {
    // Extract only the fixed cells (initial puzzle state)
    const puzzleString = grid.map(cell => cell.isFixed ? cell.value : 0).join('');
    navigator.clipboard.writeText(puzzleString);
    setShowCopyConfirmation(true);
    setTimeout(() => setShowCopyConfirmation(false), 2000);
  };

  const handlePrintPuzzle = () => {
    const printWindow = window.open('', '_blank');
    const puzzleGrid = grid.map(cell => cell.isFixed ? cell.value : 0);
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${currentPuzzleName || 'Sudoku Puzzle'}</title>
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
          <h1>${currentPuzzleName || 'Sudoku Puzzle'}</h1>
          ${currentPuzzleDifficulty ? `<div class="difficulty">Difficulty: ${currentPuzzleDifficulty}</div>` : ''}
          <div class="grid">
            ${puzzleGrid.map(val => `<div class="cell">${val || ''}</div>`).join('')}
          </div>
        </div>
      </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 250);
  };

  const solvedCount = grid.filter(c => c.value !== null).length;
  const progress = Math.round((solvedCount / 81) * 100);

  // Load user on mount and restore color settings
  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        // Load saved colors from user account
        if (currentUser.sudoku_colors) {
          setColors(currentUser.sudoku_colors);
        }
      } catch (error) {
        setUser(null);
      }
    };
    loadUser();
  }, []);

  // Load best time for current puzzle
  useEffect(() => {
    const loadBestTime = async () => {
      if (!user || !currentPuzzleName) {
        setBestTime(null);
        return;
      }

      try {
        const records = await base44.entities.SolveRecord.filter(
          { puzzle_name: currentPuzzleName, no_assist: true },
          'time_seconds',
          1
        );
        
        if (records.length > 0) {
          setBestTime(records[0].time_seconds);
        } else {
          setBestTime(null);
        }
      } catch (error) {
        console.error('Failed to load best time:', error);
        setBestTime(null);
      }
    };

    loadBestTime();
  }, [user, currentPuzzleName]);

  // Load a random puzzle on mount
  useEffect(() => {
    const loadRandomPuzzle = async () => {
      try {
        const userPuzzles = await base44.entities.SudokuPuzzle.list();
        
        // Combine built-in puzzles with user-uploaded ones, preserving metadata
        const allAvailablePuzzles = [];
        for (const difficulty in PUZZLES) {
          PUZZLES[difficulty].forEach(p => allAvailablePuzzles.push({ 
            puzzle: p.puzzle, 
            name: p.name, 
            difficulty 
          }));
        }
        userPuzzles.forEach(p => allAvailablePuzzles.push({ 
          puzzle: p.puzzle, 
          name: p.name, 
          difficulty: p.difficulty 
        }));

        if (allAvailablePuzzles.length > 0) {
          const randomPuzzleData = allAvailablePuzzles[Math.floor(Math.random() * allAvailablePuzzles.length)];
          await handleLoadPuzzle(randomPuzzleData.puzzle, { 
            name: randomPuzzleData.name, 
            difficulty: randomPuzzleData.difficulty 
          });
        }
      } catch (error) {
        console.error('Failed to load random puzzle:', error);
      }
    };
    loadRandomPuzzle();
  }, [handleLoadPuzzle]);

  // Calculate ghost grid for chain visualization
  const ghostGrid = useMemo(() => {
    if (!currentStep?.chain || !Array.isArray(currentStep.chain)) {
      return grid;
    }

    const placementSteps = currentStep.chain.filter(s => s.action === 'place');
    const visibleSteps = placementSteps.slice(0, chainPlaybackIndex + 1);

    return grid.map((cell, idx) => {
      const ghostStep = visibleSteps.find(s => s.cell === idx);
      if (ghostStep) {
        return { ...cell, ghostValue: ghostStep.value };
      }
      return cell;
    });
  }, [grid, currentStep, chainPlaybackIndex]);

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
              {currentPuzzleName ? (
                <div className="flex items-center gap-3">
                  <p className="text-lg font-medium text-white whitespace-nowrap" title={currentPuzzleName}>
                    {currentPuzzleName.length > 20 ? currentPuzzleName.slice(0, 20) + '...' : currentPuzzleName}
                  </p>
                  {currentPuzzleDifficulty && (
                    <span className="px-3 py-1 bg-slate-800 rounded-full text-sm capitalize text-slate-300">{currentPuzzleDifficulty}</span>
                  )}
                  {bestTime && (
                    <span className="px-3 py-1 bg-emerald-900/50 border border-emerald-600/30 rounded-full text-sm text-emerald-400 flex items-center gap-1.5" title="Your best no-assist time">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {Math.floor(bestTime / 60)}:{String(bestTime % 60).padStart(2, '0')}
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

            {/* Mobile - just icon */}
            <div className="lg:hidden flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">9</span>
              </div>
              {currentPuzzleName && (
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium text-white truncate max-w-[120px]">{currentPuzzleName}</span>
                  {currentPuzzleDifficulty && (
                    <span className="px-2 py-0.5 bg-slate-800 rounded-full text-xs capitalize text-slate-300">{currentPuzzleDifficulty}</span>
                  )}
                </div>
              )}
              <div className="px-2 py-1 bg-red-600 rounded-full flex items-center gap-1" title="No Assist Mode">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
            </div>

            <div className="flex items-center gap-2 lg:gap-4">
              {/* Progress - desktop only */}
              <div className="hidden lg:flex items-center gap-2 bg-slate-800 rounded-full px-4 py-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                <span className="text-base text-slate-300">{progress}% Complete</span>
              </div>

              {/* Color settings - both mobile and desktop */}
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
                    onClick={() => base44.auth.redirectToLogin()}
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

      <main className={`${isMobile ? '' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 lg:pb-8 pt-12 lg:pt-8'}`}>
        {isMobile ? (
          /* Mobile Layout - Simple Grid Only */
          <div className="flex flex-col h-[calc(100vh-56px)]">
            {/* Sudoku Grid - Positioned with top padding */}
            <div className="pt-5">
              <SudokuGrid
                grid={grid}
                selectedCell={selectedCell}
                focusedDigit={focusedDigit}
                focusedCandidates={null}
                removalCandidates={null}
                highlightedDigit={highlightedDigit}
                validationErrors={validationErrors}
                candidateMode={candidateMode}
                candidatesVisible={candidatesVisible}
                colors={colors}
                currentStep={null}
                playbackIndex={0}
                onCellClick={handleCellClick}
                onCellInput={handleCellInput}
                onToggleCandidate={handleToggleCandidate}
              />
            </div>

            {/* Mobile Controls - Fixed Bottom with offset */}
            <div className="fixed left-0 right-0 bg-slate-900/95 backdrop-blur-md border-t border-slate-700 z-40" style={{ bottom: '20px' }}>
              {/* Candidate/Solve Mode Toggle */}
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
              </div>

              {/* Digit Filter */}
              <DigitFilter 
                focusedDigit={focusedDigit} 
                onDigitClick={handleDigitFilter}
                grid={grid}
              />
            </div>
          </div>
        ) : (
          <div className="grid lg:grid-cols-[1fr,380px] gap-8">
          {/* Left Column - Grid & Controls */}
          <div className="space-y-6">
              {/* Control Bar */}
              <ControlBar
                onNextStep={handleNextStep}
                onApplyStep={handleApplyStep}
                onUndo={handleUndo}
                onRedo={handleRedo}
                onClear={handleClearGrid}
                onOpenDrawer={() => setDrawerOpen(true)}
                hasStep={currentStep !== null}
                canUndo={historyIndex >= 0}
                canRedo={historyIndex < stepHistory.length - 1}
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
                  validationErrors={validationErrors}
                  candidateMode={candidateMode}
                  candidatesVisible={candidatesVisible}
                  colors={colors}
                  currentStep={currentStep}
                  playbackIndex={chainPlaybackIndex}
                  onCellClick={handleCellClick}
                  onCellInput={handleCellInput}
                  onToggleCandidate={handleToggleCandidate}
                />
              </div>

              {/* Digit Filter - Desktop Only */}
              <DigitFilter 
                focusedDigit={focusedDigit} 
                onDigitClick={handleDigitFilter}
                grid={grid}
              />
            </div>

          {/* Right Column - Logic Panel (Desktop only) */}
          <div className="hidden lg:block">
            <LogicPanel 
              currentStep={currentStep}
              focusedDigit={focusedDigit}
              grid={grid}
              noAssistMode={noAssistMode}
              onApplyStep={handleApplyStep}
              onNextStep={handleNextStep}
              onChainPlaybackChange={setChainPlaybackIndex}
              chainPlaybackIndex={chainPlaybackIndex}
              onHighlightTechnique={(instances, total, current) => {
                // Set the first instance as the current step so it can be applied
                if (instances.length > 0) {
                  const firstStep = instances[0];
                  setCurrentStep(firstStep);

                  // Clear focus digit for all techniques to prevent global highlighting interference
                  setFocusedDigit(null);

                  // Build removal candidates map
                  if (firstStep.eliminations && firstStep.eliminations.length > 0) {
                    const removalMap = {};
                    firstStep.eliminations.forEach(({ cell, digit }) => {
                      if (!removalMap[cell]) {
                        removalMap[cell] = new Set();
                      }
                      removalMap[cell].add(digit);
                    });
                    setRemovalCandidates(removalMap);
                  } else {
                    setRemovalCandidates(null);
                  }

                  // Highlight relevant candidates based on technique type
                  const multiCandidateTechniques = ['Naked Pair', 'Hidden Pair', 'Naked Triple'];
                  if (multiCandidateTechniques.includes(firstStep.technique) && firstStep.baseCells) {
                    // Multi-candidate techniques: extract all candidates and assign colors
                    const candidatesInvolved = new Set();
                    firstStep.baseCells.forEach(cellIdx => {
                      grid[cellIdx].candidates.forEach(c => candidatesInvolved.add(c));
                    });

                    const colorPalette = [
                      colors.focusDigit || '#10b981',
                      '#3b82f6',
                      '#f59e0b',
                      '#ef4444',
                      '#8b5cf6'
                    ];
                    const candidateColorMap = {};
                    Array.from(candidatesInvolved).forEach((digit, idx) => {
                      candidateColorMap[digit] = colorPalette[idx % colorPalette.length];
                    });
                    setFocusedCandidates(candidateColorMap);
                  } else if (firstStep.technique === 'ALS-XZ' && firstStep.xDigit && firstStep.zDigit) {
                    // ALS-XZ: highlight x and z digits
                    setFocusedCandidates({
                      [firstStep.xDigit]: '#f59e0b',
                      [firstStep.zDigit]: '#a855f7'
                    });
                  } else if (firstStep.digit) {
                    // Single-digit techniques: highlight that digit
                    setFocusedCandidates({
                      [firstStep.digit]: colors.focusDigit || '#10b981'
                    });
                  } else {
                    setFocusedCandidates(null);
                  }
                }

                // Highlight cells from the current instance
                setGrid(prev => {
                  const newGrid = prev.map(cell => ({
                    ...cell,
                    isHighlighted: false,
                    highlightColor: null,
                    isBaseCell: false,
                    isTargetCell: false,
                    isUnitCell: false
                  }));

                  instances.forEach(step => {
                    // For Hidden/Naked Singles, highlight the entire unit
                    if ((step.technique === 'Hidden Single' || step.technique === 'Naked Single') && step.baseCells?.[0] !== undefined) {
                      const cellIdx = step.baseCells[0];
                      const row = Math.floor(cellIdx / 9);
                      const col = cellIdx % 9;

                      let unitCells = [];
                      if (step.explanation.includes('row')) {
                        for (let c = 0; c < 9; c++) {
                          unitCells.push(row * 9 + c);
                        }
                      } else if (step.explanation.includes('column')) {
                        for (let r = 0; r < 9; r++) {
                          unitCells.push(r * 9 + col);
                        }
                      } else if (step.explanation.includes('box')) {
                        const boxStartRow = Math.floor(row / 3) * 3;
                        const boxStartCol = Math.floor(col / 3) * 3;
                        for (let r = boxStartRow; r < boxStartRow + 3; r++) {
                          for (let c = boxStartCol; c < boxStartCol + 3; c++) {
                            unitCells.push(r * 9 + c);
                          }
                        }
                      }

                      unitCells.forEach(idx => {
                        newGrid[idx] = {
                          ...newGrid[idx],
                          isUnitCell: true
                        };
                      });
                    }

                    step.baseCells?.forEach(idx => {
                      newGrid[idx] = {
                        ...newGrid[idx],
                        isHighlighted: true,
                        isBaseCell: true,
                        highlightColor: 'blue'
                      };
                    });

                    step.targetCells?.forEach(idx => {
                      newGrid[idx] = {
                        ...newGrid[idx],
                        isHighlighted: true,
                        isTargetCell: true,
                        highlightColor: 'red'
                      };
                    });
                  });

                  return newGrid;
                  });
                  }}
                  />
                  </div>
                  </div>
                  )}
                  </main>

                  {/* Mobile Drawer for Logic Panel - Desktop Only */}
                  {!isMobile && (
                  <MobileDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <LogicPanel 
          currentStep={currentStep}
          focusedDigit={focusedDigit}
          grid={grid}
          noAssistMode={noAssistMode}
          onApplyStep={handleApplyStep}
          onNextStep={handleNextStep}
          onChainPlaybackChange={setChainPlaybackIndex}
          chainPlaybackIndex={chainPlaybackIndex}
          onHighlightTechnique={(instances, total, current) => {
            if (instances.length > 0) {
              const firstStep = instances[0];
              setCurrentStep(firstStep);

              // Clear focus digit for all techniques to prevent global highlighting interference
              setFocusedDigit(null);

              // Build removal candidates map
              if (firstStep.eliminations && firstStep.eliminations.length > 0) {
                const removalMap = {};
                firstStep.eliminations.forEach(({ cell, digit }) => {
                  if (!removalMap[cell]) {
                    removalMap[cell] = new Set();
                  }
                  removalMap[cell].add(digit);
                });
                setRemovalCandidates(removalMap);
              } else {
                setRemovalCandidates(null);
              }

              // Highlight relevant candidates based on technique type
              const multiCandidateTechniques = ['Naked Pair', 'Hidden Pair', 'Naked Triple'];
              if (multiCandidateTechniques.includes(firstStep.technique) && firstStep.baseCells) {
                // Multi-candidate techniques: extract all candidates and assign colors
                const candidatesInvolved = new Set();
                firstStep.baseCells.forEach(cellIdx => {
                  grid[cellIdx].candidates.forEach(c => candidatesInvolved.add(c));
                });

                const colorPalette = [
                  colors.focusDigit || '#10b981',
                  '#3b82f6',
                  '#f59e0b',
                  '#ef4444',
                  '#8b5cf6'
                ];
                const candidateColorMap = {};
                Array.from(candidatesInvolved).forEach((digit, idx) => {
                  candidateColorMap[digit] = colorPalette[idx % colorPalette.length];
                });
                setFocusedCandidates(candidateColorMap);
              } else if (firstStep.technique === 'ALS-XZ' && firstStep.xDigit && firstStep.zDigit) {
                // ALS-XZ: highlight x and z digits
                setFocusedCandidates({
                  [firstStep.xDigit]: '#f59e0b',
                  [firstStep.zDigit]: '#a855f7'
                });
              } else if (firstStep.digit) {
                // Single-digit techniques: highlight that digit
                setFocusedCandidates({
                  [firstStep.digit]: colors.focusDigit || '#10b981'
                });
              } else {
                setFocusedCandidates(null);
              }
            }

            setGrid(prev => {
              const newGrid = prev.map(cell => ({
                ...cell,
                isHighlighted: false,
                highlightColor: null,
                isBaseCell: false,
                isTargetCell: false,
                isUnitCell: false
              }));

              instances.forEach(step => {
                // For Hidden/Naked Singles, highlight the entire unit
                if ((step.technique === 'Hidden Single' || step.technique === 'Naked Single') && step.baseCells?.[0] !== undefined) {
                  const cellIdx = step.baseCells[0];
                  const row = Math.floor(cellIdx / 9);
                  const col = cellIdx % 9;

                  let unitCells = [];
                  if (step.explanation.includes('row')) {
                    for (let c = 0; c < 9; c++) {
                      unitCells.push(row * 9 + c);
                    }
                  } else if (step.explanation.includes('column')) {
                    for (let r = 0; r < 9; r++) {
                      unitCells.push(r * 9 + col);
                    }
                  } else if (step.explanation.includes('box')) {
                    const boxStartRow = Math.floor(row / 3) * 3;
                    const boxStartCol = Math.floor(col / 3) * 3;
                    for (let r = boxStartRow; r < boxStartRow + 3; r++) {
                      for (let c = boxStartCol; c < boxStartCol + 3; c++) {
                        unitCells.push(r * 9 + c);
                      }
                    }
                  }

                  unitCells.forEach(idx => {
                    newGrid[idx] = {
                      ...newGrid[idx],
                      isUnitCell: true
                    };
                  });
                }

                step.baseCells?.forEach(idx => {
                  newGrid[idx] = {
                    ...newGrid[idx],
                    isHighlighted: true,
                    isBaseCell: true,
                    highlightColor: 'blue'
                  };
                });

                step.targetCells?.forEach(idx => {
                  newGrid[idx] = {
                    ...newGrid[idx],
                    isHighlighted: true,
                    isTargetCell: true,
                    highlightColor: 'red'
                  };
                });
              });

              return newGrid;
              });

              setDrawerOpen(false);
              }}
            />
        </MobileDrawer>
      )}

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
          onColorsChange={async (newColors) => {
            setColors(newColors);
            // Save to user account if logged in
            if (user) {
              try {
                await base44.auth.updateMe({ sudoku_colors: newColors });
              } catch (error) {
                console.error('Failed to save colors:', error);
              }
            }
          }}
          onClose={() => setShowColorSettings(false)}
        />
      )}

      {/* Completion Modal */}
      <CompletionModal
        isOpen={showCompletion}
        onClose={() => setShowCompletion(false)}
        stats={{
          timeInSeconds: startTime ? Math.floor((Date.now() - startTime) / 1000) : 0,
          errorCount: errorCount
        }}
      />

      {/* Loading Modal */}
      <LoadingModal
        isOpen={isLoading}
        stages={loadingStages}
        currentStage={loadingStage}
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