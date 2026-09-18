import React from 'react';
import { Lightbulb, Play, Undo2, Redo2, Trash2, PanelRight } from 'lucide-react';

const ActionButton = ({ onClick, disabled = false, label, icon: Icon, tone = 'neutral' }) => {
  const tones = {
    neutral: 'text-slate-300 active:bg-slate-800',
    primary: 'text-amber-300 active:bg-slate-800',
    success: 'text-emerald-300 active:bg-slate-800',
    danger: 'text-red-400 active:bg-slate-800',
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`
        flex flex-col items-center justify-center gap-0.5 min-w-[56px] h-14 rounded-xl
        transition-colors
        ${disabled ? 'text-slate-600 cursor-not-allowed' : tones[tone]}
      `}
    >
      <Icon className="w-5 h-5" />
      <span className="text-[11px] leading-none">{label}</span>
    </button>
  );
};

/**
 * Compact action bar for narrow layouts (below lg). It sits at the bottom
 * of the viewport - thumb reach on tablets/phones, and clear of the sticky
 * header, which previously covered it entirely.
 */
export default function ControlBar({
  onNextStep,
  onApplyStep,
  onUndo,
  onRedo,
  onClear,
  onOpenDrawer,
  canUndo,
  canRedo,
  hasStep,
  hintsDisabled = false,
}) {
  return (
    <nav
      aria-label="Puzzle actions"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-700"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center justify-around px-2 py-1">
        <ActionButton onClick={onNextStep} disabled={hintsDisabled} label="Hint" icon={Lightbulb} tone="primary" />
        <ActionButton onClick={onApplyStep} disabled={!hasStep || hintsDisabled} label="Apply" icon={Play} tone="success" />
        <ActionButton onClick={onUndo} disabled={!canUndo} label="Undo" icon={Undo2} />
        <ActionButton onClick={onRedo} disabled={!canRedo} label="Redo" icon={Redo2} />
        <ActionButton onClick={onClear} label="Clear" icon={Trash2} tone="danger" />
        <ActionButton onClick={onOpenDrawer} label="Logic" icon={PanelRight} />
      </div>
    </nav>
  );
}
