import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Upload, FileText } from 'lucide-react';

export default function TextPuzzleUpload({ onClose, onPuzzleLoaded, embedded = false }) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');

  const parseTextPuzzle = (input) => {
    try {
      const lines = input.trim().split('\n').filter(line => line.trim());
      const grid = Array(81).fill(0);
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.length !== 3) {
          throw new Error(`Invalid line format: "${trimmed}". Expected 3 digits.`);
        }
        
        const row = parseInt(trimmed[0]);
        const col = parseInt(trimmed[1]);
        const value = parseInt(trimmed[2]);
        
        if (row < 1 || row > 9 || col < 1 || col > 9 || value < 1 || value > 9) {
          throw new Error(`Invalid values in line: "${trimmed}". Row, column, and value must be 1-9.`);
        }
        
        const index = (row - 1) * 9 + (col - 1);
        grid[index] = value;
      }
      
      return grid;
    } catch (e) {
      throw new Error(e.message);
    }
  };

  const handleLoad = () => {
    setError('');
    try {
      const grid = parseTextPuzzle(text);
      onPuzzleLoaded(grid);
    } catch (e) {
      setError(e.message);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setText(event.target.result);
      };
      reader.readAsText(file);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Load Text Puzzle</h2>
              <p className="text-sm text-slate-400">Paste or upload puzzle in text format</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Format Info */}
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <h3 className="text-sm font-medium text-slate-300 mb-2">Format Instructions</h3>
            <p className="text-sm text-slate-400 mb-2">
              Each line represents one pre-filled cell with 3 digits:
            </p>
            <ul className="text-sm text-slate-400 space-y-1 list-disc list-inside">
              <li>First digit: Row (1-9)</li>
              <li>Second digit: Column (1-9)</li>
              <li>Third digit: Cell value (1-9)</li>
            </ul>
            <div className="mt-3 bg-slate-900 rounded p-2 font-mono text-xs text-slate-300">
              Example: "131" = Row 1, Column 3, Value 1
            </div>
          </div>

          {/* Upload File Button */}
          <div>
            <label className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors cursor-pointer border border-slate-700">
              <Upload className="w-5 h-5" />
              <span>Upload Text File</span>
              <input
                type="file"
                accept=".txt"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          {/* Text Area */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Or paste text here:
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="131&#10;155&#10;273&#10;..."
              className="w-full h-48 bg-slate-800 border border-slate-700 rounded-lg p-3 text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-900/20 border border-red-800 rounded-lg p-3">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleLoad}
              disabled={!text.trim()}
              className={`flex-1 py-3 rounded-lg font-medium transition-all ${
                text.trim()
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:shadow-lg'
                  : 'bg-slate-800 text-slate-600 cursor-not-allowed'
              }`}
            >
              Load Puzzle
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}