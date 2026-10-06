import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, ChevronLeft, ChevronRight, RotateCcw, FastForward, X } from 'lucide-react';
import { setHintAnimation, useHintAnimation } from './hintAnimation';

const FRAME_MS = 3500;

const Btn = ({ label, onClick, disabled, primary, children }) => (
  <button type="button" aria-label={label} title={label} onClick={onClick} disabled={disabled}
    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${primary ? 'bg-violet-600 hover:bg-violet-500 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-200'}`}>
    {children}
  </button>
);

/** Caption and playback controls shown right under the board. */
export default function HintAnimationControls() {
  const anim = useHintAnimation();
  const index = anim?.index;
  const playing = anim?.playing;
  const last = anim ? anim.frames.length - 1 : 0;
  const go = (i, play = false) => setHintAnimation({ ...anim, index: i, playing: play });

  useEffect(() => {
    if (!anim || !playing) return undefined;
    const id = setTimeout(() => setHintAnimation({ ...anim, index: Math.min(last, index + 1), playing: index + 1 < last }), FRAME_MS);
    return () => clearTimeout(id);
  }, [anim, playing, index, last]);

  if (!anim) return null;
  return (
    <div className="absolute inset-0 z-10 overflow-y-auto rounded-[inherit] bg-slate-900 border border-violet-600/60 p-2 sm:p-3 flex flex-col justify-center gap-2">
      <motion.p key={index} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} aria-live="polite"
        className="text-slate-100 text-sm sm:text-base leading-snug">
        {anim.frames[index].caption}
      </motion.p>
      <div className="flex flex-wrap items-center gap-2">
        <Btn label="Previous" onClick={() => go(Math.max(0, index - 1))} disabled={index === 0}><ChevronLeft className="w-4 h-4" /></Btn>
        {index < last ? (
          <Btn primary label={playing ? 'Pause' : 'Play'} onClick={() => go(index, !playing)}>
            {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}{playing ? 'Pause' : 'Play'}
          </Btn>
        ) : (
          <Btn primary label="Replay" onClick={() => go(0, true)}><RotateCcw className="w-4 h-4" />Replay</Btn>
        )}
        <Btn label="Next" onClick={() => go(Math.min(last, index + 1))} disabled={index === last}><ChevronRight className="w-4 h-4" /></Btn>
        <Btn label="Show result" onClick={() => go(last)} disabled={index === last}><FastForward className="w-4 h-4" /></Btn>
        <span className="ml-auto text-xs text-slate-400">Step {index + 1} of {last + 1}</span>
        <Btn label="Close animation" onClick={() => setHintAnimation(null)}><X className="w-4 h-4" /></Btn>
      </div>
    </div>
  );
}