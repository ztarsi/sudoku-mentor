// What a count may cost, and where each number comes from (#100).
//
// Two promises live here, and they are not the same promise, so they are
// not the same bar.
//
//   A live count must never stutter the board while the player is entering
//   digits. The panel counts the cheap tiers after the paint, in slices
//   (sliceRunner), and a slice yields only BETWEEN detectors: its budget is
//   checked after a job finishes, never inside one. So one detector is the
//   smallest piece of work that cannot be interrupted. It is also the whole
//   wait when the player taps a single row's Count, which runs that one
//   detector there and then. The bar is therefore per detector, at 150 ms.
//
//   Scan is a wait the player has asked for, and the Ultimate tier's own
//   note says what they are about to spend: it "takes a second or two".
//   The bar is that sentence read at its outer edge - 2000 ms - over the
//   whole pass, because the pass is what the player waits through. Thirty
//   odd detectors each inside a per-detector bar can still add up to a
//   broken promise, so the Scan tier has no per-detector bar at all.
//
// Until #100 the 150 ms bar was asserted against four COUNT_SCAN detectors
// and against nothing else, so the twenty-two detectors where the promise
// actually lives had no assertion at all. That is the hole this file fills.
//
// If the Scan total is ever exceeded there are two honest fixes, and
// raising the number is neither: make a detector cheaper, or change what
// the player is told. The wording and the number move together, which is
// why the test below reads the promise out of the catalog rather than
// quoting it from memory - edit the note and this test asks for the number
// to be looked at again.
//
// Two things this file deliberately does not cover. The cost of a whole
// live pass added up is asserted on mid-game boards in
// fishAndSingleDigit.spec.js ("keeps every live count affordable", 150 ms
// for all of them together). And the 100 ms the panel waits between
// techniques while Scan runs, so the player can watch the list tick along,
// is display pacing rather than detector work: it is not in this bar,
// though it is most of what the player actually waits through today.
import { describe, it, expect } from 'vitest';
import { findAllTechniqueInstances, generateCandidates } from '../logicEngine';
import { LIVE_COUNT_TECHNIQUES, SCAN_TECHNIQUES, TIERS } from '../techniqueCatalog';
import { UNIQUENESS_ONE } from '../uniqueness';
import { PUZZLES } from '../puzzles';

// The numbers are output, not an assertion: vitest keeps console.log to
// itself, so write straight to stdout where there is one.
const out = (text) => {
  const stdout = /** @type {any} */ (globalThis).process?.stdout;
  if (stdout && typeof stdout.write === 'function') stdout.write(`${text}\n`);
  else console.log(text);
};

const buildGrid = (puzzle) =>
  generateCandidates(
    puzzle.map((value, index) => ({
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

/** How many pencil marks a board carries: its density, in one number. */
const pencilMarks = (grid) => grid.reduce((sum, cell) => sum + cell.candidates.length, 0);

// Every library board before a single digit has been placed: the densest
// each of them will ever be, with every pattern that will ever exist on it
// existing at once. Sorted densest first, so the board the bars are quoted
// against is the head of this list and is named in what prints below.
//
// All of them are timed rather than the densest alone, because density
// does not predict cost: ALS-XY-Wing's worst board in the library is
// Coffee Break, the SPARSEST board there is (87 marks), where the many
// small cells make many almost-locked sets. A bar that only ever looked at
// the densest board would let that case grow unwatched.
const LIBRARY = Object.values(PUZZLES)
  .flat()
  .map(({ name, puzzle }) => ({ name, puzzle, marks: pencilMarks(buildGrid(puzzle)) }))
  .sort((a, b) => b.marks - a.marks);

/**
 * What one detector costs on one board: the quickest of three runs.
 *
 * A single sample on a shared runner mostly measures the runner - #75
 * measured 105 ms and 159 ms back to back for the same work - and the
 * budget is what the detector costs, not what a loaded CI box costs.
 * Each run gets a board of its own, because the sets are cached per grid
 * and a second run on the same one would time the cache instead of the
 * work.
 *
 * Uniqueness is established, because every library puzzle is vetted to
 * have exactly one answer and Scan really does run the uniqueness family
 * on them. Timing with it unknown would measure thirteen detectors
 * returning an empty array, and Unique Loop alone is two thirds of the
 * Scan total.
 */
const SAMPLES = 3;
const quickest = (technique, puzzle) => {
  let best = Infinity;
  for (let sample = 0; sample < SAMPLES; sample++) {
    const board = buildGrid(puzzle);
    const started = performance.now();
    findAllTechniqueInstances(board, technique, { uniqueness: UNIQUENESS_ONE });
    best = Math.min(best, performance.now() - started);
  }
  return best;
};

describe('what a count may cost', () => {
  it('no single live count can stutter the board: 150 ms, per detector', () => {
    // A bar over an empty list is not a bar. If the catalog ever stops
    // naming live-counted techniques, this test must say so rather than
    // pass by counting nothing.
    expect(LIVE_COUNT_TECHNIQUES.length, 'nothing is counted live any more').toBeGreaterThan(0);

    const costs = [];
    for (const { name, puzzle } of LIBRARY) {
      for (const technique of LIVE_COUNT_TECHNIQUES) {
        costs.push({ where: `${technique} on ${name}`, ms: quickest(technique, puzzle) });
      }
    }
    const worst = costs.reduce((a, b) => (a.ms > b.ms ? a : b));
    out(
      `  live counts: ${LIVE_COUNT_TECHNIQUES.length} detectors over ${LIBRARY.length} untouched boards, ` +
        `worst ${worst.where} at ${worst.ms.toFixed(1)} ms of the 150 ms a detector may cost`
    );
    // Measured on the code this went in with: no live detector anywhere in
    // the library reached 7 ms. The worst is whichever of Skyscraper,
    // W-Wing, Two-String Kite and Remote Pairs the runner happens to
    // disfavour, between 4 and 7 ms, so the name in the message moves and
    // the number does not. The bar is not the measurement: it is the frame
    // budget the promise is made of, and the gap between them is how much
    // room a new detector has before the board stutters.
    expect(worst.ms, `the worst live count was ${worst.where} at ${worst.ms.toFixed(1)} ms`)
      .toBeLessThan(150);
  });

  it('a whole Scan stays inside the second or two it promises: 2000 ms, in total', () => {
    expect(SCAN_TECHNIQUES.length, 'nothing is counted behind Scan any more').toBeGreaterThan(0);

    // The promise, read out of the catalog rather than remembered: the
    // note the player sees above the Scan button before they press it.
    const scanNote = TIERS.find((tier) => tier.level === 'Ultimate')?.scanNote;
    expect(scanNote, 'the Ultimate tier must tell the player what Scan costs').toBeTruthy();
    expect(
      scanNote,
      'the bar below is this sentence read at its outer edge; if the wording changes the number has to change with it'
    ).toContain('takes a second or two');
    // "a second or two", at its outer edge, is two seconds.
    const SCAN_BUDGET_MS = 2 * 1000;

    const boards = LIBRARY.map(({ name, puzzle }) => {
      const costs = SCAN_TECHNIQUES.map((technique) => ({
        technique,
        ms: quickest(technique, puzzle),
      }));
      return {
        name,
        costs,
        total: costs.reduce((sum, cost) => sum + cost.ms, 0),
      };
    });
    const worst = boards.reduce((a, b) => (a.total > b.total ? a : b));
    const dearest = [...worst.costs].sort((a, b) => b.ms - a.ms).slice(0, 3);

    // The arithmetic, printed where the next person will see it: the sum,
    // what it is a sum of, and which detectors most of it is.
    out(
      `  Scan: ${SCAN_TECHNIQUES.length} detectors, worst board ${worst.name}, ` +
        `${worst.total.toFixed(0)} ms in all of the ${SCAN_BUDGET_MS} ms "a second or two" allows`
    );
    for (const { technique, ms } of dearest) {
      out(`    ${technique.padEnd(24)} ${ms.toFixed(0)} ms (${((ms / worst.total) * 100).toFixed(0)}% of it)`);
    }

    // Measured on the code this went in with: the two densest boards in
    // the library - X-Wing Territory at 304 pencil marks and Nightmare at
    // 303 - are also the two dearest to scan, and they trade places run to
    // run between 760 ms and 870 ms over 33 detectors. Unique Loop is two
    // thirds of that by itself (540-600 ms); Mutant Fish and Franken Fish
    // are about a tenth each; the remaining 30 detectors share the rest.
    // ALS-XY-Wing, the detector #100 started with, costs 107 ms at its own
    // worst (Coffee Break, the sparsest board in the library) inside a
    // 224 ms total there. So the promise holds with better than a twofold
    // margin, and Unique Loop is where to look first if it ever stops.
    expect(
      worst.total,
      `${worst.name} is the dearest board to scan at ${worst.total.toFixed(0)} ms over ` +
        `${SCAN_TECHNIQUES.length} detectors, dearest ${dearest
          .map(({ technique, ms }) => `${technique} ${ms.toFixed(0)} ms`)
          .join(', ')}`
    ).toBeLessThan(SCAN_BUDGET_MS);
  });
});
