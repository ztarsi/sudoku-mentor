import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Check } from 'lucide-react';

export default function LoadingModal({ isOpen, stages, currentStage }) {
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
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-slate-900 rounded-2xl shadow-2xl border border-slate-700 p-8 max-w-md w-full"
        >
          <div className="text-center mb-6">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-16 h-16 mx-auto mb-4"
            >
              <Loader2 className="w-16 h-16 text-blue-500" />
            </motion.div>
            <h3 className="text-2xl font-bold text-white">Loading Puzzle</h3>
          </div>

          <div className="space-y-3">
            {stages.map((stage, index) => {
              const isComplete = index < currentStage;
              const isCurrent = index === currentStage;
              
              return (
                <motion.div
                  key={stage}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`
                    flex items-center gap-3 p-3 rounded-lg transition-all
                    ${isCurrent ? 'bg-blue-500/20 border border-blue-500/50' : ''}
                    ${isComplete ? 'bg-emerald-500/10' : ''}
                  `}
                >
                  <div className={`
                    flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center
                    ${isComplete ? 'bg-emerald-500' : isCurrent ? 'bg-blue-500' : 'bg-slate-700'}
                  `}>
                    {isComplete ? (
                      <Check className="w-4 h-4 text-white" />
                    ) : isCurrent ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      >
                        <Loader2 className="w-4 h-4 text-white" />
                      </motion.div>
                    ) : (
                      <div className="w-2 h-2 bg-slate-500 rounded-full"></div>
                    )}
                  </div>
                  
                  <span className={`
                    text-base font-medium
                    ${isComplete ? 'text-emerald-400' : isCurrent ? 'text-blue-400' : 'text-slate-500'}
                  `}>
                    {stage}
                  </span>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}