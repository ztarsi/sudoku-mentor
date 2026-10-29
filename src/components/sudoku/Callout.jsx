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
      {/* The dismiss measured 22x22, under the 24x24 that WCAG 2.2 AA asks
          for, and it sits over the board: a thumb that misses it places a
          digit (issues #109, #107).

          The button itself is 44x44 now. It was a 22x22 button with an
          invisible 44x44 pseudo-element over it, which did take the taps -
          a click 21px out from the glyph dismissed the callout on the
          deployed build - but every way of measuring a target, an audit
          tool and a person with a ruler alike, reads the element's box and
          saw 22x22. A target that cannot be measured gets reported again,
          so it is the box that is 44x44.

          The negative margin keeps the callout the size it was: the box
          grows outwards from the glyph, 11px on each side, without taking
          any more room in the row. The glyph stays 14px and the hover and
          focus marks stay on the 22x22 chip, so nothing here looks
          different; only the part that answers a thumb is bigger. The box
          carries no rounding of its own, because a rounded corner does not
          answer a tap: with one, two of the nine probes on the 44x44 square
          missed. It does not shrink either - in the narrow callout on the
          hint card the row squeezed it to 42px wide, and a target that is
          44 only where there is room is not 44. */}
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Got it"
        title="Got it"
        className="group -m-[11px] h-11 w-11 shrink-0 flex items-center justify-center focus:outline-none text-amber-200/80 hover:text-amber-50 transition-colors"
      >
        <span className="p-1 rounded-lg transition-colors group-hover:bg-amber-900/60 group-focus-visible:ring-2 group-focus-visible:ring-amber-300">
          <X className="w-3.5 h-3.5" aria-hidden="true" />
        </span>
      </button>
      <span
        aria-hidden="true"
        className={`absolute w-0 h-0 border-x-8 border-x-transparent ${arrow === 'down' ? 'border-t-8' : 'border-b-8'} ${arrowClass}`}
      />
    </motion.div>
  );
}
