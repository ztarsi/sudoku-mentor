// The difficulty analyser: what a puzzle actually requires.
//
// Two jobs here. The first is correctness on puzzles whose answer we know:
// the solve path, the hardest technique required, and whether named
// techniques alone finish the job. The second is the report the whole
// technique-coverage programme (#69) is judged by - for each shelf, the
// share of solve-path steps a named technique explains - which is printed
// so every later batch can be compared with the number before it.
import { describe, it, expect } from 'vitest';
import {
  analyzeDifficulty,
  analyzePuzzle,
  analyzeSolvePath,
  formatShelfCoverageReport,
  shelfCoverageReport,
  startPuzzleAnalysis,
  teachingLabel,
  WHAT_IF_TIER,
} from '../difficultyAnalyzer';
import { PUZZLES } from '../puzzles';
import { TECHNIQUES, TIERS, techniqueTier } from '../techniqueCatalog';

// The report is output, not an assertion: vitest keeps console.log to
// itself, so write straight to stdout where there is one.
const out = (text) => {
  const stdout = /** @type {any} */ (globalThis).process?.stdout;
  if (stdout && typeof stdout.write === 'function') stdout.write(`${text}\n`);
  else console.log(text);
};

const byName = (name) =>
  Object.values(PUZZLES).flat().find((p) => p.name === name);

const puzzle = (name) => {
  const found = byName(name);
  if (!found) throw new Error(`no library puzzle called ${name}`);
  return found.puzzle;
};

describe('the solve path', () => {
  it('reports every step with its technique and its tier', () => {
    const path = analyzeSolvePath(puzzle('Gentle Start'));
    expect(path.solved).toBe(true);
    expect(path.complete).toBe(true);
    expect(path.steps.length).toBeGreaterThan(40);
    for (const step of path.steps) {
      expect(TECHNIQUES.map((t) => t.name)).toContain(step.technique);
      expect(step.named).toBe(true);
      expect(step.tier).toBe(techniqueTier(step.technique));
    }
    // Every step is accounted for, once, under one tier
    const tiered = Object.values(path.stepsByTier).reduce((a, b) => a + b, 0);
    expect(tiered).toBe(path.steps.length);
    expect(Object.keys(path.stepsByTier)).toEqual(['Basic']);
  });

  it('names the hardest technique a puzzle requires', () => {
    // An easy puzzle that never needs more than the two singles
    expect(analyzeSolvePath(puzzle('Gentle Start')).hardestTechnique).toBe('Naked Single');
    // A medium one that needs the box/line family
    expect(analyzeSolvePath(puzzle('Brain Teaser')).hardestTechnique).toBe('Pointing Pair');
    // A hard one that needs a subset
    expect(analyzeSolvePath(puzzle('Lunch Puzzle')).hardestTechnique).toBe('Naked Triple');
    // An expert one that needs a wing
    expect(analyzeSolvePath(puzzle('Deep Waters')).hardestTechnique).toBe('XY-Wing');
    // A diabolical one that needs colouring
    expect(analyzeSolvePath(puzzle('Witching Hour')).hardestTechnique).toBe('X-Cycle');
  });

  it('says when named techniques alone are enough', () => {
    for (const name of ['Gentle Start', 'Brain Teaser', 'Lunch Puzzle', 'Deep Waters', 'Witching Hour']) {
      const path = analyzeSolvePath(puzzle(name));
      expect(path.namedOnly, name).toBe(true);
      expect(path.whatIfSteps, name).toBe(0);
      expect(path.namedShare, name).toBe(1);
    }
  });

  it('says when a puzzle runs out of named technique, and where', () => {
    // The named ladder stops on this one with cells still empty.
    const named = analyzeSolvePath(puzzle('Golden Nugget'));
    expect(named.complete).toBe(true); // it finished looking
    expect(named.stalled).toBe(true);  // and found nothing more to say
    expect(named.solved).toBe(false);
    expect(named.namedOnly).toBe(false);

    // Following the what-if search the way the hint path does finishes it,
    // and the path says which steps were searched rather than named.
    const withWhatIf = analyzeSolvePath(puzzle('Golden Nugget'), { whatIf: true });
    expect(withWhatIf.solved).toBe(true);
    expect(withWhatIf.whatIfSteps).toBeGreaterThan(0);
    expect(withWhatIf.namedSteps + withWhatIf.whatIfSteps).toBe(withWhatIf.steps.length);
    expect(withWhatIf.stepsByTier[WHAT_IF_TIER]).toBe(withWhatIf.whatIfSteps);
    expect(withWhatIf.steps.filter((s) => !s.named).every((s) => s.tier === WHAT_IF_TIER)).toBe(true);
    // Named techniques still explain most of it, and the hardest one the
    // puzzle teaches is reported even though a what-if came first.
    expect(withWhatIf.namedShare).toBeGreaterThan(0.5);
    expect(withWhatIf.hardestTechnique).toBe('ALS-XZ');
  });

  it('every tier it reports is a tier the panel knows', () => {
    const tiers = new Set();
    for (const list of Object.values(PUZZLES)) {
      for (const p of list) {
        for (const tier of Object.keys(analyzeSolvePath(p.puzzle, { whatIf: true }).stepsByTier)) {
          tiers.add(tier);
        }
      }
    }
    for (const tier of tiers) {
      expect([...TIERS.map((t) => t.level), WHAT_IF_TIER]).toContain(tier);
    }
  });
});

describe('a walk that is cut short concludes nothing', () => {
  it('reports complete: false, and the library says nothing yet', () => {
    const cut = analyzeSolvePath(puzzle('Gentle Start'), { timeBudgetMs: -1 });
    expect(cut.complete).toBe(false);
    expect(cut.steps).toEqual([]);
    // namedOnly must never be claimed from a path that was not walked out
    expect(cut.namedOnly).toBe(false);
    expect(teachingLabel({ ...cut, complete: false })).toBeNull();
  });

  it('a walk advanced in small chunks ends up where one long walk does', () => {
    // The library measures a puzzle a slice at a time so the page stays
    // responsive; the answer must not depend on how it was sliced.
    const inOneGo = analyzeSolvePath(puzzle('Easter Monster'), { whatIf: true });
    const run = startPuzzleAnalysis(puzzle('Easter Monster'));
    let chunks = 0;
    while (!run.advance(1) && chunks < 10000) chunks++;
    const chunked = run.result();
    expect(chunks, 'a slice of 1ms should not finish it in one go').toBeGreaterThan(0);
    expect(chunked.complete).toBe(true);
    expect(chunked.steps).toBe(inOneGo.steps.length);
    expect(chunked.namedSteps).toBe(inOneGo.namedSteps);
    expect(chunked.whatIfSteps).toBe(inOneGo.whatIfSteps);
    expect(chunked.hardestTechnique).toBe(inOneGo.hardestTechnique);
    expect(chunked.namedOnly).toBe(inOneGo.namedOnly);
    expect(chunked.stepsByTier).toEqual(inOneGo.stepsByTier);
    // A puzzle already measured costs nothing the second time.
    expect(analyzePuzzle(puzzle('Easter Monster'))).toEqual(chunked);
  });
});

describe('what the library row says', () => {
  it('describes what a puzzle teaches, and whether what-if is needed', () => {
    expect(teachingLabel(analyzePuzzle(puzzle('Gentle Start')))).toBe('Teaches up to Naked Single');
    expect(teachingLabel(analyzePuzzle(puzzle('Deep Waters')))).toBe('Teaches up to XY-Wing');
    expect(teachingLabel(analyzePuzzle(puzzle('Golden Nugget')))).toBe(
      'Teaches up to ALS-XZ, then what-if search'
    );
  });

  it('is measured, never assumed: a label matches the path it came from', () => {
    for (const [shelf, list] of Object.entries(PUZZLES)) {
      for (const p of list) {
        const analysis = analyzePuzzle(p.puzzle);
        const label = teachingLabel(analysis);
        expect(analysis.complete, p.name).toBe(true);
        expect(label, p.name).toBeTruthy();
        if (analysis.namedOnly) {
          expect(label, p.name).not.toContain('what-if');
          expect(analysis.whatIfSteps, p.name).toBe(0);
        } else {
          expect(label, p.name).toContain('what-if');
          expect(analysis.whatIfSteps, p.name).toBeGreaterThan(0);
        }
        if (analysis.hardestTechnique) {
          expect(label, p.name).toContain(analysis.hardestTechnique);
        }
        // The shelf the analysis puts it on is the shelf it sits on.
        expect(analysis.shelf, p.name).toBe(shelf);
        expect(analyzeDifficulty(p.puzzle), p.name).toBe(shelf);
      }
    }
  });
});

describe('named-technique coverage, by shelf', () => {
  const report = shelfCoverageReport(PUZZLES);

  it('covers every shelf, and every step is either named or what-if', () => {
    expect(report.rows.map((r) => r.shelf)).toEqual(Object.keys(PUZZLES));
    for (const row of report.rows) {
      expect(row.named + row.whatIf).toBe(row.steps);
      expect(row.steps).toBeGreaterThan(0);
      expect(row.namedShare).toBeGreaterThan(0);
      expect(row.namedShare).toBeLessThanOrEqual(1);
      // Every library puzzle is solvable by the mentor as it stands, with
      // the what-if search where the ladder stops.
      expect(row.unsolved, `${row.shelf}: unsolved puzzles`).toEqual([]);
    }
    expect(report.named + (report.steps - report.named)).toBe(report.steps);
  });

  it('holds the shelves the programme says are fully named', () => {
    // The targets in docs/specs/technique-coverage.md. Easy through
    // Diabolical are 100% named today and must stay that way; the Ultimate
    // shelf is what the programme is trying to move.
    for (const shelf of ['easy', 'medium', 'hard', 'expert', 'diabolical']) {
      const row = report.rows.find((r) => r.shelf === shelf);
      expect(row.namedShare, `${shelf} should be fully named`).toBe(1);
      expect(row.needWhatIf, `${shelf} should need no what-if`).toBe(0);
    }
  });

  it('prints the per-shelf report the programme is judged by', () => {
    const text = formatShelfCoverageReport(report);
    expect(text).toContain('named share');
    for (const shelf of Object.keys(PUZZLES)) expect(text).toContain(shelf);
    // Readable output, not a pass or a fail: this is the baseline every
    // later batch of the coverage programme is measured against.
    out(`\n${text}\n`);
  });
});
