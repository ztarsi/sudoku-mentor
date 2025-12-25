import React from 'react';
import { motion } from 'framer-motion';

export default function DigitFilter({ focusedDigit, onDigitClick, grid }) {
  // Count occurrences of each digit (solved cells only)
  const digitCounts = {};
  for (let i = 1; i <= 9; i++) {
    digitCounts[i] = grid.filter(cell => cell.value === i).length;
  }

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg shadow-slate-200/50 p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-slate-600">Focus Mode</span>
        <span className="text-xs text-slate-400">Press Shift + 1-9 or click</span>
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
                relative w-10 h-10 sm:w-12 sm:h-12 rounded-xl font-semibold text-lg
                transition-all duration-300 ease-out
                ${isComplete 
                  ? 'bg-emerald-100 text-emerald-400 cursor-not-allowed' 
                  : isActive 
                    ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/40' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }
              `}
            >
              {digit}
              
              {/* Count indicator */}
              <span className={`
                absolute -top-1 -right-1 w-4 h-4 rounded-full text-[10px] font-medium
                flex items-center justify-center
                ${isComplete 
                  ? 'bg-emerald-500 text-white' 
                  : 'bg-slate-200 text-slate-500'
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