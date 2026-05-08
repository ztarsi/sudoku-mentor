import React, { useState, useRef, useMemo, useEffect } from 'react';
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
  const [measuredWidth, setMeasuredWidth] = useState(0);
  const longPressTimerRef = useRef(null);
  const touchStartPosRef = useRef({ x: 0, y: 0 });
  const gridWrapperRef = useRef(null);
  const gridContainerRef = useRef(null);

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;

  // ResizeObserver: measure real available container width on mobile
  useEffect(() => {
    if (!isMobile) return;
    const el = gridWrapperRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setMeasuredWidth(entry.contentRect.width);
      }
    });
    observer.observe(el);
    setMeasuredWidth(el.getBoundingClientRect().width);
    return () => observer.disconnect();
  }, [isMobile]);

  // Grid sizing: mobile uses measured container width, constrained for landscape
  const gridSize = isMobile && measuredWidth > 0
    ? (() => {
        const maxDimension = typeof window !== 'undefined'
          ? Math.min(measuredWidth, window.innerHeight - 120)
          : measuredWidth;
        return Math.floor(maxDimension / 9) * 9;
      })()
    : null;

  const cellSize = gridSize ? gridSize / 9 : null;

  const getCellCenter = (index) => {
    const row = Math.floor(index / 9);
    const col = index % 9;
    const size = cellSize || 60;
    return { x: col * size + size / 2, y: row * size + size / 2 };
  };

  const handleTouchStart = (e, cellIndex) => {
    const touch = e.touches[0];
    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
    longPressTimerRef.current = setTimeout(() => {
      setContextMenu({ isOpen: true, cellIndex, position: { x: touch.clientX, y: touch.clientY - 10 } });
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) { clearTimeout(longPressTimerRef.current); longPressTimerRef.current = null; }
  };

  const handleTouchMove = () => {
    if (longPressTimerRef.current) { clearTimeout(longPressTimerRef.current); longPressTimerRef.current = null; }
  };

  const handleContextMenuClear = () => {
    if (contextMenu.cellIndex !== null) onCellInput(contextMenu.cellIndex, null);
  };

  const handleContextMenuToggleCandidates = () => {
    if (contextMenu.cellIndex !== null && focusedDigit) onToggleCandidate(contextMenu.cellIndex, focusedDigit);
  };

  const alsLinks = useMemo(() => {
    if (currentStep?.technique !== 'ALS-XZ' || !currentStep.als1 || !currentStep.als2) return [];
    const links = [];
    const { als1, als2, zDigit, xDigit } = currentStep;
    const als1ZCells = als1.cells.filter(c => grid[c].candidates.includes(zDigit));
    const als2ZCells = als2.cells.filter(c => grid[c].candidates.includes(zDigit));
    for (let i = 0; i < als1ZCells.length; i++)
      for (let j = i + 1; j < als1ZCells.length; j++)
        links.push({ from: getCellCenter(als1ZCells[i]), to: getCellCenter(als1ZCells[j]), color: '#8b5cf6', type: 'internal', strokeWidth: 2 });
    for (let i = 0; i < als2ZCells.length; i++)
      for (let j = i + 1; j < als2ZCells.length; j++)
        links.push({ from: getCellCenter(als2ZCells[i]), to: getCellCenter(als2ZCells[j]), color: '#8b5cf6', type: 'internal', strokeWidth: 2 });
    const als1XCells = als1.cells.filter(c => grid[c].candidates.includes(xDigit));
    const als2XCells = als2.cells.filter(c => grid[c].candidates.includes(xDigit));
    for (const xCell1 of als1XCells)
      for (const xCell2 of als2XCells)
        links.push({ from: getCellCenter(xCell1), to: getCellCenter(xCell2), color: '#f59e0b', type: 'bridge', strokeWidth: 4, dashArray: '8,4' });
    return links;
  }, [currentStep, grid, cellSize]);

  const forcingChains = useMemo(() => {
    const forcingTechniques = ['Deep Forcing Chain', 'Hypothesis Mode', 'Cell Forcing Chain'];
    if (forcingTechniques.includes(currentStep?.technique)) {
      if (currentStep.chains) return currentStep.chains;
      if (currentStep.chain && currentStep.contradiction)
        return [{ cells: currentStep.chain, color: '#ef4444', label: `If ${currentStep.contradictoryDigit}` }];
    }
    return null;
  }, [currentStep]);

  return (
    <>
      <div ref={gridWrapperRef} className={`relative ${isMobile ? 'w-full flex justify-center' : ''}`}>
        {!isMobile && <div className="absolute inset-0 bg-gradient-to-br from-blue-500/30 to-indigo-500/30 rounded-2xl blur-xl" />}
        <div className={`relative ${isMobile ? '' : 'bg-slate-900 rounded-2xl shadow-2xl shadow-black/50 p-3 sm:p-4 border border-slate-700'}`}>
          <div
            ref={gridContainerRef}
            className={`grid grid-cols-9 gap-0 overflow-visible relative ${isMobile ? '' : 'rounded-lg'}`}
            style={{
              border: isMobile ? `2px solid ${colors?.gridLines || '#475569'}` : `3px solid ${colors?.gridLines || '#475569'}`,
              ...(isMobile && gridSize
                ? {
                    width: `${gridSize}px`,
                    height: `${gridSize}px`,
                    gridTemplateColumns: `repeat(9, ${gridSize / 9}px)`,
                    gridTemplateRows: `repeat(9, ${gridSize / 9}px)`,
                  }
                : !isMobile
                ? { width: 'min(90vw, 600px)', height: 'min(90vw, 600px)', aspectRatio: '1/1' }
                : { aspectRatio: '1/1' }),
            }}
          >
            {grid.map((cell, index) => {
              const row = Math.floor(index / 9);
              const col = index % 9;
              const box = Math.floor(row / 3) * 3 + Math.floor(col / 3);
              const borderRight = (col + 1) % 3 === 0 && col !== 8 ? (isMobile ? 'border-r-2' : 'border-r-4') : 'border-r';
              const borderBottom = (row + 1) % 3 === 0 && row !== 8 ? (isMobile ? 'border-b-2' : 'border-b-4') : 'border-b';

              let alsSet = null;
              let alsUnitHighlight = null;
              if (currentStep?.technique === 'ALS-XZ') {
                if (currentStep.als1?.cells.includes(index)) alsSet = 1;
                else if (currentStep.als2?.cells.includes(index)) alsSet = 2;
                const als1Rows = [...new Set(currentStep.als1.cells.map(c => Math.floor(c / 9)))];
                const als1Cols = [...new Set(currentStep.als1.cells.map(c => c % 9))];
                const als1Boxes = [...new Set(currentStep.als1.cells.map(c => Math.floor(Math.floor(c / 9) / 3) * 3 + Math.floor((c % 9) / 3)))];
                const als2Rows = [...new Set(currentStep.als2.cells.map(c => Math.floor(c / 9)))];
                const als2Cols = [...new Set(currentStep.als2.cells.map(c => c % 9))];
                const als2Boxes = [...new Set(currentStep.als2.cells.map(c => Math.floor(Math.floor(c / 9) / 3) * 3 + Math.floor((c % 9) / 3)))];
                const als1Unit = als1Rows.length === 1 ? { type: 'row', value: als1Rows[0] }
                  : als1Cols.length === 1 ? { type: 'col', value: als1Cols[0] }
                  : als1Boxes.length === 1 ? { type: 'box', value: als1Boxes[0] } : null;
                const als2Unit = als2Rows.length === 1 ? { type: 'row', value: als2Rows[0] }
                  : als2Cols.length === 1 ? { type: 'col', value: als2Cols[0] }
                  : als2Boxes.length === 1 ? { type: 'box', value: als2Boxes[0] } : null;
                if (als1Unit && (
                  (als1Unit.type === 'row' && row === als1Unit.value) ||
                  (als1Unit.type === 'col' && col === als1Unit.value) ||
                  (als1Unit.type === 'box' && box === als1Unit.value)
                )) alsUnitHighlight = 1;
                else if (als2Unit && (
                  (als2Unit.type === 'row' && row === als2Unit.value) ||
                  (als2Unit.type === 'col' && col === als2Unit.value) ||
                  (als2Unit.type === 'box' && box === als2Unit.value)
                )) alsUnitHighlight = 2;
              }

              return (
                <Cell
                  key={index}
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
                  cellSize={cellSize}
                  onClick={() => onCellClick(index)}
                  onInput={(value) => onCellInput(index, value)}
                  onToggleCandidate={(candidate) => onToggleCandidate(index, candidate)}
                  onTouchStart={(e) => handleTouchStart(e, index)}
                  onTouchEnd={handleTouchEnd}
                  onTouchMove={handleTouchMove}
                />
              );
            })}

            {/* ALS-XZ link overlay */}
            {alsLinks.length > 0 && gridSize && (
              <svg className="absolute inset-0 pointer-events-none" width={gridSize} height={gridSize} style={{ overflow: 'visible' }}>
                {alsLinks.map((link, i) => (
                  <line key={i} x1={link.from.x} y1={link.from.y} x2={link.to.x} y2={link.to.y}
                    stroke={link.color} strokeWidth={link.strokeWidth} strokeDasharray={link.dashArray}
                    strokeLinecap="round" opacity={0.8} />
                ))}
              </svg>
            )}

            {/* Forcing chain overlay */}
            {forcingChains && gridSize && (
              <svg className="absolute inset-0 pointer-events-none" width={gridSize} height={gridSize} style={{ overflow: 'visible' }}>
                {forcingChains.map((chain, chainIndex) => (
                  chain.cells && chain.cells.slice(0, -1).map((cellIdx, i) => {
                    const from = getCellCenter(cellIdx);
                    const to = getCellCenter(chain.cells[i + 1]);
                    return (
                      <line key={`${chainIndex}-${i}`} x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                        stroke={chain.color || '#ef4444'} strokeWidth={2} strokeLinecap="round" opacity={0.7} />
                    );
                  })
                ))}
              </svg>
            )}
          </div>
        </div>
      </div>

      <CellContextMenu
        isOpen={contextMenu.isOpen}
        position={contextMenu.position}
        onClose={() => setContextMenu(prev => ({ ...prev, isOpen: false }))}
        onClear={handleContextMenuClear}
        onToggleCandidate={handleContextMenuToggleCandidates}
        focusedDigit={focusedDigit}
      />
    </>
  );
}

