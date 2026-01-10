import React, { useState, useRef, useMemo } from 'react';
import Cell from './Cell';
import CellContextMenu from './CellContextMenu';

export default function SudokuGrid({ 
  grid, 
  selectedCell, 
  focusedDigit,
  focusedCandidates,
  removalCandidates,
  highlightedDigit,
  validationErrors,
  candidateMode,
  candidatesVisible,
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
  const gridContainerRef = useRef(null);

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

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;
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
    const { als1, als2, zDigit, xDigit } = currentStep;

    // Internal links - purple lines for z-digit cells within each set
    const als1ZCells = als1.cells.filter(c => grid[c].candidates.includes(zDigit));
    const als2ZCells = als2.cells.filter(c => grid[c].candidates.includes(zDigit));

    // Draw connections between ALS1 z-cells
    for (let i = 0; i < als1ZCells.length; i++) {
      for (let j = i + 1; j < als1ZCells.length; j++) {
        links.push({
          from: getCellCenter(als1ZCells[i]),
          to: getCellCenter(als1ZCells[j]),
          color: '#8b5cf6',
          type: 'internal',
          strokeWidth: 2
        });
      }
    }

    // Draw connections between ALS2 z-cells
    for (let i = 0; i < als2ZCells.length; i++) {
      for (let j = i + 1; j < als2ZCells.length; j++) {
        links.push({
          from: getCellCenter(als2ZCells[i]),
          to: getCellCenter(als2ZCells[j]),
          color: '#8b5cf6',
          type: 'internal',
          strokeWidth: 2
        });
      }
    }

    // Bridge links - thick dashed amber lines for x-digit connections between sets
    const als1XCells = als1.cells.filter(c => grid[c].candidates.includes(xDigit));
    const als2XCells = als2.cells.filter(c => grid[c].candidates.includes(xDigit));

    for (const xCell1 of als1XCells) {
      for (const xCell2 of als2XCells) {
        links.push({
          from: getCellCenter(xCell1),
          to: getCellCenter(xCell2),
          color: '#f59e0b',
          type: 'bridge',
          strokeWidth: 4,
          dashArray: '8,4'
        });
      }
    }

    return links;
  }, [currentStep, grid, cellSize]);

  const forcingChains = useMemo(() => {
    const forcingTechniques = ['Deep Forcing Chain', 'Hypothesis Mode', 'Cell Forcing Chain'];
    if (forcingTechniques.includes(currentStep?.technique)) {
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
      <div className={`relative ${isMobile ? 'w-full flex justify-center' : ''}`}>
        {/* Outer glow effect - desktop only */}
        {!isMobile && <div className="absolute inset-0 bg-gradient-to-br from-blue-500/30 to-indigo-500/30 rounded-2xl blur-xl"></div>}
        
        {/* Grid container */}
        <div className={`relative ${isMobile ? '' : 'bg-slate-900 rounded-2xl shadow-2xl shadow-black/50 p-3 sm:p-4 border border-slate-700'}`}>
          <div 
            ref={gridContainerRef}
            className={`grid grid-cols-9 gap-0 overflow-visible relative ${isMobile ? '' : 'rounded-lg'}`}
            style={{ 
              border: isMobile ? 'none' : `3px solid ${colors?.gridLines || '#475569'}`,
              width: isMobile ? 'calc(100vw - 8px)' : 'min(90vw, 600px)', 
              height: isMobile ? 'calc(100vw - 8px)' : 'min(90vw, 600px)',
              aspectRatio: '1/1',
              marginLeft: isMobile ? '4px' : '0'
            }}
          >
            {grid.map((cell, index) => {
              const row = Math.floor(index / 9);
              const col = index % 9;
              const box = Math.floor(row / 3) * 3 + Math.floor(col / 3);

              // Determine border styling for 3x3 boxes
              const isMobileView = typeof window !== 'undefined' && window.innerWidth < 1024;
              const borderRight = (col + 1) % 3 === 0 && col !== 8 ? (isMobileView ? 'border-r-2' : 'border-r-4') : 'border-r';
              const borderBottom = (row + 1) % 3 === 0 && row !== 8 ? (isMobileView ? 'border-b-2' : 'border-b-4') : 'border-b';

              // Determine ALS set membership and unit highlighting
              let alsSet = null;
              let alsUnitHighlight = null;
              if (currentStep?.technique === 'ALS-XZ') {
                if (currentStep.als1?.cells.includes(index)) {
                  alsSet = 1;
                } else if (currentStep.als2?.cells.includes(index)) {
                  alsSet = 2;
                }

                // Identify the specific unit each ALS belongs to
                const als1Rows = [...new Set(currentStep.als1.cells.map(c => Math.floor(c / 9)))];
                const als1Cols = [...new Set(currentStep.als1.cells.map(c => c % 9))];
                const als1Boxes = [...new Set(currentStep.als1.cells.map(c => Math.floor(Math.floor(c / 9) / 3) * 3 + Math.floor((c % 9) / 3)))];

                const als2Rows = [...new Set(currentStep.als2.cells.map(c => Math.floor(c / 9)))];
                const als2Cols = [...new Set(currentStep.als2.cells.map(c => c % 9))];
                const als2Boxes = [...new Set(currentStep.als2.cells.map(c => Math.floor(Math.floor(c / 9) / 3) * 3 + Math.floor((c % 9) / 3)))];

                // Determine which specific unit each ALS is in (the one where all cells share that unit)
                const als1Unit = als1Rows.length === 1 ? { type: 'row', value: als1Rows[0] } :
                                 als1Cols.length === 1 ? { type: 'col', value: als1Cols[0] } :
                                 als1Boxes.length === 1 ? { type: 'box', value: als1Boxes[0] } : null;

                const als2Unit = als2Rows.length === 1 ? { type: 'row', value: als2Rows[0] } :
                                 als2Cols.length === 1 ? { type: 'col', value: als2Cols[0] } :
                                 als2Boxes.length === 1 ? { type: 'box', value: als2Boxes[0] } : null;

                // Only highlight if this cell belongs to one of the two specific units
                if (als1Unit && 
                    ((als1Unit.type === 'row' && row === als1Unit.value) ||
                     (als1Unit.type === 'col' && col === als1Unit.value) ||
                     (als1Unit.type === 'box' && box === als1Unit.value))) {
                  alsUnitHighlight = 1;
                } else if (als2Unit && 
                           ((als2Unit.type === 'row' && row === als2Unit.value) ||
                            (als2Unit.type === 'col' && col === als2Unit.value) ||
                            (als2Unit.type === 'box' && box === als2Unit.value))) {
                  alsUnitHighlight = 2;
                }
              }

              return (
                <div
                  key={index}
                  onTouchStart={(e) => handleTouchStart(e, index)}
                  onTouchEnd={handleTouchEnd}
                  onTouchMove={handleTouchMove}
                >
                  <Cell
                    cellId={`sudoku-cell-${index}`}
                    cell={cell}
                    isSelected={selectedCell === index}
                    isFocusedDigit={false}
                    isFocusCandidate={focusedDigit !== null && cell.value === null && cell.candidates.includes(focusedDigit)}
                    isDimmed={false}
                    isHighlightedNumber={highlightedDigit !== null && cell.value === highlightedDigit}
                    hasError={validationErrors.includes(index)}
                    borderClasses={`${borderRight} ${borderBottom}`}
                    focusedDigit={focusedDigit}
                    focusedCandidates={focusedCandidates}
                    removalCandidates={removalCandidates?.[index]}
                    candidateMode={candidateMode}
                    candidatesVisible={candidatesVisible}
                    colors={colors}
                    alsSet={alsSet}
                    alsUnitHighlight={alsUnitHighlight}
                    currentStep={currentStep}
                    xDigit={currentStep?.technique === 'ALS-XZ' ? currentStep.xDigit : null}
                    zDigit={currentStep?.technique === 'ALS-XZ' ? currentStep.zDigit : null}
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