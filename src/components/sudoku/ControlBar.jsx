import React from 'react';
import { motion } from 'framer-motion';
import { 
  Lightbulb, 
  Play, 
  Undo2, 
  Redo2, 
  Trash2,
  Sparkles
} from 'lucide-react';

export default function ControlBar({ 
  onNextStep, 
  onApplyStep, 
  onUndo, 
  onRedo, 
  onClear,
  canUndo,
  canRedo,
  hasStep
}) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      {/* Primary Actions */}
      <div className="flex items-center gap-2 bg-slate-900 rounded-2xl shadow-lg shadow-black/50 p-2 border border-slate-700">
        <motion.button
          onClick={onNextStep}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-400 to-orange-500 text-white font-medium rounded-xl shadow-lg shadow-amber-500/25 hover:shadow-xl hover:shadow-amber-500/30 transition-all duration-300 text-base"
        >
          <Lightbulb className="w-5 h-5" />
          <span className="hidden sm:inline">Hint</span>
        </motion.button>
        
        <motion.button
          onClick={onApplyStep}
          disabled={!hasStep}
          whileHover={{ scale: hasStep ? 1.05 : 1 }}
          whileTap={{ scale: hasStep ? 0.95 : 1 }}
          className={`
            flex items-center gap-2 px-4 py-2.5 font-medium rounded-xl transition-all duration-300 text-base
            ${hasStep 
              ? 'bg-gradient-to-r from-emerald-400 to-green-500 text-white shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/30' 
              : 'bg-slate-800 text-slate-600 cursor-not-allowed'
            }
          `}
        >
          <Play className="w-5 h-5" />
          <span className="hidden sm:inline">Apply</span>
        </motion.button>
      </div>
      
      {/* History Controls */}
      <div className="flex items-center gap-1 bg-slate-900 rounded-2xl shadow-lg shadow-black/50 p-2 border border-slate-700">
        <motion.button
          onClick={onUndo}
          disabled={!canUndo}
          whileHover={{ scale: canUndo ? 1.1 : 1 }}
          whileTap={{ scale: canUndo ? 0.9 : 1 }}
          className={`
            p-2.5 rounded-xl transition-all duration-200
            ${canUndo 
              ? 'text-slate-300 hover:bg-slate-800' 
              : 'text-slate-700 cursor-not-allowed'
            }
          `}
        >
          <Undo2 className="w-6 h-6" />
        </motion.button>
        
        <motion.button
          onClick={onRedo}
          disabled={!canRedo}
          whileHover={{ scale: canRedo ? 1.1 : 1 }}
          whileTap={{ scale: canRedo ? 0.9 : 1 }}
          className={`
            p-2.5 rounded-xl transition-all duration-200
            ${canRedo 
              ? 'text-slate-300 hover:bg-slate-800' 
              : 'text-slate-700 cursor-not-allowed'
            }
          `}
        >
          <Redo2 className="w-6 h-6" />
        </motion.button>
      </div>
      
      {/* Danger Zone */}
      <motion.button
        onClick={onClear}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="p-2.5 bg-slate-900 rounded-2xl shadow-lg shadow-black/50 border border-slate-700 text-slate-400 hover:text-red-400 hover:bg-red-950/40 transition-all duration-200"
      >
        <Trash2 className="w-6 h-6" />
      </motion.button>
    </div>
  );
}