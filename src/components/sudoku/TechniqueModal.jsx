import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { TECHNIQUE_DETAILS, needsUniqueness } from './techniqueCatalog';
import { UNIQUENESS_UNKNOWN, uniquenessAllowed, uniquenessShortNote } from './uniqueness';
import { useDialog } from '@/hooks/useDialog';

/**
 * One technique's reference: what it is, how to find it, an example - and
 * one line about the board the player came from.
 *
 * That line is also where a single technique is counted on demand. The
 * panel used to carry a Count button on every row, which is one affordance
 * printed sixty-one times (#122); counting one technique belongs to the one
 * technique, and this is the surface about exactly one.
 */
export default function TechniqueModal({
  technique,
  count,
  noAssistMode = false,
  uniqueness = UNIQUENESS_UNKNOWN,
  onCount,
  onClose,
}) {
  const dialog = useDialog({ open: !!technique, onClose });

  if (!technique) return null;

  const details = TECHNIQUE_DETAILS[technique];
  if (!details) return null;

  const blocked =
    !uniquenessAllowed(uniqueness) && needsUniqueness(technique)
      ? uniquenessShortNote(uniqueness)
      : null;
  const known = typeof count === 'number';
  const boardLine = noAssistMode
    ? 'No Assist is on, so nothing is counted on your board. Reading is not assistance.'
    : blocked
      ? `Not available on this board: ${blocked}.`
      : known && count > 0
        ? `On your board right now: ${count} to find.`
        : known
          ? 'Not on your board right now.'
          : 'Not counted on your board yet.';
  const offerCount = !noAssistMode && !blocked && !known && !!onCount;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          ref={dialog.ref}
          {...dialog.props}
          aria-label={technique}
          className="bg-slate-900 rounded-2xl shadow-2xl border border-slate-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="sticky top-0 bg-slate-900 border-b border-slate-700 p-6 flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-white">{technique}</h2>
            <button
              onClick={onClose}
              aria-label="Close"
              className="p-2 hover:bg-slate-800 rounded-xl transition-colors"
            >
              <X className="w-6 h-6 text-slate-400" />
            </button>
          </div>

          {/* The board this was opened from, in one line */}
          <div className="px-6 pt-5">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-800/60 px-4 py-2.5">
              <p className="text-sm text-slate-300 min-w-0">{boardLine}</p>
              {offerCount && (
                <button
                  onClick={() => onCount(technique)}
                  className="shrink-0 text-xs px-2 py-1 border border-slate-600 text-slate-200 hover:bg-slate-700 rounded transition-colors"
                  title="Count this one on the board as it stands now"
                >
                  Count it
                </button>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Plain-language version first: this is what a beginner needs */}
            {details.plain && (
              <div>
                <h3 className="text-lg font-semibold text-slate-200 mb-2">In plain words</h3>
                <p className="text-slate-200 leading-relaxed text-base">{details.plain}</p>
              </div>
            )}

            {/* Description */}
            <div>
              <h3 className="text-lg font-semibold text-slate-200 mb-2">The formal version</h3>
              <p className="text-slate-300 leading-relaxed">{details.description}</p>
            </div>

            {/* Strategy */}
            <div>
              <h3 className="text-lg font-semibold text-slate-200 mb-2">How to find it</h3>
              <div className="bg-slate-800 rounded-xl p-4">
                <pre className="text-slate-300 whitespace-pre-line font-sans">{details.strategy}</pre>
              </div>
            </div>

            {/* Example */}
            <div>
              <h3 className="text-lg font-semibold text-slate-200 mb-2">Example</h3>
              <div className="bg-blue-950/40 border border-blue-800/50 rounded-xl p-4">
                <p className="text-blue-200">{details.example}</p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-slate-900 border-t border-slate-700 p-4">
            <button
              onClick={onClose}
              className="w-full px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-medium rounded-xl hover:shadow-lg transition-all"
            >
              Got it!
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}