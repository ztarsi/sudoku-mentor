import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, ChevronLeft, ChevronRight, RotateCcw, FastForward, X } from 'lucide-react';
import { setHintAnimation, useHintAnimation } from './hintAnimation';
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery';

const FRAME_MS = 3500;

const Btn = ({ label, onClick, disabled = false, primary = false, children }) => (
  <button type="button" aria-label={label} title={label} onClick={onClick} disabled={disabled}
    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${primary ? 'bg-violet-600 hover:bg-violet-500 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-200'}`}>
    {children}
  </button>
);

/**
 * Caption and playback controls shown right under the board, in the place
 * of whatever the page passes as children (the digit strip). The two share
 * one grid cell, so the card is as tall as the taller of them: a long
 * caption makes the card grow instead of being cut off inside the strip's
 * height. The player is as tall as its longest caption, so the card does
 * not change height from one frame to the next.
 *
 * `className` shapes the player to its container (a rounded card, or the
 * square fixed bar on tablets).
 */
export default function HintAnimationControls({ children = null, className = 'rounded-[15px]' }) {
  const anim = useHintAnimation();
  const reduced = usePrefersReducedMotion();
  const index = anim?.index;
  const playing = anim?.playing;
  const last = anim ? anim.frames.length - 1 : 0;
  const go = (i, play = false) => setHintAnimation({ ...anim, index: i, playing: play });

  useEffect(() => {
    if (!anim || !playing) return undefined;
    const id = setTimeout(() => setHintAnimation({ ...anim, index: Math.min(last, index + 1), playing: index + 1 < last }), FRAME_MS);
    return () => clearTimeout(id);
  }, [anim, playing, index, last]);

  // Reduced motion: the caption still changes with the frame, it just does
  // not slide in, and nothing advances until the player says so.
  const caption = reduced
    ? { initial: false, animate: { opacity: 1, y: 0 }, transition: { duration: 0 } }
    : { initial: { opacity: 0, y: 4 }, animate: { opacity: 1, y: 0 } };
  const captionText = 'text-slate-100 text-sm sm:text-base leading-snug [grid-area:1/1]';
  const player = anim ? (
    // The inner block centres with auto margins rather than justify-center:
    // if the content is ever taller than the box, auto margins collapse to
    // zero and the first line stays reachable, where centring pushed it
    // above the top of the scroll area and out of reach.
    <div
      data-testid="hint-animation-controls"
      className={`flex flex-col h-full max-h-[50vh] overflow-y-auto bg-slate-900 border border-violet-600/60 p-2 sm:p-3 ${className}`}
    >
      <div className="my-auto flex flex-col gap-2">
        <div className="grid">
          {/* Every caption, stacked and invisible, holds the height of the longest. */}
          {anim.frames.map((frame, i) => (
            <p key={`sizer-${i}`} aria-hidden="true" className={`${captionText} invisible`}>{frame.caption}</p>
          ))}
          <motion.p key={index} {...caption} aria-live="polite" data-testid="hint-animation-caption" className={captionText}>
            {anim.frames[index].caption}
          </motion.p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Btn label="Previous" onClick={() => go(Math.max(0, index - 1))} disabled={index === 0}><ChevronLeft className="w-4 h-4" /></Btn>
          {index < last ? (
            <Btn primary label={playing ? 'Pause' : 'Play'} onClick={() => go(index, !playing)}>
              {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}{playing ? 'Pause' : 'Play'}
            </Btn>
          ) : (
            <Btn primary label="Replay" onClick={() => go(0, !reduced)}><RotateCcw className="w-4 h-4" />Replay</Btn>
          )}
          <Btn label="Next" onClick={() => go(Math.min(last, index + 1))} disabled={index === last}><ChevronRight className="w-4 h-4" /></Btn>
          <Btn label="Show result" onClick={() => go(last)} disabled={index === last}><FastForward className="w-4 h-4" /></Btn>
          <span className="ml-auto text-xs text-slate-400">Step {index + 1} of {last + 1}</span>
          <Btn label="Close animation" onClick={() => setHintAnimation(null)}><X className="w-4 h-4" /></Btn>
        </div>
      </div>
    </div>
  ) : null;

  if (children === null) return player;
  // The strip stays mounted under the player (its state survives the
  // animation) but is hidden, which also takes it out of the tab order and
  // away from screen readers while the player has its place.
  return (
    <div className="grid">
      <div className={`[grid-area:1/1] min-w-0 ${anim ? 'invisible' : ''}`}>{children}</div>
      {player && <div className="[grid-area:1/1] min-w-0">{player}</div>}
    </div>
  );
}
