import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Flame, Zap, Crown, Skull } from 'lucide-react';

const PUZZLES = {
  easy: [
    {
      name: 'Gentle Start',
      puzzle: [
        5,3,0,0,7,0,0,0,0,
        6,0,0,1,9,5,0,0,0,
        0,9,8,0,0,0,0,6,0,
        8,0,0,0,6,0,0,0,3,
        4,0,0,8,0,3,0,0,1,
        7,0,0,0,2,0,0,0,6,
        0,6,0,0,0,0,2,8,0,
        0,0,0,4,1,9,0,0,5,
        0,0,0,0,8,0,0,7,9
      ]
    },
    {
      name: 'Sunday Morning',
      puzzle: [
        0,0,4,0,5,0,0,0,0,
        9,0,0,7,3,4,6,0,0,
        0,0,3,0,2,1,0,4,9,
        0,3,5,0,9,0,4,8,0,
        0,9,0,0,0,0,0,3,0,
        0,7,6,0,1,0,9,2,0,
        3,1,0,9,7,0,2,0,0,
        0,0,9,1,8,2,0,0,3,
        0,0,0,0,6,0,1,0,0
      ]
    }
  ],
  medium: [
    {
      name: 'Coffee Break',
      puzzle: [
        0,0,0,2,6,0,7,0,1,
        6,8,0,0,7,0,0,9,0,
        1,9,0,0,0,4,5,0,0,
        8,2,0,1,0,0,0,4,0,
        0,0,4,6,0,2,9,0,0,
        0,5,0,0,0,3,0,2,8,
        0,0,9,3,0,0,0,7,4,
        0,4,0,0,5,0,0,3,6,
        7,0,3,0,1,8,0,0,0
      ]
    },
    {
      name: 'Lunch Puzzle',
      puzzle: [
        0,2,0,6,0,8,0,0,0,
        5,8,0,0,0,9,7,0,0,
        0,0,0,0,4,0,0,0,0,
        3,7,0,0,0,0,5,0,0,
        6,0,0,0,0,0,0,0,4,
        0,0,8,0,0,0,0,1,3,
        0,0,0,0,2,0,0,0,0,
        0,0,9,8,0,0,0,3,6,
        0,0,0,3,0,6,0,9,0
      ]
    }
  ],
  hard: [
    {
      name: 'Night Owl',
      puzzle: [
        0,0,0,6,0,0,4,0,0,
        7,0,0,0,0,3,6,0,0,
        0,0,0,0,9,1,0,8,0,
        0,0,0,0,0,0,0,0,0,
        0,5,0,1,8,0,0,0,3,
        0,0,0,3,0,6,0,4,5,
        0,4,0,2,0,0,0,6,0,
        9,0,3,0,0,0,0,0,0,
        0,2,0,0,0,0,1,0,0
      ]
    },
    {
      name: 'Brain Teaser',
      puzzle: [
        2,0,0,3,0,0,0,0,0,
        8,0,4,0,6,2,0,0,3,
        0,1,3,8,0,0,2,0,0,
        0,0,0,0,2,0,3,9,0,
        5,0,7,0,0,0,6,2,1,
        0,3,2,0,0,6,0,0,0,
        0,0,1,0,0,7,4,6,0,
        3,0,0,6,4,0,9,0,7,
        0,0,0,0,0,9,0,0,2
      ]
    }
  ],
  expert: [
    {
      name: 'X-Wing Territory',
      puzzle: [
        0,0,0,0,0,0,0,1,2,
        0,0,0,0,3,5,0,0,0,
        0,0,0,6,0,0,0,7,0,
        7,0,0,0,0,0,3,0,0,
        0,0,0,4,0,0,8,0,0,
        1,0,0,0,0,0,0,0,0,
        0,0,0,1,2,0,0,0,0,
        0,8,0,0,0,0,0,4,0,
        0,5,0,0,0,0,6,0,0
      ]
    },
    {
      name: 'Swordfish Hunt',
      puzzle: [
        0,0,5,3,0,0,0,0,0,
        8,0,0,0,0,0,0,2,0,
        0,7,0,0,1,0,5,0,0,
        4,0,0,0,0,5,3,0,0,
        0,1,0,0,7,0,0,0,6,
        0,0,3,2,0,0,0,8,0,
        0,6,0,5,0,0,0,0,9,
        0,0,4,0,0,0,0,3,0,
        0,0,0,0,0,9,7,0,0
      ]
    }
  ],
  diabolical: [
    {
      name: 'Nightmare',
      puzzle: [
        0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,3,0,8,5,
        0,0,1,0,2,0,0,0,0,
        0,0,0,5,0,7,0,0,0,
        0,0,4,0,0,0,1,0,0,
        0,9,0,0,0,0,0,0,0,
        5,0,0,0,0,0,0,7,3,
        0,0,2,0,1,0,0,0,0,
        0,0,0,0,4,0,0,0,9
      ]
    },
    {
      name: 'World\'s Hardest',
      puzzle: [
        8,0,0,0,0,0,0,0,0,
        0,0,3,6,0,0,0,0,0,
        0,7,0,0,9,0,2,0,0,
        0,5,0,0,0,7,0,0,0,
        0,0,0,0,4,5,7,0,0,
        0,0,0,1,0,0,0,3,0,
        0,0,1,0,0,0,0,6,8,
        0,0,8,5,0,0,0,1,0,
        0,9,0,0,0,0,4,0,0
      ]
    }
  ]
};

const DIFFICULTY_CONFIG = {
  easy: { icon: Sparkles, color: 'emerald', label: 'Easy' },
  medium: { icon: Zap, color: 'blue', label: 'Medium' },
  hard: { icon: Flame, color: 'orange', label: 'Hard' },
  expert: { icon: Crown, color: 'purple', label: 'Expert' },
  diabolical: { icon: Skull, color: 'red', label: 'Diabolical' }
};

export default function PuzzleLibrary({ onClose, onSelectPuzzle }) {
  const [selectedDifficulty, setSelectedDifficulty] = useState('easy');

  const config = DIFFICULTY_CONFIG[selectedDifficulty];
  const DifficultyIcon = config.icon;

  const colorClasses = {
    emerald: 'from-emerald-400 to-green-500',
    blue: 'from-blue-400 to-indigo-500',
    orange: 'from-orange-400 to-red-500',
    purple: 'from-purple-400 to-violet-500',
    red: 'from-red-500 to-rose-600'
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-800">Puzzle Library</h2>
              <p className="text-slate-500 mt-1">Choose your challenge</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <X className="w-6 h-6 text-slate-400" />
            </button>
          </div>
        </div>
        
        {/* Difficulty Tabs */}
        <div className="p-4 border-b border-slate-100 overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            {Object.entries(DIFFICULTY_CONFIG).map(([key, cfg]) => {
              const Icon = cfg.icon;
              const isActive = selectedDifficulty === key;
              
              return (
                <button
                  key={key}
                  onClick={() => setSelectedDifficulty(key)}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-300
                    ${isActive 
                      ? `bg-gradient-to-r ${colorClasses[cfg.color]} text-white shadow-lg` 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  {cfg.label}
                </button>
              );
            })}
          </div>
        </div>
        
        {/* Puzzle List */}
        <div className="p-6 overflow-y-auto max-h-[50vh]">
          <div className="grid gap-4">
            <AnimatePresence mode="wait">
              {PUZZLES[selectedDifficulty].map((puzzle, index) => (
                <motion.button
                  key={`${selectedDifficulty}-${index}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => onSelectPuzzle(puzzle.puzzle)}
                  className="flex items-center gap-4 p-4 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all duration-300 group text-left"
                >
                  {/* Mini Preview */}
                  <div className="w-16 h-16 bg-white rounded-xl shadow-inner grid grid-cols-9 gap-0 p-1 flex-shrink-0">
                    {puzzle.puzzle.map((val, i) => (
                      <div
                        key={i}
                        className={`
                          flex items-center justify-center text-[4px]
                          ${val ? 'text-slate-700' : 'text-transparent'}
                        `}
                      >
                        {val || '·'}
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-800 group-hover:text-slate-900">
                      {puzzle.name}
                    </h3>
                    <p className="text-sm text-slate-500">
                      {puzzle.puzzle.filter(v => v !== 0).length} clues given
                    </p>
                  </div>
                  
                  <div className={`
                    px-3 py-1 rounded-full text-sm font-medium
                    bg-gradient-to-r ${colorClasses[config.color]} text-white
                    opacity-0 group-hover:opacity-100 transition-opacity
                  `}>
                    Play
                  </div>
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50">
          <p className="text-center text-sm text-slate-500">
            More puzzles coming soon! 🧩
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}