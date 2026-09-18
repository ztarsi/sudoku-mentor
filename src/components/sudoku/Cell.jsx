import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

// Seconds the rejected-entry flash plays; shorter than the hook's TTL so
// the overlay finishes fading before it unmounts.
const REJECT_FLASH_SECONDS = 0.8;

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
  rejected = null,  // { digit, id } while this cell's last entry is being refused
  onTouchStart,
  onTouchEnd,
  onTouchMove,
}) {
  const { value, isFixed, candidates, isBaseCell, isTargetCell, ghostValue, isUnitCell } = cell;
  const reduceMotion = useReducedMotion();

  // Screen-reader description of this cell
  const cellIndex = cellId ? parseInt(cellId.replace('sudoku-cell-', ''), 10) : null;
  const positionLabel = cellIndex !== null
    ? `Row ${Math.floor(cellIndex / 9) + 1}, column ${(cellIndex % 9) + 1}`
    : 'Cell';
  const contentLabel = value
    ? `${value}${isFixed ? ', given' : ''}`
    : candidates.length > 0
    ? `empty, candidates ${candidates.join(' ')}`
    : 'empty';
  const removedLabel = removalCandidates && removalCandidates.size > 0
    ? `, hint removes ${[...removalCandidates].sort().join(' ')}`
    : '';
  const hintRole = isBaseCell
    ? ', part of the hint pattern'
    : isTargetCell
    ? ', hint target'
    : isUnitCell
    ? ', in the hint unit'
    : '';
  const ariaLabel =
    `${positionLabel}: ${contentLabel}${hasError ? ', conflict' : ''}${hintRole}${removedLabel}` +
    `${isSelected ? ', selected' : ''}`;

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
  // Candidate font: fit within the sub-cell slot (cellSize/3), no floor —
  // overflow is worse than a small-but-contained digit.
  const slotSize = cellSize ? cellSize / 3 : null;
  const candidateFontSize = slotSize ? `${Math.max(7, Math.floor(slotSize * 0.72))}px` : undefined;

  return (
    <div className="relative w-full h-full">
      <motion.div
        id={cellId}
        role="button"
        aria-label={ariaLabel}
        tabIndex={isSelected ? 0 : -1}
        className={`
          relative w-full h-full flex items-center justify-center cursor-pointer overflow-hidden
          ${!useCustomBg ? bgColor : ''} ${borderClasses}
          transition-all duration-200 ease-out
          hover:bg-slate-800/50
          focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400
          ${isSelected ? 'ring-2 ring-blue-500 ring-inset z-10' : ''}
          ${isFocusedDigit && !borderStyle ? 'ring-2 ring-emerald-500 ring-inset' : ''}
          ${isHighlightedNumber && !borderStyle ? 'ring-2 ring-amber-400 ring-inset' : ''}
          ${borderStyle}
        `}
        style={useCustomBg ? { backgroundColor: bgColor, borderColor: gridLineColor }
          : { borderColor: gridLineColor }}
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
          }
        }}
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
          // Candidate mini-grid. On desktop a slot that HOLDS a candidate is a
          // click target (place it / toggle it); every other click must fall
          // through to the cell so it can be selected. On mobile (cellSize
          // set) the whole cell is one touch target: the page's digit-first
          // model decides what a tap means, never the 13px slot under it.
          <div
            className={`grid grid-cols-3 gap-0 absolute inset-0 ${cellSize ? 'pointer-events-none' : ''}`}
            aria-hidden="true"
          >
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
                    if (!hasCandidate) return; // let the cell handle selection
                    e.stopPropagation();
                    if (candidateMode) onToggleCandidate(num);
                    else onInput(num);
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onToggleCandidate(num);
                  }}
                  className={`
                    flex items-center justify-center
                    transition-all duration-200 rounded
                    ${hasCandidate ? 'cursor-pointer' : ''}
                    ${!hasCandidate ? 'text-transparent' : (
                      (isRemovalCandidate || isHighlightedCandidate || ((isBaseCell || isTargetCell) && isMultiColorCandidate))
                        ? 'font-semibold '
                        : 'text-white '
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

        {/* Rejected entry: the refused digit flashes red and shakes, then
            fades. Visual counterpart to the error sound and the live-region
            announcement, for players with sound off. Keyed on the rejection
            id so a repeated wrong entry replays the flash. */}
        {rejected && (
          <motion.div
            key={rejected.id}
            data-testid="rejected-input"
            aria-hidden="true"
            initial={{ opacity: 1, x: 0 }}
            animate={reduceMotion
              ? { opacity: [1, 1, 0] }
              : { x: [0, -6, 6, -4, 4, 0], opacity: [1, 1, 1, 1, 1, 0] }}
            transition={{
              duration: REJECT_FLASH_SECONDS,
              ease: 'easeOut',
              times: reduceMotion ? [0, 0.6, 1] : [0, 0.1, 0.2, 0.3, 0.45, 1],
            }}
            className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center bg-red-950/85 ring-2 ring-red-500 ring-inset"
          >
            <span
              className={`font-bold text-red-400 ${!valueFontSize ? 'text-2xl sm:text-4xl' : ''}`}
              style={valueFontSize ? { fontSize: valueFontSize } : {}}
            >
              {rejected.digit}
            </span>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}

