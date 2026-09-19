import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Keyboard, X } from 'lucide-react';
import { SHORTCUT_REFERENCE } from '../keyboardShortcuts';
import { useDialog } from '@/hooks/useDialog';

/**
 * The keyboard reference, as a dialog: opened with "?" or from the header
 * (and the menu once it exists). It left the lesson column so the hint
 * card can be first (lesson-first panel spec).
 */
export default function KeyboardShortcutsDialog({ open, onClose }) {
  const dialog = useDialog({ open, onClose });
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
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            ref={dialog.ref}
            {...dialog.props}
            aria-label="Keyboard shortcuts"
            className="bg-slate-900 rounded-2xl shadow-2xl border border-slate-700 w-full max-w-md overflow-hidden"
          >
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center">
                  <Keyboard className="w-5 h-5 text-blue-400" aria-hidden="true" />
                </div>
                <h2 className="text-lg font-semibold text-white">Keyboard shortcuts</h2>
              </div>
              <button onClick={onClose} aria-label="Close" className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <dl className="p-5 space-y-2 max-h-[70vh] overflow-y-auto">
              {SHORTCUT_REFERENCE.map(({ label, keys }) => (
                <div key={label} className="flex justify-between items-center gap-3 text-base">
                  <dt className="text-slate-300">{label}</dt>
                  <dd className="font-mono bg-slate-800 px-2 py-1 rounded text-sm text-slate-200 text-right">{keys}</dd>
                </div>
              ))}
            </dl>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
