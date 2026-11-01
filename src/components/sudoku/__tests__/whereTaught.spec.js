// A technique's reference says where the library teaches it, or that no
// puzzle does yet (#88): it must not imply a lesson the library cannot
// deliver.
import { describe, it, expect } from 'vitest';
import { puzzlesTeaching, whereTaughtLine } from '../whereTaught';
import { TECHNIQUES } from '../techniqueCatalog';
import { techniqueTeachingReport } from '../difficultyAnalyzer';
import { PUZZLES } from '../puzzles';

describe('where a technique is taught', () => {
  it('names the puzzles the analyser says teach it, and only those', () => {
    // The coverage report walks every puzzle live; the reference reads the
    // precomputed file. They must agree on every technique.
    const report = techniqueTeachingReport(PUZZLES);
    for (const row of report.rows) {
      const fromFile = puzzlesTeaching(row.technique).map((p) => `${p.shelf}/${p.name}`).sort();
      const fromReport = row.puzzles.map((p) => `${p.shelf}/${p.name}`).sort();
      expect(fromFile, row.technique).toEqual(fromReport);
    }
  }, 120_000);

  it('names a puzzle and its shelf for a technique the library teaches', () => {
    const line = whereTaughtLine('Naked Single', 'Basic');
    expect(line).toMatch(/^In the library: /);
    expect(line).toContain('Gentle Start (Easy)');
    // Twenty puzzles teach a Naked Single: the line names a few, not all.
    expect(line).toMatch(/and \d+ more\./);
  });

  it('says so plainly when no puzzle teaches it, rather than implying one does', () => {
    const untaught = TECHNIQUES.find((t) => t.tier !== 'What-if' && puzzlesTeaching(t.name).length === 0);
    if (!untaught) return; // every technique is taught: nothing to say
    const line = whereTaughtLine(untaught.name, untaught.tier);
    expect(line).toMatch(/^No puzzle in the library teaches this yet/);
    expect(line).not.toContain('In the library:');
  });

  it('does not offer trial and error as a lesson', () => {
    expect(whereTaughtLine('Hypothesis Mode', 'What-if')).toMatch(/does not set out to teach trial and error/);
  });

  it('joins two names with "and", without a stray comma', () => {
    const two = TECHNIQUES.find((t) => puzzlesTeaching(t.name).length === 2);
    if (!two) return;
    const [a, b] = puzzlesTeaching(two.name);
    expect(whereTaughtLine(two.name, two.tier)).toContain(`${a.name} (`);
    expect(whereTaughtLine(two.name, two.tier)).toMatch(new RegExp(`\\) and ${b.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} \\(`));
  });
});
