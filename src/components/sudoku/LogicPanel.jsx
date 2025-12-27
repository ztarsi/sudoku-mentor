import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Lightbulb, 
  Target, 
  Zap, 
  BookOpen,
  ChevronRight,
  Info,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import TechniqueModal from './TechniqueModal';
import { findAllTechniqueInstances } from './logicEngine';

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
  },
  'X-Cycle': {
    level: 'Ultimate',
    color: 'violet',
    description: 'Chain-based coloring technique using strong links.',
    icon: Lightbulb
  },
  'Finned X-Wing': {
    level: 'Ultimate',
    color: 'violet',
    description: 'X-Wing pattern with additional fin cells.',
    icon: Lightbulb
  },
  'ALS-XZ': {
    level: 'Ultimate',
    color: 'violet',
    description: 'Almost Locked Sets with restricted common digits.',
    icon: Lightbulb
  },
  'Unique Rectangle Type 1': {
    level: 'Ultimate',
    color: 'violet',
    description: 'Avoids deadly patterns with multiple solutions.',
    icon: Lightbulb
  },
  'BUG+1': {
    level: 'Ultimate',
    color: 'violet',
    description: 'Bivalue Universal Grave plus one tri-value cell.',
    icon: Lightbulb
  }
};

export default function LogicPanel({ currentStep, focusedDigit, grid, onHighlightTechnique }) {
  const [selectedTechnique, setSelectedTechnique] = useState(null);
  const [shortcutsExpanded, setShortcutsExpanded] = useState(true);
  const [techniqueIndices, setTechniqueIndices] = useState({});
  
  const techniqueInfo = currentStep ? TECHNIQUE_INFO[currentStep.technique] : null;
  const LevelIcon = techniqueInfo?.icon || Info;
  
  // Count occurrences of each technique
  const techniqueCounts = useMemo(() => {
    const counts = {};
    const techniques = [
      'Naked Single', 'Hidden Single',
      'Pointing Pair', 'Pointing Triple', 'Claiming',
      'Naked Pair', 'Hidden Pair', 'Naked Triple',
      'X-Wing', 'Swordfish', 'XY-Wing'
    ];
    
    techniques.forEach(tech => {
      const instances = findAllTechniqueInstances(grid, tech);
      counts[tech] = instances.length;
    });
    
    return counts;
  }, [grid]);
  
  const handleTechniqueClick = (techniqueName) => {
    const instances = findAllTechniqueInstances(grid, techniqueName);
    if (instances.length > 0 && onHighlightTechnique) {
      // Get current index for this technique (or start at 0), ensure it's valid
      let currentIndex = techniqueIndices[techniqueName] || 0;
      if (currentIndex >= instances.length) {
        currentIndex = 0;
      }
      const nextIndex = (currentIndex + 1) % instances.length;
      
      // Update the index for next click
      setTechniqueIndices(prev => ({
        ...prev,
        [techniqueName]: nextIndex
      }));
      
      // Show only the current instance
      onHighlightTechnique([instances[currentIndex]], instances.length, currentIndex + 1);
    }
  };

  const levelColors = {
    emerald: 'from-emerald-400 to-green-500',
    blue: 'from-blue-400 to-indigo-500',
    purple: 'from-purple-400 to-violet-500',
    orange: 'from-orange-400 to-red-500',
    violet: 'from-indigo-600 to-violet-800'
  };

  return (
    <div className="space-y-4">
      {/* Current Hint Card */}
      <motion.div 
        layout
        className="bg-slate-900 rounded-2xl shadow-lg shadow-black/50 overflow-hidden border border-slate-700"
      >
        <div className="p-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className={`
              w-10 h-10 rounded-xl flex items-center justify-center
              ${currentStep 
                ? `bg-gradient-to-br ${levelColors[techniqueInfo?.color || 'emerald']} shadow-lg` 
                : 'bg-slate-800'
              }
            `}>
              <Lightbulb className={`w-6 h-6 ${currentStep ? 'text-white' : 'text-slate-500'}`} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">
                {currentStep ? 'Technique Found!' : 'Ready for a Hint?'}
              </h3>
              <p className="text-base text-slate-400">
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
                <button
                  onClick={() => setSelectedTechnique(currentStep.technique)}
                  className={`
                    px-3 py-1 rounded-full text-base font-medium
                    bg-gradient-to-r ${levelColors[techniqueInfo?.color || 'emerald']} text-white
                    hover:shadow-lg transition-all cursor-pointer
                  `}
                >
                  {currentStep.technique}
                </button>
                {currentStep.digit && (
                  <span className="px-2 py-1 bg-slate-800 rounded-lg text-base font-medium text-slate-300">
                    Digit: {currentStep.digit}
                  </span>
                )}
              </div>
              
              {/* Explanation */}
              <div className="bg-slate-800 rounded-xl p-4">
                <p className="text-slate-200 leading-relaxed text-base">
                  {currentStep.explanation}
                </p>
              </div>
              
              {/* Action Summary */}
              {currentStep.eliminations && currentStep.eliminations.length > 0 && (
                <div className="space-y-2">
                  <p className="text-base font-medium text-slate-300">Eliminations:</p>
                  <div className="flex flex-wrap gap-2">
                    {currentStep.eliminations.slice(0, 6).map((elim, idx) => (
                      <span 
                        key={idx}
                        className="px-2 py-1 bg-red-950/50 text-red-400 text-base rounded-lg"
                      >
                        R{Math.floor(elim.cell / 9) + 1}C{(elim.cell % 9) + 1}: -{elim.digit}
                      </span>
                    ))}
                    {currentStep.eliminations.length > 6 && (
                      <span className="px-2 py-1 bg-slate-800 text-slate-400 text-base rounded-lg">
                        +{currentStep.eliminations.length - 6} more
                      </span>
                    )}
                  </div>
                </div>
              )}
              
              {currentStep.placement && (
                <div className="flex items-center gap-2 text-emerald-400">
                  <ChevronRight className="w-5 h-5" />
                  <span className="text-base font-medium">
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
              <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-slate-800 flex items-center justify-center">
                <Info className="w-8 h-8 text-slate-500" />
              </div>
              <p className="text-slate-400 text-base">
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
      <div className="bg-slate-900 rounded-2xl shadow-lg shadow-black/50 p-5 border border-slate-700">
        <h4 className="text-lg font-semibold text-white mb-4">Technique Hierarchy</h4>
        <div className="space-y-3">
          {[
            { level: 'Basic', techniques: [
              { name: 'Naked Single', full: 'Naked Single' },
              { name: 'Hidden Single', full: 'Hidden Single' }
            ], color: 'emerald' },
            { level: 'Intermediate', techniques: [
              { name: 'Pointing Pair', full: 'Pointing Pair' },
              { name: 'Claiming', full: 'Claiming' }
            ], color: 'blue' },
            { level: 'Advanced', techniques: [
              { name: 'Naked Pair', full: 'Naked Pair' },
              { name: 'Hidden Pair', full: 'Hidden Pair' },
              { name: 'Naked Triple', full: 'Naked Triple' }
            ], color: 'purple' },
            { level: 'Expert', techniques: [
              { name: 'X-Wing', full: 'X-Wing' },
              { name: 'Swordfish', full: 'Swordfish' },
              { name: 'XY-Wing', full: 'XY-Wing' }
            ], color: 'orange' },
            { level: 'Ultimate', techniques: [
              { name: 'X-Cycle', full: 'X-Cycle' },
              { name: 'Finned X-Wing', full: 'Finned X-Wing' },
              { name: 'ALS-XZ', full: 'ALS-XZ' },
              { name: 'Unique Rect.', full: 'Unique Rectangle Type 1' },
              { name: 'BUG+1', full: 'BUG+1' }
            ], color: 'violet' },
            ].map((tier) => (
            <div key={tier.level} className="flex items-start gap-3">
              <div className={`w-2 h-2 mt-2 rounded-full bg-gradient-to-br ${levelColors[tier.color]}`}></div>
              <div className="flex-1">
                <p className="text-base font-medium text-slate-200">{tier.level}</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {tier.techniques.map((tech) => {
                    const count = techniqueCounts[tech.full] || 0;
                    return (
                      <div key={tech.name} className="flex items-center gap-1">
                        <button
                          onClick={() => setSelectedTechnique(tech.full)}
                          className="text-sm text-blue-400 hover:text-blue-300 hover:underline cursor-pointer"
                        >
                          {tech.name}
                        </button>
                        {count > 0 && (
                          <button
                            onClick={() => handleTechniqueClick(tech.full)}
                            className="text-xs px-1.5 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded cursor-pointer transition-colors"
                            title={`Show ${count} instance${count > 1 ? 's' : ''}`}
                          >
                            ({count})
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Keyboard Shortcuts */}
      <div className="bg-slate-900 rounded-2xl text-white border border-slate-700 overflow-hidden">
        <button
          onClick={() => setShortcutsExpanded(!shortcutsExpanded)}
          className="w-full p-5 flex items-center justify-between hover:bg-slate-800/50 transition-colors"
        >
          <h4 className="text-lg font-semibold flex items-center gap-2">
            <span className="text-sm px-2 py-0.5 bg-slate-700 rounded">Tips</span>
            Keyboard Shortcuts
          </h4>
          {shortcutsExpanded ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </button>
        
        <AnimatePresence>
          {shortcutsExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-5 pb-5 space-y-2 text-base border-t border-slate-800">
                <div className="flex justify-between pt-3">
                  <span className="text-slate-300">Navigate cells</span>
                  <span className="font-mono bg-slate-700 px-2 py-1 rounded text-sm">Arrow Keys</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Enter number</span>
                  <span className="font-mono bg-slate-700 px-2 py-1 rounded text-sm">1-9</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Toggle candidate</span>
                  <span className="font-mono bg-slate-700 px-2 py-1 rounded text-sm">Shift + 1-9</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Focus digit</span>
                  <span className="font-mono bg-slate-700 px-2 py-1 rounded text-sm">Ctrl/Cmd + 1-9</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Hint</span>
                  <span className="font-mono bg-slate-700 px-2 py-1 rounded text-sm">H</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Apply step</span>
                  <span className="font-mono bg-slate-700 px-2 py-1 rounded text-sm">A</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Undo</span>
                  <span className="font-mono bg-slate-700 px-2 py-1 rounded text-sm">Z</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Clear cell</span>
                  <span className="font-mono bg-slate-700 px-2 py-1 rounded text-sm">Delete / Backspace</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Clear grid</span>
                  <span className="font-mono bg-slate-700 px-2 py-1 rounded text-sm">C</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Clear focus</span>
                  <span className="font-mono bg-slate-700 px-2 py-1 rounded text-sm">Esc</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Technique Modal */}
      {selectedTechnique && (
        <TechniqueModal
          technique={selectedTechnique}
          onClose={() => setSelectedTechnique(null)}
        />
      )}
    </div>
  );
}