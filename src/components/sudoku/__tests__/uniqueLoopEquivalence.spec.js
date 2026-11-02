// Unique Loop, made fast (#125), must find exactly what it found before.
//
// The reference below is the walk as it stood before #125, verbatim except
// that its node budget is lifted, so it is the complete answer. What a loop
// proves is the engine's own loopStep in both, so this checks the walk, not
// the step. The new walk keeps its unit counts in a typed array, checks
// pairs in a table, and stops a path as soon as two of its cells carry
// extras that are not one shared digit, since no loop through them can
// prove anything. Both walks are compared without their budgets: the
// budgets cap work on pathological grids, and at different points, because
// the new walk visits far fewer nodes. The last test checks how far below
// its budget the new walk stays on real boards.
import { describe, it, expect } from 'vitest';
import { findUniqueLoop, loopStep } from '../uniquenessEngine';
import { generateCandidates, findNextLogicStep, applyLogicStep, eliminateCandidatesFromPeers } from '../logicEngine';
import { establishUniqueness } from '../uniqueness';
import { getRow, getCol, getBox, arePeers } from '../gridUnits';
import { PUZZLES } from '../puzzles';

const LOOP_SIZES = [6, 8];

const referenceIsUniqueLoop = (loop) => {
  const counts = new Map();
  for (const cell of loop) {
    for (const key of [`r${getRow(cell)}`, `c${getCol(cell)}`, `b${getBox(cell)}`]) {
      counts.set(key, (counts.get(key) || 0) + 1);
    }
  }
  for (const n of counts.values()) if (n !== 2) return false;
  for (const cell of loop) {
    const partners = loop.filter((other) => other !== cell && arePeers(cell, other));
    if (partners.length !== 2) return false;
  }
  return true;
};

const referenceFindUniqueLoop = (grid, focusedDigit = null, returnAll = false) => {
  const all = [];
  for (let a = 1; a <= 9; a++) {
    for (let b = a + 1; b <= 9; b++) {
      const cells = [];
      for (let i = 0; i < 81; i++) {
        if (grid[i].value === null && grid[i].candidates.includes(a) && grid[i].candidates.includes(b)) cells.push(i);
      }
      if (cells.length < LOOP_SIZES[0]) continue;
      const neighbours = new Map(cells.map((c) => [c, cells.filter((other) => other !== c && arePeers(c, other))]));
      for (const start of cells) {
        const path = [start];
        const used = new Set([start]);
        const unitCount = new Map();
        const bump = (cell, by) => {
          for (const key of [`r${getRow(cell)}`, `c${getCol(cell)}`, `b${getBox(cell)}`]) {
            unitCount.set(key, (unitCount.get(key) || 0) + by);
          }
        };
        const overfull = (cell) =>
          [`r${getRow(cell)}`, `c${getCol(cell)}`, `b${getBox(cell)}`].some((key) => (unitCount.get(key) || 0) >= 2);
        bump(start, 1);
        const walk = () => {
          const here = path[path.length - 1];
          if (path.length >= LOOP_SIZES[0] && path.length % 2 === 0 && arePeers(here, start) && referenceIsUniqueLoop(path)) {
            const step = loopStep(grid, [...path], a, b, focusedDigit);
            if (step) {
              if (!returnAll) return step;
              all.push(step);
            }
          }
          if (path.length >= LOOP_SIZES[LOOP_SIZES.length - 1]) return null;
          for (const next of neighbours.get(here)) {
            if (next < start || used.has(next) || overfull(next)) continue;
            path.push(next);
            used.add(next);
            bump(next, 1);
            const result = walk();
            bump(next, -1);
            used.delete(next);
            path.pop();
            if (result) return result;
          }
          return null;
        };
        const result = walk();
        if (result) return result;
      }
    }
  }
  return returnAll ? all : null;
};

// A small seeded generator, so a failure names a grid that can be rebuilt.
const rng = (seed) => () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 2 ** 32;
};

const buildGrid = (digits) =>
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

// Real mid-game boards from every shelf: each puzzle walked by the hint
// path, sampled along the way.
const midGame = () => {
  const out = [];
  for (const shelf of Object.values(PUZZLES)) {
    for (const { puzzle } of shelf) {
      const { state: uniqueness } = establishUniqueness(puzzle);
      let grid = buildGrid(puzzle);
      for (let i = 0; i < 120; i++) {
        if (i % 8 === 0) out.push(grid);
        const step = findNextLogicStep(grid, null, { uniqueness });
        if (!step) break;
        grid = applyLogicStep(grid, step);
        if (step.placement) grid = eliminateCandidatesFromPeers(grid, step.placement.cell, step.placement.digit);
      }
    }
  }
  return out;
};

// Real boards hold almost no loops, which would make agreement cheap. So
// each is also seeded with loops: the marks of many empty cells are cut down
// to a shared pair, some with one or two extra digits, which is exactly the
// shape the walk and its new early stop are about.
const seeded = (grid, random) => {
  const a = 1 + Math.floor(random() * 9);
  let b = 1 + Math.floor(random() * 8);
  if (b >= a) b++;
  let c = 1 + Math.floor(random() * 7);
  for (const d of [Math.min(a, b), Math.max(a, b)]) if (c >= d) c++;
  return grid.map((cell) => {
    if (cell.value !== null || random() < 0.5) return cell;
    // Mostly the bare pair; some with one shared extra digit, the case a
    // loop with several extra cells needs; a few with a second extra,
    // the case the new walk stops early on.
    const roll = random();
    const marks = roll < 0.6 ? [a, b] : roll < 0.9 ? [a, b, c] : [a, b, c, 1 + Math.floor(random() * 9)];
    return { ...cell, candidates: [...new Set(marks)].sort((x, y) => x - y) };
  });
};

// The reference is slow by design (it is what #125 replaced), so these are
// given a harness timeout well above the default; this bounds the test
// run, not the product, whose budgets are asserted in uniqueness.spec.js.
const SLOW = 300_000;

describe('Unique Loop after #125', () => {
  const random = rng(125);
  const real = midGame();
  const grids = [...real, ...real.map((g) => seeded(g, random)), ...real.map((g) => seeded(g, random))];
  const UNLIMITED = { nodeBudget: Infinity };
  // The reference's complete answer for each grid, walked once. The first
  // step is the head of it, since both walks emit in the same order, and a
  // digit in focus keeps the steps about that digit (loopStep's rule).
  const memo = new Map();
  const reference = (n) => {
    if (!memo.has(n)) memo.set(n, referenceFindUniqueLoop(grids[n], null, true));
    return memo.get(n);
  };
  const aboutDigit = (step, digit) => (step.extraDigits ? step.digit === digit : step.pairDigits.includes(digit));

  it('runs over a few hundred mid-game grids, many holding loops, and the early stop fires', () => {
    expect(grids.length).toBeGreaterThan(300);
    const stats = { nodes: 0, pruned: 0 };
    let cutGrids = 0;
    for (const grid of grids) {
      const before = stats.pruned;
      findUniqueLoop(grid, null, true, { ...UNLIMITED, stats });
      if (stats.pruned > before) cutGrids++;
    }
    const withLoops = grids.filter((_, n) => reference(n).length > 0).length;
    const steps = grids.reduce((sum, _, n) => sum + reference(n).length, 0);
    const shared = grids.filter((_, n) => reference(n).some((step) => step.extraDigits)).length;
    /** @type {any} */ (globalThis).process?.stdout?.write(
      `  unique loop equivalence: ${grids.length} grids, ${withLoops} with loops (${steps} steps, ${shared} with a shared extra digit), early stop fired on ${cutGrids}\n`
    );
    // Fewer than these would mean the seeding no longer makes loops of
    // either kind, or never reaches the early stop, and the agreement
    // below would be cheap.
    expect(withLoops).toBeGreaterThanOrEqual(15);
    expect(shared).toBeGreaterThanOrEqual(5);
    expect(cutGrids).toBeGreaterThanOrEqual(15);
  }, SLOW);

  it('finds every loop the old walk found, in the same order, and nothing else', () => {
    grids.forEach((grid, n) => {
      expect(findUniqueLoop(grid, null, true, UNLIMITED), `grid ${n}`).toEqual(reference(n));
      expect(findUniqueLoop(grid, null, false, UNLIMITED), `grid ${n}, first`).toEqual(reference(n)[0] ?? null);
    });
  }, SLOW);

  it('agrees with a digit in focus too', () => {
    grids.forEach((grid, n) => {
      const digit = 1 + (n % 9);
      expect(findUniqueLoop(grid, digit, true, UNLIMITED), `grid ${n}, digit ${digit}`).toEqual(
        reference(n).filter((step) => aboutDigit(step, digit))
      );
    });
  }, SLOW);

  it('stays far below its node budget on every real board', () => {
    let worst = 0;
    for (const grid of real) {
      const stats = { nodes: 0, pruned: 0 };
      findUniqueLoop(grid, null, true, { stats });
      worst = Math.max(worst, stats.nodes);
    }
    /** @type {any} */ (globalThis).process?.stdout?.write(`  unique loop: worst real board walks ${worst} nodes of a 60000 budget\n`);
    expect(worst).toBeLessThan(6_000);
  });
});
