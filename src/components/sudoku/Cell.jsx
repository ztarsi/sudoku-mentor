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
  candidateMode,
  colors,
  onClick, 
  onInput,
  onToggleCandidate
}) {
  const { value, isFixed, candidates, isBaseCell, isTargetCell, highlightColor, ghostValue } = cell;

  // Detect ghost conflicts
  const hasGhostConflict = ghostValue && value && value !== ghostValue;
  
  // Determine background color based on state
  let bgColor = colors?.cellBg || '#020617';
  let textColor = isFixed ? 'text-slate-100' : 'text-blue-400';
  let useCustomBg = false;
  
  if (hasGhostConflict) {
    bgColor = 'bg-red-900/60';
    textColor = 'text-red-400';
  } else if (hasError) {
    bgColor = 'bg-red-900/40';
    textColor = 'text-red-400';
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
  } else if (ghostValue) {
    bgColor = 'bg-orange-900/20';
    useCustomBg = true;
  } else {
    useCustomBg = true;
  }

  const focusDigitColor = colors?.focusDigit || '#10b981';
  const candidateColor = colors?.candidate || '#ffffff';
  const cellNumberColor = colors?.cellNumber || '#3b82f6';
  const gridLineColor = colors?.gridLines || '#475569';

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
        ${isFocusedDigit ? 'ring-2 ring-emerald-500 ring-inset' : ''}
        ${isHighlightedNumber ? 'ring-2 ring-amber-400 ring-inset' : ''}
      `}
      style={useCustomBg ? { 
        backgroundColor: bgColor,
        borderColor: gridLineColor 
      } : {
        borderColor: gridLineColor
      }}
      onClick={onClick}
      whileTap={{ scale: 0.95 }}
    >
      {value ? (
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`
            flex items-center justify-center rounded-lg
            ${isFocusedDigit ? 'px-3 py-1' : ''}
          `}
          style={isFocusedDigit ? {
            backgroundColor: `${focusDigitColor}40`,
            boxShadow: `0 0 0 2px ${focusDigitColor}`
          } : {}}
        >
          <span
            className={`
              text-2xl sm:text-4xl font-semibold ${isFixed ? 'text-slate-100' : ''}
              ${isFixed ? '' : 'font-medium'}
              ${hasError || hasGhostConflict ? 'animate-pulse' : ''}
              ${isDimmed ? 'opacity-20' : 'opacity-100'}
            `}
            style={!isFixed && !hasError ? { color: cellNumberColor } : {}}
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
          <span className="text-xl sm:text-3xl font-medium italic text-orange-400 opacity-75">
            {ghostValue}
          </span>
        </motion.div>
      ) : (
        <div className="grid grid-cols-3 gap-0 w-full h-full p-0.5">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => {
            const hasCandidate = candidates.includes(num);
            const isHighlightedCandidate = focusedDigit === num && hasCandidate;

            return (
              <div 
                key={num}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isFixed) {
                    onInput(num);
                  }
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!isFixed) {
                    onToggleCandidate(num);
                  }
                }}
                className={`
                  flex items-center justify-center text-xs sm:text-sm cursor-pointer
                  transition-all duration-200 rounded hover:bg-slate-700/50
                  ${!hasCandidate ? 'text-transparent' : (
                    isTargetCell && focusedDigit === num 
                      ? 'text-red-400 font-bold animate-pulse' 
                      : isBaseCell && focusedDigit === num
                        ? 'text-blue-400 font-bold'
                        : isHighlightedCandidate 
                          ? 'font-semibold' 
                          : 'text-white'
                  )}
                `}
                style={isHighlightedCandidate ? {
                  backgroundColor: `${focusDigitColor}E6`,
                  boxShadow: `0 0 0 2px ${focusDigitColor}`,
                  color: '#000'
                } : {}}
              >
                {num}
              </div>
            );
          })}
        </div>
      )}
      
      {/* Highlight overlay for base/target cells */}
      {(isBaseCell || isTargetCell) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={`
            absolute inset-0 pointer-events-none
            ${isBaseCell ? 'bg-blue-500/20' : 'bg-red-500/20'}
          `}
        />
      )}
    </motion.div>
    </div>
  );
}