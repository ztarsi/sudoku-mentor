import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Upload, FileText } from 'lucide-react';

export default function TextPuzzleUpload({ onClose, onPuzzleLoaded, embedded = false }) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [puzzleName, setPuzzleName] = useState('');

  const parseTextPuzzle = (input) => {
    try {
      const trimmed = input.trim().replace(/\s+/g, '');
      
      // Check if it's compact format (81 consecutive digits)
      if (/^\d{81}$/.test(trimmed)) {
        // Compact format: 81 digits, 0 = empty cell
        const grid = [];
        for (let i = 0; i < 81; i++) {
          grid.push(parseInt(trimmed[i]));
        }
        return grid;
      }
      
      // Otherwise, parse as line-by-line format
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
      onPuzzleLoaded(grid, puzzleName || null);
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

  if (embedded) {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-white font-medium mb-2">Puzzle Name (optional):</label>
          <input
            type="text"
            value={puzzleName}
            onChange={(e) => setPuzzleName(e.target.value)}
            placeholder="e.g., Daily Challenge"
            className="w-full px-4 py-2 bg-slate-800 text-white border border-slate-700 rounded-lg focus:border-blue-500 focus:outline-none mb-4"
          />
        </div>
        
        <div>
          <label className="block text-white font-medium mb-2">Paste or type your puzzle:</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Line format:&#10;131&#10;155&#10;273...&#10;&#10;OR compact format:&#10;100007090030020008009600500..."
            className="w-full h-48 px-4 py-3 bg-slate-800 text-white border border-slate-700 rounded-lg focus:border-blue-500 focus:outline-none resize-none font-mono"
          />
        </div>

        <div>
          <label className="block text-white font-medium mb-2">Or upload a file:</label>
          <input
            type="file"
            accept=".txt"
            onChange={handleFileUpload}
            className="block w-full text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-slate-700 file:text-white hover:file:bg-slate-600"
          />
        </div>

        {error && (
          <div className="p-4 bg-red-900/20 border border-red-500/50 rounded-lg text-red-400">
            {error}
          </div>
        )}

        <div className="bg-slate-800 rounded-lg p-4 text-sm text-slate-400">
          <p className="font-medium text-white mb-2">Supported Formats:</p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Line format:</strong> Each line = 3 digits (Row, Column, Value)</li>
            <li><strong>Compact format:</strong> 81 digits (0 = empty cell)</li>
            <li>All values must be 0-9</li>
          </ul>
        </div>

        <button
          onClick={handleLoad}
          disabled={!text.trim()}
          className="w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          Load Puzzle
        </button>
      </div>
    );
  }

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
              Two formats supported (auto-detected):
            </p>
            <ul className="text-sm text-slate-400 space-y-1 list-disc list-inside">
              <li><strong>Line format:</strong> Each line = Row, Column, Value (e.g., "131")</li>
              <li><strong>Compact format:</strong> 81 digits, 0 = empty (e.g., "100007090...")</li>
            </ul>
            <div className="mt-3 bg-slate-900 rounded p-2 font-mono text-xs text-slate-300">
              Examples: "131" = R1C3=1 | "100007090..." = compact grid
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
              placeholder="Line format:&#10;131&#10;155&#10;273&#10;...&#10;&#10;OR compact:&#10;100007090030020008009600500..."
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