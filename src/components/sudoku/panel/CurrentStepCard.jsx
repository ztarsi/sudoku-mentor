import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, Eye, Sparkles, Check, FlaskConical, Timer, Trophy, Play, ChevronRight, Loader2, X, Sprout } from 'lucide-react';
import { LEVEL_COLORS, TECHNIQUE_INFO } from '../techniqueCatalog';
import { explainStep, readExplainLevel, writeExplainLevel, legendFor } from '../explainStep';

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
const Explanation = ({ explanation, legend }) => {
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
    <div className="space-y-1.5">
      {blocks.map(({ key, icon: Icon, label, text, tone }) => (
        <div key={key} className="bg-slate-800 rounded-xl px-4 py-3 flex gap-3">
          <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${tone}`} aria-hidden="true" />
          <div className="min-w-0">
            <p className={`text-xs font-semibold uppercase tracking-wide ${tone} mb-1`}>{label}</p>
            <p className="text-slate-200 leading-relaxed text-base">{text}</p>
          </div>
        </div>
      ))}
      {extra && <p className="text-xs text-slate-500 px-1">{extra}</p>}
      <p className="text-xs text-slate-500 px-1">{legend}</p>
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

const WHAT_IF_TECHNIQUES = new Set(['Hypothesis Mode', 'Cell Forcing Chain', 'Deep Forcing Chain']);

const formatTime = (seconds) => {
  const s = Math.max(0, Math.floor(seconds || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/** Every digit a step is about: placed, paired, or erased. */
const digitsOf = (step) => {
  const placed = step.placement ? [step.placement.digit] : [];
  const paired = Array.isArray(step.pairDigits) ? step.pairDigits : [];
  const erased = (step.eliminations ?? []).map((e) => e.digit);
  const involved = [...new Set([...placed, ...paired, ...(paired.length || placed.length ? [] : erased)])].sort((a, b) => a - b);
  const removed = [...new Set(erased)].sort((a, b) => a - b);
  return { involved, removed };
};

const CardShell = ({ tone = 'slate', icon: Icon, title, subtitle, children }) => {
  const tones = {
    slate: { icon: 'bg-slate-800 text-slate-500', title: 'text-white' },
    found: { icon: 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg', title: 'text-white' },
    whatif: { icon: 'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg', title: 'text-amber-100' },
    solved: { icon: 'bg-gradient-to-br from-yellow-400 to-amber-500 text-slate-900 shadow-lg', title: 'text-white' },
  };
  const t = tones[tone] || tones.slate;
  return (
    <motion.div
      data-tone={tone}
      className={`rounded-2xl shadow-lg shadow-black/50 overflow-hidden border ${
        tone === 'whatif' ? 'bg-amber-950/30 border-amber-700/60' : 'bg-slate-900 border-slate-700'
      }`}
    >
      <div className={`px-5 py-4 border-b ${tone === 'whatif' ? 'border-amber-800/50' : 'border-slate-800'}`}>
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${t.icon}`}>
            <Icon className="w-5 h-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h3 className={`text-lg font-semibold leading-tight ${t.title}`}>{title}</h3>
            {subtitle && <p className="text-sm text-slate-400">{subtitle}</p>}
          </div>
        </div>
      </div>
      {children}
    </motion.div>
  );
};

const ActionRow = ({ children }) => <div className="flex flex-wrap gap-2 pt-1">{children}</div>;
const PrimaryButton = ({ onClick, children, tone = 'blue', ...rest }) => (
  <button
    onClick={onClick}
    {...rest}
    className={`px-4 py-2 rounded-lg font-medium text-sm text-white transition-colors flex items-center gap-1.5 ${
      tone === 'emerald' ? 'bg-emerald-600 hover:bg-emerald-500' : tone === 'amber' ? 'bg-amber-600 hover:bg-amber-500' : 'bg-blue-600 hover:bg-blue-500'
    }`}
  >
    {children}
  </button>
);
const QuietButton = ({ onClick, children, ...rest }) => (
  <button
    onClick={onClick}
    {...rest}
    className="px-4 py-2 rounded-lg font-medium text-sm bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors flex items-center gap-1.5"
  >
    {children}
  </button>
);

/**
 * The hint card, one designed state per situation (hint-card-states spec):
 * idle, found, what-if, searching, No Assist, solved, nothing left. The
 * same component appears wherever the card appears.
 */
export default function CurrentStepCard({
  currentStep,
  grid = null,
  noAssistMode,
  onNextStep,
  onApplyStep,
  searching = false,
  onCancelSearch,
  onSelectTechnique,
  chainPlaybackIndex,
  onChainPlaybackChange,
  isPlayingChain,
  onToggleChainPlayback,
  solved = null,
  lessonLog = [],
  onNextPuzzle,
  canGoUp = true,
  nothingLeft = false,
  onShowSingle,
  getElapsedSeconds,
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

  // No Assist shows the play clock; it ticks once a second while visible.
  const [clock, setClock] = useState(() => (getElapsedSeconds ? getElapsedSeconds() : 0));
  useEffect(() => {
    if (!noAssistMode || solved || !getElapsedSeconds) return undefined;
    setClock(getElapsedSeconds());
    const id = setInterval(() => setClock(getElapsedSeconds()), 1000);
    return () => clearInterval(id);
  }, [noAssistMode, solved, getElapsedSeconds]);

  const isWhatIf = !!currentStep && WHAT_IF_TECHNIQUES.has(currentStep.technique);
  const legendCell = currentStep ? (currentStep.placement?.cell ?? currentStep.baseCells?.[0] ?? currentStep.targetCells?.[0]) : null;

  // ---------- Solved
  if (solved) {
    const seen = new Map();
    for (const entry of lessonLog) {
      const prev = seen.get(entry.technique) || { count: 0, byPlayer: 0 };
      seen.set(entry.technique, { count: prev.count + 1, byPlayer: prev.byPlayer + (entry.byPlayer ? 1 : 0) });
    }
    return (
      <CardShell tone="solved" icon={Trophy} title="Solved" subtitle={`${formatTime(solved.timeInSeconds)} · ${solved.errorCount === 0 ? 'no errors' : `${solved.errorCount} error${solved.errorCount === 1 ? '' : 's'}`}`}>
        <div className="p-4 space-y-3">
          {seen.size > 0 ? (
            <div>
              <p className="text-base font-medium text-slate-300 mb-1">Techniques this puzzle used</p>
              <ul className="space-y-1">
                {[...seen.entries()].map(([technique, { count, byPlayer }]) => (
                  <li key={technique} className="flex items-center justify-between gap-2 text-sm bg-slate-800 rounded-lg px-3 py-2">
                    <button onClick={() => onSelectTechnique?.(technique)} className="text-blue-300 hover:underline text-left">
                      {technique}{count > 1 ? ` ×${count}` : ''}
                    </button>
                    {byPlayer > 0 && (
                      <span className="text-emerald-300 text-xs flex items-center gap-1"><Check className="w-3 h-3" aria-hidden="true" />you placed {byPlayer === count ? 'it' : `${byPlayer} of ${count}`} yourself</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-slate-300 text-base">No hints needed. Every digit was yours.</p>
          )}
          <ActionRow>
            <PrimaryButton onClick={() => onNextPuzzle?.('same')} tone="emerald">
              Next puzzle on this shelf <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </PrimaryButton>
            {canGoUp && (
              <QuietButton onClick={() => onNextPuzzle?.('above')}>Try the shelf above</QuietButton>
            )}
          </ActionRow>
        </div>
      </CardShell>
    );
  }

  // ---------- No Assist
  if (noAssistMode) {
    return (
      <CardShell icon={Timer} title={formatTime(clock)} subtitle="Hints are off in No Assist.">
        <div className="p-4 text-sm text-slate-400">Every solve is timed and recorded when it is clean. Switch No Assist off in the header to get hints again.</div>
      </CardShell>
    );
  }

  // ---------- Searching
  if (searching) {
    return (
      <CardShell tone="whatif" icon={Loader2} title="Looking for a what-if chain..." subtitle="No named technique applies here.">
        <div className="p-4 space-y-3" role="status" aria-live="polite">
          <p className="text-sm text-slate-300">The board stays usable. Changing it stops the search.</p>
          <ActionRow>
            <QuietButton onClick={onCancelSearch}><X className="w-4 h-4" aria-hidden="true" /> Cancel</QuietButton>
          </ActionRow>
        </div>
      </CardShell>
    );
  }

  // ---------- Found (deduction) or what-if
  if (currentStep) {
    const { involved, removed } = digitsOf(currentStep);
    return (
      <CardShell
        tone={isWhatIf ? 'whatif' : 'found'}
        icon={isWhatIf ? FlaskConical : Lightbulb}
        title={isWhatIf ? 'Reasoning by trial' : currentStep.technique}
        subtitle={isWhatIf ? 'No named technique applies. This hint tests a value and follows where it leads.' : techniqueInfo?.level}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep.technique + (currentStep.placement?.cell ?? '') + (currentStep.eliminations?.length ?? 0)}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="p-4 space-y-3"
          >
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => onSelectTechnique(currentStep.technique)}
                title="Learn how this technique works"
                className={`px-3 py-1 rounded-full text-sm font-medium bg-gradient-to-r ${LEVEL_COLORS[techniqueInfo?.color || 'emerald']} text-white hover:shadow-lg transition-all cursor-pointer`}
              >
                {isWhatIf ? currentStep.technique : 'How to spot it'}
              </button>
              {involved.map((d) => (
                <span key={`d${d}`} className="px-2 py-1 bg-slate-800 rounded-lg text-sm font-semibold text-slate-100" aria-label={`digit ${d}`}>{d}</span>
              ))}
              {removed.map((d) => (
                <span key={`e${d}`} className="px-2 py-1 bg-red-950/60 border border-red-800/50 rounded-lg text-sm font-semibold text-red-300" aria-label={`erases ${d}`}>−{d}</span>
              ))}
              <div className="ml-auto">
                <LevelToggle level={explainLevel} onChange={changeLevel} />
              </div>
            </div>

            <Explanation explanation={explanation} legend={legendFor(legendCell)} />

            {(currentStep.technique === 'Deep Forcing Chain' || currentStep.technique === 'Hypothesis Mode') && currentStep.chain && (
              <ChainTrace
                currentStep={currentStep}
                chainPlaybackIndex={chainPlaybackIndex}
                onChainPlaybackChange={onChainPlaybackChange}
                isPlayingChain={isPlayingChain}
                onToggleChainPlayback={onToggleChainPlayback}
              />
            )}

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

            {currentStep.eliminations && currentStep.eliminations.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {currentStep.eliminations.slice(0, 6).map((elim, idx) => (
                  <span key={idx} className="px-2 py-1 bg-red-950/50 text-red-400 text-sm rounded-lg">{cellRef(elim.cell)}: −{elim.digit}</span>
                ))}
                {currentStep.eliminations.length > 6 && (
                  <span className="px-2 py-1 bg-slate-800 text-slate-400 text-sm rounded-lg">+{currentStep.eliminations.length - 6} more</span>
                )}
              </div>
            )}

            <ActionRow>
              <PrimaryButton onClick={onApplyStep} tone={isWhatIf ? 'amber' : 'emerald'} aria-keyshortcuts="A">
                <Play className="w-4 h-4" aria-hidden="true" /> Apply
              </PrimaryButton>
              <QuietButton onClick={onNextStep} aria-keyshortcuts="H">
                Next hint <ChevronRight className="w-4 h-4" aria-hidden="true" />
              </QuietButton>
            </ActionRow>
          </motion.div>
        </AnimatePresence>
      </CardShell>
    );
  }

  // ---------- Nothing left to teach
  if (nothingLeft) {
    return (
      <CardShell icon={Sprout} title="Nothing left to teach" subtitle="Every remaining cell is a single.">
        <div className="p-4 space-y-3">
          <p className="text-base text-slate-200">You can finish this one: every empty cell now has exactly one number that fits.</p>
          <ActionRow>
            <QuietButton onClick={onShowSingle}>Show me one anyway</QuietButton>
          </ActionRow>
        </div>
      </CardShell>
    );
  }

  // ---------- Idle
  return (
    <CardShell icon={Lightbulb} title="Stuck? Ask for a hint." subtitle="The mentor finds the next logical step and explains it.">
      <div className="p-4">
        <PrimaryButton onClick={onNextStep} aria-label="Get a hint" aria-keyshortcuts="H">
          <Lightbulb className="w-4 h-4" aria-hidden="true" /> Hint
        </PrimaryButton>
      </div>
    </CardShell>
  );
}
