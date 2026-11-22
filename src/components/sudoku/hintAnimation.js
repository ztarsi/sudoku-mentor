// A tiny shared store for the hint animation: the hint card drives it,
// the board draws it. Keeps the frame out of the page's prop chain.
import { useSyncExternalStore } from 'react';

/** @typedef {import('./hintFrames').buildHintFrames} buildHintFrames */

/**
 * `stack` holds where the player was before stepping into a frame's
 * `detail` (a forcing proof's inner trial, #141): Back returns there.
 * @type {{ frames: any[], index: number, playing: boolean, stack?: { frames: any[], index: number }[] } | null}
 */
let state = null;
const listeners = new Set();

export const setHintAnimation = (next) => {
  state = next;
  listeners.forEach((l) => l());
};

export const useHintAnimation = () =>
  useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => state);

/**
 * Start an animation on the board.
 *
 * It plays by itself unless the player has asked their system for less
 * motion, in which case it opens on the first frame and waits: a feature
 * whose whole job is movement has to be steppable by hand (#97).
 */
export const startHintAnimation = (frames, { reducedMotion = false } = {}) => {
  if (!Array.isArray(frames) || frames.length === 0) return;
  setHintAnimation({ frames, index: 0, playing: !reducedMotion, stack: [] });
};

/**
 * Step into the current frame's detail: the frames that show why it holds.
 * It does not play by itself: a detour is the player's choice to look
 * closer, and they walk it at their own pace.
 */
export const openHintDetail = () => {
  if (!state) return;
  const detail = state.frames[state.index]?.detail;
  if (!Array.isArray(detail) || detail.length === 0) return;
  setHintAnimation({ frames: detail, index: 0, playing: false, stack: [...(state.stack ?? []), { frames: state.frames, index: state.index }] });
};

/** Leave a detail and return to the frame it was opened from. */
export const closeHintDetail = () => {
  if (!state || !state.stack?.length) return;
  const stack = state.stack.slice(0, -1);
  const back = state.stack[state.stack.length - 1];
  setHintAnimation({ frames: back.frames, index: back.index, playing: false, stack });
};
