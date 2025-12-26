import React, { useState, useCallback, useEffect, useRef } from 'react';
import SudokuGrid from '@/components/sudoku/SudokuGrid';
import DigitFilter from '@/components/sudoku/DigitFilter';
import LogicPanel from '@/components/sudoku/LogicPanel';
import ControlBar from '@/components/sudoku/ControlBar';
import PuzzleLibrary from '@/components/sudoku/PuzzleLibrary';
import OCRUpload from '@/components/sudoku/OCRUpload';
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
  const [validationErrors, setValidationErrors] = useState([]);
  const [highlightedDigit, setHighlightedDigit] = useState(null);
  const [solution, setSolution] = useState(null);
  const [candidateMode, setCandidateMode] = useState(false);
  const errorAudioRef = useRef(null);

  // Auto-generate candidates whenever grid changes
  useEffect(() => {
    const newGrid = generateCandidates(grid);
    const hasChanged = newGrid.some((cell, i) => 
      JSON.stringify(cell.candidates) !== JSON.stringify(grid[i].candidates)
    );
    if (hasChanged) {
      setGrid(newGrid);
    }
  }, [grid.map(c => c.value).join(',')]);

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
      
      return newGrid;
    });
    validateGrid();
  }, [historyIndex, solution]);

  const handleToggleCandidate = useCallback((cellIndex, candidate) => {
    setGrid(prev => {
      const newGrid = [...prev];
      const cell = { ...newGrid[cellIndex] };
      
      if (!cell.isFixed && !cell.value) {
        const candidateIdx = cell.candidates.indexOf(candidate);
        if (candidateIdx >= 0) {
          cell.candidates = cell.candidates.filter(c => c !== candidate);
        } else {
          cell.candidates = [...cell.candidates, candidate].sort();
        }
        newGrid[cellIndex] = cell;
        
        // Save to history
        setStepHistory(h => [...h.slice(0, historyIndex + 1), { grid: prev, action: 'toggle_candidate' }]);
        setHistoryIndex(i => i + 1);
      }
      
      return newGrid;
    });
  }, [historyIndex]);

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
      setGrid(newGrid);
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
    
    // Solve the puzzle to get the solution
    const solved = solveSudoku(newGrid);
    if (solved) {
      setSolution(solved);
    } else {
      setSolution(null);
      alert('This puzzle has no valid solution!');
    }
    
    setGrid(newGrid);
    setShowLibrary(false);
    setShowOCRUpload(false);
    clearHighlights();
    setStepHistory([]);
    setHistoryIndex(-1);
    setValidationErrors([]);
    setHighlightedDigit(null);
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
      
      if (e.key >= '1' && e.key <= '9') {
        const digit = parseInt(e.key);
        
        // Focus digit mode (Ctrl/Cmd + digit)
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          handleDigitFilter(digit);
          return;
        }
        
        // Candidate mode (Shift + digit)
        if ((candidateMode || e.shiftKey) && selectedCell !== null && !grid[selectedCell].isFixed) {
          e.preventDefault();
          handleToggleCandidate(selectedCell, digit);
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
  }, [selectedCell, grid, candidateMode, handleCellInput, handleToggleCandidate, handleDigitFilter, handleClearGrid]);

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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-[1fr,380px] gap-8">
          {/* Left Column - Grid & Controls */}
          <div className="space-y-6">
            {/* Digit Filter */}
            <DigitFilter 
              focusedDigit={focusedDigit} 
              onDigitClick={handleDigitFilter}
              grid={grid}
            />
            
            {/* Candidate Mode Indicator */}
            {candidateMode && (
              <div className="bg-amber-900/40 border border-amber-500 rounded-xl p-3 text-center">
                <span className="text-amber-300 font-medium">
                  📝 Candidate Mode Active - Press numbers to toggle candidates
                </span>
              </div>
            )}
            
            {/* Sudoku Grid */}
            <div className="flex justify-center">
              <SudokuGrid
                grid={grid}
                selectedCell={selectedCell}
                focusedDigit={focusedDigit}
                highlightedDigit={highlightedDigit}
                validationErrors={validationErrors}
                candidateMode={candidateMode}
                onCellClick={handleCellClick}
                onCellInput={handleCellInput}
                onToggleCandidate={handleToggleCandidate}
              />
            </div>
            
            {/* Control Bar */}
            <ControlBar
              onNextStep={handleNextStep}
              onApplyStep={handleApplyStep}
              onUndo={handleUndo}
              onRedo={handleRedo}
              onClear={handleClearGrid}
              canUndo={historyIndex >= 0}
              canRedo={historyIndex < stepHistory.length - 1}
              hasStep={currentStep !== null}
            />
          </div>
          
          {/* Right Column - Logic Panel */}
          <LogicPanel 
            currentStep={currentStep}
            focusedDigit={focusedDigit}
            grid={grid}
          />
        </div>
      </main>

      {/* Puzzle Library Modal */}
      {showLibrary && (
        <PuzzleLibrary 
          onClose={() => setShowLibrary(false)}
          onSelectPuzzle={handleLoadPuzzle}
        />
      )}
      
      {/* OCR Upload Modal */}
      {showOCRUpload && (
        <OCRUpload
          onClose={() => setShowOCRUpload(false)}
          onPuzzleExtracted={handleLoadPuzzle}
        />
      )}
    </div>
  );
}