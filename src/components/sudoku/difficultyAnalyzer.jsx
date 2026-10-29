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
// difficultyAnalyzer.spec.js), and the other side of that number: which
// techniques no library puzzle ever actually teaches
// (techniqueTeachingReport, printed by the same spec).
//
// It is a developer tool and a library row. Players see its result, never
// the tool.

import { generateCandidates, findNextLogicStep, applyLogicStep, eliminateCandidatesFromPeers } from './logicEngine';
import { findWhatIfStep } from './forcingChainEngine';
import { techniqueTier, teachingRank, TECHNIQUES, TIERS, TRIAL_TECHNIQUES, isTrialTechnique } from './techniqueCatalog';
import { establishUniqueness } from './uniqueness';

/**
 * The tier a trial step is counted under in the per-tier breakdown, and
 * the tier Hypothesis Mode sits in in the catalog: the same name, because
 * since #75 they are the same thing. A forcing proof is counted under the
 * Forcing tier like any other deduction.
 */
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
  // The short chains with their own names: harder to see than a wing,
  // about as hard as a colouring, and scored so the shelves the library
  // already states stay true (the recalibration is deliberate and happens
  // once, at the end of the coverage programme).
  'Skyscraper': 7,
  'Two-String Kite': 7,
  'W-Wing': 7,
  'Remote Pairs': 8,
  'X-Cycle': 8,
  'Finned X-Wing': 8,
  'ALS-XZ': 9,
  // The uniqueness family. Type 1 has scored 9 since the shelves were cut,
  // and the rest of the family sits with it: the argument is the same one,
  // and a puzzle that needs any of it is on the top shelf. The BUG
  // variants and the loops are a rung above, as BUG+1 already was - they
  // ask the player to read the whole board rather than four cells.
  'Unique Rectangle Type 1': 9,
  'Unique Rectangle Type 2': 9,
  'Unique Rectangle Type 3': 9,
  'Unique Rectangle Type 4': 9,
  'Unique Rectangle Type 5': 9,
  'Unique Rectangle Type 6': 9,
  'Hidden Unique Rectangle': 9,
  'Avoidable Rectangle Type 1': 9,
  'Avoidable Rectangle Type 2': 9,
  'X-Chain': 9,
  'XY-Chain': 9,
  // Colouring across every digit, and the fish nobody spots by eye: a
  // puzzle that needs one of these is on the top shelf by definition.
  '3D Medusa': 9,
  'Finned Swordfish': 9,
  'Finned Jellyfish': 9,
  'Sashimi Fish': 9,
  'BUG+1': 10,
  'BUG+2': 10,
  'BUG+3': 10,
  'Unique Loop': 10,
  'Franken Fish': 10,
  'Mutant Fish': 10,
  // The general chain and its richer forms: the last deductions the mentor
  // has before what-if search.
  'Alternating Chain': 10,
  'Grouped X-Chain': 10,
  'Grouped Alternating Chain': 10,
  'Continuous Loop': 10,
  'ALS Chain': 11,
  // The rest of the almost-locked-set family (#73). It reads three groups
  // at once, or a group for every mark in a cell, or a row-and-box split -
  // past anything a player spots by scanning, and level with the general
  // chain it sits beside on the ladder. A puzzle that needs one is on the
  // top shelf, which is what the score has to say; the shelves themselves
  // are re-cut once, at the end of the programme.
  'ALS-XY-Wing': 10,
  'Death Blossom': 10,
  'Sue de Coq': 10,
  'Sue de Coq, extended': 10,
  // The forcing family (#75): proofs by cases, the last named rungs before
  // trial and error. Scored above every pattern on the ladder so that a
  // puzzle needing one still rates Ultimate, exactly as it did when the
  // same positions fell to the what-if search. The net is a rung above the
  // chains: it holds more than one supposition at a time.
  'Cell Forcing Chain': 12,
  'Unit Forcing Chain': 12,
  'Digit Forcing Chain': 12,
  'Double Forcing Chain': 12,
  'Forcing Net': 13
};

// A full solve is at most ~81 placements plus the elimination-only steps
// between them; anything past this means the engine stopped progressing.
const MAX_STEPS = 500;

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

// What counts as unnamed in the coverage report: trial and error only. A
// forcing proof is found by the search and is still a deduction, so it
// counts as named (#75) - that is the honesty line, and the report has to
// draw it in the same place the hint card does.
const isWhatIf = (technique) => isTrialTechnique(technique);

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
 * @param {{ whatIf?: boolean, maxSteps?: number }} [options]
 *   whatIf   follow the search where the ladder of patterns stops, as the
 *            hint path does: a forcing proof if there is one, and trial
 *            only if there is not. Off by default, because the patterns
 *            alone are cheap and a shelf is decided by the hardest of
 *            them. How deep a net may go is the engine's own stated limit
 *            (searchLimits.NET_DEPTH), never a caller's choice.
 */
export const startSolvePath = (puzzleArray, options = {}) => {
  const { whatIf = false, maxSteps = MAX_STEPS } = options;
  let grid = buildGrid(puzzleArray);
  // The uniqueness family only applies to a puzzle with exactly one answer.
  // The analyser establishes that the way the app does - once, from the
  // givens - so the path it reports is the path a player would be walked
  // through, uniqueness steps included.
  const { state: uniqueness } = establishUniqueness(puzzleArray);
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

      let step = findNextLogicStep(grid, null, { uniqueness });
      if (!step && whatIf) step = findWhatIfStep(grid);
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

// A walk that ran to the end never changes its answer, and the test run
// asks the same twenty puzzles the same question more than once - once for
// the per-shelf coverage report and once for the never-taught one - so keep
// the last few. Only completed walks: one cut short by a time budget says
// nothing about the rest. The path handed back is shared, so read it, do
// not change it.
const PATH_CACHE_LIMIT = 64;
const pathCache = new Map();

/**
 * @param {number[]} puzzleArray
 * @param {{ whatIf?: boolean, maxSteps?: number }} walkOptions
 */
const pathCacheKey = (puzzleArray, { whatIf, maxSteps }) =>
  [puzzleArray.join(''), whatIf ? 'whatIf' : 'named', maxSteps ?? MAX_STEPS].join('|');

/**
 * The solve path, walked to the end (or for as long as `timeBudgetMs`).
 *
 * @param {number[]} puzzleArray 81 digits, 0 for empty
 * @param {{ whatIf?: boolean, maxSteps?: number, timeBudgetMs?: number }} [options]
 */
export const analyzeSolvePath = (puzzleArray, options = {}) => {
  const { timeBudgetMs = Infinity, ...rest } = options;
  const key = timeBudgetMs === Infinity ? pathCacheKey(puzzleArray, rest) : null;
  if (key !== null && pathCache.has(key)) return pathCache.get(key);

  const run = startSolvePath(puzzleArray, rest);
  run.advance(timeBudgetMs);
  const path = run.result();

  if (key !== null && path.complete) {
    if (pathCache.size >= PATH_CACHE_LIMIT) pathCache.delete(pathCache.keys().next().value);
    pathCache.set(key, path);
  }
  return path;
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
 * How hard each tier's thinking gets, in words a player choosing a puzzle
 * has already met. The row used to lead with the measured technique's name
 * - "Teaches up to Naked Single", "Teaches up to ALS-XZ" - which is
 * written for us: the quality bar says explanations use no vocabulary the
 * player has not been given (issue #107). The level leads now and the name
 * follows in brackets, so the beginner can read the row and the enthusiast
 * still gets the measurement.
 */
const CEILING = {
  Basic: 'Beginner techniques only',
  Intermediate: 'Up to intermediate techniques',
  Advanced: 'Up to advanced techniques',
  Expert: 'Up to expert techniques',
  Ultimate: 'Up to the hardest techniques',
  // Past the patterns: the mentor works through a cell's options instead of
  // spotting something. A proof by cases, which is not trial and error, so
  // the row must not call it that.
  Forcing: 'Works through every option',
  'What-if': 'Needs trial and error',
};

/**
 * One line for a library row: how hard the puzzle's hardest step is, which
 * technique that was, and whether named techniques are enough to finish
 * it. Null while it is still being measured, because a label is worth
 * showing only once it is true.
 */
export const teachingLabel = (analysis) => {
  if (!analysis || !analysis.complete) return null;
  if (!analysis.hardestTechnique) return 'Needs trial and error throughout';
  const ceiling = CEILING[analysis.hardestTier] || 'Up to the hardest techniques';
  const upTo = `${ceiling} (${analysis.hardestTechnique})`;
  return analysis.namedOnly ? upTo : `${upTo}, then trial and error`;
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
 */
export const shelfCoverageReport = (shelves) => {
  const rows = Object.entries(shelves).map(([shelf, puzzles]) => {
    const analyses = puzzles.map((p) => ({
      name: p.name,
      path: analyzeSolvePath(p.puzzle, { whatIf: true }),
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

/**
 * The other side of the coverage number: for every technique in the
 * catalog, whether any library puzzle's solve path uses it as a step.
 *
 * "Taught" means a player following the hints on some library puzzle is
 * shown that technique. "Never the hint" means no library puzzle's path
 * reaches it - which is a gap in the library rather than a fault in the
 * detector, because the ladder always offers the easiest technique that
 * applies and an easier one may explain every position the harder one
 * would have. Such a technique is still found on the board, still counted
 * in the Techniques list, still oracle-checked; it is simply never the
 * step a player receives.
 *
 * `unlisted` catches the opposite accident: a step whose technique name is
 * not in the catalog at all, which would otherwise go unreported.
 *
 * @param {Record<string, { name: string, puzzle: number[] }[]>} shelves
 */
export const techniqueTeachingReport = (shelves) => {

  /** @type {Map<string, number>} */
  const stepsFor = new Map();
  /** @type {Map<string, { shelf: string, name: string }[]>} */
  const puzzlesFor = new Map();

  for (const [shelf, puzzles] of Object.entries(shelves)) {
    for (const p of puzzles) {
      const path = analyzeSolvePath(p.puzzle, { whatIf: true });
      const seen = new Set();
      for (const step of path.steps) {
        stepsFor.set(step.technique, (stepsFor.get(step.technique) || 0) + 1);
        seen.add(step.technique);
      }
      for (const technique of seen) {
        const rows = puzzlesFor.get(technique) || [];
        rows.push({ shelf, name: p.name });
        puzzlesFor.set(technique, rows);
      }
    }
  }

  const rows = TECHNIQUES.map((tech) => {
    const steps = stepsFor.get(tech.name) || 0;
    return {
      technique: tech.name,
      tier: tech.tier,
      /** The what-if fallback, which the library does not set out to teach. */
      whatIf: TRIAL_TECHNIQUES.includes(tech.name),
      steps,
      puzzles: puzzlesFor.get(tech.name) || [],
      taught: steps > 0,
    };
  });

  const known = new Set(TECHNIQUES.map((tech) => tech.name));
  const unlisted = [...stepsFor.keys()].filter((name) => !known.has(name)).sort();

  const byTier = TIERS.map((tier) => {
    const tierRows = rows.filter((row) => row.tier === tier.level);
    return {
      tier: tier.level,
      techniques: tierRows.length,
      taught: tierRows.filter((row) => row.taught).length,
      neverTaught: tierRows.filter((row) => !row.taught).map((row) => row.technique),
    };
  });

  return {
    rows,
    taught: rows.filter((row) => row.taught),
    neverTaught: rows.filter((row) => !row.taught),
    /** Taught by exactly one puzzle: one library change from never taught. */
    thin: rows.filter((row) => row.taught && row.puzzles.length === 1),
    byTier,
    unlisted,
    techniques: rows.length,
  };
};

// Long lists of names, wrapped under a label, so a tier's gaps read as one
// group however many names it holds.
const wrapNames = (label, names, width = 78) => {
  const indent = ' '.repeat(label.length);
  const lines = [];
  let line = null;
  for (const name of names) {
    if (line === null) {
      line = `${label}${name}`;
    } else if (`${line}, ${name}`.length <= width) {
      line = `${line}, ${name}`;
    } else {
      lines.push(`${line},`);
      line = `${indent}${name}`;
    }
  }
  if (line !== null) lines.push(line);
  return lines;
};

/** The never-taught report as the lines the test run prints. */
export const formatTechniqueTeachingReport = (report) => {
  const lines = [
    'Which techniques the library teaches, and which it never does',
    '',
    "Taught means at least one library puzzle's solve path uses the technique as",
    'a step, so a player following the hints on that puzzle is shown it. Never the',
    "hint means no library puzzle's path reaches it at all.",
    '',
    'A technique that is never the hint is not a broken detector. The ladder always',
    'gives the easiest technique that applies, so where an easier one explains the',
    'same positions, the harder one is still found on the board, still counted in',
    'the Techniques list and still checked by the oracle - and still never the step',
    'a player receives. That is a gap in the library, not in the engine, and the',
    'list grows with every technique the programme adds.',
    '',
    'The Forcing rows are proofs by cases, found by the search where no pattern',
    'applies: named techniques like any other. The What-if row is the trial',
    'fallback, which the library does not set out to teach at all.',
    '',
    'tier             techniques  taught  never the hint',
  ];
  for (const row of report.byTier) {
    lines.push(
      [
        row.tier.padEnd(16),
        String(row.techniques).padStart(10),
        String(row.taught).padStart(7),
        String(row.neverTaught.length).padStart(15),
      ].join(' ')
    );
  }
  lines.push(
    [
      'all tiers'.padEnd(16),
      String(report.techniques).padStart(10),
      String(report.taught.length).padStart(7),
      String(report.neverTaught.length).padStart(15),
    ].join(' ')
  );

  lines.push('');
  lines.push(`taught by at least one library puzzle: ${report.taught.length} of ${report.techniques}`);
  lines.push('');
  lines.push('  tier             technique                 steps  puzzles');
  for (const row of report.taught) {
    lines.push(
      '  ' +
        [
          row.tier.padEnd(16),
          row.technique.padEnd(24),
          String(row.steps).padStart(6),
          String(row.puzzles.length).padStart(8),
        ].join(' ')
    );
  }

  lines.push('');
  lines.push(`never the hint on any library puzzle: ${report.neverTaught.length} of ${report.techniques}`);
  lines.push('');
  if (report.neverTaught.length === 0) {
    lines.push('  none: every technique in the catalog is taught by some puzzle.');
  } else {
    for (const tier of report.byTier) {
      if (tier.neverTaught.length === 0) continue;
      for (const line of wrapNames(`  ${tier.tier.padEnd(16)} `, tier.neverTaught)) lines.push(line);
    }
  }

  lines.push('');
  if (report.thin.length === 0) {
    lines.push('taught by exactly one puzzle: none.');
  } else {
    lines.push('taught by exactly one puzzle, so one library change from never taught:');
    for (const line of wrapNames(
      '  ',
      report.thin.map((row) => `${row.technique} (${row.puzzles[0].name})`)
    )) {
      lines.push(line);
    }
  }

  if (report.unlisted.length > 0) {
    lines.push('');
    for (const line of wrapNames('steps whose technique is not in the catalog: ', report.unlisted)) {
      lines.push(line);
    }
  }

  return lines.join('\n');
};
