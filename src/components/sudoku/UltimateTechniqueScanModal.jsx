import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle } from 'lucide-react';

export default function UltimateTechniqueScanModal({ isOpen, currentTechnique, results, onClose }) {
  const techniques = [
    { name: 'X-Cycle', time: '~2s' },
    { name: 'Finned X-Wing', time: '~1s' },
    { name: 'ALS-XZ', time: '~3s' },
    { name: 'Unique Rectangle', time: '~2s' },
    { name: 'BUG+1', time: '~1s' }
  ];

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
          className="bg-slate-900 rounded-2xl shadow-2xl border border-slate-700 w-full max-w-md"
        >
          <div className="p-6">
            <h3 className="text-xl font-bold text-white mb-2">Scanning Ultimate Techniques</h3>
            <p className="text-slate-400 text-sm mb-6">Estimated time: ~10 seconds</p>

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