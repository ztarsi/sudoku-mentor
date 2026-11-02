import React, { useEffect, useMemo } from 'react';
import { Film } from 'lucide-react';
import { setHintAnimation, useHintAnimation, startHintAnimation } from '../hintAnimation';
import { buildHintFrames } from '../hintFrames';
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery';

/**
 * Starts the board animation; captions and controls live under the board.
 *
 * The frames are built at the player's chosen explanation level, so the
 * captions are the Beginner sentences or the Expert notation of the very
 * same proof. No frames means no button: a one-step proof has nothing to
 * animate, and nor has a technique whose shape has no builder.
 *
 * @param {{ step: object, grid: object[], level?: 'simple'|'detailed' }} props
 */
export default function HintAnimator({ step, grid, level = 'simple' }) {
  const anim = useHintAnimation();
  const reducedMotion = usePrefersReducedMotion();
  const frames = useMemo(() => buildHintFrames(step, grid, level), [step, grid, level]);

  useEffect(() => { setHintAnimation(null); }, [step, level]);
  useEffect(() => () => setHintAnimation(null), []);

  if (!frames) return null;
  if (anim) {
    return <p className="text-sm text-violet-300 text-center">Playing on the board, see the captions under the puzzle.</p>;
  }
  return (
    <button type="button" onClick={() => startHintAnimation(frames, { reducedMotion })}
      className="w-full px-4 py-2 rounded-lg text-sm font-medium bg-violet-600 hover:bg-violet-500 text-white flex items-center justify-center gap-1.5">
      <Film className="w-4 h-4" aria-hidden="true" /> Animate on the board
    </button>
  );
}
