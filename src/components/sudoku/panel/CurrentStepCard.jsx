import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, Eye, Sparkles, Check, FlaskConical, Timer, Trophy, Play, ChevronRight, Loader2, X, Sprout } from 'lucide-react';
import { LEVEL_COLORS, TECHNIQUE_INFO, isTrialTechnique } from '../techniqueCatalog';
import { explainStep, readExplainLevel, writeExplainLevel, legendFor } from '../explainStep';

import { cellName as cellRef } from '../gridUnits';
import Callout from '../Callout';
import HintAnimator from './HintAnimator';

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

/**
 * The "current hint" card: technique badge, explanation, the shape a
 * pattern makes, eliminations and placement summary - or the hint prompt
 * when idle. A proof of more than one step is walked on the board, by the
 * one animator there is (#97), not in a second list in here.
 */

/**
 * The deadly pattern, drawn as the shape it is.
 *
 * A uniqueness step is about four cells that form a rectangle, and reading
 * four cell names off a line does not show that. The corners that match
 * each other are drawn one way and the odd one (or ones) another, so the
 * shape and which corner breaks it are visible at a glance.
 */
const RectangleShape = ({ rectangle, grid }) => {
  const { corners, roof } = rectangle;
  if (!Array.isArray(corners) || corners.length !== 4) return null;
  const odd = new Set(roof ?? []);
  const corner = (cell) => {
    const value = grid?.[cell]?.value ?? null;
    const marks = value ? String(value) : (grid?.[cell]?.candidates ?? []).join(' ');
    return (
      <div
        key={cell}
        className={`rounded-lg border px-2 py-1.5 ${
          odd.has(cell)
            ? 'border-amber-600/70 bg-amber-950/30'
            : 'border-blue-700/70 bg-blue-950/30'
        }`}
      >
        <p className="text-xs font-medium text-slate-200">{cellRef(cell)}</p>
        <p className={`text-xs tabular-nums ${odd.has(cell) ? 'text-amber-300' : 'text-blue-300'}`}>
          {value ? `= ${value}` : marks}
        </p>
      </div>
    );
  };
  return (
    <div>
      <div className="grid grid-cols-2 gap-2 max-w-[15rem]">{corners.map(corner)}</div>
      <p className="text-xs text-slate-500 mt-1">
        {corners.some((cell) => grid?.[cell]?.value)
          ? 'The corners already worked out, and in amber the ones still open.'
          : odd.size === 0
            ? 'The four corners of the rectangle.'
            : odd.size === 1
              ? 'Three corners match; the one in amber is the odd one out.'
              : `The corners in amber are the ones that differ (${odd.size} of four).`}
      </p>
    </div>
  );
};

/**
 * What a net had to hold at once, and whether it ran into the limit.
 *
 * A net that stalls against its depth has not finished looking, and saying
 * nothing would let the card read as though there were nothing more to
 * find (#75).
 */
const NetNote = ({ net }) => (
  <p className="text-xs text-slate-400">
    This one needed a net: it held up to {net.depth} suppositions at once where the forced moves ran out.
    {net.limited
      ? ` It stopped at that limit rather than finishing the board, so there may be more to find here that the mentor did not reach.`
      : ''}
  </p>
);

/** A unique loop: the ring, in the order it closes. */
const LoopShape = ({ loopCells, grid }) => {
  if (!Array.isArray(loopCells) || loopCells.length === 0) return null;
  return (
    <div>
      <div className="flex flex-wrap items-center gap-1">
        {loopCells.map((cell, i) => (
          <span key={cell} className="flex items-center gap-1">
            <span
              className={`px-2 py-1 rounded-lg text-xs border ${
                (grid?.[cell]?.candidates ?? []).length > 2
                  ? 'border-amber-600/70 bg-amber-950/30 text-amber-300'
                  : 'border-blue-700/70 bg-blue-950/30 text-blue-300'
              }`}
            >
              {cellRef(cell)}
            </span>
            {i < loopCells.length - 1 && <span className="text-slate-600" aria-hidden="true">→</span>}
          </span>
        ))}
        <span className="text-slate-600" aria-hidden="true">↩</span>
      </div>
      <p className="text-xs text-slate-500 mt-1">
        The ring closes back on itself; the cells in amber carry something extra.
      </p>
    </div>
  );
};

const formatTime = (seconds) => {
  const s = Math.max(0, Math.floor(seconds || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/** Every digit a step is about: placed, paired, or erased. */
const digitsOf = (step) => {
  const placed = step.placement ? [step.placement.digit] : [];
  const paired = Array.isArray(step.subsetDigits)
    ? step.subsetDigits
    : Array.isArray(step.pairDigits) ? step.pairDigits : [];
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
  solved = null,
  lessonLog = [],
  onNextPuzzle,
  canGoUp = true,
  nothingLeft = false,
  onShowSingle,
  getElapsedSeconds,
  hintPrompt = null,
  cardPrompt = null,
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

  // Only trial and error wears the what-if heading and colour: a forcing
  // proof checks every option, so it is a deduction and is shown as one (#75).
  const isWhatIf = !!currentStep && isTrialTechnique(currentStep.technique);
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
                {isWhatIf
                  ? currentStep.technique
                  : currentStep.forcingBranches
                    ? 'How this proof works'
                    : 'How to spot it'}
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

            <HintAnimator step={currentStep} grid={grid} level={explainLevel} />

            {currentStep.rectangle && (
              <RectangleShape rectangle={currentStep.rectangle} grid={grid} />
            )}
            {currentStep.loopCells && <LoopShape loopCells={currentStep.loopCells} grid={grid} />}

            {currentStep.forcingNet && <NetNote net={currentStep.forcingNet} />}

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

            {cardPrompt && (
              <div className="pb-1">
                <Callout arrow="down" onDismiss={cardPrompt.onDismiss} testId="prompt-card">{cardPrompt.text}</Callout>
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

  // ---------- Only singles left
  if (nothingLeft) {
    return (
      <CardShell icon={Sprout} title="Only singles left" subtitle="The pencil marks say the rest.">
        <div className="p-4 space-y-3">
          <p className="text-base text-slate-200">Every empty cell now shows a single pencil mark; write them in to finish.</p>
          <ActionRow>
            <PrimaryButton onClick={onShowSingle} aria-keyshortcuts="H">
              <Lightbulb className="w-4 h-4" aria-hidden="true" /> Show me the next one
            </PrimaryButton>
          </ActionRow>
        </div>
      </CardShell>
    );
  }

  // ---------- Idle
  return (
    <CardShell icon={Lightbulb} title="Stuck? Ask for a hint." subtitle="The mentor finds the next logical step and explains it.">
      <div className="p-4 space-y-3">
        {hintPrompt && (
          <div>
            <Callout arrow="down" onDismiss={hintPrompt.onDismiss} testId="prompt-hint">{hintPrompt.text}</Callout>
          </div>
        )}
        <PrimaryButton onClick={onNextStep} aria-label="Get a hint" aria-keyshortcuts="H">
          <Lightbulb className="w-4 h-4" aria-hidden="true" /> Hint
        </PrimaryButton>
      </div>
    </CardShell>
  );
}
