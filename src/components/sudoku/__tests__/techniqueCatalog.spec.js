// The catalog is what the panel, the hint card and the analyser all read.
// At fifty-odd techniques a missing tier or a missing lesson is a hole in
// the product, so the shape is checked here rather than found later. That
// every catalog technique has a detector that works is oracleAll's job: it
// takes its list from this catalog.
import { describe, it, expect } from 'vitest';
import {
  TECHNIQUES,
  TIERS,
  TECHNIQUE_DETAILS,
  TECHNIQUE_INFO,
  TECHNIQUE_TIERS,
  LEVEL_COLORS,
  LIVE_COUNT_TECHNIQUES,
  SCAN_TECHNIQUES,
  WHAT_IF_TECHNIQUES,
  COUNT_LIVE,
  COUNT_SCAN,
  COUNT_SEARCH,
  matchTechniques,
  searchTerms,
  teachingRank,
  techniqueTier,
  tierColor,
} from '../techniqueCatalog';
describe('the technique catalog', () => {
  it('names every technique once', () => {
    const names = TECHNIQUES.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
  });

  for (const tech of TECHNIQUES) {
    it(`${tech.name} is complete`, () => {
      // A tier the panel can place it in, with a colour
      expect(TIERS.map((t) => t.level)).toContain(tech.tier);
      expect(LEVEL_COLORS[tierColor(tech.tier)]).toBeTruthy();
      // A stated cost, so the panel knows whether it may be counted live
      expect([COUNT_LIVE, COUNT_SCAN, COUNT_SEARCH]).toContain(tech.count);
      // A lesson in all four parts
      const details = TECHNIQUE_DETAILS[tech.name];
      expect(details, `${tech.name} has no reference entry`).toBeTruthy();
      for (const part of ['plain', 'description', 'example', 'strategy']) {
        expect(typeof details[part], `${tech.name}.${part}`).toBe('string');
        expect(details[part].length, `${tech.name}.${part}`).toBeGreaterThan(20);
      }
      // Findable by name
      expect(searchTerms(tech)).toContain(tech.name.toLowerCase());
      expect(matchTechniques(tech.name).map((t) => t.name)).toContain(tech.name);
    });
  }

  it('splits the techniques by what their count costs', () => {
    expect([...LIVE_COUNT_TECHNIQUES, ...SCAN_TECHNIQUES, ...WHAT_IF_TECHNIQUES].sort()).toEqual(
      TECHNIQUES.map((t) => t.name).sort()
    );
    // The what-if techniques are a search, not a count, and are not on the
    // deductive ladder the hint card shows a tier chip for.
    for (const name of WHAT_IF_TECHNIQUES) expect(TECHNIQUE_INFO[name]).toBeUndefined();
    for (const name of [...LIVE_COUNT_TECHNIQUES, ...SCAN_TECHNIQUES]) {
      expect(TECHNIQUE_INFO[name].level).toBe(techniqueTier(name));
    }
  });

  it('puts the ladder in teaching order, tier by tier', () => {
    const ranks = TECHNIQUES.map((t) => teachingRank(t.name));
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
    // A tier's techniques are contiguous: the panel groups by tier, so a
    // technique filed out of order would appear under the wrong heading.
    const order = TECHNIQUES.map((t) => t.tier);
    const firstSeen = TIERS.map((tier) => order.indexOf(tier.level)).filter((i) => i >= 0);
    expect(firstSeen).toEqual([...firstSeen].sort((a, b) => a - b));
    for (const tier of TIERS) {
      const indices = order.flatMap((level, i) => (level === tier.level ? [i] : []));
      expect(indices.length, `${tier.level} has no techniques`).toBeGreaterThan(0);
      expect(indices[indices.length - 1] - indices[0]).toBe(indices.length - 1);
    }
    // The grouped view the panel reads agrees with the flat list.
    expect(TECHNIQUE_TIERS.flatMap((t) => t.techniques.map((x) => x.full))).toEqual(
      TECHNIQUES.map((t) => t.name)
    );
  });
});

describe('finding a technique by name', () => {
  it('finds one by part of its plain name', () => {
    expect(matchTechniques('wing').map((t) => t.name)).toEqual(
      expect.arrayContaining(['X-Wing', 'XY-Wing', 'Finned X-Wing'])
    );
    expect(matchTechniques('wing').map((t) => t.name)).not.toContain('Naked Single');
  });

  it('finds one by the name a guide would use', () => {
    // The spec's own example: "colouring" has to find X-Cycle.
    expect(matchTechniques('colouring').map((t) => t.name)).toContain('X-Cycle');
    expect(matchTechniques('coloring').map((t) => t.name)).toContain('X-Cycle');
    expect(matchTechniques('box/line').map((t) => t.name)).toContain('Claiming');
    expect(matchTechniques('almost locked').map((t) => t.name)).toContain('ALS-XZ');
    expect(matchTechniques('deadly pattern').map((t) => t.name)).toContain('Unique Rectangle Type 1');
    expect(matchTechniques('y-wing').map((t) => t.name)).toContain('XY-Wing');
  });

  it('ignores case and surrounding space, and matches nothing for nonsense', () => {
    expect(matchTechniques('  SWORDfish ').map((t) => t.name)).toEqual(['Swordfish']);
    expect(matchTechniques('qqq')).toEqual([]);
  });

  it('matches everything when nothing is typed', () => {
    expect(matchTechniques('')).toEqual(TECHNIQUES);
    expect(matchTechniques('   ')).toEqual(TECHNIQUES);
  });
});
