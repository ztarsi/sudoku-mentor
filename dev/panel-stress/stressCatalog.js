// The technique catalog, made worse, at the boundary the panel reads it
// through.
//
// break-ui's rule is to change the data and never the component, so this
// module stands in for `src/components/sudoku/techniqueCatalog.js` through a
// Vite alias (see vite.config.js) and hands the panel a catalog the size and
// shape of one we might plausibly ship. The panel is byte-identical to the
// one players get.
//
// `?catalog=<n>` sets the size; the default is three times today's. The five
// awkward entries below come first in the synthetic part, so they land in
// the rows that are actually on screen. None of them is nonsense: every one
// is a naming pattern the solving literature already uses.
// The `?real` suffix is how this module escapes its own alias: the alias
// matches any path ending in techniqueCatalog.js, which would otherwise
// include these two lines.
export * from '../../src/components/sudoku/techniqueCatalog.js?real';

import * as real from '../../src/components/sudoku/techniqueCatalog.js?real';

const size = Number(new URLSearchParams(window.location.search).get('catalog')) || 183;

// Plausible worst cases, in the tiers a player opens most.
const AWKWARD = [
  {
    // No short form, so the row has to render all sixty-two characters of
    // it. Chains really are named like this.
    name: 'Grouped Alternating Inference Chain with Almost Locked Set nodes',
    formal: 'Grouped AIC (ALS node, discontinuous, type 2)',
    tier: 'Ultimate',
    count: real.COUNT_SCAN,
    description: 'A chain whose nodes are groups and almost locked sets.',
  },
  {
    // Hyphenated to the end: one token with no break opportunity, which is
    // how the fish variants are written on the forums.
    name: 'Finned-Franken-Sashimi-Swordfish-with-Grouped-Links',
    formal: 'FFSS-GL',
    tier: 'Expert',
    count: real.COUNT_LIVE,
    description: 'Every fish modifier at once, hyphenated.',
  },
  {
    // One letter. The wings are named for their shape, and this is the
    // shortest name the literature has.
    name: 'W',
    short: 'W',
    formal: 'W-Wing (short form)',
    tier: 'Expert',
    count: real.COUNT_LIVE,
    description: 'The shortest name in the literature.',
  },
  {
    // Every optional field missing: no short form, no formal name.
    name: 'Nishio',
    tier: 'What-if',
    count: real.COUNT_SEARCH,
    description: 'Trial of a single candidate, named in Japanese.',
  },
  {
    // Diacritics and a non-Latin alias, which the find box has to match.
    name: 'Rossini Rotation (à deux, Ðurić variant)',
    short: 'Rossini à deux',
    formal: 'Rotación de Rossini',
    aliases: ['西尾', 'rossini'],
    tier: 'Ultimate',
    count: real.COUNT_SCAN,
    description: 'A rotation named for its author, with the author spelt properly.',
  },
];

const filler = [];
let i = 0;
while (real.TECHNIQUES.length + AWKWARD.length + filler.length < size) {
  const tier = real.TIERS[i % real.TIERS.length];
  const mine = real.TECHNIQUES.filter((tech) => tech.tier === tier.level);
  filler.push({
    name: `Synthetic ${tier.level} ${Math.floor(i / real.TIERS.length) + 1}`,
    tier: tier.level,
    count: mine[0].count,
    description: 'A stand-in for a technique we have not written yet.',
  });
  i += 1;
}

export const TECHNIQUES = [...real.TECHNIQUES, ...AWKWARD, ...filler];

const terms = (tech) =>
  [tech.name, tech.short, tech.formal, ...(tech.aliases ?? [])].filter(Boolean);

export const matchTechniques = (query) => {
  const needle = (query || '').trim().toLowerCase();
  if (!needle) return TECHNIQUES;
  return TECHNIQUES.filter((tech) => terms(tech).some((t) => t.toLowerCase().includes(needle)));
};

export const UNIQUENESS_TECHNIQUES = TECHNIQUES.filter((tech) => tech.uniqueness).map(
  (tech) => tech.name
);
export const LIVE_COUNT_TECHNIQUES = TECHNIQUES.filter(
  (tech) => tech.count === real.COUNT_LIVE
).map((tech) => tech.name);
export const SCAN_TECHNIQUES = TECHNIQUES.filter((tech) => tech.count === real.COUNT_SCAN).map(
  (tech) => tech.name
);
export const SEARCH_TECHNIQUES = TECHNIQUES.filter((tech) => tech.count === real.COUNT_SEARCH).map(
  (tech) => tech.name
);
