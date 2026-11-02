// The states the toggle flips between. Each one is props for the panel, the
// same shape LogicPanel hands it, so nothing about the component changes
// between them.
import { TECHNIQUES } from './stressCatalog.js';

const byName = (predicate) => TECHNIQUES.filter(predicate).map((tech) => tech.name);
const countsFor = (entries) => Object.fromEntries(entries);
const ultimate = byName((tech) => tech.tier === 'Ultimate');

// Every live-counted technique counted: what the panel has when nothing
// easier applies and the whole live ladder was worth counting.
const allLiveCounted = (value = 0) =>
  countsFor(byName((tech) => tech.count === 'live').map((name) => [name, value]));

// What the panel actually has on a board with a single on it (#128): the
// easiest tier counted, and nothing after it, because the pass stopped.
const basicOnly = (counts) =>
  countsFor(byName((tech) => tech.tier === 'Basic').map((name) => [name, counts[name] ?? 0]));

export const FIXTURES = {
  demo: {
    label: 'Demo data',
    note: 'A Medium board with singles on it: the Basic tier counted, every harder tier held back by the gate.',
    props: {
      uniqueness: 'one',
      counts: basicOnly({ 'Naked Single': 3, 'Hidden Single': 1 }),
    },
  },

  worst: {
    label: 'Worst case',
    note: 'Long names, an unbreakable one, a one-letter one, a four-digit count, a count of exactly 1, a scan the player asked for anyway, and a grid with more than one answer.',
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
    note: 'Exactly one technique on the board, with exactly one instance, and every harder tier held back by it.',
    props: { uniqueness: 'one', counts: basicOnly({ 'Hidden Single': 1 }) },
  },

  nothingeasy: {
    label: 'Nothing easy',
    note: 'Every live tier counted and empty: the gate is open and the Ultimate tier is worth scanning.',
    props: { uniqueness: 'one', counts: allLiveCounted(0) },
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
    note: 'A scan of the Ultimate tier, one detector from the end, asked for in spite of the gate.',
    props: {
      uniqueness: 'one',
      counts: basicOnly({ 'Naked Single': 2 }),
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
