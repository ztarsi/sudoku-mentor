import React from 'react';
import { Pencil, Undo2, Redo2, Eraser, Lightbulb, Loader2, Eye, EyeOff } from 'lucide-react';
import { cellName } from './gridUnits';
import Callout from './Callout';

/**
 * The one input strip under the board, on every width (digit-strip spec).
 *
 * Nine digit buttons with placed counts; a digit greys out when all nine
 * are in. Tapping a digit arms it (digit-first: the next cell taps place
 * it) and, when a cell is already selected, places it there at once
 * (cell-first). A pencil toggle switches the strip between placing digits
 * and toggling pencil marks. Undo, Redo and Erase are labelled buttons.
 * A refused entry is named for a moment ("4 can't go in R2C1").
 *
 * The strip is layout-neutral: the page decides whether it sits in a card
 * (desktop) or a fixed bar (touch). `touch` enlarges every target to at
 * least 44px tall. When the lesson lives in a sheet rather than a column,
 * the page passes `hint` and the strip carries the Hint button too
 * (one-adaptive-page spec): `{ onClick, disabled, searching, onCancel,
 * prompt? }`; `prompt` is the first visit's "Stuck?" callout, floated
 * above the button (inline-onboarding spec).
 * Showing or hiding pencil marks lives next to Pencil (header-and-menu
 * spec) when the page passes `marksVisible` and `onMarksVisibleChange`.
 */
export default function DigitStrip({
  grid,
  focusedDigit,
  onDigitSelect,
  pencilMode,
  onPencilModeChange,
  onUndo,
  onRedo,
  onErase,
  canUndo = false,
  canRedo = false,
  canErase = false,
  rejected = null,
  touch = false,
  hint = null,
  marksVisible = null,
  onMarksVisibleChange = null,
}) {
  const counts = {};
  for (let d = 1; d <= 9; d++) counts[d] = 0;
  for (const cell of grid) if (cell.value) counts[cell.value] = (counts[cell.value] || 0) + 1;

  const digitSize = touch ? 'min-h-[44px] text-lg' : 'h-11 text-base';
  const controlSize = touch ? 'min-h-[44px]' : 'h-10';
  const refusal = rejected
    ? `${rejected.digit} can't go in ${cellName(rejected.cellIndex)}`
    : '';

  return (
    <div className="space-y-1.5" data-testid="digit-strip">
      {/* The refusal line has a fixed height so the strip never jumps. */}
      <p role="status" aria-live="polite" className="h-5 text-sm text-red-300 text-center leading-5">
        {refusal}
      </p>

      <div role="group" aria-label="Digits" className="flex gap-0.5 sm:gap-1">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => {
          const count = counts[digit];
          const complete = count >= 9;
          const selected = focusedDigit === digit;
          // A completed digit is done in solve mode, but still a pencil mark.
          const disabled = complete && !pencilMode && !selected;
          return (
            <button
              key={digit}
              type="button"
              onClick={() => onDigitSelect(digit)}
              disabled={disabled}
              aria-pressed={selected}
              aria-label={`Digit ${digit}, ${count} placed${complete ? ', complete' : ''}`}
              className={`relative flex-1 min-w-0 rounded-lg font-semibold transition-colors ${digitSize} ${
                disabled
                  ? 'bg-emerald-900/30 text-emerald-700 cursor-not-allowed'
                  : selected
                  ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/30'
                  : 'bg-slate-800 text-slate-200 hover:bg-slate-700 active:bg-slate-700'
              }`}
            >
              {digit}
              <span
                aria-hidden="true"
                className={`absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full text-[10px] font-medium flex items-center justify-center ${
                  complete ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-300'
                }`}
              >
                {complete ? '✓' : count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex gap-1 sm:gap-2">
        {hint && (hint.searching ? (
          <button
            type="button"
            onClick={hint.onCancel}
            aria-label="Cancel the hint search"
            className={`flex-1 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 transition-colors bg-amber-900/40 text-amber-200 ${controlSize}`}
          >
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            Cancel
          </button>
        ) : (
          <div className="relative flex-1 flex">
            {hint.prompt && (
              <div className="absolute bottom-full left-0 mb-2 z-10 whitespace-nowrap">
                <Callout arrow="down" onDismiss={hint.prompt.onDismiss} testId="prompt-hint">{hint.prompt.text}</Callout>
              </div>
            )}
            <button
              type="button"
              onClick={hint.onClick}
              disabled={!!hint.disabled}
              aria-label="Get a hint"
              className={`flex-1 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 transition-colors ${controlSize} ${
                hint.disabled
                  ? 'bg-slate-800/60 text-slate-600 cursor-not-allowed'
                  : 'bg-amber-500/90 text-black hover:bg-amber-400'
              }`}
            >
              <Lightbulb className="w-4 h-4" aria-hidden="true" />
              Hint
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => onPencilModeChange(!pencilMode)}
          aria-pressed={pencilMode}
          className={`flex-1 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 transition-colors ${controlSize} ${
            pencilMode ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          <Pencil className="w-4 h-4" aria-hidden="true" />
          Pencil
        </button>
        {marksVisible !== null && onMarksVisibleChange && (
          <button
            type="button"
            onClick={() => onMarksVisibleChange(!marksVisible)}
            aria-pressed={marksVisible}
            aria-label={marksVisible ? 'Hide pencil marks' : 'Show pencil marks'}
            title={marksVisible ? 'Hide pencil marks' : 'Show pencil marks'}
            className={`flex-1 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 transition-colors ${controlSize} ${
              marksVisible ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
            }`}
          >
            {marksVisible ? <Eye className="w-4 h-4" aria-hidden="true" /> : <EyeOff className="w-4 h-4" aria-hidden="true" />}
            Marks
          </button>
        )}
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          className={`flex-1 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 transition-colors ${controlSize} ${
            canUndo ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-800/60 text-slate-600 cursor-not-allowed'
          }`}
        >
          <Undo2 className="w-4 h-4" aria-hidden="true" />
          Undo
        </button>
        <button
          type="button"
          onClick={onRedo}
          disabled={!canRedo}
          className={`flex-1 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 transition-colors ${controlSize} ${
            canRedo ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-800/60 text-slate-600 cursor-not-allowed'
          }`}
        >
          <Redo2 className="w-4 h-4" aria-hidden="true" />
          Redo
        </button>
        <button
          type="button"
          onClick={onErase}
          disabled={!canErase}
          className={`flex-1 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 transition-colors ${controlSize} ${
            canErase ? 'bg-slate-800 text-red-300 hover:bg-red-950' : 'bg-slate-800/60 text-slate-600 cursor-not-allowed'
          }`}
        >
          <Eraser className="w-4 h-4" aria-hidden="true" />
          Erase
        </button>
      </div>
    </div>
  );
}
