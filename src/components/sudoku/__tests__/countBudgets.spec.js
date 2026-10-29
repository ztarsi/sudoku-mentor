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
// One thing this file deliberately does not cover: the cost of a whole live
// pass added up is asserted on mid-game boards in fishAndSingleDigit.spec.js
// ("keeps every live count affordable", 150 ms for all of them together).
//
// Until #105 there was a second thing, and it was most of what the player
// actually waited through: the panel paused 100 ms between techniques while
// Scan ran, to animate a dialog listing them. The dialog is gone and so is
// the pause, so the detector time measured below is now very nearly the
// whole wait, and the promise in the catalog's note is about the work
// rather than about the animation over it.
//
// One last thing, about this file rather than about the product (#117). The
// Scan case below is the third timing test in this repository to go red on
// its own runtime rather than on its assertion: it measured 33 detectors on
// all 20 library boards, quickest of three runs each, which is some 2,000
// detector runs inside one `it`, and on a loaded shared runner that passed
// vitest's 30-second per-test limit while the 2000 ms promise it checks was
// still being kept with room to spare. A performance test that is itself
// expensive ends up measuring the harness instead of the product. So when
// writing the next one: keep the measurement cheap enough that the harness
// cannot become the thing under test - sample only the cases that can
// actually approach the bar, rather than every case there is - and give the
// case an explicit timeout, so that a runner having a bad minute reads as a
// slow test and not as a broken promise.
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
 *
 * The sample count is an argument so that the Scan case can rank the
 * library with one run per board before it samples properly; three is what
 * any number the bars are read against is measured with.
 */
const SAMPLES = 3;
const quickest = (technique, puzzle, samples = SAMPLES) => {
  let best = Infinity;
  for (let sample = 0; sample < samples; sample++) {
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

    // How many boards are measured properly, and why not all twenty (#117).
    //
    // The bar is a total on the dearest board, so only the dearest board's
    // number is ever read against it. Sampling all twenty was what made
    // this case time out on its own runtime, so the pass below is in two
    // parts: one run of every detector on every board, which is cheap and
    // ranks them, and then the quickest of three on the few dearest, which
    // is the number the bar is actually read against.
    //
    // The ranking is measured rather than assumed, because density does not
    // predict it. The two densest boards are indeed the two dearest to scan,
    // but the third dearest is Brain Teaser at 208 marks - sixteenth of the
    // twenty by density - so a hand-picked "densest few" would have dropped
    // the third-worst case in the library and not noticed.
    //
    // Nothing over the bar can hide behind this. The boards re-measured are
    // the dearest the ranking pass found, so a board over the budget is
    // either one of them or is beaten by one of them, and the assertion
    // fails either way. Three rather than one, because a single run is
    // noisy: the top two trade places run to run, and three clears the gap
    // between second and third (about 700 ms against about 430 ms) by
    // enough that the true worst cannot be ranked out of it.
    const MEASURED_PROPERLY = 3;
    const ranked = LIBRARY.map(({ name, puzzle }) => ({
      name,
      puzzle,
      ranking: SCAN_TECHNIQUES.reduce((sum, technique) => sum + quickest(technique, puzzle, 1), 0),
    })).sort((a, b) => b.ranking - a.ranking);

    const boards = ranked.slice(0, MEASURED_PROPERLY).map(({ name, puzzle }) => {
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
    // what it is a sum of, which detectors most of it is, and which boards
    // the sum was looked for on.
    out(
      `  Scan: ${SCAN_TECHNIQUES.length} detectors, worst board ${worst.name}, ` +
        `${worst.total.toFixed(0)} ms in all of the ${SCAN_BUDGET_MS} ms "a second or two" allows`
    );
    for (const { technique, ms } of dearest) {
      out(`    ${technique.padEnd(24)} ${ms.toFixed(0)} ms (${((ms / worst.total) * 100).toFixed(0)}% of it)`);
    }
    out(
      `    measured quickest-of-${SAMPLES} on the ${MEASURED_PROPERLY} dearest of ${LIBRARY.length} boards: ` +
        `${boards.map(({ name, total }) => `${name} ${total.toFixed(0)} ms`).join(', ')}`
    );

    // Measured on the code this went in with: the two densest boards in
    // the library - X-Wing Territory at 304 pencil marks and Nightmare at
    // 303 - are also the two dearest to scan, and they trade places run to
    // run between 710 ms and 950 ms over 33 detectors, with Brain Teaser
    // third at about 430 ms. Unique Loop is two thirds of the worst board's
    // total by itself (540-600 ms); Mutant Fish and Franken Fish are about
    // a tenth each; the remaining 30 detectors share the rest.
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

    // The second number in this test case, and it is not a budget (#117).
    //
    // This one is how long vitest lets the case run before it gives up, and
    // it is harness plumbing: it bounds the measuring, not the product. The
    // bar the player is promised is SCAN_BUDGET_MS above, it is 2000 ms, it
    // is quoted out of the catalog note, and it does not move. This number
    // is generous on purpose - the pass costs about twelve seconds on an
    // idle machine, so there is an order of magnitude of headroom - because
    // a shared runner having a bad minute must make this test slow and not
    // make it red. If it is ever reached, the measuring has grown; make the
    // measuring cheaper before reaching for a bigger number here.
  }, 120_000);
});
