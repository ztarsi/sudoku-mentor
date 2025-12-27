import React, { useState, useRef, useMemo } from 'react';
import Cell from './Cell';
import CellContextMenu from './CellContextMenu';
import ChainVisualization from './ChainVisualization';

export default function SudokuGrid({ 
  grid, 
  selectedCell, 
  focusedDigit,
  highlightedDigit,
  validationErrors,
  candidateMode,
  colors,
  currentStep,
  whatIfOverlay,
  whatIfAnimStep,
  onCellClick, 
  onCellInput,
  onToggleCandidate
}) {
  const [contextMenu, setContextMenu] = useState({ isOpen: false, cellIndex: null, position: { x: 0, y: 0 } });
  const longPressTimerRef = useRef(null);
  const touchStartPosRef = useRef({ x: 0, y: 0 });

  const handleTouchStart = (e, cellIndex) => {
    const touch = e.touches[0];
    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
    
    longPressTimerRef.current = setTimeout(() => {
      setContextMenu({
        isOpen: true,
        cellIndex,
        position: { x: touch.clientX, y: touch.clientY - 10 }
      });
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleTouchMove = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleContextMenuClear = () => {
    if (contextMenu.cellIndex !== null) {
      onCellInput(contextMenu.cellIndex, null);
    }
  };

  const handleContextMenuToggleCandidates = () => {
    if (contextMenu.cellIndex !== null && focusedDigit) {
      onToggleCandidate(contextMenu.cellIndex, focusedDigit);
    }
  };

  const gridSize = typeof window !== 'undefined' ? Math.min(window.innerWidth * 0.9, 600) : 600;
  const cellSize = gridSize / 9;

  // Compute overlay grid if we're animating a what-if scenario
  const overlayGrid = useMemo(() => {
    if (!whatIfOverlay || !whatIfOverlay.chain) return null;

    const { chain, baseGrid } = whatIfOverlay;
    const visibleSteps = chain.slice(0, whatIfAnimStep + 1);

    // Clone the base grid
    const tempGrid = baseGrid.map(cell => ({ ...cell, candidates: [...cell.candidates] }));

    // Apply visible steps
    visibleSteps.forEach(step => {
      if (step.action === 'place') {
        tempGrid[step.cell].value = step.value;
        tempGrid[step.cell].candidates = [];
      } else if (step.action === 'eliminate') {
        tempGrid[step.cell].candidates = tempGrid[step.cell].candidates.filter(c => c !== step.value);
      }
    });

    return tempGrid;
  }, [whatIfOverlay, whatIfAnimStep]);

  const getCellCenter = (index) => {
    const row = Math.floor(index / 9);
    const col = index % 9;
    return {
      x: col * cellSize + cellSize / 2,
      y: row * cellSize + cellSize / 2
    };
  };

  const alsLinks = useMemo(() => {
    if (currentStep?.technique !== 'ALS-XZ' || !currentStep.als1 || !currentStep.als2) {
      return [];
    }

    const links = [];
    const { als1, als2, zDigit } = currentStep;

    // Create links for z digit cells within each ALS
    const als1ZCells = als1.cells.filter(c => grid[c].candidates.includes(zDigit));
    const als2ZCells = als2.cells.filter(c => grid[c].candidates.includes(zDigit));

    // Draw connections between ALS1 z-cells
    for (let i = 0; i < als1ZCells.length; i++) {
      for (let j = i + 1; j < als1ZCells.length; j++) {
        links.push({
          from: getCellCenter(als1ZCells[i]),
          to: getCellCenter(als1ZCells[j]),
          color: '#3b82f6',
          type: 'strong'
        });
      }
    }

    // Draw connections between ALS2 z-cells
    for (let i = 0; i < als2ZCells.length; i++) {
      for (let j = i + 1; j < als2ZCells.length; j++) {
        links.push({
          from: getCellCenter(als2ZCells[i]),
          to: getCellCenter(als2ZCells[j]),
          color: '#3b82f6',
          type: 'strong'
        });
      }
    }

    return links;
  }, [currentStep, grid, cellSize]);

  const forcingChains = useMemo(() => {
    if (currentStep?.technique === 'Deep Forcing Chain') {
      if (currentStep.chains) {
        return currentStep.chains;
      } else if (currentStep.chain && currentStep.contradiction) {
        return [{ cells: currentStep.chain, color: '#ef4444', label: `If ${currentStep.contradictoryDigit}` }];
      }
    }
    return null;
  }, [currentStep]);

  return (
    <>
      <div className="relative">
        {/* Outer glow effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/30 to-indigo-500/30 rounded-2xl blur-xl"></div>
        
        {/* Grid container */}
        <div className="relative bg-slate-900 rounded-2xl shadow-2xl shadow-black/50 p-3 sm:p-4 border border-slate-700">
          <div 
            className="grid grid-cols-9 gap-0 rounded-lg overflow-hidden relative"
            style={{ 
              border: `2px solid ${colors?.gridLines || '#475569'}`,
              width: 'min(90vw, 600px)', 
              height: 'min(90vw, 600px)' 
            }}
          >
            {/* What-If Overlay Grid - shown on top during animation */}
            {overlayGrid && (
              <div className="absolute inset-0 z-50 pointer-events-none">
                <div className="w-full h-full grid grid-cols-9 gap-0">
                  {overlayGrid.map((cell, index) => {
                    const row = Math.floor(index / 9);
                    const col = index % 9;
                    const borderRight = (col + 1) % 3 === 0 && col !== 8 ? 'border-r-2' : 'border-r';
                    const borderBottom = (row + 1) % 3 === 0 && row !== 8 ? 'border-b-2' : 'border-b';
                    
                    return (
                      <div
                        key={`overlay-${index}`}
                        className={`flex items-center justify-center ${borderRight} ${borderBottom} border-slate-600 bg-slate-800`}
                        style={{
                          width: `${cellSize}px`,
                          height: `${cellSize}px`
                        }}
                      >
                        {cell.value !== null ? (
                          <span className="text-2xl font-bold text-emerald-400">
                            {cell.value}
                          </span>
                        ) : cell.candidates.length > 0 && (
                          <div className="grid grid-cols-3 gap-0 w-full h-full p-1">
                            {[1,2,3,4,5,6,7,8,9].map(num => (
                              <div key={num} className="flex items-center justify-center text-[8px] text-slate-300">
                                {cell.candidates.includes(num) ? num : ''}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Chain Visualization Overlay - hide arrows during what-if animation */}
            {currentStep && (currentStep.chains || currentStep.chain || currentStep.strongLinks || currentStep.weakLinks || alsLinks.length > 0 || forcingChains) && (
              <div className="absolute inset-0 z-40 pointer-events-none">
                <ChainVisualization
                  chains={currentStep.chains}
                  strongLinks={currentStep.strongLinks}
                  weakLinks={currentStep.weakLinks}
                  alsLinks={alsLinks}
                  forcingChains={overlayGrid ? null : forcingChains}
                  cellSize={cellSize}
                  gridSize={gridSize}
                  currentStep={currentStep}
                />
              </div>
            )}
            {grid.map((cell, index) => {
              const row = Math.floor(index / 9);
              const col = index % 9;
              
              // Determine border styling for 3x3 boxes
              const borderRight = (col + 1) % 3 === 0 && col !== 8 ? 'border-r-2' : 'border-r';
              const borderBottom = (row + 1) % 3 === 0 && row !== 8 ? 'border-b-2' : 'border-b';
              
              return (
                <div
                  key={index}
                  onTouchStart={(e) => handleTouchStart(e, index)}
                  onTouchEnd={handleTouchEnd}
                  onTouchMove={handleTouchMove}
                >
                  <Cell
                    cell={cell}
                    isSelected={selectedCell === index}
                    isFocusedDigit={focusedDigit !== null && cell.value === focusedDigit}
                    isFocusCandidate={focusedDigit !== null && cell.candidates.includes(focusedDigit)}
                    isDimmed={focusedDigit !== null && cell.value !== focusedDigit && !cell.candidates.includes(focusedDigit)}
                    isHighlightedNumber={highlightedDigit !== null && cell.value === highlightedDigit}
                    hasError={validationErrors.includes(index)}
                    borderClasses={`${borderRight} ${borderBottom}`}
                    focusedDigit={focusedDigit}
                    candidateMode={candidateMode}
                    colors={colors}
                    onClick={() => onCellClick(index)}
                    onInput={(value) => onCellInput(index, value)}
                    onToggleCandidate={(candidate) => onToggleCandidate(index, candidate)}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <CellContextMenu
        isOpen={contextMenu.isOpen}
        position={contextMenu.position}
        cell={contextMenu.cellIndex !== null ? grid[contextMenu.cellIndex] : null}
        onClose={() => setContextMenu({ isOpen: false, cellIndex: null, position: { x: 0, y: 0 } })}
        onClear={handleContextMenuClear}
        onToggleCandidateMode={handleContextMenuToggleCandidates}
      />
    </>
  );
}