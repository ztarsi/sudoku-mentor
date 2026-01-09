import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Flame, Zap, Crown, Skull, Brain, Edit2, Check } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export const PUZZLES = {
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
        0,0,0,0,0,0,6,8,0,
        0,0,0,0,7,3,0,0,9,
        3,0,9,0,0,0,0,4,5,
        4,9,0,0,0,0,0,0,0,
        8,0,3,0,5,0,9,0,2,
        0,0,0,0,0,0,0,3,6,
        9,6,0,0,0,0,3,0,8,
        7,0,0,6,8,0,0,0,0,
        0,2,8,0,0,0,0,0,0
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
  ],
  ultimate: [
    {
      name: 'AI Escargot',
      puzzle: [
        1,0,0,0,0,7,0,9,0,
        0,3,0,0,2,0,0,0,8,
        0,0,9,6,0,0,5,0,0,
        0,0,5,3,0,0,9,0,0,
        0,1,0,0,8,0,0,0,2,
        6,0,0,0,0,4,0,0,0,
        3,0,0,0,0,0,0,1,0,
        0,4,0,0,0,0,0,0,7,
        0,0,7,0,0,0,3,0,0
      ]
    },
    {
      name: 'Platinum Blonde',
      puzzle: [
        0,0,0,0,0,0,0,1,2,
        0,0,0,0,0,0,0,0,3,
        0,0,2,3,0,0,4,0,0,
        0,0,1,8,0,0,0,0,5,
        0,6,0,0,7,0,8,0,0,
        0,0,0,0,0,9,0,0,0,
        0,0,8,5,0,0,0,0,0,
        9,0,0,0,4,0,5,0,0,
        4,7,0,0,0,6,0,0,0
      ]
    }
  ]
};

const DIFFICULTY_CONFIG = {
  easy: { icon: Sparkles, color: 'emerald', label: 'Easy' },
  medium: { icon: Zap, color: 'blue', label: 'Medium' },
  hard: { icon: Flame, color: 'orange', label: 'Hard' },
  expert: { icon: Crown, color: 'purple', label: 'Expert' },
  diabolical: { icon: Skull, color: 'red', label: 'Diabolical' },
  ultimate: { icon: Brain, color: 'violet', label: 'Ultimate' }
};

export default function PuzzleLibrary({ onClose, onSelectPuzzle, embedded = false }) {
  const [selectedDifficulty, setSelectedDifficulty] = useState('easy');
  const [editingPuzzleId, setEditingPuzzleId] = useState(null);
  const [editingName, setEditingName] = useState('');

  const queryClient = useQueryClient();

  // Fetch user-added puzzles
  const { data: userPuzzles = [] } = useQuery({
    queryKey: ['sudoku-puzzles'],
    queryFn: () => base44.entities.SudokuPuzzle.list('-created_date'),
    initialData: []
  });

  // Fetch solve records for the logged-in user
  const { data: solveRecords = [] } = useQuery({
    queryKey: ['solve-records'],
    queryFn: async () => {
      try {
        const user = await base44.auth.me();
        if (!user) return [];
        return await base44.entities.SolveRecord.filter({ no_assist: true });
      } catch {
        return [];
      }
    },
    initialData: []
  });

  // Create a map of puzzle names to best times
  const bestTimesMap = React.useMemo(() => {
    const map = {};
    solveRecords.forEach(record => {
      if (!map[record.puzzle_name] || record.time_seconds < map[record.puzzle_name]) {
        map[record.puzzle_name] = record.time_seconds;
      }
    });
    return map;
  }, [solveRecords]);

  // Update puzzle name mutation
  const updatePuzzleMutation = useMutation({
    mutationFn: ({ id, name }) => base44.entities.SudokuPuzzle.update(id, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sudoku-puzzles'] });
      setEditingPuzzleId(null);
      setEditingName('');
    }
  });

  // Delete puzzle mutation
  const deletePuzzleMutation = useMutation({
    mutationFn: (id) => base44.entities.SudokuPuzzle.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sudoku-puzzles'] });
    }
  });

  const config = DIFFICULTY_CONFIG[selectedDifficulty];
  const DifficultyIcon = config.icon;

  // Combine built-in and user puzzles for selected difficulty
  const allPuzzles = [
    ...PUZZLES[selectedDifficulty],
    ...userPuzzles
      .filter(p => p.difficulty === selectedDifficulty)
      .map(p => ({ id: p.id, name: p.name, puzzle: p.puzzle, isCustom: true }))
  ];

  const colorClasses = {
    emerald: 'from-emerald-400 to-green-500',
    blue: 'from-blue-400 to-indigo-500',
    orange: 'from-orange-400 to-red-500',
    purple: 'from-purple-400 to-violet-500',
    red: 'from-red-500 to-rose-600',
    violet: 'from-indigo-600 to-violet-800'
  };

  const content = (
    <>
      {/* Difficulty Tabs */}
      <div className="mb-4">
        <div className="flex flex-wrap gap-2">
          {Object.entries(DIFFICULTY_CONFIG).map(([key, cfg]) => {
            const Icon = cfg.icon;
            const isActive = selectedDifficulty === key;
            
            return (
              <button
                key={key}
                onClick={() => setSelectedDifficulty(key)}
                className={`
                  flex items-center gap-2 px-3 py-2 rounded-xl font-medium transition-all duration-300
                  ${isActive 
                    ? `bg-gradient-to-r ${colorClasses[cfg.color]} text-white shadow-lg` 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm">{cfg.label}</span>
              </button>
            );
          })}
        </div>
      </div>
      
      {/* Puzzle List */}
      <div className="grid gap-4">
        <AnimatePresence mode="wait">
          {allPuzzles.map((puzzle, index) => (
            <motion.button
              key={`${selectedDifficulty}-${index}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => onSelectPuzzle(puzzle.puzzle, { name: puzzle.name, difficulty: selectedDifficulty })}
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
                {editingPuzzleId === puzzle.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="flex-1 px-2 py-1 border border-slate-300 rounded text-sm"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          updatePuzzleMutation.mutate({ id: puzzle.id, name: editingName });
                        } else if (e.key === 'Escape') {
                          setEditingPuzzleId(null);
                          setEditingName('');
                        }
                      }}
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        updatePuzzleMutation.mutate({ id: puzzle.id, name: editingName });
                      }}
                      className="p-1 hover:bg-slate-200 rounded"
                    >
                      <Check className="w-4 h-4 text-green-600" />
                    </button>
                  </div>
                ) : (
                  <h3 className="font-semibold text-slate-800 group-hover:text-slate-900 flex items-center gap-2">
                    {puzzle.name}
                    {puzzle.isCustom && (
                      <>
                        <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">Custom</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingPuzzleId(puzzle.id);
                            setEditingName(puzzle.name);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-200 rounded transition-opacity"
                          title="Edit name"
                        >
                          <Edit2 className="w-3 h-3 text-slate-600" />
                        </button>
                      </>
                    )}
                    </h3>
                    )}
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-slate-500">
                        {puzzle.puzzle.filter(v => v !== 0).length} clues given
                      </p>
                      {bestTimesMap[puzzle.name] && (
                        <span className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full flex items-center gap-1" title="Your best no-assist time">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {Math.floor(bestTimesMap[puzzle.name] / 60)}:{String(bestTimesMap[puzzle.name] % 60).padStart(2, '0')}
                        </span>
                      )}
                    </div>
                    </div>

                    {puzzle.isCustom && (
                    <button
                    onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('Delete this puzzle? This cannot be undone.')) {
                      deletePuzzleMutation.mutate(puzzle.id);
                    }
                    }}
                    className="opacity-0 group-hover:opacity-100 p-2 hover:bg-red-100 rounded transition-opacity"
                    title="Delete puzzle"
                    >
                    <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    </button>
                    )}
              
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
    </>
  );

  if (embedded) {
    return content;
  }

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
        
        <div className="p-6 overflow-y-auto max-h-[50vh]">
          {content}
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