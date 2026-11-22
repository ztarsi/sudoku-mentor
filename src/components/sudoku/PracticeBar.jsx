import React from 'react';
import { Target, Eye, ChevronRight, X, Check } from 'lucide-react';
import { foundLine } from './practice';

/**
 * The line above the board while a player practises a technique (#139):
 * what to find, which position of how many, and the three ways on. When
 * the player has carried the technique out, it says so, and that is
 * announced.
 */
export default function PracticeBar({ technique, line, position, total, found, onShow, onNext, onStop }) {
  return (
    <div
      className={`rounded-2xl border px-4 py-3 ${
        found ? 'border-emerald-600/60 bg-emerald-950/40' : 'border-violet-600/50 bg-violet-950/40'
      }`}
      data-testid="practice-bar"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex items-start gap-2">
          {found ? (
            <Check className="w-5 h-5 mt-0.5 shrink-0 text-emerald-300" aria-hidden="true" />
          ) : (
            <Target className="w-5 h-5 mt-0.5 shrink-0 text-violet-300" aria-hidden="true" />
          )}
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Practice · position {position} of {total}
            </p>
            <p className="text-sm text-slate-100" role="status" aria-live="polite">
              {found ? foundLine(technique) : line}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          {!found && (
            <button
              type="button"
              onClick={onShow}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-600 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800"
            >
              <Eye className="w-4 h-4" aria-hidden="true" /> Show me
            </button>
          )}
          {position < total && (
            <button
              type="button"
              onClick={onNext}
              className="inline-flex items-center gap-1 rounded-lg bg-violet-600 px-3 py-1.5 text-sm text-white hover:bg-violet-500"
            >
              Next position <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
          <button
            type="button"
            onClick={onStop}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-600 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800"
          >
            <X className="w-4 h-4" aria-hidden="true" /> Stop
          </button>
        </div>
      </div>
    </div>
  );
}
