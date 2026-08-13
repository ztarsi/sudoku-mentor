import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, ChevronRight } from 'lucide-react';
import { LEVEL_COLORS, TECHNIQUE_INFO } from '../techniqueCatalog';

const cellRef = (index) => `R${Math.floor(index / 9) + 1}C${(index % 9) + 1}`;

const ChainTrace = ({
  currentStep,
  chainPlaybackIndex,
  onChainPlaybackChange,
  isPlayingChain,
  onToggleChainPlayback,
}) => {
  const placements = currentStep.chain.filter((s) => s.action === 'place');

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-base font-medium text-slate-300">Logical Chain Trace:</p>
        {currentStep.chain.length > 1 && (
          <div className="flex gap-2">
            <button
              onClick={() => onChainPlaybackChange?.(Math.max(0, chainPlaybackIndex - 1))}
              disabled={chainPlaybackIndex === 0}
              className="p-1.5 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-600 rounded transition-colors"
              title="Previous Step"
              aria-label="Previous chain step"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={onToggleChainPlayback}
              className={`p-1.5 ${isPlayingChain ? 'bg-red-600 hover:bg-red-500' : 'bg-blue-600 hover:bg-blue-500'} rounded transition-colors`}
              title={isPlayingChain ? 'Pause' : 'Play Chain'}
              aria-label={isPlayingChain ? 'Pause chain playback' : 'Play chain'}
            >
              {isPlayingChain ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                </svg>
              )}
            </button>
            <button
              onClick={() => onChainPlaybackChange?.(Math.min(placements.length - 1, chainPlaybackIndex + 1))}
              disabled={chainPlaybackIndex >= placements.length - 1}
              className="p-1.5 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-600 rounded transition-colors"
              title="Next Step"
              aria-label="Next chain step"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
      </div>
      <div className="bg-slate-800 rounded-xl p-4 max-h-72 overflow-y-auto space-y-2">
        {placements.map((step, idx) => {
          const isActive = idx <= chainPlaybackIndex;
          const isCurrentStep = idx === chainPlaybackIndex;

          return (
            <motion.div
              key={idx}
              onClick={() => onChainPlaybackChange?.(idx)}
              className={`flex items-start gap-2 text-sm p-2 rounded cursor-pointer hover:bg-slate-700/50 transition-colors ${isCurrentStep ? 'bg-blue-900/30 border border-blue-600' : ''} ${!isActive ? 'opacity-40' : ''}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              <span className={`font-bold ${idx === 0 ? 'text-purple-400' : isCurrentStep ? 'text-blue-300' : 'text-slate-400'}`}>
                {idx + 1}.
              </span>
              <div className="flex-1">
                <span className={isCurrentStep ? 'text-white font-medium' : 'text-slate-300'}>
                  {cellRef(step.cell)} = {step.value}
                </span>
                {step.reason && (
                  <p className="text-slate-400 text-xs mt-1">{step.reason}</p>
                )}
              </div>
              {isCurrentStep && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-2 h-2 bg-blue-500 rounded-full"
                />
              )}
            </motion.div>
          );
        })}
        {currentStep.contradiction && chainPlaybackIndex >= placements.length - 1 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-3 p-3 bg-red-950/50 border border-red-600 rounded-lg"
          >
            <div className="flex items-center gap-2 text-red-400 font-medium mb-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              CONTRADICTION REACHED
            </div>
            <p className="text-sm text-red-300">
              {cellRef(currentStep.contradictionCell)} has no valid candidates left!
            </p>
            {currentStep.placement && (
              <p className="text-sm text-emerald-400 mt-2">
                ✓ Therefore: {cellRef(currentStep.placement.cell)} must be {currentStep.placement.digit}
              </p>
            )}
          </motion.div>
        )}
      </div>
      <div className="text-xs text-slate-500 text-center">
        Step {Math.min(chainPlaybackIndex + 1, placements.length)} of {placements.length}
      </div>
    </div>
  );
};

/**
 * The "current hint" card: technique badge, explanation, chain trace,
 * eliminations, and placement summary - or the hint prompt when idle.
 */
export default function CurrentStepCard({
  currentStep,
  focusedDigit,
  noAssistMode,
  onNextStep,
  onSelectTechnique,
  chainPlaybackIndex,
  onChainPlaybackChange,
  isPlayingChain,
  onToggleChainPlayback,
}) {
  const techniqueInfo = currentStep ? TECHNIQUE_INFO[currentStep.technique] : null;

  return (
    <motion.div
      layout
      className="bg-slate-900 rounded-2xl shadow-lg shadow-black/50 overflow-hidden border border-slate-700"
    >
      <div className="p-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className={`
            w-10 h-10 rounded-xl flex items-center justify-center
            ${currentStep
              ? `bg-gradient-to-br ${LEVEL_COLORS[techniqueInfo?.color || 'emerald']} shadow-lg`
              : 'bg-slate-800'
            }
          `}>
            <Lightbulb className={`w-6 h-6 ${currentStep ? 'text-white' : 'text-slate-500'}`} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">
              {currentStep ? 'Technique Found!' : 'Ready for a Hint?'}
            </h3>
            <p className="text-base text-slate-400">
              {currentStep ? techniqueInfo?.level : 'Click "Hint" to analyze the board'}
            </p>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {currentStep ? (
          <motion.div
            key="step"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="p-5 space-y-4"
          >
            {/* Technique Name */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => onSelectTechnique(currentStep.technique)}
                className={`
                  px-3 py-1 rounded-full text-base font-medium
                  bg-gradient-to-r ${LEVEL_COLORS[techniqueInfo?.color || 'emerald']} text-white
                  hover:shadow-lg transition-all cursor-pointer
                `}
              >
                {currentStep.technique}
              </button>
              {currentStep.digit && (
                <span className="px-2 py-1 bg-slate-800 rounded-lg text-base font-medium text-slate-300">
                  Digit: {currentStep.digit}
                </span>
              )}
            </div>

            {/* Explanation */}
            <div className="bg-slate-800 rounded-xl p-4">
              <p className="text-slate-200 leading-relaxed text-base whitespace-pre-line">
                {currentStep.explanation}
              </p>
            </div>

            {/* Step-by-step breakdown for Deep Forcing Chains and Hypothesis Mode */}
            {(currentStep.technique === 'Deep Forcing Chain' || currentStep.technique === 'Hypothesis Mode') && currentStep.chain && (
              <ChainTrace
                currentStep={currentStep}
                chainPlaybackIndex={chainPlaybackIndex}
                onChainPlaybackChange={onChainPlaybackChange}
                isPlayingChain={isPlayingChain}
                onToggleChainPlayback={onToggleChainPlayback}
              />
            )}

            {/* Action Summary */}
            {currentStep.eliminations && currentStep.eliminations.length > 0 && (
              <div className="space-y-2">
                <p className="text-base font-medium text-slate-300">Eliminations:</p>
                <div className="flex flex-wrap gap-2">
                  {currentStep.eliminations.slice(0, 6).map((elim, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 bg-red-950/50 text-red-400 text-base rounded-lg"
                    >
                      {cellRef(elim.cell)}: -{elim.digit}
                    </span>
                  ))}
                  {currentStep.eliminations.length > 6 && (
                    <span className="px-2 py-1 bg-slate-800 text-slate-400 text-base rounded-lg">
                      +{currentStep.eliminations.length - 6} more
                    </span>
                  )}
                </div>
              </div>
            )}

            {currentStep.placement && (
              <div className="flex items-center gap-2 text-emerald-400">
                <ChevronRight className="w-5 h-5" />
                <span className="text-base font-medium">
                  Place {currentStep.placement.digit} at {cellRef(currentStep.placement.cell)}
                </span>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="p-5 text-center"
          >
            {noAssistMode ? (
              <div className="py-8">
                <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-slate-800 flex items-center justify-center opacity-50">
                  <Lightbulb className="w-8 h-8 text-slate-600" />
                </div>
                <p className="text-slate-500 text-sm">
                  Hints disabled in No Assist Mode
                </p>
              </div>
            ) : (
              <>
                <button
                  onClick={onNextStep}
                  aria-label="Get a hint"
                  className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 flex items-center justify-center transition-all shadow-lg hover:shadow-xl"
                >
                  <Lightbulb className="w-8 h-8 text-white" />
                </button>
                {focusedDigit && (
                  <p className="text-slate-400 text-base">
                    Filtering for digit {focusedDigit}. Click above to find patterns.
                  </p>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
