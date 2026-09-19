import React from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';

/**
 * A small in-context prompt anchored to a control (inline-onboarding
 * spec). It sits next to the thing it names, never over it, and goes away
 * when the player does the thing or taps it away. `arrow` says which edge
 * points at the anchor.
 */
export default function Callout({ children, onDismiss, arrow = 'down', className = '', testId = 'callout' }) {
  const arrowClass = {
    down: 'top-full left-6 border-t-amber-500/60',
    up: 'bottom-full left-6 border-b-amber-500/60',
    none: 'hidden',
  }[arrow] || 'hidden';
  return (
    <motion.div
      initial={{ opacity: 0, y: arrow === 'up' ? 6 : -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      role="note"
      data-testid={testId}
      className={`relative inline-flex items-center gap-2 rounded-xl border border-amber-500/60 bg-amber-950/70 text-amber-100 text-sm font-medium pl-3 pr-1.5 py-1.5 shadow-lg shadow-black/30 backdrop-blur-sm ${className}`}
    >
      <span>{children}</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Got it"
        title="Got it"
        className="p-1 rounded-lg text-amber-200/80 hover:text-amber-50 hover:bg-amber-900/60 transition-colors"
      >
        <X className="w-3.5 h-3.5" aria-hidden="true" />
      </button>
      <span
        aria-hidden="true"
        className={`absolute w-0 h-0 border-x-8 border-x-transparent ${arrow === 'down' ? 'border-t-8' : 'border-b-8'} ${arrowClass}`}
      />
    </motion.div>
  );
}
