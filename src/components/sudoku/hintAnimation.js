// A tiny shared store for the hint animation: the hint card drives it,
// the board draws it. Keeps the frame out of the page's prop chain.
import { useSyncExternalStore } from 'react';
import { getRow, getCol, getBox, arePeers, cellName } from './gridUnits';

let state = null; // { frames, index } | null
const listeners = new Set();

export const setHintAnimation = (next) => {
  state = next;
  listeners.forEach((l) => l());
};

export const useHintAnimation = () =>
  useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => state);

const linkUnit = (a, b) =>
  getRow(a) === getRow(b) ? `row ${getRow(a) + 1}`
  : getCol(a) === getCol(b) ? `column ${getCol(a) + 1}`
  : `box ${getBox(a) + 1}`;

/**
 * One frame of a hint animation: how much of the picture the board draws,
 * and the one sentence shown under it.
 *
 * @typedef {object} HintFrame
 * @property {number} digit
 * @property {number[]} chain
 * @property {{from: {cell: number}, to: {cell: number}}[]} allLinks
 * @property {number[]} colorA
 * @property {number[]} colorB
 * @property {number} links      how many of `allLinks` are drawn
 * @property {boolean} colored   whether the two colours are on
 * @property {string} caption
 * @property {number[]} [active] the link the caption is about
 * @property {number[]} [conflict] the two same-colour cells that clash
 * @property {number[]} [wrongCells] the colour a wrap has killed
 * @property {{cell: number, a: number|undefined, b: number|undefined}[]} [proofs]
 * @property {number} [focus]
 */

/**
 * Frames for an X-Cycle hint. Each frame says how much of the picture the
 * board shows: `links` drawn so far, whether the colours are on, and the
 * result evidence (`proofs`: lines from an erased mark to what it sees,
 * `conflict`: the two same-colour cells that clash in a wrap).
 */
export const buildXCycleFrames = (step) => {
  const d = step.digit;
  const links = step.strongLinks ?? [];
  const colorA = step.colorA ?? [];
  const colorB = step.colorB ?? [];
  const base = { digit: d, chain: step.baseCells, allLinks: links, colorA, colorB };
  /** @type {HintFrame[]} */
  const frames = [{ ...base, links: 0, colored: false, caption: `Focus on the ${d}s. These highlighted cells are joined into one chain.` }];

  links.forEach((l, i) => {
    frames.push({
      ...base,
      links: i + 1,
      colored: false,
      active: [l.from.cell, l.to.cell],
      caption: `In ${linkUnit(l.from.cell, l.to.cell)}, ${d} fits only in ${cellName(l.from.cell)} or ${cellName(l.to.cell)}. If one is not ${d}, the other is.`,
    });
  });

  frames.push({ ...base, links: links.length, colored: true, caption: `Colour the chain alternately, blue and orange. Either every blue cell is ${d}, or every orange cell is.` });

  if (step.colorRule === 'wrap') {
    const cells = step.wrappedColor === 0 ? colorA : colorB;
    let conflict = null;
    for (let i = 0; i < cells.length && !conflict; i++)
      for (let j = i + 1; j < cells.length && !conflict; j++)
        if (arePeers(cells[i], cells[j])) conflict = [cells[i], cells[j]];
    const name = step.wrappedColor === 0 ? 'blue' : 'orange';
    const done = { ...base, links: links.length, colored: true, conflict };
    frames.push({
      ...done,
      caption: conflict
        ? `Look: ${cellName(conflict[0])} and ${cellName(conflict[1])} are both ${name} and share a unit. They can't both be ${d}.`
        : `Two ${name} cells share a unit, so they can't both be ${d}.`,
    });
    frames.push({
      ...done, wrongCells: cells,
      caption: `So ${name} is the wrong colour: erase ${d} from every ${name} cell.`,
    });
  } else {
    const proofs = step.eliminations.map(({ cell }) => ({
      cell,
      a: colorA.find((c) => arePeers(cell, c)),
      b: colorB.find((c) => arePeers(cell, c)),
    }));
    proofs.forEach((p, i) => {
      frames.push({
        ...base, links: links.length, colored: true, proofs: proofs.slice(0, i + 1), focus: p.cell,
        caption: `${cellName(p.cell)} sees blue ${cellName(p.a)} and orange ${cellName(p.b)}. Whichever colour is right, ${cellName(p.cell)} can't be ${d}: erase it.`,
      });
    });
  }
  return frames;
};
