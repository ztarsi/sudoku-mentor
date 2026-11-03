// The forcing proofs, explained move by move (#141).
//
// The founder's two asks of the forcing animation: show the options that
// fail first, not the answer, and say why each move follows from the ones
// before it rather than leave the player to work it out. These tests hold
// the frames and the causes behind them to both, on the forcing proofs the
// Ultimate shelf really produces:
//
//   every cause a move names is a placement this case made earlier, in a
//   cell that sees the one it rules out, holding the digit it rules out;
//   in a refutation the option that survives is never played as a case:
//   it appears once, in the closing frame;
//   a beginner caption, at any depth, uses no jargon, and Expert differs;
//   a claim resting on a trial of its own carries that trial as detail;
//   a step stays plain data, since it crosses the what-if worker.
import { describe, it, expect } from 'vitest';
import { PUZZLES } from '../puzzles';
import { findNextLogicStep, applyLogicStep, eliminateCandidatesFromPeers, generateCandidates } from '../logicEngine';
import { findWhatIfStep } from '../forcingChainEngine';
import { establishUniqueness } from '../uniqueness';
import { buildHintFrames } from '../hintFrames';
import { arePeers, cellName } from '../gridUnits';

const givens = (digits) =>
  generateCandidates(
    digits.map((value, index) => ({
      cellIndex: index,
      value: value || null,
      isFixed: value !== 0,
      candidates: [],
      isHighlighted: false,
      highlightColor: null,
      isBaseCell: false,
      isTargetCell: false,
    }))
  );

// The first puzzles of the Ultimate shelf reach a forcing proof within a
// few steps, of every kind: nets and chains, refutations and convergences,
// placements and eliminations. Walked once, in about ten seconds.
const harvest = () => {
  const found = [];
  for (const { name, puzzle } of PUZZLES.ultimate.slice(0, 7)) {
    const { state: uniqueness } = establishUniqueness(puzzle);
    let grid = givens(puzzle);
    for (let n = 0; n < 12; n++) {
      if (grid.every((c) => c.value !== null)) break;
      const step = findNextLogicStep(grid, null, { uniqueness }) ?? findWhatIfStep(grid);
      if (!step) break;
      if (step.forcingBranches) found.push({ where: `${name} step ${n} (${step.technique})`, step, grid });
      grid = applyLogicStep(grid, step);
      if (step.placement) grid = eliminateCandidatesFromPeers(grid, step.placement.cell, step.placement.digit);
    }
  }
  return found;
};

const FOUND = harvest();
const JARGON = /\b(candidate|unit|conjugate|strong link|node|peer|bivalue|bi-value|contradiction)\b/i;

/** Every frame at every depth, with how it was reached. */
const everyFrame = (frames, path = []) =>
  frames.flatMap((f, i) => [{ f, path: [...path, i] }, ...(f.detail ? everyFrame(f.detail, [...path, i, 'why']) : [])]);

/**
 * Walk a case's items as the player sees them and check every cause: it
 * must be a placement already shown in this case (the assumption or an
 * earlier move), see the cell it rules out, and hold the digit it rules
 * out. Recurses into every trial a net or a dead end carries.
 */
const checkCauses = (start, items, ending, where) => {
  const placed = new Map(start.map((p) => [p.cell, p.digit]));
  const cause = (by, cell, digit, what) => {
    if (!by) return;
    expect(placed.get(by.cell), `${where}: ${what} names ${cellName(by.cell)}, which this case has not placed`).toBe(by.digit);
    expect(by.digit, `${where}: ${what}`).toBe(digit);
    expect(arePeers(by.cell, cell), `${where}: ${what}: ${cellName(by.cell)} does not see ${cellName(cell)}`).toBe(true);
  };
  const trials = (list, cell) => {
    for (const t of list ?? []) {
      expect(t.cell, where).toBe(cell);
      checkCauses([...placed].map(([c, d]) => ({ cell: c, digit: d })).concat({ cell, digit: t.digit }), t.items ?? [], t.ending, `${where} > try ${cellName(cell)}=${t.digit}`);
    }
  };
  for (const item of items) {
    const what = `${cellName(item.cell)}=${item.digit}`;
    if (item.kind === 'naked') for (const b of item.because) cause(b.by, item.cell, b.digit, what);
    if (item.kind === 'hidden') {
      for (const b of item.because) {
        if (b.filled != null) expect(placed.get(b.cell), `${where}: ${what}: ${cellName(b.cell)} was not filled by this case`).toBe(b.filled);
        else cause(b.by, b.cell, item.digit, what);
      }
    }
    if (item.split) {
      for (const b of item.split.narrowed ?? []) cause(b.by, item.split.cell, b.digit, `${what} (why ${cellName(item.split.cell)} had two options)`);
      trials(item.trials, item.split.cell);
    }
    placed.set(item.cell, item.digit);
  }
  if (!ending) return;
  if (ending.kind === 'empty-cell') for (const b of ending.because) cause(b.by, ending.cell, b.digit, 'the empty cell');
  if (ending.kind === 'no-place') for (const b of ending.because) if (b.filled == null) cause(b.by, b.cell, ending.digit, `no ${ending.digit} in ${ending.unit}`);
  if (ending.kind === 'no-option') {
    for (const b of ending.narrowed ?? []) cause(b.by, ending.cell, b.digit, `why ${cellName(ending.cell)} was down to its last options`);
    trials(ending.trials, ending.cell);
  }
  if (ending.kind === 'removes') for (const r of ending.removes) if (r.filled == null) cause(r.by, r.cell, r.digit, `the ${r.digit} in ${cellName(r.cell)}`);
  if (ending.kind === 'reaches') expect(placed.get(ending.cell), `${where}: the case never reaches its conclusion`).toBe(ending.digit);
};

describe('forcing proofs, explained (#141)', () => {
  it('finds proofs of every kind to check', () => {
    const kinds = new Set(FOUND.map(({ step }) => `${step.forcingConclusion.kind}/${step.placement ? 'place' : 'erase'}`));
    expect(FOUND.length).toBeGreaterThanOrEqual(10);
    expect(kinds).toContain('refutation/place');
    expect(kinds).toContain('convergence/erase');
    expect(FOUND.some(({ step }) => step.technique === 'Forcing Net')).toBe(true);
  });

  it('names as a cause only what the case has already placed, in a cell that sees it', () => {
    for (const { step, where } of FOUND) {
      for (const branch of step.forcingBranches) {
        if (!branch.explained) continue;
        checkCauses([branch.assume], branch.explained.items, branch.explained.ending, `${where}, case ${cellName(branch.assume.cell)}=${branch.assume.digit}`);
      }
    }
  });

  it('explains every case that breaks and every case a convergence rests on', () => {
    for (const { step, where } of FOUND) {
      for (const branch of step.forcingBranches) {
        const needed = branch.outcome?.kind === 'contradiction' || step.forcingConclusion.kind === 'convergence';
        expect(Boolean(branch.explained), where).toBe(needed);
        if (branch.outcome?.kind === 'contradiction') expect(branch.explained.ending?.kind, where).not.toBe('reaches');
      }
    }
  });

  it('plays the options that fail first, and the answer only at the end', () => {
    for (const { step, grid, where } of FOUND) {
      const frames = buildHintFrames(step, grid, 'simple');
      const cases = frames.filter((f) => /^Case [A-I]: suppose/.test(f.caption));
      const broken = step.forcingBranches.filter((b) => b.outcome?.kind === 'contradiction');
      if (step.forcingConclusion.kind === 'refutation') {
        // Only the options that break are played; the survivor is the closing line.
        expect(cases.map((f) => f.caption), where).toEqual(
          broken.map((b, i) => `Case ${'ABCDEFGHI'[i]}: suppose ${cellName(b.assume.cell)} is ${b.assume.digit}.`)
        );
        if (step.placement) {
          const answer = new RegExp(`${cellName(step.placement.cell)} (is|as) ${step.placement.digit}\\b`);
          frames.slice(0, -1).forEach((f, i) => expect(answer.test(f.caption), `${where} frame ${i}: gives the answer away`).toBe(false));
          expect(frames[frames.length - 1].place, where).toEqual(step.placement);
        }
      } else {
        // Every option is a case, and the broken ones come first.
        expect(cases, where).toHaveLength(step.forcingBranches.length);
        const order = step.forcingBranches
          .slice()
          .sort((a, b) => Number(b.outcome?.kind === 'contradiction') - Number(a.outcome?.kind === 'contradiction'));
        expect(cases.map((f) => f.caption), where).toEqual(
          order.map((b, i) => `Case ${'ABCDEFGHI'[i]}: suppose ${cellName(b.assume.cell)} is ${b.assume.digit}.`)
        );
      }
      expect(frames[0].crosses, where).toHaveLength(0);
      expect(frames[0].place, where).toBeNull();
    }
  });

  it('opens every trial a claim rests on with Show why, and only those', () => {
    let opened = 0;
    for (const { step, grid, where } of FOUND) {
      for (const { f, path } of everyFrame(buildHintFrames(step, grid, 'simple'))) {
        const invites = /Show why/.test(f.caption);
        expect(Boolean(f.detail), `${where} ${path.join('.')}: ${f.caption}`).toBe(invites);
        if (!f.detail) continue;
        opened++;
        expect(f.detail[0].caption, where).toMatch(/^Try R\dC\d as \d\.$/);
        // A trial ends by breaking the board, or (either-way nets) by
        // reaching the move it proves.
        expect(f.detail[f.detail.length - 1].caption, where).toMatch(/cannot be \d\.|This way/);
      }
    }
    expect(opened).toBeGreaterThan(0);
  });

  it('speaks plainly to a beginner at every depth, and in notation to an expert', () => {
    for (const { step, grid, where } of FOUND) {
      const simple = everyFrame(buildHintFrames(step, grid, 'simple'));
      const detailed = everyFrame(buildHintFrames(step, grid, 'detailed'));
      for (const { f, path } of simple) expect(f.caption, `${where} ${path.join('.')}`).not.toMatch(JARGON);
      expect(detailed.length, where).toBe(simple.length);
      expect(detailed.map(({ f }) => f.caption), where).not.toEqual(simple.map(({ f }) => f.caption));
    }
  });

  it('stays plain data, so it can cross the worker', () => {
    for (const { step, where } of FOUND) expect(structuredClone(step), where).toEqual(step);
  });

  // The trials a net ran are what the explanation is built from. Left on the
  // step's moves they made it fifteen times the size, for nothing.
  it('keeps the trials only inside the explanation', () => {
    for (const { step, where } of FOUND) {
      for (const branch of step.forcingBranches) {
        for (const move of branch.moves) expect(move.net?.trials, where).toBeUndefined();
        expect(branch.outcome?.trials, where).toBeUndefined();
      }
    }
  });
});
