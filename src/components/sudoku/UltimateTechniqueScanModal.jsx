import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle } from 'lucide-react';
import { useDialog } from '@/hooks/useDialog';
import { SCAN_TECHNIQUES, needsUniqueness } from './techniqueCatalog';
import { UNIQUENESS_UNKNOWN, uniquenessAllowed, uniquenessNote } from './uniqueness';

// What each scan actually costs on a mid-game board, measured rather than
// guessed (fishAndSingleDigit.spec.js prints the numbers). Anything not
// listed is a detector added since, and "a moment" is the safe word.
const SCAN_TIMES = {
  'X-Cycle': 'instant',
  '3D Medusa': 'instant',
  'Finned X-Wing': 'instant',
  'Finned Swordfish': 'instant',
  'Unique Rectangle Type 1': 'instant',
  'Unique Rectangle Type 2': 'instant',
  'Unique Rectangle Type 3': 'instant',
  'Unique Rectangle Type 4': 'instant',
  'Unique Rectangle Type 5': 'instant',
  'Unique Rectangle Type 6': 'instant',
  'Hidden Unique Rectangle': 'instant',
  'Avoidable Rectangle Type 1': 'instant',
  'Avoidable Rectangle Type 2': 'instant',
  'BUG+1': 'instant',
  'BUG+2': 'instant',
  'BUG+3': 'instant',
  'Unique Loop': 'a moment',
  'Finned Jellyfish': 'a moment',
  'Sashimi Fish': 'a moment',
  'ALS-XZ': 'a moment',
  'Franken Fish': 'a moment',
  'Mutant Fish': 'a moment',
};

export default function UltimateTechniqueScanModal({
  isOpen,
  currentTechnique,
  results,
  uniqueness = UNIQUENESS_UNKNOWN,
  onClose,
}) {
  const dialog = useDialog({ open: isOpen, onClose });
  // The catalog decides which techniques are scan-only, so a new one joins
  // this dialog without being listed twice. The ones that need the puzzle
  // to have a single answer are left out when it has not got one, with a
  // line saying so rather than a list of zeroes.
  const uniquenessOff = !uniquenessAllowed(uniqueness);
  const techniques = SCAN_TECHNIQUES.filter((name) => !(uniquenessOff && needsUniqueness(name))).map(
    (name) => ({ name, time: SCAN_TIMES[name] || 'a moment' })
  );
  const skipped = uniquenessOff ? SCAN_TECHNIQUES.filter(needsUniqueness).length : 0;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          ref={dialog.ref}
          {...dialog.props}
          aria-label="Ultimate technique scan"
          className="bg-slate-900 rounded-2xl shadow-2xl border border-slate-700 w-full max-w-md"
        >
          <div className="p-6">
            <h3 className="text-xl font-bold text-white mb-2">Scanning Ultimate Techniques</h3>
            <p className="text-slate-400 text-sm mb-2">
              Running {techniques.length} detector{techniques.length === 1 ? '' : 's'} on the board as
              it stands now. A second or two.
            </p>
            {skipped > 0 && (
              <p className="text-slate-400 text-sm mb-6">
                {skipped} more are not in the list: {uniquenessNote(uniqueness)}
              </p>
            )}
            {skipped === 0 && <div className="mb-6" />}

            <div className="space-y-3">
              {techniques.map((tech, index) => {
                const isScanning = currentTechnique === tech.name;
                const isComplete = results[tech.name] !== undefined;
                const count = results[tech.name] || 0;

                return (
                  <motion.div
                    key={tech.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`
                      flex items-center justify-between p-4 rounded-xl border
                      ${isScanning ? 'bg-blue-900/20 border-blue-500' : ''}
                      ${isComplete ? 'bg-slate-800 border-slate-700' : 'bg-slate-800/50 border-slate-700'}
                    `}
                  >
                    <div className="flex items-center gap-3">
                      {isScanning && <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />}
                      {isComplete && <CheckCircle className="w-5 h-5 text-emerald-400" />}
                      {!isScanning && !isComplete && <div className="w-5 h-5 rounded-full border-2 border-slate-600" />}
                      
                      <div>
                        <p className="text-white font-medium">{tech.name}</p>
                        <p className="text-sm text-slate-400">{tech.time}</p>
                      </div>
                    </div>

                    {isComplete && (
                      <div className="px-3 py-1 bg-emerald-600 text-white text-sm font-medium rounded-lg">
                        {count} found
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {Object.keys(results).length === techniques.length && (
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={onClose}
                className="w-full mt-6 px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-medium rounded-xl hover:shadow-lg transition-all"
              >
                Done
              </motion.button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}