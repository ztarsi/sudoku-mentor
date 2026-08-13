import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Info } from 'lucide-react';

const CONTENT = {
  techniques: {
    title: 'Technique Hierarchy',
    body: 'Browse all Sudoku solving techniques organized by difficulty. Click on technique names to learn how they work, or click the counter badges to see live examples in your current puzzle. Use the Scan button to find advanced techniques.',
  },
  shortcuts: {
    title: 'Keyboard Shortcuts',
    body: 'Speed up your solving with keyboard shortcuts. Navigate the grid with arrow keys, enter numbers directly, and use Shift for candidate mode. Press H for hints and A to apply the current step. All shortcuts work seamlessly together for efficient solving.',
  },
};

/** Small informational dialog for the panel section headers. */
export default function PanelInfoModal({ topic, onClose }) {
  // Close on Escape while open
  useEffect(() => {
    if (!topic) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [topic, onClose]);

  const content = topic ? CONTENT[topic] : null;

  return (
    <AnimatePresence>
      {content && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={content.title}
            className="bg-slate-900 rounded-2xl shadow-2xl border border-slate-700 w-full max-w-md p-6"
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                <Info className="w-6 h-6 text-blue-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-white mb-2">{content.title}</h3>
                <p className="text-slate-300 text-sm leading-relaxed">{content.body}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-full py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
            >
              Got it
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
