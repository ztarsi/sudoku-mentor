import React from 'react';
import { motion } from 'framer-motion';

export default function DigitFilter({ focusedDigit, onDigitClick, grid }) {
  // Count occurrences of each digit (solved cells only)
  const digitCounts = {};
  for (let i = 1; i <= 9; i++) {
    digitCounts[i] = grid.filter(cell => cell.value === i).length;
  }

  return (
    <div className="bg-slate-900/90 backdrop-blur-sm rounded-2xl shadow-lg shadow-black/50 p-4 border border-slate-700">
      <div className="flex items-center justify-between mb-3">
        <span className="text-base font-medium text-slate-300">Focus Mode</span>
        <span className="text-sm text-slate-500">Press Shift + 1-9 or click</span>
      </div>
      
      <div className="flex justify-center gap-2">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(digit => {
          const isActive = focusedDigit === digit;
          const isComplete = digitCounts[digit] >= 9;
          
          return (
            <motion.button
              key={digit}
              onClick={() => onDigitClick(digit)}
              disabled={isComplete}
              whileHover={{ scale: isComplete ? 1 : 1.1 }}
              whileTap={{ scale: isComplete ? 1 : 0.95 }}
              className={`
                relative w-10 h-10 sm:w-12 sm:h-12 rounded-xl font-semibold text-xl
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
                absolute -top-1 -right-1 w-5 h-5 rounded-full text-xs font-medium
                flex items-center justify-center
                ${isComplete 
                  ? 'bg-emerald-500 text-white' 
                  : 'bg-slate-700 text-slate-400'
                }
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