import React, { useState, useCallback, useEffect, useRef } from 'react';
import SudokuGrid from '@/components/sudoku/SudokuGrid';
import DigitFilter from '@/components/sudoku/DigitFilter';
import UnifiedPuzzleLoader from '@/components/sudoku/UnifiedPuzzleLoader';
import ColorSettings from '@/components/sudoku/ColorSettings';
import CompletionModal from '@/components/sudoku/CompletionModal';
import LoadingModal from '@/components/sudoku/LoadingModal';
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

export default function SudokuMentorMobile() {
  const [grid, setGrid] = useState(createEmptyGrid());
  const [selectedCell, setSelectedCell] = useState(null);
  const [focusedDigit, setFocusedDigit] = useState(null);
  const [currentPuzzleName, setCurrentPuzzleName] = useState(null);
  const [currentPuzzleDifficulty, setCurrentPuzzleDifficulty] = useState(null);
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
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState(0);
  const [user, setUser] = useState(null);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [showCopyConfirmation, setShowCopyConfirmation] = useState(false);
  const [noAssistStartTime, setNoAssistStartTime] = useState(null);
  const [bestTime, setBestTime] = useState(null);
  const [stepHistory, setStepHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const errorAudioRef = useRef(null);

  const loadingStages = [
    'Loading puzzle...',
    'Validating solution...',
    'Ready to solve!'
  ];

  const handleCellClick = useCallback((cellIndex) => {
    setSelectedCell(cellIndex);
    
    const clickedValue = grid[cellIndex].value;
    if (clickedValue !== null) {
      setHighlightedDigit(prev => prev === clickedValue ? null : clickedValue);
    } else {
      setHighlightedDigit(null);
    }
  }, [grid]);

  const handleCellInput = useCallback((cellIndex, value) => {
    // If solution exists and value doesn't match, play error sound and reject
    if (solution && value !== null && solution[cellIndex].value !== value) {
      if (errorAudioRef.current) {
        errorAudioRef.current.currentTime = 0;
        errorAudioRef.current.play();
      }
      setErrorCount(prev => prev + 1);
      return;
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
    const cell = grid[cellIndex];
    
    if (cell.isFixed || cell.value !== null) {
      return;
    }
    
    setGrid(prev => {
      const newGrid = [...prev];
      const updatedCell = { ...newGrid[cellIndex] };
      
      const candidateIdx = updatedCell.candidates.indexOf(candidate);
      if (candidateIdx >= 0) {
        updatedCell.candidates = updatedCell.candidates.filter(c => c !== candidate);
      } else {
        updatedCell.candidates = [...updatedCell.candidates, candidate].sort((a, b) => a - b);
      }
      
      newGrid[cellIndex] = updatedCell;
      return newGrid;
    });
    
    setStepHistory(h => [...h.slice(0, historyIndex + 1), { grid, action: 'toggle_candidate' }]);
    setHistoryIndex(i => i + 1);
  }, [grid, historyIndex]);

  const handleDigitFilter = useCallback((digit) => {
    setFocusedDigit(prev => prev === digit ? null : digit);
  }, []);

  const handleDigitInput = useCallback((digit) => {
    if (selectedCell === null) return;
    
    const cell = grid[selectedCell];
    if (cell.isFixed) return;

    if (candidateMode) {
      // Toggle candidate
      handleToggleCandidate(selectedCell, digit);
    } else {
      // Set value
      handleCellInput(selectedCell, digit);
    }
  }, [selectedCell, grid, candidateMode, handleToggleCandidate, handleCellInput]);

  const handleUndo = useCallback(() => {
    if (historyIndex >= 0) {
      setGrid(stepHistory[historyIndex].grid);
      setHistoryIndex(i => i - 1);
    }
  }, [historyIndex, stepHistory]);

  const handleClearGrid = useCallback(() => {
    setStepHistory(h => [...h, { grid, action: 'clear' }]);
    setHistoryIndex(i => i + 1);
    setGrid(createEmptyGrid());
    setSolution(null);
    setValidationErrors([]);
  }, [grid]);

  const handleLoadPuzzle = useCallback(async (puzzle, puzzleMeta = null) => {
    setIsLoading(true);
    setLoadingStage(0);
    
    if (puzzleMeta) {
      setCurrentPuzzleName(puzzleMeta.name);
      setCurrentPuzzleDifficulty(puzzleMeta.difficulty);
    } else {
      setCurrentPuzzleName(null);
      setCurrentPuzzleDifficulty(null);
    }
    
    setNoAssistStartTime(Date.now());
    
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
    
    // Stage 3: Ready!
    setLoadingStage(2);
    await new Promise(resolve => setTimeout(resolve, 200));
    
    setGrid(newGrid);
    setShowPuzzleLoader(false);
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
      const isModalOpen = showPuzzleLoader || showColorSettings || showCompletion || showAccountMenu || showCopyConfirmation;
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
        const digit = parseInt(e.key);
        
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          handleDigitFilter(digit);
          return;
        }
        
        if (selectedCell !== null) {
          e.preventDefault();
          handleDigitInput(digit);
        }
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
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
      } else if (e.key.toLowerCase() === 'z' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleUndo();
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
  }, [selectedCell, grid, candidateMode, historyIndex, handleCellInput, handleToggleCandidate, handleDigitFilter, handleClearGrid, handleUndo, showPuzzleLoader, showColorSettings, showCompletion, showAccountMenu, showCopyConfirmation, handleDigitInput]);

  // Check if puzzle is complete
  useEffect(() => {
    if (!solution || !startTime) return;

    const solvedCount = grid.filter(c => c.value !== null).length;
    const isSolved = solvedCount === 81 && grid.every((cell, idx) => 
      cell.value !== null && cell.value === solution[idx].value
    );

    if (isSolved) {
      const noAssistTime = Math.floor((Date.now() - noAssistStartTime) / 1000);
      setShowCompletion(true);
      
      if (user && currentPuzzleName && currentPuzzleDifficulty) {
        base44.entities.SolveRecord.create({
          puzzle_name: currentPuzzleName,
          difficulty: currentPuzzleDifficulty,
          time_seconds: noAssistTime,
          no_assist: true,
          error_count: errorCount
        }).catch(err => console.error('Failed to save solve record:', err));
      }
    }
  }, [grid, solution, startTime, noAssistStartTime, user, currentPuzzleName, currentPuzzleDifficulty, errorCount]);

  const handleCopyPuzzle = () => {
    const puzzleString = grid.map(cell => cell.isFixed ? cell.value : 0).join('');
    navigator.clipboard.writeText(puzzleString);
    setShowCopyConfirmation(true);
    setTimeout(() => setShowCopyConfirmation(false), 2000);
  };

  const solvedCount = grid.filter(c => c.value !== null).length;
  const progress = Math.round((solvedCount / 81) * 100);

  // Load user on mount and restore color settings
  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
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
                    onClick={() => base44.auth.redirectToLogin()}
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
            grid={grid}
            selectedCell={selectedCell}
            focusedDigit={focusedDigit}
            focusedCandidates={null}
            removalCandidates={null}
            highlightedDigit={highlightedDigit}
            validationErrors={validationErrors}
            candidateMode={candidateMode}
            candidatesVisible={true}
            colors={colors}
            currentStep={null}
            playbackIndex={0}
            onCellClick={handleCellClick}
            onCellInput={handleCellInput}
            onToggleCandidate={handleToggleCandidate}
          />
        </div>

        {/* Mobile Controls - Fixed Bottom */}
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

          {/* Digit Input - Modified to handle input */}
          <div className="py-1.5 px-1">
            <div className="flex gap-1 justify-between">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(digit => {
                const digitCount = grid.filter(cell => cell.value === digit).length;
                const isComplete = digitCount >= 9;
                
                return (
                  <button
                    key={digit}
                    onClick={() => handleDigitInput(digit)}
                    disabled={isComplete && !candidateMode}
                    className={`
                      relative flex-shrink-0 w-9 h-9 rounded-lg font-semibold text-sm
                      transition-all duration-200
                      ${isComplete && !candidateMode
                        ? 'bg-emerald-900/40 text-emerald-600 cursor-not-allowed' 
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