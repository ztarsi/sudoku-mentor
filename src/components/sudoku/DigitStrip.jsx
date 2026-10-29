import React from 'react';
import { Pencil, Undo2, Redo2, Eraser, Lightbulb, Loader2, Eye, EyeOff } from 'lucide-react';
import { cellName } from './gridUnits';
import Callout from './Callout';

/**
 * The one input strip under the board, on every width (digit-strip spec).
 *
 * Nine digit buttons, each with how many of that digit are still to
 * place; a digit greys out, and its count becomes a tick, when all nine
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
 * `inline` lays the digits and the controls side by side where there is
 * room (the wide arrangement), so the strip takes one row and the board
 * keeps its height (issue #55).
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
  inline = false,
}) {
  const counts = {};
  for (let d = 1; d <= 9; d++) counts[d] = 0;
  for (const cell of grid) if (cell.value) counts[cell.value] = (counts[cell.value] || 0) + 1;

  const digitSize = touch ? 'min-h-[44px] text-lg' : 'h-11 text-base';
  // Nine 44px-wide keys need 396px before a single gutter, and a 390px
  // phone leaves the strip about 374px, so the keys cannot be 44 square
  // there; the height is (digit-strip spec). What a thumb then trips over
  // is the gutter: at 2px, a touch landing a pixel the wrong side of a
  // boundary placed the neighbouring digit. At 6px it places nothing, and
  // a digit that was not placed is a far better answer than a wrong one,
  // which costs an error and a red flash. The 3.6px per key this spends is
  // the cheaper side of that trade (issue #107).
  const digitGap = touch ? 'gap-1.5' : 'gap-0.5 sm:gap-1';
  const controlSize = touch ? 'min-h-[44px]' : 'h-10';
  const refusal = rejected
    ? `${rejected.digit} can't go in ${cellName(rejected.cellIndex)}`
    : '';

  return (
    <div className="space-y-1.5" data-testid="digit-strip" data-inline={inline || undefined}>
      {/* The refusal line has a fixed height so the strip never jumps. */}
      <p role="status" aria-live="polite" className="h-5 text-sm text-red-300 text-center leading-5">
        {refusal}
      </p>

      <div className={inline ? 'flex flex-wrap items-stretch gap-2' : 'space-y-1.5'}>
      <div role="group" aria-label="Digits" className={`flex ${digitGap} ${inline ? 'flex-[4] min-w-[340px]' : ''}`}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => {
          const count = counts[digit];
          const complete = count >= 9;
          // The number on the key is how many of that digit are left to
          // place. It was how many were placed, which nothing said, and on
          // a phone the first key read "1 0" - which could mean either
          // (issue #107). Counting down teaches itself: the number falls as
          // the player places that digit and turns into a tick at the same
          // moment the key greys out, so the badge and the greying say one
          // thing. A "0" that means two different things never appears.
          const left = 9 - count;
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
              aria-label={complete ? `Digit ${digit}, all nine placed` : `Digit ${digit}, ${left} still to place`}
              title={complete ? `All nine ${digit}s are placed` : `${left} of the nine ${digit}s still to place`}
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
                {complete ? '✓' : left}
              </span>
            </button>
          );
        })}
      </div>

      <div className={`flex gap-1 sm:gap-2 ${inline ? 'flex-[3] min-w-[364px]' : ''}`}>
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
              data-hint-control
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
        {/* One strip with the same controls at every width: Shift+digit is
            a shortcut with no affordance, so the button is the only way a
            player with a mouse can place a pencil mark. */}
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
    </div>
  );
}
