import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MousePointerClick, Lightbulb, Play, Hand, Pencil, RotateCcw } from 'lucide-react';
import { useDialog } from '@/hooks/useDialog';

const STEPS = {
  desktop: [
    { icon: MousePointerClick, title: 'Pick a cell, type a digit', body: 'Click any empty cell and press 1-9. Shift + digit toggles a pencil mark. Wrong digits are rejected, so you can experiment freely.' },
    { icon: Lightbulb, title: 'Ask for a hint', body: 'Press H (or the lightbulb) and the mentor finds the next logical technique, highlights the cells involved, and explains why it works.' },
    { icon: Play, title: 'Apply it - or do it yourself', body: 'Press A to apply the step, or place the digit yourself to practice. Click any technique name to learn how to spot it.' },
  ],
  mobile: [
    { icon: Hand, title: 'Pick a digit, then tap cells', body: 'Choose a digit in the bottom bar, then tap the cells where it belongs. Wrong digits are rejected, so you can experiment freely.' },
    { icon: Pencil, title: 'Pencil marks', body: 'Switch to Candidate mode to note possible digits. Tap a cell to open the candidate pad.' },
    { icon: RotateCcw, title: 'Fix mistakes', body: 'Undo and Erase live next to the mode switch. Long-press a cell for more options.' },
  ],
};

/** One-time orientation shown to first-time visitors. */
export default function WelcomeTour({ open, variant = 'desktop', onClose }) {
  const dialog = useDialog({ open, onClose });

  const steps = STEPS[variant] || STEPS.desktop;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 12 }}
            onClick={(e) => e.stopPropagation()}
            ref={dialog.ref}
            {...dialog.props}
            aria-labelledby="welcome-title"
            className="bg-slate-900 rounded-2xl shadow-2xl border border-slate-700 w-full max-w-md overflow-hidden"
          >
            <div className="p-6 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
                  <span className="text-white font-bold text-lg">9</span>
                </div>
                <div>
                  <h2 id="welcome-title" className="text-xl font-semibold text-white">Welcome to Sudoku Mentor</h2>
                  <p className="text-slate-400 text-sm">A tutor, not just a solver. Three things to know:</p>
                </div>
              </div>
            </div>

            <ol className="p-6 space-y-4">
              {steps.map(({ icon: Icon, title, body }, i) => (
                <li key={title} className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-white font-medium">
                      <span className="text-slate-500 mr-1">{i + 1}.</span>
                      {title}
                    </p>
                    <p className="text-sm text-slate-400 leading-relaxed">{body}</p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="p-6 pt-0">
              <button
                onClick={onClose}
                autoFocus
                className="w-full py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
              >
                Start solving
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
