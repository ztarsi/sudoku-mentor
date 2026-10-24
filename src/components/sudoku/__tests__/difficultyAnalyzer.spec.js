// The difficulty analyser: what a puzzle actually requires.
//
// Two jobs here. The first is correctness on puzzles whose answer we know:
// the solve path, the hardest technique required, and whether named
// techniques alone finish the job. The second is the report the whole
// technique-coverage programme (#69) is judged by - for each shelf, the
// share of solve-path steps a named technique explains - which is printed
// so every later batch can be compared with the number before it. Beside
// it, the other half of that question: which techniques the library never
// teaches, because an easier rung always explains the same positions.
import { describe, it, expect } from 'vitest';
import {
  analyzeDifficulty,
  analyzePuzzle,
  analyzeSolvePath,
  formatShelfCoverageReport,
  formatTechniqueTeachingReport,
  shelfCoverageReport,
  startPuzzleAnalysis,
  techniqueTeachingReport,
  teachingLabel,
  WHAT_IF_TIER,
} from '../difficultyAnalyzer';
import { PUZZLES } from '../puzzles';
import { TECHNIQUES, TIERS, techniqueTier } from '../techniqueCatalog';

// The reports are output, not an assertion: vitest keeps console.log to
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
    // Two diabolical ones that need a single-digit box pattern. Both used
    // to peak higher - a colouring chain and a four-candidate wing - until
    // #72 put the Empty Rectangle on the ladder in front of them and it
    // explained the same positions one rung lower.
    expect(analyzeSolvePath(puzzle("Devil's Den")).hardestTechnique).toBe('Empty Rectangle');
    expect(analyzeSolvePath(puzzle('Witching Hour')).hardestTechnique).toBe('Empty Rectangle');
    // And one on the top shelf that the named ladder now finishes on its
    // own, with colouring across every digit as its hardest step.
    expect(analyzeSolvePath(puzzle('Night Owl')).hardestTechnique).toBe('3D Medusa');
  });

  it('says when named techniques alone are enough', () => {
    for (const name of ['Gentle Start', 'Brain Teaser', 'Lunch Puzzle', 'Deep Waters', "Devil's Den"]) {
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
    // Grouped X-Chain until the almost-locked-set family landed (#73): the
    // named ALS-XY-Wing now explains those positions, and it sits a rung
    // before the general chain, so it is the hardest rung this puzzle asks
    // for. A measurement, re-read when a rung changes, not a promise.
    expect(withWhatIf.hardestTechnique).toBe('ALS-XY-Wing');
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
      'Teaches up to ALS-XY-Wing, then what-if search'
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

  it('keeps the ground the chain family gained on the Ultimate shelf', () => {
    // The Ultimate shelf was 91.7% named before the fish (#72) and 92.6%
    // after them; the chain family (#67) moved it to 94.4%, and 37 what-if
    // steps became 31. The floors sit a little under that so a later batch
    // can only push them up.
    const ultimate = report.rows.find((r) => r.shelf === 'ultimate');
    expect(ultimate.namedShare).toBeGreaterThan(0.93);
    expect(ultimate.whatIf).toBeLessThan(37);
    expect(ultimate.needWhatIf).toBeLessThan(ultimate.puzzles);
    expect(report.namedShare).toBeGreaterThan(0.97);
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

describe('which techniques the library actually teaches', () => {
  const report = techniqueTeachingReport(PUZZLES);

  // Every step of every library puzzle, counted here independently of the
  // report, so the report is checked against the paths and not itself.
  const stepsPerTechnique = new Map();
  for (const list of Object.values(PUZZLES)) {
    for (const p of list) {
      for (const step of analyzeSolvePath(p.puzzle, { whatIf: true }).steps) {
        stepsPerTechnique.set(step.technique, (stepsPerTechnique.get(step.technique) || 0) + 1);
      }
    }
  }

  it('answers for every technique in the catalog, exactly once', () => {
    expect(report.rows.map((r) => r.technique)).toEqual(TECHNIQUES.map((t) => t.name));
    expect(report.taught.length + report.neverTaught.length).toBe(report.techniques);
    // A step whose technique the catalog does not hold would be missing
    // from the report entirely, so the report says when it meets one.
    expect(report.unlisted).toEqual([]);
  });

  it('calls a technique taught only where a solve path uses it as a step', () => {
    for (const row of report.rows) {
      expect(row.steps, row.technique).toBe(stepsPerTechnique.get(row.technique) || 0);
      expect(row.taught, row.technique).toBe(row.steps > 0);
      // Never the hint means no puzzle at all, not simply few steps.
      if (!row.taught) expect(row.puzzles, row.technique).toEqual([]);
      else expect(row.puzzles.length, row.technique).toBeGreaterThan(0);
    }
    // The two singles are the floor: a library that teaches nothing would
    // pass every assertion above, and this one would not.
    for (const name of ['Naked Single', 'Hidden Single']) {
      expect(report.taught.map((r) => r.technique), name).toContain(name);
    }
  });

  it('names the puzzles that teach a technique, and they really do', () => {
    for (const row of report.taught) {
      for (const { shelf, name } of row.puzzles) {
        expect(PUZZLES[shelf].map((p) => p.name), `${row.technique}: ${name}`).toContain(name);
        const path = analyzeSolvePath(puzzle(name), { whatIf: true });
        expect(path.steps.map((s) => s.technique), `${name} should teach ${row.technique}`).toContain(
          row.technique
        );
      }
      // One puzzle per name, however many steps it takes there.
      expect(new Set(row.puzzles.map((p) => p.name)).size, row.technique).toBe(row.puzzles.length);
    }
  });

  it('groups the answer by tier, and every tier adds up', () => {
    expect(report.byTier.map((t) => t.tier)).toEqual(TIERS.map((t) => t.level));
    let techniques = 0;
    for (const tier of report.byTier) {
      expect(tier.taught + tier.neverTaught.length, tier.tier).toBe(tier.techniques);
      techniques += tier.techniques;
      for (const name of tier.neverTaught) {
        expect(techniqueTier(name), name).toBe(tier.tier);
        expect(report.neverTaught.map((r) => r.technique), name).toContain(name);
      }
    }
    // No technique sits in a tier the panel does not know, so none is lost
    // between the tier table and the lists below it.
    expect(techniques).toBe(report.techniques);
  });

  it('prints the list, readable without a key', () => {
    const text = formatTechniqueTeachingReport(report);
    // Every technique in the catalog appears, in one group or the other.
    for (const tech of TECHNIQUES) expect(text, tech.name).toContain(tech.name);
    expect(text).toContain('taught by at least one library puzzle');
    expect(text).toContain('never the hint on any library puzzle');
    // And it says, in the report's own words, why a technique can be found
    // on a board and counted in the panel and still never be the hint.
    expect(text).toContain('not a broken detector');
    for (const tier of TIERS) expect(text, tier.level).toContain(tier.level);
    // Readable output, not a pass or a fail: this is the list of techniques
    // the library cannot currently teach anybody.
    out(`\n${text}\n`);
  });
});
