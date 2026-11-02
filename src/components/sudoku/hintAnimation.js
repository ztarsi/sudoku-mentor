// A tiny shared store for the hint animation: the hint card drives it,
// the board draws it. Keeps the frame out of the page's prop chain.
import { useSyncExternalStore } from 'react';

/** @typedef {import('./hintFrames').buildHintFrames} buildHintFrames */

/** @type {{ frames: any[], index: number, playing: boolean } | null} */
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
  setHintAnimation({ frames, index: 0, playing: !reducedMotion });
};
