import React, { useEffect, useMemo, useState } from 'react';
import { Play, Pause, ChevronLeft, ChevronRight, RotateCcw, FastForward, Film } from 'lucide-react';
import { setHintAnimation, buildXCycleFrames } from '../hintAnimation';

const BUILDERS = { 'X-Cycle': buildXCycleFrames };
export const canAnimate = (step) => !!step && !!BUILDERS[step.technique];

const Btn = ({ label, onClick, disabled, children }) => (
  <button type="button" aria-label={label} title={label} onClick={onClick} disabled={disabled}
    className="p-1.5 rounded bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-600 text-slate-200 transition-colors">
    {children}
  </button>
);

/** Steps the board through a hint's reasoning, frame by frame. */
export default function HintAnimator({ step }) {
  const frames = useMemo(() => BUILDERS[step.technique](step), [step]);
  const [index, setIndex] = useState(null); // null = not started
  const [playing, setPlaying] = useState(false);

  useEffect(() => { setIndex(null); setPlaying(false); }, [step]);
  useEffect(() => {
    setHintAnimation(index === null ? null : { frames, index });
  }, [frames, index]);
  useEffect(() => () => setHintAnimation(null), []);
  useEffect(() => {
    if (!playing) return undefined;
    if (index >= frames.length - 1) { setPlaying(false); return undefined; }
    const id = setTimeout(() => setIndex((i) => i + 1), 2200);
    return () => clearTimeout(id);
  }, [playing, index, frames.length]);

  if (index === null) {
    return (
      <button type="button" onClick={() => { setIndex(0); setPlaying(true); }}
        className="w-full px-4 py-2 rounded-lg text-sm font-medium bg-violet-600 hover:bg-violet-500 text-white flex items-center justify-center gap-1.5">
        <Film className="w-4 h-4" aria-hidden="true" /> Animate on the board
      </button>
    );
  }

  const last = frames.length - 1;
  return (
    <div className="bg-slate-800 rounded-xl p-3 space-y-2 border border-violet-700/50">
      <p className="text-slate-100 text-base leading-relaxed min-h-[3rem]" aria-live="polite">{frames[index].caption}</p>
      <div className="flex items-center gap-1.5">
        <Btn label="Previous" onClick={() => { setPlaying(false); setIndex(Math.max(0, index - 1)); }} disabled={index === 0}><ChevronLeft className="w-4 h-4" /></Btn>
        {index < last ? (
          <Btn label={playing ? 'Pause' : 'Play'} onClick={() => setPlaying(!playing)}>{playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}</Btn>
        ) : (
          <Btn label="Replay" onClick={() => { setIndex(0); setPlaying(true); }}><RotateCcw className="w-4 h-4" /></Btn>
        )}
        <Btn label="Next" onClick={() => { setPlaying(false); setIndex(Math.min(last, index + 1)); }} disabled={index === last}><ChevronRight className="w-4 h-4" /></Btn>
        <Btn label="Show result" onClick={() => { setPlaying(false); setIndex(last); }} disabled={index === last}><FastForward className="w-4 h-4" /></Btn>
        <span className="ml-auto text-xs text-slate-400">{index + 1} / {frames.length}</span>
        <button type="button" onClick={() => { setPlaying(false); setIndex(null); }} className="text-xs text-slate-400 hover:text-slate-200 px-1">Close</button>
      </div>
    </div>
  );
}