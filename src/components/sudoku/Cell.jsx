import React from 'react';
import { motion } from 'framer-motion';

export default function Cell({ 
  cell, 
  isSelected, 
  isFocusedDigit,
  isFocusCandidate,
  isDimmed,
  isHighlightedNumber,
  hasError,
  borderClasses,
  focusedDigit,
  onClick, 
  onInput 
}) {
  const { value, isFixed, candidates, isBaseCell, isTargetCell, highlightColor } = cell;

  // Determine background color based on state
  let bgColor = 'bg-slate-950';
  let textColor = isFixed ? 'text-slate-100' : 'text-blue-400';
  
  if (hasError) {
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
  }

  // Calculate opacity for focus mode
  const opacity = isDimmed ? 'opacity-20' : 'opacity-100';

  return (
    <motion.div
      className={`
        relative aspect-square flex items-center justify-center cursor-pointer
        ${bgColor} ${borderClasses} ${opacity}
        transition-all duration-200 ease-out
        hover:bg-slate-800/50
        ${isSelected ? 'ring-2 ring-blue-500 ring-inset z-10' : ''}
        ${isFocusedDigit ? 'ring-2 ring-emerald-500 ring-inset' : ''}
        ${isHighlightedNumber ? 'ring-2 ring-amber-400 ring-inset' : ''}
      `}
      onClick={onClick}
      whileTap={{ scale: 0.95 }}
    >
      {value ? (
        <motion.span
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`
            text-xl sm:text-3xl font-semibold ${textColor}
            ${isFixed ? '' : 'font-medium'}
            ${hasError ? 'animate-pulse' : ''}
          `}
        >
          {value}
        </motion.span>
      ) : (
        <div className="grid grid-cols-3 gap-0 w-full h-full p-0.5">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => {
            const hasCandidate = candidates.includes(num);
            const isHighlightedCandidate = focusedDigit === num && hasCandidate;
            const shouldDim = focusedDigit !== null && focusedDigit !== num;
            
            return (
              <div 
                key={num} 
                className={`
                  flex items-center justify-center text-[10px] sm:text-xs
                  transition-all duration-200
                  ${hasCandidate ? (
                    isTargetCell && focusedDigit === num 
                      ? 'text-red-400 font-bold animate-pulse' 
                      : isBaseCell && focusedDigit === num
                        ? 'text-blue-400 font-bold'
                        : isHighlightedCandidate 
                          ? 'text-emerald-400 font-semibold' 
                          : shouldDim 
                            ? 'text-slate-700' 
                            : 'text-slate-500'
                  ) : ''}
                `}
              >
                {hasCandidate ? num : ''}
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
  );
}