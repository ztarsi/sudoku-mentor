import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Info, ChevronDown, ChevronUp } from 'lucide-react';
import { SHORTCUT_REFERENCE } from '../keyboardShortcuts';

const SHORTCUTS = SHORTCUT_REFERENCE;

/** Collapsible keyboard-shortcut reference. */
export default function KeyboardShortcutsCard({ onShowInfo }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-slate-900 rounded-2xl text-white border border-slate-700 overflow-hidden">
      <div className="flex items-center hover:bg-slate-800/50 transition-colors">
        <button
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
          className="flex-1 min-w-0 p-5 pr-2 flex items-center justify-between gap-2 text-left"
        >
          <h4 className="text-lg font-semibold">Keyboard Shortcuts</h4>
          {expanded ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </button>
        <button
          onClick={onShowInfo}
          className="p-2 mr-3 hover:bg-slate-700 rounded-lg transition-colors"
          title="Learn more"
          aria-label="About keyboard shortcuts"
        >
          <Info className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-2 text-base border-t border-slate-800">
              {SHORTCUTS.map(({ label, keys }, idx) => (
                <div key={label} className={`flex justify-between items-center gap-3 ${idx === 0 ? 'pt-3' : ''}`}>
                  <span className="text-slate-300">{label}</span>
                  <span className="font-mono bg-slate-700 px-2 py-1 rounded text-sm text-right">{keys}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
