import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * CandidateNumpad — bottom sheet numpad for mobile candidate entry.
 *
 * Slides up from the bottom when candidate mode is active and a cell is selected.
 * Shows all 9 digits with visual state reflecting the selected cell's current candidates,
 * removal highlights, and focus digit highlights.
 *
 * Tapping a digit calls onToggleCandidate(digit).
 * Does not obscure the grid — sits below it in the layout.
 */
export default function CandidateNumpad({
  isOpen,
  selectedCell,
  grid,
  onToggleCandidate,
  onClose,
  colors,
  focusedDigit,
  removalCandidates,
}) {
  const cell = selectedCell !== null && grid ? grid[selectedCell] : null;
  const candidates = cell?.candidates || [];

  const focusDigitColor = colors?.focusDigit || '#10b981';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 32, stiffness: 320 }}
          className="fixed bottom-0 left-0 right-0 z-40 lg:hidden"
        >
          <div className="bg-slate-900 border-t border-slate-700 px-4 pt-3 pb-6 safe-area-inset-bottom">
            {/* Header row */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                Pencil Marks
              </span>
              <button
                onClick={onClose}
                className="text-xs text-slate-500 hover:text-slate-300 px-2 py-1 rounded transition-colors"
              >
                Done
              </button>
            </div>

            {/* 3×3 numpad grid */}
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => {
                const isActive = candidates.includes(num);
                const isRemoval = removalCandidates?.[selectedCell]?.has(num);
                const isFocus = focusedDigit === num;

                let bgStyle = {};
                let textClass = 'text-slate-500';

                if (isRemoval) {
                  bgStyle = { backgroundColor: '#ef444480', boxShadow: '0 0 0 2px #ef4444' };
                  textClass = 'text-red-300 font-semibold';
                } else if (isActive && isFocus) {
                  bgStyle = { backgroundColor: `${focusDigitColor}40`, boxShadow: `0 0 0 2px ${focusDigitColor}` };
                  textClass = 'text-white font-semibold';
                } else if (isActive) {
                  bgStyle = { backgroundColor: 'rgba(255,255,255,0.12)' };
                  textClass = 'text-white font-medium';
                }

                return (
                  <motion.button
                    key={num}
                    whileTap={{ scale: 0.92 }}
                    onClick={() => onToggleCandidate(num)}
                    className={`
                      flex items-center justify-center rounded-xl
                      min-h-[52px] text-2xl
                      transition-all duration-150
                      ${textClass}
                      active:opacity-70
                    `}
                    style={{
                      backgroundColor: isActive || isRemoval ? undefined : 'rgba(255,255,255,0.04)',
                      ...bgStyle,
                    }}
                  >
                    {num}
                  </motion.button>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
