import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

const TECHNIQUE_DETAILS = {
  'Naked Single': {
    description: 'When a cell has only one possible candidate remaining after eliminating all numbers that appear in its row, column, and 3x3 box.',
    example: 'If a cell can only be a 5 (all other digits 1-9 are already present in its row, column, or box), then it must be a 5.',
    strategy: '1. Look at the cell\n2. Check which numbers appear in its row, column, and box\n3. If only one number is missing, place it'
  },
  'Hidden Single': {
    description: 'When a candidate appears only once in a row, column, or box, even if that cell has other candidates.',
    example: 'If the digit 7 can only go in one cell within a row (even if that cell also has candidates 2, 4, 7), then it must be 7.',
    strategy: '1. Pick a digit to focus on\n2. Look at a row, column, or box\n3. If the digit can only fit in one cell, place it there'
  },
  'Pointing Pair': {
    description: 'When a candidate in a box appears in only two cells, and those cells are aligned in the same row or column, you can eliminate that candidate from other cells in that row/column outside the box.',
    example: 'If 3s in a box only appear in two cells that share a row, eliminate all other 3s from that row outside the box.',
    strategy: '1. Look at candidates within a box\n2. Find digits that appear in only 2-3 cells\n3. If aligned in a row/column, eliminate from that row/column outside the box'
  },
  'Pointing Triple': {
    description: 'Similar to Pointing Pair, but with three cells in the same row or column within a box.',
    example: 'If 6s only appear in three aligned cells within a box, eliminate 6s from the rest of that row/column.',
    strategy: 'Same as Pointing Pair, but look for three aligned cells instead of two'
  },
  'Claiming': {
    description: 'When all instances of a candidate in a row or column are confined to a single box, you can eliminate that candidate from other cells in that box.',
    example: 'If all 8s in a row appear only within one box, eliminate 8s from other cells in that box.',
    strategy: '1. Look at a row or column\n2. Find a digit whose candidates all fall in one box\n3. Eliminate that digit from other cells in the box'
  },
  'Naked Pair': {
    description: 'When two cells in a unit (row, column, or box) contain exactly the same two candidates, those candidates can be eliminated from all other cells in that unit.',
    example: 'If two cells both have only {2,5}, eliminate 2 and 5 from all other cells in their row/column/box.',
    strategy: '1. Find two cells with identical pair of candidates\n2. Ensure they are in the same unit\n3. Eliminate those numbers from other cells in the unit'
  },
  'Hidden Pair': {
    description: 'When two candidates appear only in the same two cells within a unit, all other candidates can be removed from those two cells.',
    example: 'If 3 and 7 only appear in cells A and B within a row, remove all other candidates from cells A and B.',
    strategy: '1. Look for two digits that appear in only two cells in a unit\n2. Remove all other candidates from those cells'
  },
  'Naked Triple': {
    description: 'When three cells in a unit collectively contain only three candidates distributed among them, eliminate those candidates from all other cells in that unit.',
    example: 'Three cells contain {1,4}, {1,9}, {4,9}. Eliminate 1, 4, and 9 from other cells in that unit.',
    strategy: '1. Find three cells that share only three candidates total\n2. Eliminate those candidates from other cells in the unit'
  },
  'X-Wing': {
    description: 'When a candidate appears in only two cells in each of two rows (or columns), and these cells align in the same columns (or rows), forming a rectangle, you can eliminate that candidate from other cells in those columns (or rows).',
    example: 'If 5 appears only in columns 2 and 7 in both rows 1 and 8, eliminate all other 5s from columns 2 and 7.',
    strategy: '1. Find a candidate in exactly two positions in a row\n2. Find another row where it appears in the same two columns\n3. Eliminate from those columns in other rows'
  },
  'Swordfish': {
    description: 'An extension of X-Wing to three rows and three columns. When a candidate appears 2-3 times in each of three rows, confined to the same three columns, eliminate from those columns in other rows.',
    example: 'Similar to X-Wing but with three rows and three columns forming the pattern.',
    strategy: 'Like X-Wing, but look for the pattern across three rows and three columns'
  },
  'XY-Wing': {
    description: 'Three cells form a chain: pivot cell with candidates {X,Y}, one wing with {X,Z}, another wing with {Y,Z}. Any cell that sees both wings cannot be Z.',
    example: 'Pivot: {2,5}, Wing 1: {2,8}, Wing 2: {5,8}. Eliminate 8 from cells seeing both wings.',
    strategy: '1. Find a bi-value cell (pivot) with {X,Y}\n2. Find two wings: {X,Z} and {Y,Z}\n3. Eliminate Z from cells seeing both wings'
  }
};

export default function TechniqueModal({ technique, onClose }) {
  if (!technique) return null;
  
  const details = TECHNIQUE_DETAILS[technique];
  if (!details) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-slate-900 rounded-2xl shadow-2xl border border-slate-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="sticky top-0 bg-slate-900 border-b border-slate-700 p-6 flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-white">{technique}</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-800 rounded-xl transition-colors"
            >
              <X className="w-6 h-6 text-slate-400" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Description */}
            <div>
              <h3 className="text-lg font-semibold text-slate-200 mb-2">What is it?</h3>
              <p className="text-slate-300 leading-relaxed">{details.description}</p>
            </div>

            {/* Strategy */}
            <div>
              <h3 className="text-lg font-semibold text-slate-200 mb-2">How to find it</h3>
              <div className="bg-slate-800 rounded-xl p-4">
                <pre className="text-slate-300 whitespace-pre-line font-sans">{details.strategy}</pre>
              </div>
            </div>

            {/* Example */}
            <div>
              <h3 className="text-lg font-semibold text-slate-200 mb-2">Example</h3>
              <div className="bg-blue-950/40 border border-blue-800/50 rounded-xl p-4">
                <p className="text-blue-200">{details.example}</p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-slate-900 border-t border-slate-700 p-4">
            <button
              onClick={onClose}
              className="w-full px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-medium rounded-xl hover:shadow-lg transition-all"
            >
              Got it!
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}