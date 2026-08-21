import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Info, ChevronDown, ChevronUp } from 'lucide-react';

const SHORTCUTS = [
  { label: 'Navigate cells', keys: 'Arrow Keys' },
  { label: 'Enter number', keys: '1-9' },
  { label: 'Toggle candidate', keys: 'Shift + 1-9' },
  { label: 'Focus digit', keys: 'Ctrl/Cmd + 1-9' },
  { label: 'Hint', keys: 'H' },
  { label: 'Apply step', keys: 'A' },
  { label: 'Undo', keys: 'Z' },
  { label: 'Redo', keys: 'Shift + Z' },
  { label: 'Clear cell', keys: 'Delete / Backspace' },
  { label: 'Clear grid', keys: 'C' },
  { label: 'Clear focus', keys: 'Esc' },
];

/** Collapsible keyboard-shortcut reference. */
export default function KeyboardShortcutsCard({ onShowInfo }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-slate-900 rounded-2xl text-white border border-slate-700 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        className="w-full p-5 flex items-center justify-between hover:bg-slate-800/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <h4 className="text-lg font-semibold">Keyboard Shortcuts</h4>
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              onShowInfo();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.stopPropagation();
                onShowInfo();
              }
            }}
            className="p-1 hover:bg-slate-700 rounded-lg transition-colors"
            title="Learn more"
            aria-label="About keyboard shortcuts"
          >
            <Info className="w-4 h-4 text-slate-400" />
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="w-5 h-5 text-slate-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-slate-400" />
        )}
      </button>

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
                <div key={label} className={`flex justify-between ${idx === 0 ? 'pt-3' : ''}`}>
                  <span className="text-slate-300">{label}</span>
                  <span className="font-mono bg-slate-700 px-2 py-1 rounded text-sm">{keys}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
