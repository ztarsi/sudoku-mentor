import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { TECHNIQUE_DETAILS } from './techniqueCatalog';

export default function TechniqueModal({ technique, onClose }) {
  // Close on Escape
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!technique) return null;
  
  const details = TECHNIQUE_DETAILS[technique];
  if (!details) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          role="dialog"
          aria-modal="true"
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

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Description */}
            <div>
              <h3 className="text-lg font-semibold text-slate-200 mb-2">What is it?</h3>
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