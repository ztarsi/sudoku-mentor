import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Pin, PinOff } from 'lucide-react';

export const SIDE_SHEET_WIDTH = 360;

/**
 * The lesson panel's home when there is no room for a second column
 * (one-adaptive-page spec): a side sheet on medium widths, a bottom sheet
 * when the page is stacked. It is not a dialog: the board stays live, the
 * keyboard shortcuts keep working and nothing is dimmed, because the point
 * is to read the lesson while placing the digit yourself.
 *
 * `pinned` keeps the sheet open once the lesson it opened for is gone.
 * Escape closes an unpinned sheet. A bottom sheet reports its height so
 * the page can keep the hint's cells visible above it.
 */
export default function LessonSheet({
  side = 'right',
  open,
  pinned = false,
  onPinnedChange = null,
  onClose = null,
  topOffset = 0,
  bottomOffset = 0,
  onHeightChange = null,
  children = null,
}) {
  const panelRef = useRef(/** @type {HTMLElement | null} */ (null));

  useEffect(() => {
    if (!open || pinned) return undefined;
    const onKeyDown = (e) => {
      if (e.key !== 'Escape') return;
      // A dialog above the sheet owns Escape.
      if (document.querySelector('[role="dialog"]')) return;
      onClose?.();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, pinned, onClose]);

  // Report the bottom sheet's height (0 when closed) so the page can pad
  // itself and scroll the hint's cells clear of it.
  useEffect(() => {
    if (!onHeightChange) return undefined;
    if (!open) {
      onHeightChange(0);
      return undefined;
    }
    const el = panelRef.current;
    if (!el) return undefined;
    onHeightChange(Math.ceil(el.getBoundingClientRect().height));
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) onHeightChange(Math.ceil(entry.contentRect.height));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [open, onHeightChange]);

  const isBottom = side === 'bottom';
  const motionProps = isBottom
    ? { initial: { y: '100%' }, animate: { y: 0 }, exit: { y: '100%' } }
    : { initial: { x: '100%' }, animate: { x: 0 }, exit: { x: '100%' } };

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          {...motionProps}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          ref={panelRef}
          aria-label="Lesson"
          data-testid="lesson-sheet"
          data-side={side}
          className={`fixed z-40 bg-slate-900 border-slate-700 shadow-2xl shadow-black/60 flex flex-col ${
            isBottom
              ? 'left-0 right-0 rounded-t-2xl border-t max-h-[55vh]'
              : 'right-0 bottom-0 border-l overflow-hidden'
          }`}
          style={
            isBottom
              ? { bottom: bottomOffset }
              : { top: topOffset, width: `min(${SIDE_SHEET_WIDTH}px, 100vw)` }
          }
        >
          <div className="flex items-center justify-between gap-2 px-4 py-2 border-b border-slate-800 shrink-0">
            <h2 className="text-sm font-semibold text-slate-200">Lesson</h2>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onPinnedChange?.(!pinned)}
                aria-pressed={pinned}
                aria-label={pinned ? 'Unpin the lesson' : 'Pin the lesson open'}
                title={pinned ? 'Unpin: closes after each lesson' : 'Pin open'}
                className={`p-2 rounded-lg transition-colors ${
                  pinned ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                {pinned ? <Pin className="w-4 h-4" aria-hidden="true" /> : <PinOff className="w-4 h-4" aria-hidden="true" />}
              </button>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close the lesson"
                className="p-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>
          <div className="p-3 sm:p-4 overflow-y-auto min-h-0">{children}</div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
