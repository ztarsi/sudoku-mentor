import React, { useEffect } from 'react';
import { Film } from 'lucide-react';
import { setHintAnimation, useHintAnimation, buildXCycleFrames } from '../hintAnimation';

const BUILDERS = { 'X-Cycle': buildXCycleFrames };
export const canAnimate = (step) => !!step && !!BUILDERS[step.technique];

/** Starts the board animation; captions and controls live under the board. */
export default function HintAnimator({ step }) {
  const anim = useHintAnimation();
  useEffect(() => { setHintAnimation(null); }, [step]);
  useEffect(() => () => setHintAnimation(null), []);

  if (anim) {
    return <p className="text-sm text-violet-300 text-center">Playing on the board, see the captions under the puzzle.</p>;
  }
  return (
    <button type="button" onClick={() => setHintAnimation({ frames: BUILDERS[step.technique](step), index: 0, playing: true })}
      className="w-full px-4 py-2 rounded-lg text-sm font-medium bg-violet-600 hover:bg-violet-500 text-white flex items-center justify-center gap-1.5">
      <Film className="w-4 h-4" aria-hidden="true" /> Animate on the board
    </button>
  );
}