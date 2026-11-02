// @vitest-environment jsdom
// Entering a digit with the Techniques list open must stay instant.
//
// This is the budget the whole panel-at-scale batch exists to protect: the
// live counts used to mean every detector ran in the render that follows a
// keystroke, which is what made the board stutter and what would become
// unaffordable at fifty-odd techniques. The guard is not a timing
// threshold, which would be flaky, but a count: the render that follows a
// board change runs no detector at all. The wall-clock numbers are printed
// alongside, measured rather than assumed.
import React from 'react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, act, cleanup } from '@testing-library/react';

const detectorRuns = [];
const detectorCost = { ms: 0 };
vi.mock('../logicEngine', async (importOriginal) => {
  const actual = /** @type {any} */ (await importOriginal());
  return {
    ...actual,
    findAllTechniqueInstances: (grid, technique) => {
      detectorRuns.push(technique);
      const started = performance.now();
      const found = actual.findAllTechniqueInstances(grid, technique);
      detectorCost.ms += performance.now() - started;
      return found;
    },
  };
});

const { default: LogicPanel } = await import('../LogicPanel');
const {
  generateCandidates,
  findNextLogicStep,
  applyLogicStep,
  eliminateCandidatesFromPeers,
  findAllTechniqueInstances,
} = await import('../logicEngine');
const { PUZZLES } = await import('../puzzles');
const { COUNT_LIVE, LIVE_COUNT_TECHNIQUES, TECHNIQUES } = await import('../techniqueCatalog');

/** The live-counted techniques of one tier, in ladder order. */
const liveTier = (level) =>
  TECHNIQUES.filter((tech) => tech.tier === level && tech.count === COUNT_LIVE).map((t) => t.name);

const buildGrid = (puzzle) =>
  generateCandidates(
    puzzle.map((value, index) => ({
      cellIndex: index, value: value || null, isFixed: value !== 0, candidates: [],
      isHighlighted: false, highlightColor: null, isBaseCell: false, isTargetCell: false,
    }))
  );

/** A board played forward until `filled` cells carry a digit. */
const playTo = (puzzle, filled) => {
  let grid = buildGrid(puzzle);
  for (let i = 0; i < 400; i++) {
    if (grid.filter((c) => c.value !== null).length >= filled) break;
    const step = findNextLogicStep(grid, null);
    if (!step) break;
    grid = applyLogicStep(grid, step);
    if (step.placement) grid = eliminateCandidatesFromPeers(grid, step.placement.cell, step.placement.digit);
  }
  return grid;
};

const noop = () => {};
const panel = (grid, extra = {}) => (
  <LogicPanel
    currentStep={null}
    grid={grid}
    noAssistMode={false}
    onHighlightTechnique={noop}
    onNextStep={noop}
    onApplyStep={noop}
    onCancelHintSearch={noop}
    onAssistUsed={noop}
    onNextPuzzle={noop}
    onShowSingle={noop}
    getElapsedSeconds={() => 0}
    {...extra}
  />
);

// The numbers are output, not an assertion: vitest keeps console.log to
// itself, so write straight to stdout where there is one.
const out = (text) => {
  const stdout = /** @type {any} */ (globalThis).process?.stdout;
  if (stdout && typeof stdout.write === 'function') stdout.write(`${text}\n`);
  else console.log(text);
};

beforeEach(() => {
  detectorRuns.length = 0;
  detectorCost.ms = 0;
  // The player left the Techniques list open: the expensive case.
  window.localStorage.setItem('sudoku-mentor:techniques-open', '1');
  window.localStorage.setItem('sudoku-mentor:technique-tiers-open', JSON.stringify(['Expert', 'Ultimate']));
});
afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

const letTheCountsHappen = async () => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 500));
  });
};

describe('entering a digit with the Techniques list open', () => {
  it('runs no detector in the render the player is waiting for', async () => {
    // A nearly full board on the hardest shelf: the most pencil marks and
    // the most patterns to find.
    const nearlyFull = playTo(PUZZLES.ultimate[1].puzzle, 72);
    const { rerender } = render(panel(nearlyFull));
    await letTheCountsHappen();
    const afterFirstPass = detectorRuns.length;
    expect(afterFirstPass, 'the open panel should count the live tiers').toBeGreaterThan(0);

    // Now the player places a digit. The board object changes, the panel
    // re-renders, and nothing may be computed before it paints.
    const next = nearlyFull.map((cell) => ({ ...cell }));
    detectorRuns.length = 0;
    const started = performance.now();
    act(() => { rerender(panel(next)); });
    const elapsed = performance.now() - started;

    expect(detectorRuns, 'a digit must not pay for a single detector run').toEqual([]);
    out(`  digit entered, panel open, 72 of 81 cells filled: render ${elapsed.toFixed(1)} ms, ${detectorRuns.length} detector runs`);
    // Generous, because a loaded CI box is slow; the assertion that matters
    // is the zero above.
    expect(elapsed).toBeLessThan(250);
  });

  it('counts the easiest tier that has something, and stops there', async () => {
    // The rule from #128: a count of a harder technique taken while an
    // easier move is on the board is four times out of five a count of
    // patterns the move is about to destroy. So the pass stops.
    const midGame = playTo(PUZZLES.diabolical[1].puzzle, 40);
    const basic = liveTier('Basic');
    // The premise, checked rather than assumed: if this board has no
    // single on it, the test below is asserting something else.
    const singles = basic.filter((name) => findAllTechniqueInstances(midGame, name).length > 0);
    expect(singles.length, 'the fixture should have a single on it').toBeGreaterThan(0);

    detectorRuns.length = 0;
    detectorCost.ms = 0;
    render(panel(midGame));
    await letTheCountsHappen();

    // The whole of the easiest tier, because a tier is the unit, and
    // nothing after it.
    expect([...detectorRuns].sort()).toEqual([...basic].sort());
    out(
      `  deferred count pass, mid-game board: ${detectorRuns.length} of ${LIVE_COUNT_TECHNIQUES.length} live detectors ` +
        `(the rest held back by a single on the board), ${detectorCost.ms.toFixed(1)} ms of work after the paint`
    );
  });

  it('counts every live tier on a board where nothing easy applies', async () => {
    // Played until the singles run out: now the harder tiers are the ones
    // worth counting, and all of them are counted.
    let grid = playTo(PUZZLES.diabolical[1].puzzle, 40);
    for (let i = 0; i < 200; i++) {
      const easy = liveTier('Basic').some((name) => findAllTechniqueInstances(grid, name).length > 0);
      if (!easy) break;
      const step = findNextLogicStep(grid, null);
      if (!step) break;
      grid = applyLogicStep(grid, step);
      if (step.placement) {
        grid = eliminateCandidatesFromPeers(grid, step.placement.cell, step.placement.digit);
      }
    }
    detectorRuns.length = 0;
    render(panel(grid));
    await letTheCountsHappen();
    // Whatever the first tier with something is, everything easier than it
    // ran too, and the pass is a prefix of the ladder.
    const order = LIVE_COUNT_TECHNIQUES;
    const ran = new Set(detectorRuns);
    const prefix = order.slice(0, detectorRuns.length);
    expect([...ran].sort()).toEqual([...prefix].sort());
    expect(detectorRuns.length).toBeGreaterThan(liveTier('Basic').length);
  });

  it('pays nothing for a board change while the list is closed', async () => {
    window.localStorage.setItem('sudoku-mentor:techniques-open', '0');
    const grid = playTo(PUZZLES.easy[0].puzzle, 40);
    const { rerender } = render(panel(grid));
    await letTheCountsHappen();
    act(() => { rerender(panel(grid.map((cell) => ({ ...cell })))); });
    await letTheCountsHappen();
    expect(detectorRuns).toEqual([]);
  });

  it('pays nothing in No Assist, even with the list open', async () => {
    const grid = playTo(PUZZLES.easy[0].puzzle, 40);
    render(panel(grid, { noAssistMode: true }));
    await letTheCountsHappen();
    expect(detectorRuns).toEqual([]);
  });
});
