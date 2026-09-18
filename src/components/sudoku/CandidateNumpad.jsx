import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * CandidateNumpad - pencil-mark pad for mobile candidate entry.
 *
 * Rendered INSIDE the fixed bottom bar, above the mode switch and digit
 * row, so it never covers Undo, Erase or the mode buttons. It expands when
 * candidate mode is active and a cell is selected, and shows the selected
 * cell's current pencil marks, removal highlights and focus digit.
 *
 * Tapping a digit calls onToggleCandidate(digit).
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
  const cellLabel = selectedCell !== null
    ? `R${Math.floor(selectedCell / 9) + 1}C${(selectedCell % 9) + 1}`
    : '';

  return (
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div
          key="candidate-numpad"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ type: 'spring', damping: 32, stiffness: 320 }}
          className="overflow-hidden"
        >
          <div
            role="group"
            aria-label={`Pencil marks for ${cellLabel}`}
            className="bg-slate-900 border-b border-slate-800 px-4 pt-3 pb-3"
          >
            {/* Header row */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                Pencil marks {cellLabel && <span className="text-slate-500 normal-case">for {cellLabel}</span>}
              </span>
              <button
                onClick={onClose}
                className="text-xs text-slate-400 hover:text-slate-200 px-2 py-1 rounded transition-colors"
              >
                Done
              </button>
            </div>

            {/* 3x3 numpad grid */}
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
                    aria-pressed={isActive}
                    aria-label={`Pencil mark ${num}`}
                    className={`
                      flex items-center justify-center rounded-xl
                      min-h-[44px] text-xl
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
