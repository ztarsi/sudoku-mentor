import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, BookOpen, Camera, FileText } from 'lucide-react';
import PuzzleLibrary from './PuzzleLibrary';
import OCRUpload from './OCRUpload';
import TextPuzzleUpload from './TextPuzzleUpload';
import { analyzeDifficulty } from './difficultyAnalyzer';
import { base44 } from '@/api/base44Client';
import { solveSudoku } from './solver';

export default function UnifiedPuzzleLoader({ isOpen, onClose, onPuzzleLoaded }) {
  const [activeTab, setActiveTab] = useState('library');
  const [savingPuzzle, setSavingPuzzle] = useState(false);

  const handlePuzzleLoad = async (puzzle, source = 'library', customName = null) => {
    // If from library, just load it
    if (source === 'library') {
      onPuzzleLoaded(puzzle);
      return;
    }

    // For OCR/text uploads, validate, check duplicates, analyze and save
    setSavingPuzzle(true);
    try {
      // Check if puzzle is solvable
      const gridForSolving = puzzle.map((value, index) => ({
        cellIndex: index,
        value: value || null,
        isFixed: value !== 0,
        candidates: []
      }));
      
      const solved = solveSudoku(gridForSolving);
      if (!solved) {
        alert('This puzzle has no valid solution and cannot be saved.');
        setSavingPuzzle(false);
        return;
      }

      // Check for duplicates
      const existingPuzzles = await base44.entities.SudokuPuzzle.list();
      const isDuplicate = existingPuzzles.some(existing => 
        JSON.stringify(existing.puzzle) === JSON.stringify(puzzle)
      );
      
      if (isDuplicate) {
        alert('This puzzle already exists in your library!');
        setSavingPuzzle(false);
        onPuzzleLoaded(puzzle);
        return;
      }

      // Analyze difficulty
      const difficulty = analyzeDifficulty(puzzle);
      const clueCount = puzzle.filter(v => v !== 0).length;
      const timestamp = new Date().toLocaleString();
      
      const name = customName || `${source === 'ocr' ? 'OCR' : 'Custom'} Puzzle (${clueCount} clues) - ${timestamp}`;
      
      await base44.entities.SudokuPuzzle.create({
        name,
        difficulty,
        puzzle,
        source
      });
      
      onPuzzleLoaded(puzzle);
    } catch (error) {
      console.error('Error saving puzzle:', error);
      alert('Failed to save puzzle: ' + error.message);
      setSavingPuzzle(false);
      return;
    } finally {
      setSavingPuzzle(false);
    }
  };

  if (!isOpen) return null;

  const tabs = [
    { id: 'library', label: 'Library', icon: BookOpen },
    { id: 'ocr', label: 'Image', icon: Camera },
    { id: 'text', label: 'Text', icon: FileText }
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-slate-900 rounded-2xl shadow-2xl border border-slate-700 w-full max-w-4xl max-h-[90vh] overflow-hidden"
        >
          {/* Header with tabs */}
          <div className="border-b border-slate-700">
            <div className="flex items-center justify-between p-6 pb-0">
              <h2 className="text-2xl font-bold text-white">Load Puzzle</h2>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-slate-800 rounded-lg"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            {/* Tabs */}
            <div className="flex gap-2 px-6 mt-4">
              {tabs.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex items-center gap-2 px-4 py-3 rounded-t-lg font-medium transition-all relative
                      ${activeTab === tab.id
                        ? 'bg-slate-800 text-white'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                      }
                    `}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{tab.label}</span>
                    {activeTab === tab.id && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
            {activeTab === 'library' && (
              <div className="p-6">
                <PuzzleLibrary
                  isOpen={true}
                  onClose={onClose}
                  onSelectPuzzle={(puzzle) => handlePuzzleLoad(puzzle, 'library')}
                  embedded={true}
                />
              </div>
            )}
            {activeTab === 'ocr' && (
              <div className="p-6">
                <OCRUpload
                  isOpen={true}
                  onClose={onClose}
                  onPuzzleExtracted={(puzzle, name) => handlePuzzleLoad(puzzle, 'ocr', name)}
                  embedded={true}
                />
              </div>
            )}
            {activeTab === 'text' && (
              <div className="p-6">
                <TextPuzzleUpload
                  isOpen={true}
                  onClose={onClose}
                  onPuzzleLoaded={(puzzle, name) => handlePuzzleLoad(puzzle, 'text', name)}
                  embedded={true}
                />
              </div>
            )}
            
            {savingPuzzle && (
              <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center">
                <div className="bg-slate-800 rounded-xl p-6 shadow-xl">
                  <div className="flex items-center gap-3">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                    <p className="text-white font-medium">Analyzing & saving puzzle...</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}