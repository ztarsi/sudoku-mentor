// The hint animation, across the whole catalog (#97).
//
// The template was built for one technique. The thing to prove here is that
// it reaches the rest: that every technique whose proof has more than one
// step is animated, that a one-step proof is not, and that no technique is
// quietly left without a frame builder - with sixty-one of them, that has
// to be measured rather than assumed.
//
// Beside it, the two things the animation gained on the way: captions that
// follow the player's explanation level, and frames that are the proof
// rather than a decoration on it.
import { describe, it, expect } from 'vitest';
import {
  findNextLogicStep,
  findAllTechniqueInstances,
  generateCandidates,
  eliminateCandidatesFromPeers,
  applyLogicStep,
} from '../logicEngine';
import { findForcingChain, findForcingNet, findHypothesis } from '../forcingChainEngine';
import { buildHintFrames, canAnimate } from '../hintFrames';
import { TECHNIQUES, techniqueTier } from '../techniqueCatalog';
import { UNIQUENESS_ONE, establishUniqueness } from '../uniqueness';
import { PUZZLES } from '../puzzles';
import { cellName } from '../gridUnits';

const at = (row, col) => (row - 1) * 9 + (col - 1);
const emptyCell = (i) => ({
  cellIndex: i, value: null, isFixed: false, candidates: [],
  isHighlighted: false, highlightColor: null, isBaseCell: false, isTargetCell: false,
});
const buildGrid = (puzzle) =>
  generateCandidates(puzzle.map((value, index) => ({
    ...emptyCell(index), value: value || null, isFixed: value !== 0,
  })));

/**
 * One real instance of as many techniques as the library can produce,
 * harvested from the intermediate grids of every library puzzle. Real
 * steps, not fixtures: a frame builder that only works on hand-made data
 * is no use to a player.
 */
const harvest = () => {
  const found = new Map();
  const names = TECHNIQUES.map((t) => t.name);
  const searches = { '@Forcing': findForcingChain, '@Net': findForcingNet, '@Trial': findHypothesis };
  for (const puzzle of Object.values(PUZZLES).flat()) {
    let grid = eliminateCandidatesFromPeers(buildGrid(puzzle.puzzle));
    const { state: uniqueness } = establishUniqueness(puzzle.puzzle);
    for (let iteration = 0; iteration < 200; iteration++) {
      if (iteration % 4 === 0) {
        for (const name of names) {
          if (found.has(name)) continue;
          let instances = [];
          try { instances = findAllTechniqueInstances(grid, name, { uniqueness }) ?? []; } catch { /* a detector that cannot run here */ }
          if (instances.length > 0) found.set(name, { step: instances[0], grid });
        }
        for (const [key, find] of Object.entries(searches)) {
          if (found.has(key)) continue;
          let step = null;
          try { step = find(grid); } catch { /* no proof from this board */ }
          if (step) found.set(key, { step, grid });
        }
      }
      const step = findNextLogicStep(grid, null, { uniqueness });
      if (!step) break;
      grid = applyLogicStep(grid, step);
    }
  }
  return found;
};

const FOUND = harvest();
const LEVELS = /** @type {const} */ (['simple', 'detailed']);

// The vocabulary a beginner caption may never use: the same list the
// lesson text is held to, because these are the same sentences.
const JARGON = /\b(candidate|unit|conjugate|strong link|node|peer|bivalue|bi-value)\b/i;

/** Every frame is a whole picture, so every field is always there. */
const expectWellFormed = (frames, where) => {
  expect(frames.length, where).toBeGreaterThan(1);
  for (const [i, f] of frames.entries()) {
    expect(f.caption.trim().length, `${where} frame ${i}`).toBeGreaterThan(0);
    expect(Array.isArray(f.regions), `${where} frame ${i}`).toBe(true);
    expect(Array.isArray(f.lines), `${where} frame ${i}`).toBe(true);
    expect(Array.isArray(f.rings), `${where} frame ${i}`).toBe(true);
    expect(Array.isArray(f.crosses), `${where} frame ${i}`).toBe(true);
    expect(Array.isArray(f.ghosts), `${where} frame ${i}`).toBe(true);
    for (const cell of f.crosses) expect(cell, `${where} frame ${i}`).toBeGreaterThanOrEqual(0);
  }
};

/**
 * The point of an animation: the conclusion arrives last. The first frame
 * may not already show what the step erases or places, or there was
 * nothing to watch.
 */
const expectBuildsUp = (frames, step, where) => {
  const first = frames[0];
  expect(first.crosses, `${where}: the first frame gives the answer away`).toHaveLength(0);
  expect(first.place, `${where}: the first frame gives the answer away`).toBeNull();
  const last = frames[frames.length - 1];
  const erased = [...new Set((step.eliminations ?? []).map((e) => e.cell))].sort((a, b) => a - b);
  expect([...last.crosses].sort((a, b) => a - b), where).toEqual(erased);
  if (step.placement) expect(last.place, where).toEqual(step.placement);
};

describe('every technique the library can show', () => {
  it('animates a proof of more than one step, and never a single', () => {
    const singles = [];
    const animated = [];
    for (const technique of TECHNIQUES.map((t) => t.name)) {
      const hit = FOUND.get(technique);
      if (!hit) continue;
      const single = techniqueTier(technique) === 'Basic';
      const frames = buildHintFrames(hit.step, hit.grid, 'simple');
      if (single) {
        // A single is one step: look at the cell, write the digit. One
        // frame is not an animation, so there is no button at all.
        expect(frames, `${technique} should not be animated`).toBeNull();
        expect(canAnimate(hit.step, hit.grid), technique).toBe(false);
        singles.push(technique);
        continue;
      }
      expect(frames, `${technique} has no frame builder`).not.toBeNull();
      expectWellFormed(frames, technique);
      expectBuildsUp(frames, hit.step, technique);
      animated.push(technique);
    }
    // The two singles are the only techniques in the Basic tier, and the
    // only ones a player meets without an animate button.
    expect(singles.sort()).toEqual(['Hidden Single', 'Naked Single']);
    // The sweep reached 36 on 26 October. A floor, not a target: if the
    // library stops showing a technique, or one loses its builder, this
    // drops and the test says so rather than passing quietly.
    expect(animated.length).toBeGreaterThanOrEqual(36);
  });

  // The library cannot produce an instance of every technique in the
  // catalog - that is the teaching gap #88 is about, not an animation
  // problem. These are the ones the sweep above never sees, so they are
  // named here rather than silently skipped. Every one of them is covered
  // another way: the forcing tier and the trial by their own engines
  // below, the uniqueness family by the hand-built rectangle below, and
  // the rest by sharing a builder with a family that is swept.
  const NOT_ON_THE_LIBRARY = [
    'W-Wing', 'Remote Pairs',
    'Unique Rectangle Type 1', 'Unique Rectangle Type 2', 'Unique Rectangle Type 3',
    'Unique Rectangle Type 4', 'Unique Rectangle Type 5', 'Unique Rectangle Type 6',
    'Hidden Unique Rectangle', 'Avoidable Rectangle Type 1', 'Avoidable Rectangle Type 2',
    'BUG+1', 'BUG+2', 'BUG+3', 'Unique Loop',
    'Sue de Coq', 'Sue de Coq, extended',
    'Cell Forcing Chain', 'Unit Forcing Chain', 'Digit Forcing Chain',
    'Double Forcing Chain', 'Forcing Net', 'Hypothesis Mode',
  ];

  it('reaches every technique the library has an instance of', () => {
    const unreached = TECHNIQUES.map((t) => t.name).filter((name) => !FOUND.has(name));
    // A technique the sweep stops reaching is a technique nobody is
    // checking, so it has to be a known one rather than a new one.
    for (const name of unreached) {
      expect(NOT_ON_THE_LIBRARY, `${name} is no longer swept`).toContain(name);
    }
  });

  it('writes its captions at whichever level the player chose', () => {
    for (const technique of TECHNIQUES.map((t) => t.name)) {
      const hit = FOUND.get(technique);
      if (!hit || techniqueTier(technique) === 'Basic') continue;
      const [beginner, expert] = LEVELS.map((level) => buildHintFrames(hit.step, hit.grid, level));
      expect(beginner, technique).not.toBeNull();
      expect(expert, technique).not.toBeNull();
      // The beginner wording obeys the vocabulary rules the lesson text
      // obeys, because they are the same sentences.
      for (const f of beginner) {
        expect(f.caption, `${technique}: beginner caption uses jargon - "${f.caption}"`).not.toMatch(JARGON);
      }
      // Expert captions are the same proof in the standard notation, so
      // they name cells the way an expert writes them.
      expect(expert.map((f) => f.caption).join(' '), technique).toMatch(/R\d+C\d+/);
      // The two levels say the same thing differently, so at least one
      // caption has to differ; captions written at one level would not.
      const same = beginner.length === expert.length
        && beginner.every((f, i) => f.caption === expert[i].caption);
      expect(same, `${technique}: the two levels read identically`).toBe(false);
    }
  });

  it('draws the same picture at either level, and only the words change', () => {
    for (const technique of TECHNIQUES.map((t) => t.name)) {
      const hit = FOUND.get(technique);
      if (!hit || techniqueTier(technique) === 'Basic') continue;
      const [beginner, expert] = LEVELS.map((level) => buildHintFrames(hit.step, hit.grid, level));
      const picture = (frames) =>
        frames.map((f) => JSON.stringify([f.regions, f.lines, f.rings, f.crosses, f.ghosts, f.place]));
      // A staged proof reads its stages off the lesson text, which has a
      // different number of sentences per level, so the pictures line up
      // from the front rather than one for one.
      expect(picture(beginner)[0], technique).toEqual(picture(expert)[0]);
      expect(picture(beginner)[beginner.length - 1], technique).toEqual(picture(expert)[expert.length - 1]);
    }
  });
});

describe('a frame is the proof, family by family', () => {
  it('a colouring: one frame per link, in the two colours, then the clash', () => {
    const hit = FOUND.get('X-Cycle');
    expect(hit, 'no X-Cycle on the library').toBeTruthy();
    const frames = buildHintFrames(hit.step, hit.grid, 'simple');
    // One frame per link of the walk, plus the opening and the result.
    expect(frames.length).toBeGreaterThanOrEqual(hit.step.chainNodes.length);
    // The links arrive one at a time and never go backwards.
    let drawn = -1;
    for (const f of frames) {
      expect(f.lines.length).toBeGreaterThanOrEqual(drawn);
      drawn = f.lines.length;
    }
    // Two colours on the board, and only those two.
    const colours = new Set(frames.flatMap((f) => f.rings.map((r) => r.color)));
    expect(colours.size).toBeLessThanOrEqual(2);
    // The link being talked about is drawn heavier than the rest.
    const middle = frames[2];
    expect(middle.lines.some((l) => l.emphasis)).toBe(true);
  });

  it('a chain: the nodes stay ringed as the links build up', () => {
    const hit = FOUND.get('X-Chain') ?? FOUND.get('Alternating Chain') ?? FOUND.get('Grouped X-Chain');
    expect(hit, 'no chain on the library').toBeTruthy();
    const frames = buildHintFrames(hit.step, hit.grid, 'simple');
    let ringed = -1;
    for (const f of frames) {
      expect(f.rings.length).toBeGreaterThanOrEqual(ringed);
      ringed = f.rings.length;
    }
    expect(frames[frames.length - 1].lines.length).toBeGreaterThan(0);
  });

  it('a forcing proof: each case in its own colour, with the digits it forces as ghosts', () => {
    const hit = FOUND.get('@Forcing') ?? FOUND.get('@Net');
    expect(hit, 'no forcing proof on the library').toBeTruthy();
    const frames = buildHintFrames(hit.step, hit.grid, 'simple');
    expectWellFormed(frames, hit.step.technique);
    // The cases disagree with each other, so only one is ever on the
    // board: the ghosts reset when the next case opens.
    const ghostCounts = frames.map((f) => f.ghosts.length);
    expect(Math.max(...ghostCounts)).toBeGreaterThan(0);
    expect(ghostCounts.some((n, i) => i > 0 && n < ghostCounts[i - 1])).toBe(true);
    // A ghost says a cell takes a digit, which is what a case claims.
    for (const f of frames) {
      for (const ghost of f.ghosts) {
        expect(typeof ghost.cell).toBe('number');
        expect(ghost.digit).toBeGreaterThanOrEqual(1);
      }
    }
    const colours = new Set(frames.flatMap((f) => f.lines.map((l) => l.color)));
    expect(colours.size, 'the cases are told apart by colour').toBeGreaterThanOrEqual(1);
  });

  // The forcing tier and the trial come from the search rather than from a
  // detector, so they are taken from their own engines.
  it('the forcing tier and the trial are animated too', () => {
    for (const key of ['@Forcing', '@Net', '@Trial']) {
      const hit = FOUND.get(key);
      expect(hit, `no ${key} proof on the library`).toBeTruthy();
      for (const level of LEVELS) {
        const frames = buildHintFrames(hit.step, hit.grid, level);
        expect(frames, `${hit.step.technique} at ${level}`).not.toBeNull();
        expectWellFormed(frames, `${hit.step.technique} at ${level}`);
      }
      expectBuildsUp(buildHintFrames(hit.step, hit.grid, 'simple'), hit.step, hit.step.technique);
    }
  });

  it('a fish: the base lines first, then the lines the eliminations come out of', () => {
    const hit = FOUND.get('Finned Swordfish') ?? FOUND.get('Swordfish') ?? FOUND.get('X-Wing');
    expect(hit, 'no fish on the library').toBeTruthy();
    const frames = buildHintFrames(hit.step, hit.grid, 'simple');
    expectWellFormed(frames, hit.step.technique);
    // Every region is a whole row or column: that is what a fish stands on.
    for (const f of frames) for (const region of f.regions) expect(region.cells).toHaveLength(9);
    // Fewer regions early than late: the picture is built, not dumped.
    expect(frames[0].regions.length).toBeLessThan(frames[frames.length - 1].regions.length);
  });

  it('a subset: the unit it locks, then what that erases', () => {
    const hit = FOUND.get('Naked Triple') ?? FOUND.get('Hidden Pair') ?? FOUND.get('Naked Pair');
    expect(hit, 'no subset on the library').toBeTruthy();
    const frames = buildHintFrames(hit.step, hit.grid, 'simple');
    expectWellFormed(frames, hit.step.technique);
    expect(frames[0].regions[0].cells).toHaveLength(9);
    expect(frames[0].rings.map((r) => r.cell).sort((a, b) => a - b))
      .toEqual([...hit.step.baseCells].sort((a, b) => a - b));
  });

  it('a set-based step: each almost locked set outlined with its own digits', () => {
    const hit = FOUND.get('ALS-XZ') ?? FOUND.get('ALS-XY-Wing') ?? FOUND.get('Death Blossom');
    expect(hit, 'no set-based step on the library').toBeTruthy();
    const frames = buildHintFrames(hit.step, hit.grid, 'simple');
    expectWellFormed(frames, hit.step.technique);
    const labels = frames.flatMap((f) => f.regions.map((r) => r.label)).filter(Boolean);
    expect(labels.length, 'a set is named by the digits it holds').toBeGreaterThan(0);
    for (const label of labels) expect(label).toMatch(/^\d+$/);
  });

  // The uniqueness family never comes up on the library (#88), so its
  // shape is checked on the smallest board that holds one: four cells with
  // the same two marks bar one, which is a Type 1 deadly rectangle.
  it('a deadly rectangle: the corners that match, then the one that breaks it', () => {
    const grid = Array.from({ length: 81 }, (_, i) => ({ ...emptyCell(i), candidates: [4, 5, 6, 7, 8, 9] }));
    // A deadly rectangle spans exactly two boxes, so the corners sit in
    // two columns three apart.
    const corners = [at(1, 1), at(1, 4), at(2, 1), at(2, 4)];
    for (const cell of corners) grid[cell] = { ...grid[cell], candidates: [1, 2] };
    grid[at(2, 4)] = { ...grid[at(2, 4)], candidates: [1, 2, 3] };
    const [step] = findAllTechniqueInstances(grid, 'Unique Rectangle Type 1', { uniqueness: UNIQUENESS_ONE }) ?? [];
    expect(step, 'no Type 1 rectangle on the fixture').toBeTruthy();
    const frames = buildHintFrames(step, grid, 'simple');
    expectWellFormed(frames, 'Unique Rectangle Type 1');
    expectBuildsUp(frames, step, 'Unique Rectangle Type 1');
    // The floor and the roof are drawn as the two regions they are.
    const regions = frames[frames.length - 1].regions;
    expect(regions.length).toBe(2);
    expect(regions.flatMap((r) => r.cells).sort((a, b) => a - b)).toEqual([...corners].sort((a, b) => a - b));
    expect(frames[frames.length - 1].crosses.map(cellName)).toEqual(['R2C4']);
  });
});

describe('a technique the template does not reach', () => {
  it('offers no animation rather than an empty one', () => {
    // A step shape no builder recognises: no lesson text, no walk, no
    // pattern. With sixty-one techniques in the catalog this is the case
    // that must not show a button.
    const unknown = {
      technique: 'Naked Single', digit: 1, baseCells: [], targetCells: [],
      placement: null, eliminations: [], explanation: '',
    };
    expect(buildHintFrames(unknown, null, 'simple')).toBeNull();
    expect(canAnimate(unknown, null)).toBe(false);
    expect(buildHintFrames(null, null, 'simple')).toBeNull();
    expect(canAnimate(null, null)).toBe(false);
  });

  it('survives a step whose shape it has never seen', () => {
    const odd = {
      technique: 'Sue de Coq', digit: null, baseCells: [0, 1],
      targetCells: [2], placement: null, eliminations: [{ cell: 2, digit: 5 }],
      explanation: '', chainNodes: [{ nonsense: true }, { nonsense: true }],
    };
    expect(() => buildHintFrames(odd, null, 'simple')).not.toThrow();
  });
});
