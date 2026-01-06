
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
  };

  const handleNextStep = useCallback(async () => {
    setChainPlaybackIndex(0); // Reset playback for new hint
    const step = findNextLogicStep(grid, null);
    if (step) {
      setCurrentStep(step);
      
      setGrid(prev => {
        const newGrid = prev.map(cell => ({
          ...cell,
          isHighlighted: false,
          highlightColor: null,
          isBaseCell: false,
          isTargetCell: false
        }));
        
        // Highlight base cells
        step.baseCells?.forEach(idx => {
          newGrid[idx] = {
            ...newGrid[idx],
            isHighlighted: true,
            isBaseCell: true,
            highlightColor: 'blue'
          };
        });
        
        // Highlight target cells
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
            isTargetCell: false
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
      clearHighlights();
    }
  }, [currentStep, grid, historyIndex]);

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

  const handleLoadPuzzle = useCallback(async (puzzle) => {
    setIsLoading(true);
    setLoadingStage(0);
    
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
      
      // Hint shortcut (H key)
      if (e.key.toLowerCase() === 'h' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        handleNextStep();
        return;
      }
      
      // Apply step (A key)
      if (e.key.toLowerCase() === 'a' && !e.ctrlKey && !e.metaKey && currentStep) {
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
  }, [selectedCell, grid, candidateMode, currentStep, historyIndex, handleCellInput, handleToggleCandidate, handleDigitFilter, handleClearGrid, handleNextStep, handleApplyStep, handleUndo]);

  // Check if puzzle is complete
  useEffect(() => {
    if (!solution || !startTime) return;
    
    const isSolved = grid.every((cell, idx) => 
      cell.value !== null && cell.value === solution[idx].value
    );
    
    if (isSolved && solvedCount === 81) {
      const timeInSeconds = Math.floor((Date.now() - startTime) / 1000);
      setShowCompletion(true);
    }
  }, [grid, solution, startTime]);

  const solvedCount = grid.filter(c => c.value !== null).length;
  const progress = Math.round((solvedCount / 81) * 100);

  // Load a random puzzle on mount
  useEffect(() => {
    const loadRandomPuzzle = async () => {
      try {
        const userPuzzles = await base44.entities.SudokuPuzzle.list();
        
        // Combine built-in puzzles with user-uploaded ones
        const allAvailablePuzzles = [];
        for (const difficulty in PUZZLES) {
          PUZZLES[difficulty].forEach(p => allAvailablePuzzles.push(p.puzzle));
        }
        userPuzzles.forEach(p => allAvailablePuzzles.push(p.puzzle));

        if (allAvailablePuzzles.length > 0) {
          const randomPuzzle = allAvailablePuzzles[Math.floor(Math.random() * allAvailablePuzzles.length)];
          await handleLoadPuzzle(randomPuzzle);
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
      <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-700/60 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-2 lg:px-8 py-1 lg:py-4">
          <div className="flex items-center justify-between">
            {/* Desktop Title */}
            <div className="hidden lg:flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
                <span className="text-white font-bold text-lg">9</span>
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-white tracking-tight">Sudoku Mentor</h1>
                <p className="text-sm text-slate-400">Learn logic-based solving</p>
              </div>
            </div>
            
            {/* Mobile - just icon */}
            <div className="lg:hidden w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">9</span>
            </div>
            
            <div className="flex items-center gap-2 lg:gap-4">
              {/* Progress - desktop only */}
              <div className="hidden lg:flex items-center gap-2 bg-slate-800 rounded-full px-4 py-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                <span className="text-base text-slate-300">{progress}% Complete</span>
              </div>
              
              {/* Buttons - icons on mobile, text on desktop */}
              <button
                onClick={() => setShowAppInfo(true)}
                className="p-2 bg-slate-800 text-slate-300 rounded-lg lg:rounded-xl hover:bg-slate-700 transition-all duration-200"
                title="About Sudoku Mentor"
              >
                <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
              <button
                onClick={() => setShowColorSettings(true)}
                className="p-2 bg-slate-800 text-slate-300 rounded-lg lg:rounded-xl hover:bg-slate-700 transition-all duration-200"
                title="Color Settings"
              >
                <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                </svg>
              </button>
              <button
                onClick={() => setShowPuzzleLoader(true)}
                className="p-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg lg:rounded-xl transition-all duration-200"
                title="Load Puzzle"
              >
                <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 lg:pb-8 pt-12 lg:pt-8">
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
                  highlightedDigit={highlightedDigit}
                  validationErrors={validationErrors}
                  candidateMode={candidateMode}
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
              onApplyStep={handleApplyStep}
              onNextStep={handleNextStep}
              onChainPlaybackChange={setChainPlaybackIndex}
              chainPlaybackIndex={chainPlaybackIndex}
              onHighlightTechnique={(instances, total, current) => {
                // Set the first instance as the current step so it can be applied
                if (instances.length > 0) {
                  setCurrentStep(instances[0]);
                }

                // Highlight cells from the current instance
                setGrid(prev => {
                  const newGrid = prev.map(cell => ({
                    ...cell,
                    isHighlighted: false,
                    highlightColor: null,
                    isBaseCell: false,
                    isTargetCell: false
                  }));

                  instances.forEach(step => {
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

                // If all instances involve the same digit, highlight it
                const digits = [...new Set(instances.map(s => s.digit).filter(d => d))];
                if (digits.length === 1) {
                  setFocusedDigit(digits[0]);
                }
              }}
            />
          </div>
        </div>
      </main>

      {/* Mobile Drawer for Logic Panel */}
      <MobileDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <LogicPanel 
          currentStep={currentStep}
          focusedDigit={focusedDigit}
          grid={grid}
          onApplyStep={handleApplyStep}
          onNextStep={handleNextStep}
          onChainPlaybackChange={setChainPlaybackIndex}
          chainPlaybackIndex={chainPlaybackIndex}
          onHighlightTechnique={(instances, total, current) => {
            setGrid(prev => {
              const newGrid = prev.map(cell => ({
                ...cell,
                isHighlighted: false,
                highlightColor: null,
                isBaseCell: false,
                isTargetCell: false
              }));

              instances.forEach(step => {
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

            const digits = [...new Set(instances.map(s => s.digit).filter(d => d))];
            if (digits.length === 1) {
              setFocusedDigit(digits[0]);
            }
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
          onColorsChange={setColors}
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
      </div>
      );
      }
