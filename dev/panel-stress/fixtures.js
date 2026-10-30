// The states the toggle flips between. Each one is props for the panel, the
// same shape LogicPanel hands it, so nothing about the component changes
// between them.
import { TECHNIQUES } from './stressCatalog.js';

const byName = (predicate) => TECHNIQUES.filter(predicate).map((tech) => tech.name);
const countsFor = (entries) => Object.fromEntries(entries);
const ultimate = byName((tech) => tech.tier === 'Ultimate');

// Every live-counted technique counted, which is what a board does a moment
// after it changes: the tiers that count live have a number for every row.
const allLiveCounted = (value = 0) =>
  countsFor(byName((tech) => tech.count === 'live').map((name) => [name, value]));

export const FIXTURES = {
  demo: {
    label: 'Demo data',
    note: 'A Medium board, part-solved: six techniques on it, the live tiers counted.',
    props: {
      uniqueness: 'one',
      counts: {
        ...allLiveCounted(0),
        'Naked Single': 3,
        'Hidden Single': 1,
        'Naked Pair': 2,
        'X-Wing': 1,
        Swordfish: 1,
        'X-Cycle': 2,
      },
    },
  },

  worst: {
    label: 'Worst case',
    note: 'Long names, an unbreakable one, a one-letter one, a four-digit count, a count of exactly 1, a scan just finished, and a grid with more than one answer.',
    props: {
      uniqueness: 'many',
      counts: {
        ...allLiveCounted(0),
        'Naked Single': 9999,
        'Hidden Single': 1,
        'Finned-Franken-Sashimi-Swordfish-with-Grouped-Links': 1284,
        W: 1,
        'Grouped Alternating Inference Chain with Almost Locked Set nodes': 7,
        'Rossini Rotation (à deux, Ðurić variant)': 2,
        'X-Cycle': 12,
        'ALS-XZ': 1,
      },
      scan: {
        grid: null,
        total: ultimate.length,
        done: ultimate.length,
        running: false,
        cancelled: false,
        found: [
          'Grouped Alternating Inference Chain with Almost Locked Set nodes',
          'Rossini Rotation (à deux, Ðurić variant)',
          'X-Cycle',
          'ALS-XZ',
        ],
      },
    },
  },

  empty: {
    label: 'Empty',
    note: 'Every live technique counted, nothing found, no scan asked for.',
    props: { uniqueness: 'one', counts: allLiveCounted(0) },
  },

  one: {
    label: 'One',
    note: 'Exactly one technique on the board, with exactly one instance.',
    props: { uniqueness: 'one', counts: { ...allLiveCounted(0), 'Hidden Single': 1 } },
  },

  all: {
    label: 'All of them',
    note: 'Every technique in the catalog on the board at once, which is the upper bound the short view has to hold.',
    props: {
      uniqueness: 'one',
      counts: countsFor(TECHNIQUES.map((tech) => [tech.name, 4])),
    },
  },

  scanning: {
    label: 'Scanning',
    note: 'A scan of the Ultimate tier, one detector from the end.',
    props: {
      uniqueness: 'one',
      counts: { ...allLiveCounted(0), 'Naked Single': 2 },
      scan: {
        grid: null,
        total: ultimate.length,
        done: ultimate.length - 1,
        running: true,
        cancelled: false,
        found: null,
      },
    },
  },

  noassist: {
    label: 'No Assist',
    note: 'Nothing may be counted; reading stays available.',
    props: { uniqueness: 'one', noAssistMode: true, counts: {} },
  },
};
