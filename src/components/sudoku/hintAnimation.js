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

  if (step.rule === 'wrap') {
    const cells = step.wrappedColor === 0 ? colorA : colorB;
    let conflict = null;
    for (let i = 0; i < cells.length && !conflict; i++)
      for (let j = i + 1; j < cells.length && !conflict; j++)
        if (arePeers(cells[i], cells[j])) conflict = [cells[i], cells[j]];
    const name = step.wrappedColor === 0 ? 'blue' : 'orange';
    frames.push({
      ...base, links: links.length, colored: true, conflict, result: true,
      caption: conflict
        ? `${cellName(conflict[0])} and ${cellName(conflict[1])} are both ${name} and share a unit, so they can't both be ${d}. ${name[0].toUpperCase() + name.slice(1)} is wrong: erase ${d} from every ${name} cell.`
        : `Two ${name} cells share a unit, so ${name} is wrong: erase ${d} from every ${name} cell.`,
    });
  } else {
    const proofs = step.eliminations.map(({ cell }) => ({
      cell,
      a: colorA.find((c) => arePeers(cell, c)),
      b: colorB.find((c) => arePeers(cell, c)),
    }));
    frames.push({
      ...base, links: links.length, colored: true, proofs, result: true,
      caption: `Each red cell sees a blue ${d} and an orange ${d}. Whichever colour is right, it clashes, so erase ${d} there.`,
    });
  }
  return frames;
};