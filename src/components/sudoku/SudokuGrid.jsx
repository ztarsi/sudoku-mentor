import React from 'react';
import Cell from './Cell';

export default function SudokuGrid({ 
  grid, 
  selectedCell, 
  focusedDigit,
  highlightedDigit,
  validationErrors,
  candidateMode,
  onCellClick, 
  onCellInput,
  onToggleCandidate
}) {
  return (
    <div className="relative">
      {/* Outer glow effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/30 to-indigo-500/30 rounded-2xl blur-xl"></div>
      
      {/* Grid container */}
      <div className="relative bg-slate-900 rounded-2xl shadow-2xl shadow-black/50 p-3 sm:p-4 border border-slate-700">
        <div 
          className="grid grid-cols-9 gap-0 border-2 border-slate-600 rounded-lg overflow-hidden"
          style={{ 
            width: 'min(90vw, 600px)', 
            height: 'min(90vw, 600px)' 
          }}
        >
          {grid.map((cell, index) => {
            const row = Math.floor(index / 9);
            const col = index % 9;
            
            // Determine border styling for 3x3 boxes
            const borderRight = (col + 1) % 3 === 0 && col !== 8 ? 'border-r-2 border-r-slate-600' : 'border-r border-r-slate-700';
            const borderBottom = (row + 1) % 3 === 0 && row !== 8 ? 'border-b-2 border-b-slate-600' : 'border-b border-b-slate-700';
            
            return (
              <Cell
                key={index}
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
                onClick={() => onCellClick(index)}
                onInput={(value) => onCellInput(index, value)}
                onToggleCandidate={(candidate) => onToggleCandidate(index, candidate)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}