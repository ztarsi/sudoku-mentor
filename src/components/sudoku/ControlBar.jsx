import React from 'react';
import { motion } from 'framer-motion';
import { 
  Lightbulb, 
  Play, 
  Undo2, 
  Redo2, 
  Trash2,
  Menu
} from 'lucide-react';

export default function ControlBar({ 
  onNextStep, 
  onApplyStep, 
  onUndo, 
  onRedo, 
  onClear,
  onOpenDrawer,
  canUndo,
  canRedo,
  hasStep
}) {
  return (
    <>
      {/* Mobile sticky top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-slate-900/95 backdrop-blur-md border-b border-slate-700 p-2 z-30 flex items-center justify-between gap-2 safe-area-inset-top">
        <div className="flex gap-1">
          <button
            onClick={onNextStep}
            className="p-2.5 bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-lg shadow-lg active:scale-95 transition-transform"
            title="Hint"
          >
            <Lightbulb className="w-5 h-5" />
          </button>
          
          <button
            onClick={onApplyStep}
            disabled={!hasStep}
            className={`
              p-2.5 rounded-lg transition-all
              ${hasStep
                ? 'bg-gradient-to-r from-emerald-400 to-green-500 text-white shadow-lg active:scale-95'
                : 'bg-slate-800 text-slate-600 cursor-not-allowed'
              }
            `}
            title="Apply"
          >
            <Play className="w-5 h-5" />
          </button>
        </div>

        <div className="flex gap-1">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className={`
              p-2.5 rounded-lg transition-all
              ${canUndo
                ? 'bg-slate-800 text-slate-300 active:bg-slate-700'
                : 'bg-slate-800 text-slate-700 cursor-not-allowed'
              }
            `}
            title="Undo"
          >
            <Undo2 className="w-5 h-5" />
          </button>
          
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className={`
              p-2.5 rounded-lg transition-all
              ${canRedo
                ? 'bg-slate-800 text-slate-300 active:bg-slate-700'
                : 'bg-slate-800 text-slate-700 cursor-not-allowed'
              }
            `}
            title="Redo"
          >
            <Redo2 className="w-5 h-5" />
          </button>

          <button
            onClick={onClear}
            className="p-2.5 bg-slate-800 text-red-400 rounded-lg active:bg-red-950 transition-all"
            title="Clear"
          >
            <Trash2 className="w-5 h-5" />
          </button>

          <button
            onClick={onOpenDrawer}
            className="p-2.5 bg-slate-800 text-slate-300 rounded-lg active:bg-slate-700 transition-all"
            title="Logic Panel"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>
    </>
  );
}