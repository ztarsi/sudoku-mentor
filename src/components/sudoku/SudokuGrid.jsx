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
  playbackIndex,
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
    if (currentStep?.technique === 'Deep Forcing Chain' || currentStep?.technique === 'Hypothesis Mode') {
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
            
            {/* Chain Visualization Overlay - after cells so it renders on top */}
            {currentStep && (currentStep.chains || currentStep.chain || currentStep.strongLinks || currentStep.weakLinks || alsLinks.length > 0 || forcingChains) && (
              <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 50 }}>
                <ChainVisualization
                  chains={currentStep.chains}
                  strongLinks={currentStep.strongLinks}
                  weakLinks={currentStep.weakLinks}
                  alsLinks={alsLinks}
                  forcingChains={forcingChains}
                  cellSize={cellSize}
                  gridSize={gridSize}
                  currentStep={currentStep}
                  playbackIndex={playbackIndex}
                />
              </div>
            )}
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