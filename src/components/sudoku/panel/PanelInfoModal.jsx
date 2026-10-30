import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Info } from 'lucide-react';
import { useDialog } from '@/hooks/useDialog';

const CONTENT = {
  techniques: {
    title: 'Techniques',
    body: 'What applies to the board in front of you comes first, with how many of each there are; tap a count to see them. Below that is the ladder, by tier, closed until you open one: a tier shows what is on your board, then one line for everything else, because a list of what is not there is not worth your column. Counting works up the ladder and stops at the first tier with something on it: on a board that still has singles, a count of anything harder is mostly patterns the single is about to destroy. A tier held back that way says so, and will count itself if you ask. Tap that line, or Browse, to read the whole reference, where every technique is set out in columns; tap any name anywhere to read how it works, whether or not it applies right now. The tiers that cost too much to count while you play have a Scan button instead. A few techniques work only because a puzzle has exactly one answer; on a grid that has more than one they cannot be counted, and the tier says so.',
  },
};

/** Small informational dialog for the panel section headers. */
export default function PanelInfoModal({ topic, onClose }) {
  const content = topic ? CONTENT[topic] : null;
  const dialog = useDialog({ open: !!content, onClose });

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
            ref={dialog.ref}
            {...dialog.props}
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
