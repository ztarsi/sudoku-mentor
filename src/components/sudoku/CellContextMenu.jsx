import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Edit3, X } from 'lucide-react';

export default function CellContextMenu({ isOpen, position, onClose, onClear, onToggleCandidateMode, cell }) {
  if (!isOpen || !cell) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            style={{
              position: 'fixed',
              left: position.x,
              top: position.y,
              transform: 'translate(-50%, -100%)',
            }}
            className="bg-slate-800 rounded-xl shadow-2xl border border-slate-700 overflow-hidden z-50 min-w-[200px]"
          >
            <div className="p-2 space-y-1">
              {cell.value === null && (
                <button
                  onClick={() => {
                    onToggleCandidateMode();
                    onClose();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left text-white hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <Edit3 className="w-4 h-4 text-blue-400" />
                  <span>Toggle Candidates</span>
                </button>
              )}
              {(cell.value !== null || cell.candidates?.length > 0) && (
                <button
                  onClick={() => {
                    onClear();
                    onClose();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left text-white hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4 text-red-400" />
                  <span>Clear Cell</span>
                </button>
              )}
              <button
                onClick={onClose}
                className="w-full flex items-center gap-3 px-4 py-3 text-left text-slate-400 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
                <span>Cancel</span>
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}