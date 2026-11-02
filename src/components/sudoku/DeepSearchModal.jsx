import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDialog } from '@/hooks/useDialog';

/**
 * What the Search button says when it comes back with nothing.
 *
 * The search has one stated limit, and it is deliberate: a net that may be
 * deepened on request is a solver, not a mentor (#75). So this dialog says
 * where the search stopped and why, rather than offering to go deeper or
 * implying there is nothing on the board.
 */
export default function DeepSearchModal({ isOpen, onClose, onCancel, netDepth, isSearching }) {
  const dialog = useDialog({ open: isOpen, onClose });
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          ref={dialog.ref}
          {...dialog.props}
          aria-label="No techniques found"
          className="bg-slate-900 rounded-2xl shadow-2xl border border-slate-700 max-w-md w-full"
        >
          {/* Header */}
          <div className="p-6 border-b border-slate-700">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-orange-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">Nothing found from here</h2>
                <p className="text-sm text-slate-400">The search holds at most {netDepth} suppositions at once</p>
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
                <p className="text-slate-300 text-lg font-medium">Searching…</p>
                <p className="text-slate-400 text-sm mt-2">The search runs in the background; the board stays usable.</p>
                <Button onClick={onCancel} variant="outline" className="mt-4 border-slate-600">
                  Cancel search
                </Button>
              </div>
            ) : (
              <>
                <p className="text-slate-300 leading-relaxed">
                  No forcing proof and no what-if chain was found on this board inside the search's
                  limit: it may hold {netDepth} suppositions at once, and it stopped there.
                </p>

                <p className="text-slate-400 text-sm">
                  That is not the same as there being nothing to find. The limit is deliberate - a
                  search without one would solve the puzzle for you instead of teaching it - so the
                  mentor stops rather than digging further. Place a digit you are sure of and ask
                  again, and the board it searches will be a different one.
                </p>
              </>
            )}
          </div>

          {/* Footer */}
          {!isSearching && (
            <div className="p-4 border-t border-slate-700">
              <Button onClick={onClose} variant="outline" className="w-full border-slate-600">
                Close
              </Button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}