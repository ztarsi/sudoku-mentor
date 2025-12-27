import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, AlertCircle, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DeepSearchModal({ isOpen, onClose, onGoDeeper, currentDepth, isSearching }) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-slate-900 rounded-2xl shadow-2xl border border-slate-700 max-w-md w-full"
        >
          {/* Header */}
          <div className="p-6 border-b border-slate-700">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-orange-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">No Techniques Found</h2>
                <p className="text-sm text-slate-400">Current search depth: {currentDepth}</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            {isSearching ? (
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-500/20 mb-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
                </div>
                <p className="text-slate-300 text-lg font-medium">Searching deeper...</p>
                <p className="text-slate-400 text-sm mt-2">Depth: {currentDepth}</p>
              </div>
            ) : (
              <>
                <p className="text-slate-300 leading-relaxed">
                  No forcing chains or logical contradictions were found at the current search depth.
                </p>
                
                <div className="bg-slate-800 rounded-xl p-4 space-y-2">
                  <div className="flex items-start gap-2">
                    <Zap className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-slate-200 font-medium">Go Deeper</p>
                      <p className="text-slate-400 text-sm">Search with increased depth (may take longer)</p>
                    </div>
                  </div>
                </div>

                <p className="text-slate-400 text-sm">
                  Deeper searches explore more complex logical chains but may take a few seconds to complete.
                </p>
              </>
            )}
          </div>

          {/* Footer */}
          {!isSearching && (
            <div className="p-4 border-t border-slate-700 flex gap-3">
              <Button
                onClick={onClose}
                variant="outline"
                className="flex-1 border-slate-600"
              >
                Cancel
              </Button>
              <Button
                onClick={onGoDeeper}
                className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-500"
              >
                <Search className="w-4 h-4 mr-2" />
                Go Deeper
              </Button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}