import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, Eye, Sparkles, Check } from 'lucide-react';
import { LEVEL_COLORS, TECHNIQUE_INFO } from '../techniqueCatalog';
import { explainStep, readExplainLevel, writeExplainLevel, CELL_LEGEND } from '../explainStep';

import { cellName as cellRef } from '../gridUnits';

/**
 * Beginner / Expert switch for the explanation text. The selected option is
 * filled blue with a check mark so it cannot be mistaken for the inactive
 * one.
 */
const LevelToggle = ({ level, onChange }) => (
  <div
    role="radiogroup"
    aria-label="Explanation level"
    className="inline-flex rounded-lg bg-slate-800 border border-slate-700 p-0.5 text-xs font-medium"
  >
    {[
      { id: 'simple', label: 'Beginner' },
      { id: 'detailed', label: 'Expert' },
    ].map((opt) => {
      const active = level === opt.id;
      return (
        <button
          key={opt.id}
          role="radio"
          aria-checked={active}
          onClick={() => onChange(opt.id)}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors ${
            active ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {active && <Check className="w-3 h-3" aria-hidden="true" />}
          {opt.label}
        </button>
      );
    })}
  </div>
);

/**
 * The explanation body. Simple mode is chunked into "Look", "Why", and
 * "Do" so a beginner can follow it one idea at a time; detailed mode shows
 * the engine's own text with a glossary for its terms.
 */
const Explanation = ({ explanation }) => {
  if (!explanation) return null;
  const { level, look, why, extra, action, terms } = explanation;

  if (level === 'detailed') {
    return (
      <div className="space-y-3">
        <div className="bg-slate-800 rounded-xl p-4">
          <p className="text-slate-200 leading-relaxed text-base whitespace-pre-line">{why}</p>
        </div>
        {action && (
          <div className="flex items-start gap-2 text-emerald-300 text-sm">
            <Check className="w-4 h-4 mt-0.5 shrink-0" />
            <p>{action}</p>
          </div>
        )}
        {terms.length > 0 && (
          <details className="text-sm text-slate-400">
            <summary className="cursor-pointer hover:text-slate-200">Terms used here</summary>
            <dl className="mt-2 space-y-1.5">
              {terms.map(({ term, meaning }) => (
                <div key={term}>
                  <dt className="inline font-medium text-slate-300">{term}: </dt>
                  <dd className="inline">{meaning}</dd>
                </div>
              ))}
            </dl>
          </details>
        )}
      </div>
    );
  }

  const blocks = [
    look && { key: 'look', icon: Eye, label: 'Look', text: look, tone: 'text-blue-300' },
    why && { key: 'why', icon: Sparkles, label: 'Why it works', text: why, tone: 'text-violet-300' },
    action && { key: 'do', icon: Check, label: 'What to do', text: action, tone: 'text-emerald-300' },
  ].filter(Boolean);

  return (
    <div className="space-y-2">
      {blocks.map(({ key, icon: Icon, label, text, tone }) => (
        <div key={key} className="bg-slate-800 rounded-xl p-4 flex gap-3">
          <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${tone}`} aria-hidden="true" />
          <div className="min-w-0">
            <p className={`text-xs font-semibold uppercase tracking-wide ${tone} mb-1`}>{label}</p>
            <p className="text-slate-200 leading-relaxed text-base">{text}</p>
          </div>
        </div>
      ))}
      {extra && <p className="text-xs text-slate-500 px-1">{extra}</p>}
      <p className="text-xs text-slate-500 px-1">{CELL_LEGEND}</p>
    </div>
  );
};

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
              {currentStep.contradictionText
                ? `${currentStep.contradictionText[0].toUpperCase()}${currentStep.contradictionText.slice(1)}.`
                : `${cellRef(currentStep.contradictionCell)} has no valid candidates left!`}
            </p>
            {currentStep.chain.filter((s) => s.action === 'note').map((n, i) => (
              <p key={i} className="text-sm text-red-200/80 mt-1">{n.reason}</p>
            ))}
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
  grid = null,
  focusedDigit,
  noAssistMode,
  onNextStep,
  searching = false,
  onCancelSearch,
  onSelectTechnique,
  chainPlaybackIndex,
  onChainPlaybackChange,
  isPlayingChain,
  onToggleChainPlayback,
}) {
  const techniqueInfo = currentStep ? TECHNIQUE_INFO[currentStep.technique] : null;
  const [explainLevel, setExplainLevel] = useState(readExplainLevel);
  const changeLevel = (level) => {
    setExplainLevel(level);
    writeExplainLevel(level);
  };
  const explanation = useMemo(
    () => (currentStep ? explainStep(currentStep, grid, explainLevel) : null),
    [currentStep, grid, explainLevel]
  );

  return (
    <motion.div
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
              {currentStep ? 'Technique Found!' : searching ? 'Searching...' : 'Ready for a Hint?'}
            </h3>
            <p className="text-base text-slate-400">
              {currentStep
                ? techniqueInfo?.level
                : searching
                ? 'No named technique applies; trying what-if chains'
                : 'Click "Hint" to analyze the board'}
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
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => onSelectTechnique(currentStep.technique)}
                title="Learn how this technique works"
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
              <div className="ml-auto">
                <LevelToggle level={explainLevel} onChange={changeLevel} />
              </div>
            </div>

            {currentStep.technique === 'Hypothesis Mode' && (
              <p className="text-sm text-amber-200 bg-amber-950/40 border border-amber-800/50 rounded-xl px-4 py-3">
                No deductive technique in the mentor's toolkit applies to this position, so this hint
                uses what-if search: assume a value, follow the consequences, and rule it out if it
                breaks the puzzle.
              </p>
            )}

            {/* Explanation, at the reader's chosen level */}
            <Explanation explanation={explanation} />

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

            {/* Both paths of a Cell Forcing Chain, so the convergence is visible */}
            {currentStep.technique === 'Cell Forcing Chain' && Array.isArray(currentStep.chains) && (
              <div className="space-y-2">
                <p className="text-base font-medium text-slate-300">Both paths:</p>
                {currentStep.chains.map((path, pi) => (
                  <div key={pi} className="bg-slate-800 rounded-xl p-3">
                    <p className="text-sm font-medium mb-1" style={{ color: path.color || '#94a3b8' }}>{path.label}</p>
                    <ol className="text-xs text-slate-300 space-y-0.5">
                      {(path.cells ?? []).filter((e) => e.action === 'place').map((e, i) => (
                        <li key={i}>{cellRef(e.cell)} = {e.value}{e.reason && i > 0 ? <span className="text-slate-500"> ({e.reason})</span> : null}</li>
                      ))}
                    </ol>
                  </div>
                ))}
              </div>
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
            ) : searching ? (
              <div className="py-6" role="status" aria-live="polite">
                <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-slate-800 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400" aria-hidden="true"></div>
                </div>
                <p className="text-slate-300 text-base">Searching what-if chains in the background</p>
                <p className="text-slate-500 text-sm mt-1 mb-3">The board stays usable. Changing it stops the search.</p>
                <button
                  onClick={onCancelSearch}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-medium transition-colors"
                >
                  Cancel search
                </button>
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
