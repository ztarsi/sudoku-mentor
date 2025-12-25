import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Lightbulb, 
  Target, 
  Zap, 
  BookOpen,
  ChevronRight,
  Info
} from 'lucide-react';

const TECHNIQUE_INFO = {
  'Naked Single': {
    level: 'Basic',
    color: 'emerald',
    description: 'A cell has only one possible candidate remaining.',
    icon: Target
  },
  'Hidden Single': {
    level: 'Basic',
    color: 'emerald',
    description: 'A candidate appears only once in a row, column, or box.',
    icon: Target
  },
  'Pointing Pair': {
    level: 'Intermediate',
    color: 'blue',
    description: 'Candidates in a box align in a row/column, eliminating candidates outside the box.',
    icon: Zap
  },
  'Pointing Triple': {
    level: 'Intermediate',
    color: 'blue',
    description: 'Three candidates in a box align in a row/column.',
    icon: Zap
  },
  'Claiming': {
    level: 'Intermediate',
    color: 'blue',
    description: 'Candidates in a row/column are confined to one box.',
    icon: Zap
  },
  'Naked Pair': {
    level: 'Advanced',
    color: 'purple',
    description: 'Two cells in a unit have the same two candidates.',
    icon: BookOpen
  },
  'Hidden Pair': {
    level: 'Advanced',
    color: 'purple',
    description: 'Two candidates appear only in two cells of a unit.',
    icon: BookOpen
  },
  'Naked Triple': {
    level: 'Advanced',
    color: 'purple',
    description: 'Three cells share three candidates between them.',
    icon: BookOpen
  },
  'X-Wing': {
    level: 'Expert',
    color: 'orange',
    description: 'A candidate forms a rectangle pattern, allowing eliminations.',
    icon: Lightbulb
  },
  'Swordfish': {
    level: 'Expert',
    color: 'orange',
    description: 'An X-Wing extended to three rows and columns.',
    icon: Lightbulb
  },
  'XY-Wing': {
    level: 'Expert',
    color: 'orange',
    description: 'Three bi-value cells form a chain for eliminations.',
    icon: Lightbulb
  }
};

export default function LogicPanel({ currentStep, focusedDigit, grid }) {
  const techniqueInfo = currentStep ? TECHNIQUE_INFO[currentStep.technique] : null;
  const LevelIcon = techniqueInfo?.icon || Info;

  const levelColors = {
    emerald: 'from-emerald-400 to-green-500',
    blue: 'from-blue-400 to-indigo-500',
    purple: 'from-purple-400 to-violet-500',
    orange: 'from-orange-400 to-red-500'
  };

  return (
    <div className="space-y-4">
      {/* Current Hint Card */}
      <motion.div 
        layout
        className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 overflow-hidden"
      >
        <div className="p-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className={`
              w-10 h-10 rounded-xl flex items-center justify-center
              ${currentStep 
                ? `bg-gradient-to-br ${levelColors[techniqueInfo?.color || 'emerald']} shadow-lg` 
                : 'bg-slate-100'
              }
            `}>
              <Lightbulb className={`w-5 h-5 ${currentStep ? 'text-white' : 'text-slate-400'}`} />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">
                {currentStep ? 'Technique Found!' : 'Ready for a Hint?'}
              </h3>
              <p className="text-sm text-slate-500">
                {currentStep ? techniqueInfo?.level : 'Click "Hint" to analyze the board'}
              </p>
            </div>
          </div>
        </div>
        
        <AnimatePresence mode="wait">
          {currentStep ? (
            <motion.div
              key="step"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="p-5 space-y-4"
            >
              {/* Technique Name */}
              <div className="flex items-center gap-2">
                <span className={`
                  px-3 py-1 rounded-full text-sm font-medium
                  bg-gradient-to-r ${levelColors[techniqueInfo?.color || 'emerald']} text-white
                `}>
                  {currentStep.technique}
                </span>
                {currentStep.digit && (
                  <span className="px-2 py-1 bg-slate-100 rounded-lg text-sm font-medium text-slate-600">
                    Digit: {currentStep.digit}
                  </span>
                )}
              </div>
              
              {/* Explanation */}
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-slate-700 leading-relaxed">
                  {currentStep.explanation}
                </p>
              </div>
              
              {/* Action Summary */}
              {currentStep.eliminations && currentStep.eliminations.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-600">Eliminations:</p>
                  <div className="flex flex-wrap gap-2">
                    {currentStep.eliminations.slice(0, 6).map((elim, idx) => (
                      <span 
                        key={idx}
                        className="px-2 py-1 bg-red-50 text-red-600 text-sm rounded-lg"
                      >
                        R{Math.floor(elim.cell / 9) + 1}C{(elim.cell % 9) + 1}: -{elim.digit}
                      </span>
                    ))}
                    {currentStep.eliminations.length > 6 && (
                      <span className="px-2 py-1 bg-slate-100 text-slate-500 text-sm rounded-lg">
                        +{currentStep.eliminations.length - 6} more
                      </span>
                    )}
                  </div>
                </div>
              )}
              
              {currentStep.placement && (
                <div className="flex items-center gap-2 text-emerald-600">
                  <ChevronRight className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    Place {currentStep.placement.digit} at R{Math.floor(currentStep.placement.cell / 9) + 1}C{(currentStep.placement.cell % 9) + 1}
                  </span>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-5 text-center"
            >
              <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-slate-100 flex items-center justify-center">
                <Info className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-500 text-sm">
                {focusedDigit 
                  ? `Filtering for digit ${focusedDigit}. Click Hint to find patterns.`
                  : 'Load a puzzle and click Hint to get started.'
                }
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      
      {/* Technique Reference */}
      <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 p-5">
        <h4 className="font-semibold text-slate-800 mb-4">Technique Hierarchy</h4>
        <div className="space-y-3">
          {[
            { level: 'Basic', techniques: ['Naked Single', 'Hidden Single'], color: 'emerald' },
            { level: 'Intermediate', techniques: ['Pointing', 'Claiming'], color: 'blue' },
            { level: 'Advanced', techniques: ['Naked Pairs/Triples', 'Hidden Pairs'], color: 'purple' },
            { level: 'Expert', techniques: ['X-Wing', 'Swordfish', 'XY-Wing'], color: 'orange' },
          ].map((tier) => (
            <div key={tier.level} className="flex items-start gap-3">
              <div className={`w-2 h-2 mt-2 rounded-full bg-gradient-to-br ${levelColors[tier.color]}`}></div>
              <div>
                <p className="text-sm font-medium text-slate-700">{tier.level}</p>
                <p className="text-xs text-slate-500">{tier.techniques.join(', ')}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Keyboard Shortcuts */}
      <div className="bg-slate-800 rounded-2xl p-5 text-white">
        <h4 className="font-semibold mb-3 flex items-center gap-2">
          <span className="text-xs px-2 py-0.5 bg-slate-700 rounded">Tips</span>
          Keyboard Shortcuts
        </h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-400">Focus digit</span>
            <span className="font-mono bg-slate-700 px-2 py-0.5 rounded">Shift + 1-9</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Enter number</span>
            <span className="font-mono bg-slate-700 px-2 py-0.5 rounded">1-9</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Clear cell</span>
            <span className="font-mono bg-slate-700 px-2 py-0.5 rounded">Delete</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Clear focus</span>
            <span className="font-mono bg-slate-700 px-2 py-0.5 rounded">Esc</span>
          </div>
        </div>
      </div>
    </div>
  );
}