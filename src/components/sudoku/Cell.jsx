import React from 'react';
import { motion } from 'framer-motion';

export default function Cell({ 
  cellId,
  cell, 
  isSelected, 
  isFocusedDigit,
  isFocusCandidate,
  isDimmed,
  isHighlightedNumber,
  hasError,
  borderClasses,
  focusedDigit,
  focusedCandidates,
  removalCandidates,
  candidateMode,
  candidatesVisible,
  colors,
  onClick, 
  onInput,
  onToggleCandidate,
  alsSet,
  alsUnitHighlight,
  currentStep,
  xDigit,
  zDigit,
  cellSize,         // NEW: passed from SudokuGrid on mobile; undefined on desktop
  onTouchStart,
  onTouchEnd,
  onTouchMove,
}) {
  const { value, isFixed, candidates, isBaseCell, isTargetCell, highlightColor, ghostValue, isUnitCell } = cell;

  const hasGhostConflict = ghostValue && value && value !== ghostValue;

  let bgColor = colors?.cellBg || '#020617';
  let textColor = isFixed ? 'text-slate-100' : 'text-blue-400';
  let useCustomBg = false;
  let borderStyle = '';

  if (hasGhostConflict) {
    bgColor = 'bg-red-900/60'; textColor = 'text-red-400';
  } else if (hasError) {
    bgColor = 'bg-red-900/40'; textColor = 'text-red-400';
  } else if (alsSet) {
    bgColor = alsSet === 1 ? 'bg-blue-600/40' : 'bg-indigo-600/40';
    borderStyle = alsSet === 1 ? 'ring-2 ring-blue-400 ring-inset' : 'ring-2 ring-indigo-400 ring-inset';
  } else if (alsUnitHighlight) {
    bgColor = alsUnitHighlight === 1 ? 'bg-blue-500/10' : 'bg-indigo-500/10';
  } else if (isTargetCell && currentStep?.technique === 'ALS-XZ') {
    bgColor = 'bg-orange-600/30'; borderStyle = 'ring-2 ring-orange-400 ring-inset';
  } else if (isBaseCell) {
    bgColor = 'bg-blue-900/40';
  } else if (isTargetCell) {
    bgColor = 'bg-red-900/40';
  } else if (isSelected) {
    bgColor = 'bg-blue-950/60';
  } else if (isFocusedDigit) {
    bgColor = 'bg-emerald-900/40';
  } else if (isHighlightedNumber) {
    bgColor = 'bg-amber-900/40';
  } else if (isUnitCell) {
    bgColor = 'bg-blue-500/10';
  } else if (ghostValue) {
    bgColor = 'bg-orange-900/20'; useCustomBg = true;
  } else {
    useCustomBg = true;
  }

  const focusDigitColor = colors?.focusDigit || '#10b981';
  const candidateColor = colors?.candidate || '#ffffff';
  const cellNumberColor = colors?.cellNumber || '#3b82f6';
  const gridLineColor = colors?.gridLines || '#475569';

  // Proportional font sizes when cellSize is available (mobile).
  // Fallback to Tailwind breakpoint classes on desktop (cellSize undefined).
  const valueFontSize = cellSize ? `${Math.round(cellSize * 0.58)}px` : undefined;
  const ghostFontSize = cellSize ? `${Math.round(cellSize * 0.50)}px` : undefined;
  // Candidate font: at 41px cell → ~10.7px, meets AC ≥10px minimum
  const candidateFontSize = cellSize ? `${Math.max(10, Math.round(cellSize * 0.26))}px` : undefined;

  return (
    <div className="relative">
      <motion.div
        id={cellId}
        className={`
          relative aspect-square flex items-center justify-center cursor-pointer
          ${!useCustomBg ? bgColor : ''} ${borderClasses}
          transition-all duration-200 ease-out
          hover:bg-slate-800/50
          ${isSelected ? 'ring-2 ring-blue-500 ring-inset z-10' : ''}
          ${isFocusedDigit && !borderStyle ? 'ring-2 ring-emerald-500 ring-inset' : ''}
          ${isHighlightedNumber && !borderStyle ? 'ring-2 ring-amber-400 ring-inset' : ''}
          ${borderStyle}
        `}
        style={useCustomBg ? { backgroundColor: bgColor, borderColor: gridLineColor }
          : { borderColor: gridLineColor }}
        onClick={onClick}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onTouchMove={onTouchMove}
        whileTap={{ scale: 0.95 }}
      >
        {value ? (
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`flex items-center justify-center rounded-lg ${isFocusedDigit ? 'px-3 py-1' : ''}`}
            style={isFocusedDigit ? { backgroundColor: `${focusDigitColor}40`, boxShadow: `0 0 0 2px ${focusDigitColor}` } : {}}
          >
            <span
              className={`
                font-semibold ${isFixed ? 'text-slate-100' : ''}
                ${isFixed ? '' : 'font-medium'}
                ${hasError || hasGhostConflict ? 'animate-pulse' : ''}
                ${isDimmed ? 'opacity-20' : 'opacity-100'}
                ${!valueFontSize ? 'text-2xl sm:text-4xl' : ''}
              `}
              style={{
                ...(valueFontSize ? { fontSize: valueFontSize } : {}),
                ...(!isFixed && !hasError ? { color: cellNumberColor } : {}),
              }}
            >
              {value}
            </span>
          </motion.div>
        ) : ghostValue ? (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center justify-center"
          >
            <span
              className={`font-medium italic text-orange-400 opacity-75 ${!ghostFontSize ? 'text-xl sm:text-3xl' : ''}`}
              style={ghostFontSize ? { fontSize: ghostFontSize } : {}}
            >
              {ghostValue}
            </span>
          </motion.div>
        ) : candidatesVisible ? (
          <div className="grid grid-cols-3 gap-0 w-full h-full p-0.5">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => {
              const hasCandidate = candidates.includes(num);
              const isHighlightedCandidate = focusedDigit === num && hasCandidate;
              const isMultiColorCandidate = focusedCandidates && focusedCandidates[num] && hasCandidate;
              const isRemovalCandidate = removalCandidates && removalCandidates.has(num);
              const candidateColorResolved = isRemovalCandidate
                ? '#ef4444'
                : (isMultiColorCandidate ? focusedCandidates[num] : focusDigitColor);

              return (
                <div
                  key={num}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (hasCandidate) {
                      if (candidateMode) onToggleCandidate(num);
                      else onInput(num);
                    }
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onToggleCandidate(num);
                  }}
                  className={`
                    flex items-center justify-center
                    transition-all duration-200 rounded cursor-pointer
                    ${!hasCandidate ? 'text-transparent' : (
                      (isRemovalCandidate || isHighlightedCandidate || ((isBaseCell || isTargetCell) && isMultiColorCandidate))
                        ? 'font-semibold hover:scale-110'
                        : 'text-white hover:scale-110'
                    )}
                    ${alsSet && hasCandidate && num !== xDigit && num !== zDigit ? 'opacity-20' : ''}
                    ${!candidateFontSize ? 'text-xs sm:text-sm' : ''}
                  `}
                  style={(() => {
                    const sizeStyle = candidateFontSize ? { fontSize: candidateFontSize } : {};
                    if (isRemovalCandidate) {
                      return { ...sizeStyle, backgroundColor: '#ef4444E6', boxShadow: '0 0 0 2px #ef4444', color: '#000' };
                    }
                    if (alsSet && hasCandidate) {
                      if (num === xDigit) return { ...sizeStyle, backgroundColor: '#f59e0b80', boxShadow: '0 0 0 2px #f59e0b', color: '#000' };
                      if (num === zDigit) return { ...sizeStyle, backgroundColor: '#a855f780', boxShadow: '0 0 0 2px #a855f7', color: '#000' };
                    }
                    if (isHighlightedCandidate || ((isBaseCell || isTargetCell) && isMultiColorCandidate)) {
                      return { ...sizeStyle, backgroundColor: `${candidateColorResolved}E6`, boxShadow: `0 0 0 2px ${candidateColorResolved}`, color: '#000' };
                    }
                    return sizeStyle;
                  })()}
                >
                  {num}
                </div>
              );
            })}
          </div>
        ) : null}

        {/* Highlight overlay for base/target cells */}
        {(isBaseCell || isTargetCell) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`absolute inset-0 pointer-events-none ${isBaseCell ? 'bg-blue-500/20' : 'bg-red-500/20'}`}
          />
        )}
      </motion.div>
    </div>
  );
}
