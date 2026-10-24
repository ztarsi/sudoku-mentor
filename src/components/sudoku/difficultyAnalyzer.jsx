// What a puzzle actually requires.
//
// The analyser walks a puzzle the way the mentor's hint path does: the named
// ladder first, and the what-if search only where nothing named applies.
// What comes back is the solve path itself - every step, its technique, its
// tier, and whether it was named or searched - and the few facts worth
// stating about it: the hardest technique required, how many steps each tier
// explains, and whether named techniques alone finish the puzzle.
//
// That is where the library's shelf labels come from, so a shelf's claim is
// true by construction rather than by hand. It is also the number the
// technique-coverage programme is judged by: the share of steps on each
// shelf that a named technique explains (shelfCoverageReport, printed by
// difficultyAnalyzer.spec.js).
//
// It is a developer tool and a library row. Players see its result, never
// the tool.

import { generateCandidates, findNextLogicStep, applyLogicStep, eliminateCandidatesFromPeers } from './logicEngine';
import { findForcingChain, findHypothesis } from './forcingChainEngine';
import { techniqueTier, teachingRank, WHAT_IF_TECHNIQUES } from './techniqueCatalog';

/** The tier a what-if step is counted under in the per-tier breakdown. */
export const WHAT_IF_TIER = 'What-if';

// How hard each named technique is taken to be, for the shelf a puzzle
// lands on. The ladder's order says which technique is harder; these
// numbers say how much harder, which is what maps onto six shelves.
const TECHNIQUE_SCORES = {
  'Naked Single': 1,
  'Hidden Single': 1,
  'Pointing Pair': 2,
  'Pointing Triple': 2,
  'Claiming': 2,
  'Naked Pair': 3,
  'Hidden Pair': 3,
  'Naked Triple': 4,
  'Hidden Triple': 4,
  'Naked Quad': 4,
  'Hidden Quad': 4,
  'X-Wing': 5,
  'Swordfish': 6,
  'XY-Wing': 6,
  // Harder to see than an XY-Wing, easier than a colouring chain.
  'XYZ-Wing': 7,
  'WXYZ-Wing': 7,
  // The top of the Expert band. A Jellyfish is the hardest shape in the
  // basic fish family, and an Empty Rectangle asks the player to hold a
  // box pattern and a two-place line in mind at once - harder than a wing,
  // and still something a player can learn to spot.
  'Jellyfish': 7,
  'Empty Rectangle': 7,
  'X-Cycle': 8,
  'Finned X-Wing': 8,
  'ALS-XZ': 9,
  'Unique Rectangle Type 1': 9,
  // Colouring across every digit, and the fish nobody spots by eye: a
  // puzzle that needs one of these is on the top shelf by definition.
  '3D Medusa': 9,
  'Finned Swordfish': 9,
  'Finned Jellyfish': 9,
  'Sashimi Fish': 9,
  'BUG+1': 10,
  'Franken Fish': 10,
  'Mutant Fish': 10
};

// A full solve is at most ~81 placements plus the elimination-only steps
// between them; anything past this means the engine stopped progressing.
const MAX_STEPS = 500;

// How far the what-if search may propagate. The depth the hint path uses
// (whatIfSearch.HINT_SEARCH_DEPTH), so the path the analyser reports is the
// path a player would actually be walked through.
export const WHAT_IF_DEPTH = 20;

/** The 81-cell grid the engines take, with pencil marks filled in. */
export const buildGrid = (puzzleArray) =>
  generateCandidates(
    puzzleArray.map((value, index) => ({
      cellIndex: index,
      value: value || null,
      isFixed: value !== 0,
      candidates: [],
      isHighlighted: false,
      highlightColor: null,
      isBaseCell: false,
      isTargetCell: false
    }))
  );

const isWhatIf = (technique) => WHAT_IF_TECHNIQUES.includes(technique);

/** The shelf a solve path belongs on. */
const shelfFor = (path) => {
  // The named ladder could not finish it: the rest is what-if search.
  if (!path.solved || path.whatIfSteps > 0) return 'ultimate';
  let maxScore = 0;
  for (const step of path.steps) {
    maxScore = Math.max(maxScore, TECHNIQUE_SCORES[step.technique] || 0);
  }
  if (maxScore <= 1) return 'easy';
  if (maxScore <= 2) return 'medium';
  if (maxScore <= 4) return 'hard';
  if (maxScore <= 6) return 'expert';
  if (maxScore <= 8) return 'diabolical';
  return 'ultimate';
};

/**
 * Walk a puzzle the way the hint path does, in chunks of bounded length.
 *
 * The walk is a few milliseconds for most puzzles and a couple of hundred
 * for one that leans on the what-if search, which is too long to spend in
 * one go on a phone. `advance(ms)` does as much of it as it can in that
 * long and returns whether the walk is finished; `result()` reports the
 * path so far and whether it is the whole of it.
 *
 * @param {number[]} puzzleArray 81 digits, 0 for empty
 * @param {{ whatIf?: boolean, whatIfDepth?: number, maxSteps?: number }} [options]
 *   whatIf       follow the what-if search where the named ladder stops, as
 *                the hint path does. Off by default: the named ladder alone
 *                is what decides a puzzle's shelf, and it is cheap.
 *   whatIfDepth  how far the what-if search may propagate.
 */
export const startSolvePath = (puzzleArray, options = {}) => {
  const { whatIf = false, whatIfDepth = WHAT_IF_DEPTH, maxSteps = MAX_STEPS } = options;
  let grid = buildGrid(puzzleArray);
  const steps = [];
  let stalled = false;
  let finished = false;

  const advance = (timeBudgetMs = Infinity) => {
    const deadline = timeBudgetMs === Infinity ? Infinity : Date.now() + timeBudgetMs;
    while (!finished) {
      if (grid.every((cell) => cell.value !== null)) {
        finished = true;
        break;
      }
      if (steps.length >= maxSteps) {
        // The engine has stopped making progress on a board it cannot
        // finish; that is a stall, not a walk still in progress.
        stalled = true;
        finished = true;
        break;
      }
      if (Date.now() > deadline) break;

      let step = findNextLogicStep(grid, null);
      if (!step && whatIf) {
        step = findForcingChain(grid, whatIfDepth) || findHypothesis(grid, whatIfDepth);
      }
      if (!step) {
        stalled = true;
        finished = true;
        break;
      }

      const named = !isWhatIf(step.technique);
      steps.push({
        technique: step.technique,
        tier: named ? techniqueTier(step.technique) || 'Basic' : WHAT_IF_TIER,
        named,
        placement: step.placement ? step.placement.cell : null,
        digit: typeof step.digit === 'number' ? step.digit : null,
      });

      // applyLogicStep already clears the placed digit from its peers; the
      // second call is what the hint path does too, and is a no-op after it.
      grid = applyLogicStep(grid, step);
      if (step.placement) {
        grid = eliminateCandidatesFromPeers(grid, step.placement.cell, step.placement.digit);
      }
    }
    return finished;
  };

  const result = () => {
    const solved = grid.every((cell) => cell.value !== null);
    const namedSteps = steps.filter((s) => s.named).length;
    const whatIfSteps = steps.length - namedSteps;

    const stepsByTier = /** @type {Record<string, number>} */ ({});
    for (const step of steps) {
      stepsByTier[step.tier] = (stepsByTier[step.tier] || 0) + 1;
    }

    // The hardest named technique the path needed, by its place on the ladder.
    let hardestTechnique = null;
    for (const step of steps) {
      if (!step.named) continue;
      if (hardestTechnique === null || teachingRank(step.technique) > teachingRank(hardestTechnique)) {
        hardestTechnique = step.technique;
      }
    }

    return {
      steps,
      solved,
      stalled,
      // The whole path was walked: it either finished the puzzle or ran out
      // of technique. A path cut short by a time budget says nothing about
      // the rest, so nothing may be concluded from it beyond its own steps.
      complete: finished,
      namedSteps,
      whatIfSteps,
      stepsByTier,
      hardestTechnique,
      hardestTier: hardestTechnique ? techniqueTier(hardestTechnique) : null,
      namedOnly: finished && solved && whatIfSteps === 0,
      namedShare: steps.length === 0 ? 1 : namedSteps / steps.length,
    };
  };

  return { advance, result };
};

/**
 * The solve path, walked to the end (or for as long as `timeBudgetMs`).
 *
 * @param {number[]} puzzleArray 81 digits, 0 for empty
 * @param {{ whatIf?: boolean, whatIfDepth?: number, maxSteps?: number, timeBudgetMs?: number }} [options]
 */
export const analyzeSolvePath = (puzzleArray, options = {}) => {
  const { timeBudgetMs = Infinity, ...rest } = options;
  const run = startSolvePath(puzzleArray, rest);
  run.advance(timeBudgetMs);
  return run.result();
};

/** What a library row says about a puzzle, from its solve path. */
const summarise = (path) => ({
  hardestTechnique: path.hardestTechnique,
  hardestTier: path.hardestTier,
  stepsByTier: path.stepsByTier,
  steps: path.steps.length,
  namedSteps: path.namedSteps,
  whatIfSteps: path.whatIfSteps,
  /** True when named techniques alone finish the puzzle. */
  namedOnly: path.namedOnly,
  /** False when the walk was cut short: conclude nothing about the rest. */
  complete: path.complete,
  shelf: path.complete ? shelfFor(path) : null,
});

// The library asks the same question about the same twenty puzzles on every
// open, and a puzzle's answer never changes, so keep it.
const cache = new Map();

/**
 * What a puzzle teaches, for the library row, measured in chunks. The
 * what-if search is followed, because a puzzle whose first step is a what-if
 * still teaches everything that comes after it.
 *
 * Returns `advance(ms)`, which does that much of the walk and says whether
 * it finished, and `result()`. A puzzle already measured costs nothing.
 */
export const startPuzzleAnalysis = (puzzleArray) => {
  const key = puzzleArray.join('');
  const cached = cache.get(key);
  if (cached) return { advance: () => true, result: () => cached };

  const run = startSolvePath(puzzleArray, { whatIf: true });
  return {
    advance: (/** @type {number} */ timeBudgetMs) => run.advance(timeBudgetMs),
    result: () => {
      const analysis = summarise(run.result());
      if (analysis.complete) cache.set(key, analysis);
      return analysis;
    },
  };
};

/** What a puzzle teaches, measured in one go. */
export const analyzePuzzle = (puzzleArray) => {
  const run = startPuzzleAnalysis(puzzleArray);
  run.advance(Infinity);
  return run.result();
};

/**
 * One line for a library row: what the puzzle teaches, and whether named
 * techniques are enough to finish it. Null while it is still being
 * measured, because a label is worth showing only once it is true.
 */
export const teachingLabel = (analysis) => {
  if (!analysis || !analysis.complete) return null;
  if (!analysis.hardestTechnique) return 'Needs what-if search';
  const upTo = `Teaches up to ${analysis.hardestTechnique}`;
  return analysis.namedOnly ? upTo : `${upTo}, then what-if search`;
};

/**
 * The shelf a puzzle rates: the hardest technique the named ladder needs,
 * and "ultimate" when the ladder cannot finish the puzzle on its own. The
 * named ladder only, so a shelf never depends on the what-if search.
 */
export const analyzeDifficulty = (puzzleArray) => shelfFor(analyzeSolvePath(puzzleArray));

/**
 * The per-shelf coverage report the programme is judged by: for each shelf,
 * the share of solve-path steps that a named technique explains.
 *
 * @param {Record<string, { name: string, puzzle: number[] }[]>} shelves
 * @param {{ whatIfDepth?: number }} [options]
 */
export const shelfCoverageReport = (shelves, options = {}) => {
  const { whatIfDepth = WHAT_IF_DEPTH } = options;
  const rows = Object.entries(shelves).map(([shelf, puzzles]) => {
    const analyses = puzzles.map((p) => ({
      name: p.name,
      path: analyzeSolvePath(p.puzzle, { whatIf: true, whatIfDepth }),
    }));
    const steps = analyses.reduce((sum, a) => sum + a.path.steps.length, 0);
    const named = analyses.reduce((sum, a) => sum + a.path.namedSteps, 0);
    return {
      shelf,
      puzzles: analyses.length,
      steps,
      named,
      whatIf: steps - named,
      namedShare: steps === 0 ? 1 : named / steps,
      needWhatIf: analyses.filter((a) => a.path.whatIfSteps > 0).length,
      unsolved: analyses.filter((a) => !a.path.solved).map((a) => a.name),
      puzzleRows: analyses.map((a) => ({
        name: a.name,
        hardestTechnique: a.path.hardestTechnique,
        namedOnly: a.path.namedOnly,
        steps: a.path.steps.length,
        whatIfSteps: a.path.whatIfSteps,
      })),
    };
  });
  const steps = rows.reduce((sum, r) => sum + r.steps, 0);
  const named = rows.reduce((sum, r) => sum + r.named, 0);
  return { rows, steps, named, namedShare: steps === 0 ? 1 : named / steps };
};

/** The report as the lines the test run prints. */
export const formatShelfCoverageReport = (report) => {
  const pct = (/** @type {number} */ share) => `${(share * 100).toFixed(1)}%`;
  const lines = [
    'Named-technique coverage of the solve path, by shelf',
    '',
    'shelf        puzzles  steps  named  what-if  named share  need what-if',
  ];
  for (const row of report.rows) {
    lines.push(
      [
        row.shelf.padEnd(11),
        String(row.puzzles).padStart(7),
        String(row.steps).padStart(7),
        String(row.named).padStart(6),
        String(row.whatIf).padStart(8),
        pct(row.namedShare).padStart(12),
        `${row.needWhatIf} of ${row.puzzles}`.padStart(13),
      ].join(' ')
    );
  }
  lines.push('');
  lines.push(
    `all shelves: ${report.named} of ${report.steps} steps named (${pct(report.namedShare)})`
  );
  lines.push('');
  lines.push('hardest technique each puzzle requires');
  for (const row of report.rows) {
    for (const p of row.puzzleRows) {
      lines.push(
        `  ${row.shelf.padEnd(11)} ${p.name.padEnd(18)} ${(p.hardestTechnique || 'none').padEnd(16)}` +
          ` ${String(p.steps).padStart(3)} steps` +
          (p.namedOnly ? ', named only' : `, ${p.whatIfSteps} what-if`)
      );
    }
    if (row.unsolved.length > 0) {
      lines.push(`  ${row.shelf}: not solved even with what-if: ${row.unsolved.join(', ')}`);
    }
  }
  return lines.join('\n');
};
