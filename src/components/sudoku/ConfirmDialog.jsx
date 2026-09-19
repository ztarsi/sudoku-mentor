import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDialog } from '@/hooks/useDialog';

/**
 * A small in-app confirmation for actions that throw work away (clearing
 * the board). It uses the shared dialog behaviour: Escape cancels, focus is
 * trapped, and focus returns to the control that opened it.
 */
export default function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}) {
  const dialog = useDialog({ open, onClose: onCancel, initialFocus: '[data-confirm-cancel]' });
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
          onClick={onCancel}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            ref={dialog.ref}
            {...dialog.props}
            aria-label={title}
            className="bg-slate-900 rounded-2xl shadow-2xl border border-slate-700 w-full max-w-sm overflow-hidden"
          >
            <div className="p-5 space-y-2">
              <h2 className="text-lg font-semibold text-white">{title}</h2>
              {body && <p className="text-sm text-slate-300 leading-relaxed">{body}</p>}
            </div>
            <div className="px-5 pb-5 flex gap-3">
              <button
                type="button"
                data-confirm-cancel
                onClick={onCancel}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
