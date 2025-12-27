import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, BookOpen, Camera, FileText } from 'lucide-react';
import PuzzleLibrary from './PuzzleLibrary';
import OCRUpload from './OCRUpload';
import TextPuzzleUpload from './TextPuzzleUpload';

export default function UnifiedPuzzleLoader({ isOpen, onClose, onPuzzleLoaded }) {
  const [activeTab, setActiveTab] = useState('library');

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
                  onSelectPuzzle={onPuzzleLoaded}
                  embedded={true}
                />
              </div>
            )}
            {activeTab === 'ocr' && (
              <div className="p-6">
                <OCRUpload
                  isOpen={true}
                  onClose={onClose}
                  onPuzzleExtracted={onPuzzleLoaded}
                  embedded={true}
                />
              </div>
            )}
            {activeTab === 'text' && (
              <div className="p-6">
                <TextPuzzleUpload
                  isOpen={true}
                  onClose={onClose}
                  onPuzzleLoaded={onPuzzleLoaded}
                  embedded={true}
                />
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}