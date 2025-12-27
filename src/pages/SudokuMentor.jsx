import React, { useState, useCallback, useEffect, useRef } from 'react';
import SudokuGrid from '@/components/sudoku/SudokuGrid';
import DigitFilter from '@/components/sudoku/DigitFilter';
import LogicPanel from '@/components/sudoku/LogicPanel';
import ControlBar from '@/components/sudoku/ControlBar';
import PuzzleLibrary from '@/components/sudoku/PuzzleLibrary';
import OCRUpload from '@/components/sudoku/OCRUpload';
import ColorSettings from '@/components/sudoku/ColorSettings';
import CompletionModal from '@/components/sudoku/CompletionModal';
import TextPuzzleUpload from '@/components/sudoku/TextPuzzleUpload';
import MobileDrawer from '@/components/sudoku/MobileDrawer';
import { generateCandidates, findNextLogicStep, applyLogicStep } from '@/components/sudoku/logicEngine';
import { solveSudoku } from '@/components/sudoku/solver';

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
  const [showLibrary, setShowLibrary] = useState(false);
  const [showOCRUpload, setShowOCRUpload] = useState(false);
  const [showTextUpload, setShowTextUpload] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);
  const [highlightedDigit, setHighlightedDigit] = useState(null);
  const [solution, setSolution] = useState(null);
  const [candidateMode, setCandidateMode] = useState(false);
  const [showColorSettings, setShowColorSettings] = useState(false);
  const [colors, setColors] = useState({
    focusDigit: '#10b981',
    candidate: '#ffffff',
    cellNumber: '#3b82f6',
    gridLines: '#475569',
    cellBg: '#020617',
  });
  const [startTime, setStartTime] = useState(null);
  const [errorCount, setErrorCount] = useState(0);
  const [showCompletion, setShowCompletion] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const errorAudioRef = useRef(null);

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
      }
      
      // Regenerate candidates after setting a value
      return generateCandidates(newGrid);
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

  const handleNextStep = useCallback(() => {
    const step = findNextLogicStep(grid, focusedDigit);
    if (step) {
      setCurrentStep(step);
      // Highlight the digit from the hint
      if (step.digit) {
        setFocusedDigit(step.digit);
      }
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
    }
  }, [grid, focusedDigit]);

  const handleApplyStep = useCallback(() => {
    if (currentStep) {
      setStepHistory(h => [...h.slice(0, historyIndex + 1), { grid, action: currentStep.technique }]);
      setHistoryIndex(i => i + 1);
      
      const newGrid = applyLogicStep(grid, currentStep);
      
      // Only regenerate candidates if we placed a value (not just eliminated candidates)
      if (currentStep.placement) {
        const gridWithCandidates = generateCandidates(newGrid);
        setGrid(gridWithCandidates);
      } else {
        setGrid(newGrid);
      }
      
      setCurrentStep(null);
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
      // Reapply the action
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

  const handleLoadPuzzle = useCallback((puzzle) => {
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
    
    // Generate initial candidates
    const gridWithCandidates = generateCandidates(newGrid);
    
    // Solve the puzzle to get the solution
    const solved = solveSudoku(gridWithCandidates);
    if (solved) {
      setSolution(solved);
    } else {
      setSolution(null);
      alert('This puzzle has no valid solution!');
    }
    
    setGrid(gridWithCandidates);
    setShowLibrary(false);
    setShowOCRUpload(false);
    setShowTextUpload(false);
    clearHighlights();
    setStepHistory([]);
    setHistoryIndex(-1);
    setValidationErrors([]);
    setHighlightedDigit(null);
    setStartTime(Date.now());
    setErrorCount(0);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Error sound */}
      <audio ref={errorAudioRef} src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIF2i777edTRALUKXi8LljHAU2jdTwzIUsBS2Ayv=="  preload="auto"></audio>
      
      {/* Header */}
      <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-700/60 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
                <span className="text-white font-bold text-lg">9</span>
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-white tracking-tight">Sudoku Mentor</h1>
                <p className="text-sm text-slate-400">Learn logic-based solving</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 bg-slate-800 rounded-full px-4 py-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                <span className="text-base text-slate-300">{progress}% Complete</span>
              </div>
              <div className="flex gap-2">
                  <button
                    onClick={() => setShowColorSettings(true)}
                    className="p-2 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 transition-all duration-200"
                    title="Color Settings"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setShowTextUpload(true)}
                    className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-medium rounded-xl shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30 transition-all duration-300 hover:-translate-y-0.5"
                  >
                    Text Upload
                  </button>
                  <button
                    onClick={() => setShowOCRUpload(true)}
                    className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-medium rounded-xl shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/30 transition-all duration-300 hover:-translate-y-0.5"
                  >
                    OCR Upload
                  </button>
                  <button
                    onClick={() => setShowLibrary(true)}
                    className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-sm font-medium rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-300 hover:-translate-y-0.5"
                  >
                    Load Puzzle
                  </button>
                </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 lg:pb-8 pt-20 lg:pt-8">
        <div className="grid lg:grid-cols-[1fr,380px] gap-8">
          {/* Left Column - Grid & Controls */}
          <div className="space-y-6">
            {/* Digit Filter - Desktop Only */}
            <DigitFilter 
              focusedDigit={focusedDigit} 
              onDigitClick={handleDigitFilter}
              grid={grid}
            />

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
                grid={grid}
                selectedCell={selectedCell}
                focusedDigit={focusedDigit}
                highlightedDigit={highlightedDigit}
                validationErrors={validationErrors}
                candidateMode={candidateMode}
                colors={colors}
                onCellClick={handleCellClick}
                onCellInput={handleCellInput}
                onToggleCandidate={handleToggleCandidate}
              />
            </div>
          </div>

          {/* Right Column - Logic Panel (Desktop only) */}
          <div className="hidden lg:block">
            <LogicPanel 
              currentStep={currentStep}
              focusedDigit={focusedDigit}
              grid={grid}
              onHighlightTechnique={(instances, total, current) => {
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

      {/* Puzzle Library Modal */}
      {showLibrary && (
        <PuzzleLibrary 
          onClose={() => setShowLibrary(false)}
          onSelectPuzzle={handleLoadPuzzle}
        />
      )}
      
      {/* Text Upload Modal */}
      {showTextUpload && (
        <TextPuzzleUpload
          onClose={() => setShowTextUpload(false)}
          onPuzzleLoaded={handleLoadPuzzle}
        />
      )}

      {/* OCR Upload Modal */}
      {showOCRUpload && (
        <OCRUpload
          onClose={() => setShowOCRUpload(false)}
          onPuzzleExtracted={handleLoadPuzzle}
        />
      )}

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
      </div>
      );
      }