import React from 'react';
import { motion } from 'framer-motion';

/**
 * Focus-mode digit picker. One layout at every width: a card with nine
 * digit buttons, each showing how many of that digit are placed.
 */
export default function DigitFilter({ focusedDigit, onDigitClick, grid }) {
  // Count occurrences of each digit (solved cells only)
  const digitCounts = {};
  for (let i = 1; i <= 9; i++) {
    digitCounts[i] = grid.filter(cell => cell.value === i).length;
  }

  return (
    <div
      role="group"
      aria-label="Focus on a digit"
      className="bg-slate-900/90 backdrop-blur-sm rounded-2xl shadow-lg shadow-black/50 p-3 sm:p-4 border border-slate-700"
    >
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <span className="text-sm sm:text-base font-medium text-slate-300">Focus Mode</span>
        <span className="hidden sm:inline text-sm text-slate-500">Click, or press 1-9 with no cell selected</span>
      </div>

      <div className="flex justify-between sm:justify-center gap-1 sm:gap-2">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(digit => {
          const isActive = focusedDigit === digit;
          const isComplete = digitCounts[digit] >= 9;

          return (
            <motion.button
              key={digit}
              onClick={() => onDigitClick(digit)}
              disabled={isComplete}
              aria-pressed={isActive}
              aria-label={`Focus digit ${digit}, ${digitCounts[digit]} placed`}
              whileHover={{ scale: isComplete ? 1 : 1.08 }}
              whileTap={{ scale: isComplete ? 1 : 0.95 }}
              className={`
                relative w-9 h-9 sm:w-12 sm:h-12 rounded-xl font-semibold text-base sm:text-xl
                transition-all duration-300 ease-out
                ${isComplete
                  ? 'bg-emerald-900/40 text-emerald-600 cursor-not-allowed'
                  : isActive
                    ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/40'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }
              `}
            >
              {digit}

              {/* Count indicator */}
              <span className={`
                absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 rounded-full text-[10px] sm:text-xs font-medium
                flex items-center justify-center
                ${isComplete ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-400'}
              `}>
                {digitCounts[digit]}
              </span>

              {/* Active glow */}
              {isActive && (
                <motion.div
                  layoutId="activeDigit"
                  className="absolute inset-0 rounded-xl bg-blue-400/20 blur-md -z-10"
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
