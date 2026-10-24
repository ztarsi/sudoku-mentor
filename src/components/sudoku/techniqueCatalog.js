// Single source of truth for the technique catalog: display metadata,
// teaching content, and the ladder the Techniques panel shows.
//
// Adding a technique is one entry in TECHNIQUES plus its TECHNIQUE_DETAILS
// text. Everything else here is derived, so the panel, the hint card and
// the difficulty analyser all learn about it at once.
import { Lightbulb, Target, Zap, BookOpen } from 'lucide-react';

export const LEVEL_COLORS = {
  emerald: 'from-emerald-400 to-green-500',
  blue: 'from-blue-400 to-indigo-500',
  purple: 'from-purple-400 to-violet-500',
  orange: 'from-orange-400 to-red-500',
  violet: 'from-indigo-600 to-violet-800',
  fuchsia: 'from-fuchsia-600 to-pink-600',
};

// How a technique's count on the current board is paid for.
//
//   live    cheap enough to count while the panel is open, off the input path
//   scan    only when the player asks, on the tier's Scan button
//   search  not a count at all: the what-if search, on the Search button
export const COUNT_LIVE = 'live';
export const COUNT_SCAN = 'scan';
export const COUNT_SEARCH = 'search';

// The tiers, in teaching order. `scanNote` is what the Scan button promises
// before it runs, so the player knows what they are about to spend.
export const TIERS = [
  { level: 'Basic', color: 'emerald' },
  { level: 'Intermediate', color: 'blue' },
  { level: 'Advanced', color: 'purple' },
  { level: 'Expert', color: 'orange' },
  {
    level: 'Ultimate',
    color: 'violet',
    scanNote: 'These cost too much to count while you play. Scan runs every one of them on the board as it stands now, and looks at longer chains than a hint will show you; it takes a second or two. Or count one row on its own.',
  },
  {
    level: 'Forcing Chains',
    color: 'fuchsia',
    searchNote: 'Not a pattern on the board: Search assumes a digit and follows the consequences until something repeats or breaks.',
  },
];

/**
 * Every technique the mentor knows, in teaching order.
 *
 *   name        the engine's name, and the key used everywhere else
 *   short       what a narrow row shows instead of the full name
 *   formal      the name an experienced solver uses, when it differs
 *   aliases     other names players look for ("colouring" finds X-Cycle)
 *   tier        a TIERS level
 *   count       COUNT_LIVE, COUNT_SCAN or COUNT_SEARCH (above)
 *   description one line, shown in the hint card's tier chip tooltip
 */
export const TECHNIQUES = [
  {
    name: 'Naked Single',
    tier: 'Basic',
    count: COUNT_LIVE,
    aliases: ['sole candidate', 'forced cell', 'single', 'last remaining candidate'],
    description: 'A cell has only one possible candidate remaining.',
    icon: Target,
  },
  {
    name: 'Hidden Single',
    tier: 'Basic',
    count: COUNT_LIVE,
    aliases: ['unique candidate', 'single', 'only square', 'last remaining cell'],
    description: 'A candidate appears only once in a row, column, or box.',
    icon: Target,
  },
  {
    name: 'Pointing Pair',
    tier: 'Intermediate',
    count: COUNT_LIVE,
    formal: 'Locked Candidates (pointing)',
    aliases: ['locked candidates', 'intersection removal', 'box line'],
    description: 'Candidates in a box align in a row/column, eliminating candidates outside the box.',
    icon: Zap,
  },
  {
    name: 'Pointing Triple',
    tier: 'Intermediate',
    count: COUNT_LIVE,
    formal: 'Locked Candidates (pointing, three cells)',
    aliases: ['locked candidates', 'intersection removal'],
    description: 'Three candidates in a box align in a row/column.',
    icon: Zap,
  },
  {
    name: 'Claiming',
    tier: 'Intermediate',
    count: COUNT_LIVE,
    formal: 'Box/Line Reduction',
    aliases: ['box line reduction', 'line box reduction', 'locked candidates'],
    description: 'Candidates in a row/column are confined to one box.',
    icon: Zap,
  },
  {
    name: 'Naked Pair',
    tier: 'Advanced',
    count: COUNT_LIVE,
    formal: 'Naked Subset (two cells)',
    aliases: ['locked pair', 'naked subset', 'conjugate pair'],
    description: 'Two cells in a unit have the same two candidates.',
    icon: BookOpen,
  },
  {
    name: 'Hidden Pair',
    tier: 'Advanced',
    count: COUNT_LIVE,
    formal: 'Hidden Subset (two digits)',
    aliases: ['hidden subset'],
    description: 'Two candidates appear only in two cells of a unit.',
    icon: BookOpen,
  },
  {
    name: 'Naked Triple',
    tier: 'Advanced',
    count: COUNT_LIVE,
    formal: 'Naked Subset (three cells)',
    aliases: ['naked subset', 'triple'],
    description: 'Three cells share three candidates between them.',
    icon: BookOpen,
  },
  {
    name: 'Hidden Triple',
    tier: 'Advanced',
    count: COUNT_LIVE,
    formal: 'Hidden Subset (three digits)',
    aliases: ['hidden subset', 'triple'],
    description: 'Three candidates appear only in three cells of a unit.',
    icon: BookOpen,
  },
  {
    name: 'Naked Quad',
    tier: 'Advanced',
    count: COUNT_LIVE,
    formal: 'Naked Subset (four cells)',
    aliases: ['naked subset', 'quad', 'quadruple'],
    description: 'Four cells share four candidates between them.',
    icon: BookOpen,
  },
  {
    name: 'Hidden Quad',
    tier: 'Advanced',
    count: COUNT_LIVE,
    formal: 'Hidden Subset (four digits)',
    aliases: ['hidden subset', 'quad', 'quadruple'],
    description: 'Four candidates appear only in four cells of a unit.',
    icon: BookOpen,
  },
  {
    name: 'X-Wing',
    tier: 'Expert',
    count: COUNT_LIVE,
    aliases: ['fish', 'basic fish'],
    description: 'A candidate forms a rectangle pattern, allowing eliminations.',
    icon: Lightbulb,
  },
  {
    name: 'Swordfish',
    tier: 'Expert',
    count: COUNT_LIVE,
    aliases: ['fish', 'basic fish', '3-fish'],
    description: 'An X-Wing extended to three rows and columns.',
    icon: Lightbulb,
  },
  {
    name: 'Jellyfish',
    tier: 'Expert',
    count: COUNT_LIVE,
    formal: 'Basic Fish (four lines)',
    aliases: ['fish', 'basic fish', '4-fish', 'jelly fish'],
    description: 'A Swordfish one size up: four lines against four.',
    icon: Lightbulb,
  },
  {
    name: 'Empty Rectangle',
    short: 'Empty Rect.',
    tier: 'Expert',
    count: COUNT_LIVE,
    aliases: ['empty rectangle', 'er', 'single digit pattern', 'box pattern', 'crossing lines'],
    description: "A digit's places in one box lie on one row and one column, crossing at an empty cell.",
    icon: Lightbulb,
  },
  {
    name: 'XY-Wing',
    tier: 'Expert',
    count: COUNT_LIVE,
    formal: 'Y-Wing',
    aliases: ['y wing', 'bent triple', 'wing'],
    description: 'Three bi-value cells form a chain for eliminations.',
    icon: Lightbulb,
  },
  {
    name: 'XYZ-Wing',
    tier: 'Expert',
    count: COUNT_LIVE,
    aliases: ['wing', 'xyz wing', 'bent triple'],
    description: 'An XY-Wing whose pivot keeps a third candidate.',
    icon: Lightbulb,
  },
  {
    name: 'WXYZ-Wing',
    tier: 'Expert',
    count: COUNT_LIVE,
    aliases: ['wing', 'wxyz wing', 'almost locked set'],
    description: 'Four cells spanning four candidates pin one digit inside the set.',
    icon: Lightbulb,
  },
  // The chain family (#67). Four short chains with well-known names come
  // first, so a player gains a vocabulary rather than one general machine.
  {
    name: 'Skyscraper',
    tier: 'Expert',
    count: COUNT_LIVE,
    formal: 'Turbot Fish (skyscraper)',
    aliases: ['turbot fish', 'single digit chain', 'chain', 'aic'],
    description: 'Two conjugate pairs on one digit share a line at one end.',
    icon: Lightbulb,
  },
  {
    name: 'Two-String Kite',
    short: 'Two-String Kite',
    tier: 'Expert',
    count: COUNT_LIVE,
    formal: 'Turbot Fish (kite)',
    aliases: ['kite', 'turbot fish', 'single digit chain', 'chain', 'aic'],
    description: 'A row pair and a column pair on one digit meet in a box.',
    icon: Lightbulb,
  },
  {
    name: 'W-Wing',
    tier: 'Expert',
    count: COUNT_LIVE,
    aliases: ['wing', 'w wing', 'chain', 'aic'],
    description: 'The same bare pair twice, bridged by a conjugate pair.',
    icon: Lightbulb,
  },
  {
    name: 'Remote Pairs',
    tier: 'Expert',
    count: COUNT_LIVE,
    formal: 'Remote Pair chain',
    aliases: ['remote pair', 'chain', 'aic'],
    description: 'A chain of cells all holding the same two candidates.',
    icon: Lightbulb,
  },
  {
    name: 'X-Cycle',
    tier: 'Ultimate',
    count: COUNT_SCAN,
    formal: 'Simple Colouring',
    aliases: ['colouring', 'coloring', 'simple colouring', 'single digit chain', 'nice loop'],
    description: 'Chain-based coloring technique using strong links.',
    icon: Lightbulb,
  },
  {
    name: '3D Medusa',
    tier: 'Ultimate',
    count: COUNT_SCAN,
    formal: '3D Medusa Colouring',
    aliases: ['medusa', 'colouring', 'coloring', 'multi-digit colouring', 'multi colouring'],
    description: 'Colouring across every digit at once, inside cells as well as along units.',
    icon: Lightbulb,
  },
  {
    name: 'X-Chain',
    tier: 'Ultimate',
    count: COUNT_SCAN,
    formal: 'X-Chain (single-digit AIC)',
    aliases: ['single digit chain', 'chain', 'aic', 'alternating inference chain'],
    description: 'A longer chain of strong and weak links on one digit.',
    icon: Lightbulb,
  },
  {
    name: 'XY-Chain',
    tier: 'Ultimate',
    count: COUNT_SCAN,
    aliases: ['xy chain', 'chain', 'aic', 'alternating inference chain'],
    description: 'A chain of bi-value cells whose two ends share a digit.',
    icon: Lightbulb,
  },
  {
    name: 'Finned X-Wing',
    tier: 'Ultimate',
    count: COUNT_SCAN,
    formal: 'Finned Fish (two lines)',
    aliases: ['finned fish', 'fish'],
    description: 'X-Wing pattern with additional fin cells.',
    icon: Lightbulb,
  },
  {
    name: 'Finned Swordfish',
    tier: 'Ultimate',
    count: COUNT_SCAN,
    formal: 'Finned Fish (three lines)',
    aliases: ['finned fish', 'fish', 'finned swordfish'],
    description: 'A Swordfish spoiled by one or two extra candidates in a base line.',
    icon: Lightbulb,
  },
  {
    name: 'Finned Jellyfish',
    tier: 'Ultimate',
    count: COUNT_SCAN,
    formal: 'Finned Fish (four lines)',
    aliases: ['finned fish', 'fish', 'finned jellyfish'],
    description: 'The same fin, on the four-line fish.',
    icon: Lightbulb,
  },
  {
    name: 'Sashimi Fish',
    tier: 'Ultimate',
    count: COUNT_SCAN,
    formal: 'Sashimi Finned Fish',
    aliases: ['sashimi', 'sashimi x-wing', 'sashimi swordfish', 'sashimi jellyfish', 'finned fish', 'fish'],
    description: 'A finned fish whose spoiled corner is empty rather than occupied.',
    icon: Lightbulb,
  },
  {
    name: 'ALS-XZ',
    tier: 'Ultimate',
    count: COUNT_SCAN,
    formal: 'Almost Locked Set XZ rule',
    aliases: ['almost locked set', 'als', 'als xz'],
    description: 'Almost Locked Sets with restricted common digits.',
    icon: Lightbulb,
  },
  {
    name: 'Unique Rectangle Type 1',
    short: 'Unique Rect.',
    tier: 'Ultimate',
    count: COUNT_SCAN,
    aliases: ['uniqueness', 'deadly pattern', 'ur', 'unique rectangle'],
    description: 'Avoids deadly patterns with multiple solutions.',
    icon: Lightbulb,
  },
  {
    name: 'BUG+1',
    tier: 'Ultimate',
    count: COUNT_SCAN,
    formal: 'Bivalue Universal Grave + 1',
    aliases: ['bivalue universal grave', 'bug', 'uniqueness'],
    description: 'Bivalue Universal Grave plus one tri-value cell.',
    icon: Lightbulb,
  },
  {
    name: 'Franken Fish',
    tier: 'Ultimate',
    count: COUNT_SCAN,
    aliases: ['fish', 'franken', 'franken fish', 'box fish'],
    description: 'A fish that uses a box as one of its lines.',
    icon: Lightbulb,
  },
  {
    name: 'Mutant Fish',
    tier: 'Ultimate',
    count: COUNT_SCAN,
    aliases: ['fish', 'mutant', 'mutant fish'],
    description: 'A fish whose lines mix rows, columns and boxes freely.',
    icon: Lightbulb,
  },
  {
    name: 'Alternating Chain',
    tier: 'Ultimate',
    count: COUNT_SCAN,
    formal: 'Alternating Inference Chain (AIC)',
    aliases: ['aic', 'alternating inference chain', 'chain', 'mixed digit chain'],
    description: 'Strong and weak links alternating across mixed digits.',
    icon: Lightbulb,
  },
  {
    name: 'Grouped X-Chain',
    tier: 'Ultimate',
    count: COUNT_SCAN,
    formal: 'Grouped X-Chain',
    aliases: ['grouped chain', 'grouped aic', 'group node', 'chain', 'aic'],
    description: 'A one-digit chain whose links may land on a group of cells.',
    icon: Lightbulb,
  },
  {
    name: 'Grouped Alternating Chain',
    short: 'Grouped AIC',
    tier: 'Ultimate',
    count: COUNT_SCAN,
    formal: 'Grouped Alternating Inference Chain',
    aliases: ['grouped chain', 'grouped aic', 'group node', 'chain', 'aic'],
    description: 'A mixed-digit chain whose links may land on a group of cells.',
    icon: Lightbulb,
  },
  {
    name: 'Continuous Loop',
    tier: 'Ultimate',
    count: COUNT_SCAN,
    formal: 'Nice Loop (continuous)',
    aliases: ['nice loop', 'loop', 'continuous nice loop', 'chain', 'aic'],
    description: 'A chain that closes on itself, so every weak link eliminates.',
    icon: Lightbulb,
  },
  {
    name: 'ALS Chain',
    tier: 'Ultimate',
    count: COUNT_SCAN,
    formal: 'AIC with Almost Locked Set nodes',
    aliases: ['als', 'almost locked set', 'als aic', 'chain', 'aic'],
    description: 'A chain that passes through a set one digit short of locked.',
    icon: Lightbulb,
  },
  {
    name: 'Cell Forcing Chain',
    tier: 'Forcing Chains',
    count: COUNT_SEARCH,
    aliases: ['forcing chain', 'what if', 'convergence'],
    description: 'Every candidate of one cell leads to the same conclusion.',
    icon: Lightbulb,
  },
  {
    name: 'Hypothesis Mode',
    tier: 'Forcing Chains',
    count: COUNT_SEARCH,
    aliases: ['what if', 'contradiction', 'trial and error', 'nishio'],
    description: 'Assume a candidate and eliminate it when it breaks the board.',
    icon: Lightbulb,
  },
];

const TIER_BY_LEVEL = Object.fromEntries(TIERS.map((tier) => [tier.level, tier]));
const BY_NAME = Object.fromEntries(TECHNIQUES.map((tech) => [tech.name, tech]));

/** The catalog entry for a technique name, or undefined. */
export const techniqueEntry = (name) => BY_NAME[name];

/** The tier a technique sits in ('Expert'), or null for an unknown name. */
export const techniqueTier = (name) => BY_NAME[name]?.tier ?? null;

/** Where a technique sits on the teaching ladder; -1 for an unknown name. */
export const teachingRank = (name) => TECHNIQUES.findIndex((tech) => tech.name === name);

/** The tier's accent colour key, for LEVEL_COLORS. */
export const tierColor = (level) => TIER_BY_LEVEL[level]?.color ?? 'emerald';

/** Names in teaching order, by how their count is paid for. */
export const techniqueNamesByCount = (count) =>
  TECHNIQUES.filter((tech) => tech.count === count).map((tech) => tech.name);

export const LIVE_COUNT_TECHNIQUES = techniqueNamesByCount(COUNT_LIVE);
export const SCAN_TECHNIQUES = techniqueNamesByCount(COUNT_SCAN);
export const WHAT_IF_TECHNIQUES = techniqueNamesByCount(COUNT_SEARCH);

/** Every name a player might type to find this technique, lower-cased. */
export const searchTerms = (tech) =>
  [tech.name, tech.short, tech.formal, ...(tech.aliases || [])]
    .filter(Boolean)
    .map((term) => term.toLowerCase());

/**
 * The techniques whose name, formal name or alias contains `query`. An empty
 * query matches everything, in teaching order.
 */
export const matchTechniques = (query) => {
  const needle = (query || '').trim().toLowerCase();
  if (!needle) return TECHNIQUES;
  return TECHNIQUES.filter((tech) => searchTerms(tech).some((term) => term.includes(needle)));
};

/**
 * What the hint card reads for a step's tier and colour. Only the deductive
 * techniques are here: a what-if step is presented as a search, not as a
 * tier on the ladder, and the card's own wording covers it.
 */
export const TECHNIQUE_INFO = Object.fromEntries(
  TECHNIQUES.filter((tech) => tech.count !== COUNT_SEARCH).map((tech) => [
    tech.name,
    { level: tech.tier, color: tierColor(tech.tier), description: tech.description, icon: tech.icon },
  ])
);

/** The ladder, grouped by tier, in teaching order. */
export const TECHNIQUE_TIERS = TIERS.map((tier) => ({
  ...tier,
  techniques: TECHNIQUES.filter((tech) => tech.tier === tier.level).map((tech) => ({
    name: tech.short || tech.name,
    full: tech.name,
    formal: tech.formal || null,
    count: tech.count,
  })),
}));

// Teaching content for the "learn this technique" dialog.
//
// `plain` is written for someone who has never read a Sudoku guide: everyday
// words, no notation, one idea per sentence. `description`, `strategy` and
// `example` use the standard vocabulary an experienced solver expects.
// Cell notation in the advanced text: R3C4 = row 3, column 4.
export const TECHNIQUE_DETAILS = {
  'Naked Single': {
    plain: 'A cell where only one number can still go. Every other number from 1 to 9 is already used in its row, its column, or its 3x3 box. Write that number in.',
    description: 'A cell has exactly one candidate left after removing every digit present in its row, column, and box.',
    example: 'A cell whose row, column, and box together already contain 1, 2, 3, 4, 6, 7, 8, and 9 must be 5.',
    strategy: '1. Pick an empty cell\n2. Cross off every digit that appears in its row, column, or box\n3. If exactly one digit is left, place it'
  },
  'Hidden Single': {
    plain: 'A number that has only one possible home in a row, column, or box. The cell might have other pencil marks too, but since the number has nowhere else to go, it must go there.',
    description: 'Within one unit, a digit is a candidate in exactly one cell, even if that cell has other candidates.',
    example: 'In row 4 the digit 7 fits only in R4C6 (its other cells all see a 7). R4C6 = 7, even if it also had candidates 2 and 4.',
    strategy: '1. Pick a digit\n2. Scan one row, column, or box for where it can still go\n3. If there is only one spot, place it there'
  },
  'Pointing Pair': {
    plain: 'Inside one 3x3 box, a number can only go in two cells, and those two cells happen to be in the same row (or column). The box must get that number from one of them. So the number cannot appear anywhere else in that row (or column), and you can erase it from the other cells of that row outside the box.',
    description: 'All candidates for a digit within a box lie in one row or column. That digit is then excluded from the rest of that row or column outside the box.',
    example: 'In box 1, the only 3s are R2C1 and R2C3. Row 2 gets its 3 from box 1, so 3 is removed from R2C4 through R2C9.',
    strategy: '1. Pick a box and a digit\n2. Find the cells in the box where the digit can go\n3. If they all share a row or column, erase the digit from that line outside the box'
  },
  'Pointing Triple': {
    plain: 'The same idea as a Pointing Pair, with three cells instead of two: inside a box, a number can only go in three cells that all sit in one row or column. Erase the number from the rest of that row or column.',
    description: 'A Pointing Pair with three aligned candidate cells in the box.',
    example: 'In box 5, the only 6s are R4C4, R4C5, and R4C6. Remove 6 from the rest of row 4.',
    strategy: 'As for Pointing Pair, with three aligned cells'
  },
  'Claiming': {
    plain: 'Look along one row (or column). A number can only go in a few cells there, and all of them sit inside the same 3x3 box. The row must get its number from one of those cells, so the box gets its number from the row. Erase the number from every other cell in that box.',
    description: 'All candidates for a digit within a row or column lie inside one box. That digit is excluded from the rest of the box. Also called Box/Line Reduction.',
    example: 'In row 7 the only 8s are R7C7 and R7C8, both in box 9. Remove 8 from the other cells of box 9.',
    strategy: '1. Pick a row or column and a digit\n2. Find where the digit can go along that line\n3. If every spot is in one box, erase the digit from the rest of that box'
  },
  'Naked Pair': {
    plain: 'Two cells in the same row, column, or box that have exactly the same two pencil marks and nothing else. Between them they must use up both numbers. So those two numbers cannot appear anywhere else in that row, column, or box.',
    description: 'Two cells in a unit hold the same two candidates and no others. Those digits are removed from every other cell in the unit.',
    example: 'R3C2 and R3C8 both hold only {2, 5}. Remove 2 and 5 from the rest of row 3.',
    strategy: '1. Look for two cells in one unit with the same two pencil marks\n2. Erase those two numbers from every other cell in that unit'
  },
  'Hidden Pair': {
    plain: 'Two numbers that can only go in the same two cells of a row, column, or box. Those two cells are reserved for those two numbers, so any other pencil marks in them can be erased.',
    description: 'Two digits are candidates in exactly the same two cells of a unit. All other candidates are removed from those two cells.',
    example: 'In box 4, the digits 3 and 7 fit only in R4C1 and R6C2. Those cells become {3, 7}.',
    strategy: '1. Pick a unit\n2. Find two digits that each fit in only two cells, the same two cells\n3. Erase every other pencil mark from those two cells'
  },
  'Naked Triple': {
    plain: 'Three cells in the same row, column, or box whose pencil marks, put together, are only three different numbers. (Each cell can have two or three of them.) Those three numbers must fill those three cells, so erase them from the rest of that row, column, or box.',
    description: 'Three cells in a unit whose combined candidates are exactly three digits. Those digits are removed from the other cells of the unit.',
    example: 'Three cells in column 5 hold {1, 4}, {1, 9}, and {4, 9}. Remove 1, 4, and 9 from the rest of column 5.',
    strategy: '1. Find three cells in one unit\n2. Check that their pencil marks together make only three numbers\n3. Erase those numbers from every other cell in the unit'
  },
  'Hidden Triple': {
    plain: 'Three numbers that can only go in the same three cells of a row, column, or box. Those three cells are reserved for those three numbers, so any other pencil marks in them can be erased. A number does not have to be possible in all three cells, only nowhere else in that row, column, or box.',
    description: 'Three digits are candidates only in the same three cells of a unit, each in two or three of them. All other candidates are removed from those three cells.',
    example: 'In row 2, the digits 2, 6 and 9 fit only in R2C1, R2C5 and R2C8. Those three cells keep only 2, 6 and 9.',
    strategy: '1. Pick a unit\n2. Find three digits that each fit in only two or three cells, all inside the same three cells\n3. Erase every other pencil mark from those three cells'
  },
  'Naked Quad': {
    plain: 'Four cells in the same row, column, or box whose pencil marks, put together, are only four different numbers. (Each cell can have two, three, or four of them.) Those four numbers must fill those four cells, so erase them from the rest of that row, column, or box. There is no point looking for five or more: the cells left over are always a smaller subset you can spot instead.',
    description: 'Four cells in a unit whose combined candidates are exactly four digits. Those digits are removed from the other cells of the unit. Larger subsets are redundant: the complement of an N-subset in a unit is always a smaller subset.',
    example: 'Four cells in box 3 hold {1, 4}, {4, 7}, {1, 7, 8} and {7, 8}. Remove 1, 4, 7 and 8 from the rest of box 3.',
    strategy: '1. Find four cells in one unit\n2. Check that their pencil marks together make only four numbers\n3. Erase those numbers from every other cell in the unit'
  },
  'Hidden Quad': {
    plain: 'Four numbers that can only go in the same four cells of a row, column, or box. Those four cells are reserved for those four numbers, so any other pencil marks in them can be erased. Four is as far as this goes: with five or more, the cells left over are always a smaller subset you can spot instead.',
    description: 'Four digits are candidates only in the same four cells of a unit. All other candidates are removed from those four cells. Larger hidden subsets are redundant for the same reason as larger naked ones.',
    example: 'In column 7, the digits 1, 3, 5 and 6 fit only in R1C7, R4C7, R5C7 and R9C7. Those four cells keep only 1, 3, 5 and 6.',
    strategy: '1. Pick a unit\n2. Find four digits whose possible cells all fall inside the same four cells\n3. Erase every other pencil mark from those four cells'
  },
  'X-Wing': {
    plain: 'Pick a number. Find two rows where that number can only go in the same two columns, making the four corners of a rectangle. Each of those rows needs the number once, so the two columns will each get one from these rows. That uses up both columns, so erase the number from every other cell in those two columns. (It also works with rows and columns swapped.)',
    description: 'A digit has exactly two candidate cells in each of two rows, in the same two columns. The digit is removed from those columns outside the two rows. Symmetrically for columns.',
    example: 'The 5s in rows 1 and 8 are confined to columns 2 and 7. Remove 5 from columns 2 and 7 in every other row.',
    strategy: '1. Pick a digit\n2. Find a row where it has exactly two spots\n3. Find a second row with its two spots in the same columns\n4. Erase the digit from those columns in all other rows'
  },
  'Swordfish': {
    plain: 'An X-Wing with three rows and three columns instead of two. A number is limited to the same three columns in three different rows (two or three spots in each). Those three columns get all their copies of the number from these rows, so erase it from the rest of those columns.',
    description: 'A digit appears in at most three cells in each of three rows, all within the same three columns. The digit is removed from those columns outside the three rows.',
    example: 'The 4s in rows 2, 5, and 9 all fall in columns 1, 4, and 8. Remove 4 from those columns in the other rows.',
    strategy: '1. Pick a digit\n2. Find three rows whose candidate cells fall in only three columns\n3. Erase the digit from those columns in the other rows'
  },
  'Jellyfish': {
    plain: 'The same pattern as an X-Wing and a Swordfish, one size bigger. Pick a number and find four rows where it can only go in the same four columns (two, three or four spots in each row). Each of those four rows needs one copy of the number, and only those four columns can hold them, so the four columns are completely used up by these rows. Erase the number from every other cell in those four columns. It works the same way with rows and columns swapped. Four is as far as the family goes: if you tried five rows, the four rows you left out would form a Jellyfish of their own on the other four columns, so there is nothing new to find.',
    description: 'A digit occupies at most four cells in each of four rows, all inside the same four columns. The digit is removed from those columns outside the four rows, and symmetrically for columns. A size-five fish is the complement of a size-four fish on a 9x9 grid, so larger sizes are redundant. A pattern that collapses to a smaller fish is reported as that smaller fish.',
    example: 'The 7s in rows 1, 3, 6 and 8 all fall in columns 2, 4, 5 and 9. Remove 7 from those four columns in every other row, for instance from R5C4.',
    strategy: '1. Pick a digit\n2. Find four rows where it has two, three or four spots each\n3. Check that all those spots fall in only four columns\n4. Erase the digit from those four columns in the other rows\n5. Try it again with columns and rows swapped'
  },
  'Empty Rectangle': {
    plain: 'Pick a number and one 3x3 box. Look at where that number can still go in the box. If every one of those places sits on a single row or a single column of the box, then the box must take its number from that row or from that column - never from the four cells away from both, which is the empty rectangle the pattern is named after. That is useful because it ties the row to the column: if the box does not use the row, it must use the column. Now find a line somewhere else where the same number has only two possible homes, one of them on the box\'s column. Then the cell where the box\'s row meets the other home can never be the number. If it were, the box could not use its row, so it would use its column; that would empty the rest of the column, which pushes the two-home line onto its other end - and that end shares a line with the cell we started from. Two copies of one number in a line is impossible, so the starting cell is ruled out.',
    description: 'In one box, all candidates for a digit lie on one row and one column of that box, with at least one candidate off each of them, so the box\'s digit is on the crossing row or the crossing column. Combined with a conjugate pair on the same digit in a line outside the box that meets the crossing column, the digit is eliminated where the crossing row meets the far end of that pair; and symmetrically with rows and columns exchanged.',
    example: 'In box 5 the only 4s are R4C4, R4C6 and R6C4, so they lie on row 4 and column 4 and the box takes its 4 from one of those lines. Row 8 has only two 4s, R8C4 and R8C9. Then R4C9 cannot be 4: it would force the box onto column 4, the column onto R8C4 is then impossible, so row 8 would need R8C9, which shares column 9 with R4C9.',
    strategy: '1. Pick a digit and a box where it has three or four places left\n2. Check that they all lie on one row and one column of the box, with at least one off each\n3. Look along the crossing column for a line with exactly two places for the digit, one of them in that column\n4. Erase the digit where the crossing row meets the other place\n5. Repeat with rows and columns swapped'
  },
  'XY-Wing': {
    plain: 'Three cells with two pencil marks each, arranged like a hinge. The middle cell holds numbers A and B. One outer cell holds A and C, the other holds B and C. Whichever number the middle cell takes, it pushes one outer cell to C. So C is guaranteed to land in one of the outer cells, and any cell that shares a row, column, or box with both outer cells can never be C.',
    description: 'A pivot with candidates {X, Y} sees two wings, {X, Z} and {Y, Z}. Either value of the pivot forces a wing to be Z, so Z is removed from every cell that sees both wings.',
    example: 'Pivot R5C5 = {2, 5}, wings R5C1 = {2, 8} and R1C5 = {5, 8}. Remove 8 from R1C1, which sees both wings.',
    strategy: '1. Find a cell with two pencil marks (the pivot)\n2. Find two cells it shares a unit with that each share one of its marks and share a third mark with each other\n3. Erase that third mark from cells that see both wings'
  },
  'XYZ-Wing': {
    plain: 'The same hinge as an XY-Wing, with one extra pencil mark in the middle cell. The middle cell holds A, B and C. One outer cell holds A and C, the other holds B and C. If the middle cell is A, the first outer cell must be C; if it is B, the second outer cell must be C; and it may be C itself. So the middle cell counts as a third place C could go, and C is guaranteed to land in one of these three cells. That is why only a cell that shares a row, column, or box with all three can be ruled out, not one that merely sees the two outer cells.',
    description: 'A pivot with candidates {X, Y, Z} sees two wings, {X, Z} and {Y, Z}. All three cells can hold Z, so Z is removed from every cell that sees the pivot and both wings.',
    example: 'Pivot R5C5 = {2, 5, 8}, wings R5C4 = {2, 8} and R6C5 = {5, 8}. Remove 8 only from cells that see all three, such as R6C4.',
    strategy: '1. Find a cell with three pencil marks (the pivot)\n2. Find two cells it shares a unit with, each holding two of its marks and sharing a third mark with each other\n3. Erase that shared mark from the cells that see the pivot and both wings'
  },
  'WXYZ-Wing': {
    plain: 'Four cells whose pencil marks, put together, are only four different numbers. Three of those numbers are each penned into cells that all share a row, column, or box, so each of the three can be used only once among the four cells. Three numbers cannot fill four cells, so the fourth number has to go in one of them. Any cell that shares a row, column, or box with every cell of the group that could hold that number can never be it.',
    description: 'Four cells spanning exactly four candidates where each of the three non-Z digits is restricted (all its cells in the set see each other). At most three cells take those digits, so one cell must be Z, and Z is removed from every cell that sees all Z candidates in the set.',
    example: 'R1C1 = {1, 9}, R1C3 = {4, 9}, R1C7 = {1, 4, 6} and R3C1 = {6, 9}. The 1s, 4s and 6s each see each other, so one of the four cells is 9. Remove 9 from cells that see every 9 in the set.',
    strategy: '1. Find four cells whose pencil marks together are only four numbers\n2. Pick the number whose cells do not all see each other; the other three must each be confined to cells that do\n3. Erase that number from every cell that sees all of its places inside the set'
  },
  'Skyscraper': {
    plain: 'Pick a number. Find two rows where it has only two possible cells each, and where one of those cells in each row sits in the same column as the other row\'s. Those two cells share a column, so they cannot both hold the number. That leaves the other two cells, one in each row, and at least one of them has to hold it. Any cell that shares a row, column, or box with both of those can never be that number.',
    description: 'Two conjugate pairs on one digit lie in two rows (or two columns) with one end of each in the same column (or row). The two free ends are the endpoints of a four-node alternating inference chain, so the digit is eliminated from every cell that sees both of them.',
    example: 'The only 5s in row 1 are R1C3 and R1C7; the only 5s in row 4 are R4C7 and R4C9. R1C7 and R4C7 share column 7, so one of R1C3 and R4C9 is 5. R1C9 sees both, so remove 5 from R1C9.',
    strategy: '1. Pick a digit\n2. Find two rows where it has exactly two places\n3. Check that one place from each row shares a column\n4. Erase the digit from every cell that sees both of the other two places'
  },
  'Two-String Kite': {
    plain: 'Pick a number. Find a row where it has only two possible cells, and a column where it has only two possible cells. If one cell from the row and one cell from the column sit inside the same 3x3 box, those two cannot both hold the number. So one of the other two cells, the far ends, must hold it. The cell that shares a row with one far end and a column with the other can never be that number.',
    description: 'A conjugate pair on one digit in a row and another in a column, with their near ends in the same box. The far ends are the endpoints of a four-node alternating inference chain, so the digit is eliminated from the cell that sees both.',
    example: 'The only 7s in row 7 are R7C2 and R7C8; the only 7s in column 3 are R5C3 and R9C3. R7C2 and R9C3 both sit in box 7, so they cannot both be 7, which leaves one of R7C8 and R5C3. R5C8 shares row 5 with one and column 8 with the other, so R5C8 cannot be 7.',
    strategy: '1. Pick a digit\n2. Find a row with exactly two places for it, and a column with exactly two\n3. Check that one place from each shares a box\n4. Erase the digit from the cell that sees both far ends'
  },
  'W-Wing': {
    plain: 'Two cells somewhere on the board hold exactly the same two pencil marks, say 3 and 8, and they do not see each other. Now find a row, column, or box where 3 has only two possible cells, with one of them seeing the first cell and the other seeing the second. One of those two cells is the 3, and whichever it is, it stops the matching cell beside it from being 3, which forces that cell to be 8. So one of the two matching cells is 8. Any cell that shares a row, column, or box with both of them can never be 8.',
    description: 'Two cells hold the same bare pair {X, Z} and are joined by a conjugate pair on X, one end of which sees each pair cell. Either end of the conjugate pair forces the pair cell it sees to Z, so Z is eliminated from every cell that sees both pair cells.',
    example: 'R1C1 and R7C9 both hold only {3, 8}. In row 4 the only 3s are R4C1 and R4C9. R4C1 sees R1C1 and R4C9 sees R7C9, so one of R1C1 and R7C9 is 8. Remove 8 from R1C9, which sees both.',
    strategy: '1. Find two cells with the same two pencil marks that do not see each other\n2. Pick one of the two digits and find a row, column, or box where it has exactly two places\n3. Check that one place sees the first cell and the other sees the second\n4. Erase the other digit from every cell that sees both of the matching cells'
  },
  'Remote Pairs': {
    plain: 'A line of cells that all hold exactly the same two pencil marks, each cell sharing a row, column, or box with the next. Because every cell has only those two numbers, the chain flips between them: if one cell takes the first number, its neighbour has to take the second, and the next one flips back. Follow the flipping from one end to the other and you learn that one of the two far ends must hold a particular number, whichever way it falls. Any cell that shares a row, column, or box with both ends can never be that number.',
    description: 'A chain of cells all holding the same two candidates, each linked to the next. The alternation makes the two ends either the same digit or opposite; where they share a digit, that digit is eliminated from every cell seeing both ends.',
    example: 'R1C1, R1C5, R6C5 and R6C9 all hold only {2, 7}, each linked to the next. One of R1C1 and R6C9 is 2, so remove 2 from any cell that sees both.',
    strategy: '1. Find cells holding the same two pencil marks\n2. Link each to the next one it shares a row, column, or box with\n3. With four or more cells in the line, erase the end digit from every cell that sees both ends'
  },
  'X-Chain': {
    plain: 'One number, followed along a chain. Each link of the chain is a row, column, or box where the number has only two possible places: if one of them is not the number, the other one is. Between the links, two places that share a row, column, or box cannot both hold the number. Follow the chain from end to end and you learn that one of its two end cells holds the number. Any cell that shares a row, column, or box with both ends can never be it.',
    description: 'An alternating inference chain where every node is the same digit: conjugate pairs as the strong links and shared units as the weak ones. At least one endpoint is true, so the digit is eliminated from every cell that sees both endpoints. Skyscraper and Two-String Kite are its four-node cases.',
    example: 'A chain on 6: (6)R1C3 = (6)R1C7 - (6)R4C7 = (6)R4C2 - (6)R8C2 = (6)R8C9. One of R1C3 and R8C9 is 6, so any cell seeing both loses its 6.',
    strategy: '1. Pick a digit\n2. Find a row, column, or box where it has exactly two places and start at one of them\n3. Hop to a place that shares a unit with the other, then to its own pair, and keep going\n4. Erase the digit from every cell that sees both ends of the chain'
  },
  'XY-Chain': {
    plain: 'A chain of cells that each have only two pencil marks left. Each cell passes the baton to the next: the two cells share a number and also share a row, column, or box, so they cannot both be that number, which forces the next cell to take its other mark. The two ends of the chain happen to share a number. Follow the chain and one of the two ends must be that number, so any cell that sees both ends can never be it.',
    description: 'An alternating inference chain whose strong links are all bi-value cells and whose weak links are shared units on a common digit. Where the two endpoint candidates are the same digit, it is eliminated from every cell that sees both endpoint cells. An XY-Wing is its three-cell case.',
    example: 'R1C1 = {4, 9}, R1C6 = {9, 2}, R5C6 = {2, 7}, R5C3 = {7, 4}, each linked to the next. One of R1C1 and R5C3 is 4, so remove 4 from R1C3, which sees both.',
    strategy: '1. Start at a cell with two pencil marks\n2. Move to another two-mark cell that shares a unit and one of those marks\n3. Keep going, each step carrying the unused mark forward\n4. When the far end offers the digit you started with, erase it from every cell that sees both ends'
  },
  'Alternating Chain': {
    plain: 'The general form of every chain in this family, with mixed numbers rather than one. The chain alternates two kinds of step. A strong step says "at least one of these two is right": the only two places for a number in a row, column, or box, or the only two numbers left in a cell. A weak step says "at most one of these two is right": the same number in two cells that see each other, or two numbers in one cell. A chain that starts and ends with a strong step proves that at least one of its two ends is right, and anything both ends rule out can be erased.',
    description: 'An alternating inference chain (AIC) over mixed digits, beginning and ending with a strong link. Endpoints on the same digit eliminate it from every cell that sees both; endpoints on two digits in one cell leave that cell only those two.',
    example: '(7)R2C2 = (4)R2C2 - (4)R2C8 = (4)R6C8 - (9)R6C8 = (9)R6C2 gives "one of (7)R2C2 and (9)R6C2 is true", so R6C2 and R2C2 between them settle column 2.',
    strategy: '1. Start on a pencil mark and take a strong step away from it\n2. Take a weak step, then a strong one, and keep alternating\n3. Stop on a strong step\n4. Read off what both ends rule out and erase it'
  },
  'Grouped X-Chain': {
    plain: 'A chain on one number, except that a link may land on a small group of cells instead of a single cell. Where a 3x3 box overlaps a row or a column, the number is either somewhere in that overlap or nowhere in it, so the whole overlap behaves like one place in the chain. Everything else works the same way. One thing to be careful about: an erasure at the end of the chain has to share a row, column, or box with every single cell of the group. Missing one of them makes the erasure wrong.',
    description: 'An X-Chain in which a node may be a group: every candidate for the digit in the cells where a box overlaps a row or a column. A group is true or false as a whole, so the link rules are unchanged, but an elimination must see every cell of an endpoint group.',
    example: 'A chain on 3 where the middle node is "the 3s in R4C1 and R4C2", which is where box 4 overlaps row 4. The ends are single cells, and a cell seeing both ends loses its 3.',
    strategy: '1. Pick a digit\n2. Look for a row, column, or box where its places fall into just two clumps, each clump inside one box\n3. Treat each clump as one place and build the chain as usual\n4. Erase the digit only from cells that see every cell of both end clumps'
  },
  'Grouped Alternating Chain': {
    plain: 'The same as a chain with mixed numbers, except that a link may land on a small group of cells instead of a single cell. Where a 3x3 box overlaps a row or a column, a number is either somewhere in that overlap or nowhere in it, so the overlap behaves like one place in the chain. An erasure at the end has to share a row, column, or box with every single cell of the group; missing one makes it wrong.',
    description: 'An alternating inference chain over mixed digits in which at least one node is a group: every candidate for one digit in a box/line overlap. An elimination must see every cell of an endpoint group.',
    example: 'A chain whose second node is "the 5s in R7C7 and R7C8", the overlap of box 9 and row 7, with the chain continuing on a different digit from a cell inside it.',
    strategy: '1. Build the chain as usual, hopping between pencil marks\n2. Where a digit in a unit is confined to one box/line overlap, use that overlap as a single step\n3. Finish on a strong step\n4. Erase only from cells that see every cell of both ends'
  },
  'Continuous Loop': {
    plain: 'A chain that closes back on itself, with the two kinds of step still alternating all the way round. Because the chain returns to where it started, each weak step turns into an exact either-or rather than a one-way push: in every weak step, exactly one of the two sides is right. That hands you several erasures at once, one for each weak step in the loop, instead of a single one at the end of a chain. A loop with an odd number of steps cannot alternate, so it proves nothing at all.',
    description: 'A nice loop: a chain that closes with strong and weak links alternating all the way round. Every weak link becomes exact, so each one eliminates - the digit from every cell seeing both of its sides, or the other candidates from a cell shared by two digits. An odd number of links cannot alternate and is rejected.',
    example: 'A four-link loop on 2 and 8 around R1C1, R1C6, R5C6 and R5C1. Each weak link is now exact, so 2 leaves the rest of row 1 and 8 leaves the rest of column 6, and so on round the loop.',
    strategy: '1. Build a chain as usual\n2. Keep going until it returns to the mark it started from, still alternating\n3. Check that the number of steps is even\n4. Take the erasure every weak step in the loop gives you, not just the first'
  },
  'ALS Chain': {
    plain: 'A chain that passes through a group of cells that is one number short of locked: the cells together hold exactly one more number than there are cells. Take any one of those numbers away and the rest are forced into place. So the group behaves like a single step in the chain: either it holds one particular number, or it loses that one, locks, and must hold another. The rest of the chain works as usual. The erasure at the end has to share a row, column, or box with every cell of the group that could hold the number.',
    description: 'An alternating inference chain with an Almost Locked Set as a node: N cells holding N + 1 candidates. Losing digit X locks the set, which must then contain Z, so (X in set) = (Z in set) is a strong link. The links into and out of the set are restricted commons: every copy of the digit in the set sees every copy outside it.',
    example: 'Two cells in row 5 holding {2, 3, 5} between them are one number short of locked. A chain arrives on 2 and leaves on 5: if nothing in the pair is 2, both cells are forced and one of them is 5.',
    strategy: '1. Find a few cells in one row, column, or box holding one more number than there are cells\n2. Pick two of its numbers, X and Z, and use "no X means a Z" as a strong step\n3. Join it to the rest of the chain on X and on Z, checking that every copy of the digit inside the group sees every copy outside it\n4. Erase at the end only from cells that see every cell of the group that could hold the digit'
  },
  'X-Cycle': {
    plain: 'Pick a number and find places where it has exactly two possible cells in a row, column, or box. Those pairs link into a chain: if one end is not the number, the other end must be. Colour the chain alternately, like a checkerboard. Exactly one colour is the true set. If a cell sees both colours it can never be the number. And if two cells of one colour clash with each other, that whole colour is wrong.',
    description: 'Simple colouring: strong links (conjugate pairs) on one digit are chained and 2-coloured. A candidate that sees both colours is eliminated; a colour whose cells see each other is entirely false.',
    example: 'Colour the 6s along a chain. R2C4 sees a blue 6 and a green 6, so R2C4 cannot be 6.',
    strategy: '1. Pick a digit\n2. Mark units where it has exactly two spots and link them\n3. Colour the chain alternately\n4. Erase the digit from cells that see both colours'
  },
  '3D Medusa': {
    plain: 'Colouring, but across every number at once. Two kinds of pair give you a certainty: a number that has only two possible homes in a row, column or box (one of those two is it), and a cell with only two numbers left (one of those two is it). Chain those pairs together and colour them alternately, like a checkerboard, writing the colour on the pencil mark rather than on the cell. One whole colour is right and the other is wrong; we just do not know which. So look for a colour that contradicts itself. If one cell ends up with two marks of the same colour, that colour would make the cell two numbers at once. If one row, column or box ends up with the same number twice in one colour, that colour would put a number twice in a line. Either way that colour is wrong, so every pencil mark wearing it can be erased.',
    description: 'Colouring extended to all digits. Strong links are conjugate pairs (a digit with exactly two positions in a unit) and bi-value cells (a cell with exactly two candidates). Candidates are the nodes; the graph is two-coloured per component, and one colour is entirely true. Two contradictions are checked: two same-coloured candidates in one cell, and two same-coloured candidates of one digit in one unit. The contradicted colour is false and all of its candidates are eliminated.',
    example: 'A colouring on several digits reaches R5C3 twice: its 2 and its 7 are both blue. Blue would make R5C3 two digits at once, so blue is false and every blue candidate on the board goes, R5C3\'s 2 and 7 among them.',
    strategy: '1. Mark every place where a digit has only two homes in a unit, and every cell with only two marks left\n2. Start from one mark and colour along those pairs, alternating\n3. Look for one cell holding two marks of the same colour\n4. Look for one row, column or box holding the same digit twice in one colour\n5. Erase every mark of the colour you caught'
  },
  'Finned X-Wing': {
    plain: 'Almost an X-Wing: a number is limited to two columns in two rows, except for one or two stray extra spots (the "fin") that spoil the rectangle. Either the fin is the number, or it is not. If it is not, the X-Wing works as usual. If it is, then cells near the fin cannot be the number. Cells that are ruled out both ways can be erased.',
    description: 'An X-Wing with one or two extra candidates (the fin) in one of the base rows. Eliminations survive only in cells that see the fin and lie in the cover columns.',
    example: 'An X-Wing on 3 in rows 1 and 5, columns 2 and 8, with a fin at R1C3. Remove 3 from R2C2 and R3C2, which see the fin.',
    strategy: '1. Find a near-X-Wing with one or two extra candidates in a base row\n2. Keep only the eliminations that see every fin cell'
  },
  'Finned Swordfish': {
    plain: 'A Swordfish with a blemish. A number is almost limited to three columns across three rows, except for one or two stray extra spots in one of those rows - the "fin". Either the fin is the number or it is not. If it is not, the Swordfish is perfect and erases the number from the rest of those three columns. If it is, then every cell sharing a row, column or box with the fin cannot be the number. Only the cells ruled out both ways can be erased: those that lie in the three columns and also see every fin. Miss one fin and the conclusion is wrong, so the mentor checks all of them.',
    description: 'A Swordfish whose base lines hold one or two extra candidates (the fin) outside the cover lines. Eliminations survive only in cover-line cells, outside the base lines, that see every fin cell: they are false whether the fin is true or false. Patterns that contain a plain fish of smaller size are left to that rung.',
    example: 'A Swordfish on 3 in rows 2, 5 and 7 against columns 1, 4 and 8, with a fin at R2C3. Only 3s in columns 1, 4 and 8 that also see R2C3 are removed, such as R1C1.',
    strategy: '1. Find three rows whose spots for a digit almost fit three columns\n2. Note the one or two extra spots as the fin\n3. Keep only the eliminations in those columns that see every fin cell\n4. Try it again with rows and columns swapped'
  },
  'Finned Jellyfish': {
    plain: 'The same blemish as a Finned Swordfish, on the four-line fish. A number is almost limited to four columns across four rows, apart from one or two stray spots in one of those rows. If those stray spots are not the number, the Jellyfish is perfect; if one of them is, its own row, column and box lose the number. The cells erased are the ones ruled out either way: in the four columns, and seeing every stray spot.',
    description: 'A Jellyfish with one or two extra candidates (the fin) in a base line. Eliminations are the cover-line candidates outside the base lines that see every fin cell. Sizes above four are redundant on a 9x9 grid, finned or not.',
    example: 'A Jellyfish on 6 in rows 1, 4, 5 and 9 against columns 2, 3, 7 and 8, with a fin at R1C5. Only 6s in those four columns that also see R1C5 are removed.',
    strategy: '1. Find four rows whose spots for a digit almost fit four columns\n2. Note the one or two extra spots as the fin\n3. Keep only the eliminations in those columns that see every fin cell\n4. Try it again with rows and columns swapped'
  },
  'Sashimi Fish': {
    plain: 'The same idea as a finned fish, with the spoiled corner empty instead of occupied. In a finned fish, one row keeps its two or three places inside the pattern and adds a stray one; in a sashimi fish, that row has only a single place left inside the pattern, because the corner where it should have sat is already gone. The proof does not change at all: either the stray place is the number, and its row, column and box lose it, or it is not, and the fish is perfect. Only cells ruled out both ways are erased. It is listed on its own because the shape your eye looks for is different - a gap where a corner should be - and it comes in the same sizes as the finned fish, two lines, three or four.',
    description: 'A finned fish in which a base line has exactly one candidate inside the cover lines: the corner cell of the pattern holds no candidate. Same proof and same eliminations as the finned form - cover-line candidates outside the base lines that see every fin - at sizes two, three and four. Reported separately from Finned X-Wing, Finned Swordfish and Finned Jellyfish so that one pattern never carries two names.',
    example: 'An X-Wing shape on 5 in rows 3 and 7 against columns 2 and 6, but R3C2 has no 5 left and row 3 has a stray 5 at R3C1. Only 5s in columns 2 and 6 that also see R3C1 are removed.',
    strategy: '1. Look for a fish that almost works but has a corner with no mark in it\n2. Find the stray spots in that row or column: they are the fin\n3. Keep only the eliminations in the cover lines that see every fin cell'
  },
  'ALS-XZ': {
    plain: 'Find two small groups of cells, each in its own row, column, or box. In each group, the cells together hold exactly one more different pencil mark than there are cells. Such a group is "one number short of locked": remove any one of its numbers and the rest are forced. The two groups share a number, X, but every X in one group clashes with every X in the other, so only one group can take X. The group that loses X becomes locked and must contain another shared number, Z. So Z is certain to land in one of the two groups, and any cell that clashes with every Z in both groups can never be Z.',
    description: 'Two Almost Locked Sets (N cells, N+1 candidates) share a restricted common digit X: every X in one set sees every X in the other. Whichever set loses X is locked and must contain Z, so Z is eliminated from cells that see all Z candidates in both sets.',
    example: 'ALS A = {2, 3, 5} over two cells in row 5; ALS B = {3, 5, 7} over two cells in column 1. With X = 3, any 5 that sees all the 5s in both sets is removed.',
    strategy: '1. Find two groups of N cells with N+1 candidates, in different units\n2. Find a shared digit X whose cells in one group all see its cells in the other\n3. Pick another shared digit Z and erase it from cells that see every Z in both groups'
  },
  'Unique Rectangle Type 1': {
    plain: 'Four cells at the corners of a rectangle, spread across two 3x3 boxes. Three corners hold exactly the same two pencil marks. If the fourth corner could also be one of those two numbers, the puzzle would have two answers (you could swap the numbers around the rectangle). Real puzzles have one answer, so the fourth corner must be something else. Erase those two numbers from it.',
    description: 'Four cells in two rows, two columns, and two boxes where three corners are the same bare pair. The fourth corner cannot take either pair digit, or the puzzle would have two solutions.',
    example: 'R2C3, R2C7, and R6C3 are {1, 2}; R6C7 is {1, 2, 6}. Remove 1 and 2 from R6C7, leaving 6.',
    strategy: '1. Find a rectangle of four cells spanning exactly two boxes\n2. Check that three corners hold the same two pencil marks only\n3. Erase those two marks from the fourth corner'
  },
  'BUG+1': {
    plain: 'Every empty cell on the board has exactly two pencil marks, except one cell that has three. If that cell took one of its "normal" two numbers, the whole board would become a pattern with two answers. So it must take the odd one out: the number that shows up three times in its row, column, or box.',
    description: 'Bivalue Universal Grave plus one: all empty cells are bi-value except one tri-value cell. That cell must take the digit that appears three times in one of its units, or the grid would have two solutions.',
    example: 'Every cell is bi-value except R5C5 = {4, 7, 9}. 7 appears three times in row 5, so R5C5 = 7.',
    strategy: '1. Check that all empty cells but one have exactly two pencil marks\n2. In the odd cell, find the mark that appears three times in its row, column, or box\n3. Place it'
  },
  'Franken Fish': {
    plain: 'A fish that uses a 3x3 box as one of its lines. The reasoning is the same as an X-Wing: pick a few groups that each must contain the number, make sure no two of them share a cell, and find the same number of groups that cover every place the number could be. Since each covering group can hold the number only once, each one is used up by the groups underneath it, and any other place for the number inside a covering group is out. Be honest about this one: nobody is expected to spot it by eye, and you do not need to. The mentor finds it, shows you which groups it used, and the proof is short enough to follow even though the shape is not one you can scan for.',
    description: 'A fish whose base or cover sets include a box, keeping the basic shape otherwise: the base lines are all rows or all columns and the cover lines are the other kind. Base sets must be pairwise disjoint in their candidates; cover sets must cover every base candidate. Candidates in cover sets outside the base sets are eliminated. Sizes two to four; patterns containing a smaller fish, locked candidates included, are left to the rung that explains them.',
    example: 'The 9s in row 2 and in box 7 share no cell, and together they lie in column 1 and box 1. Those two cover sets can hold two 9s between them, so every other 9 in column 1 and box 1 is eliminated.',
    strategy: '1. This one is for the mentor to find; read the groups it names on the board\n2. Check that the base groups share no cell and each must hold the digit\n3. Check that the cover groups contain every place the digit could be in the base groups\n4. Erase the digit everywhere else inside the cover groups'
  },
  'Mutant Fish': {
    plain: 'The most general fish there is: its groups mix rows, columns and boxes freely on both sides. The argument is still the same one that makes an X-Wing work. A few groups that each must contain the number and share no cell between them; the same number of groups that between them cover every place the number could go; so each covering group is spoken for, and any other place for the number inside one of them is out. Again, be honest: no human spots these by eye, and nobody should feel behind for not seeing one. The mentor finds it and names the groups, and the proof is two sentences long.',
    description: 'A fish with no restriction on the kinds of unit used: base and cover sets may each mix rows, columns and boxes. Base sets are pairwise disjoint in their candidates, the cover sets cover every base candidate, and candidates in cover sets outside the base sets are eliminated. Sizes two to four; a pattern that reduces to a basic or Franken fish, or to locked candidates, is reported as that instead.',
    example: 'The 4s in row 5, in column 2 and in box 9 share no cell, and together they fall inside row 9, column 5 and box 4. Each of those three cover sets holds one 4 at most, so every other 4 inside them is eliminated.',
    strategy: '1. This one is for the mentor to find; read the groups it names on the board\n2. Check that the base groups share no cell and each must hold the digit\n3. Check that the cover groups contain every place the digit could be in the base groups\n4. Erase the digit everywhere else inside the cover groups'
  },
  'Cell Forcing Chain': {
    plain: 'Take a cell with just two (or three) pencil marks. Try each one in turn and follow the forced moves. If every option ends up putting the same number in the same cell, that number is certain, no matter which option was right. This is real logic, because every possibility was checked.',
    description: 'All candidates of one cell are propagated independently. Any placement or elimination common to every branch is proven, regardless of which candidate is true.',
    example: 'R3C4 = {2, 7}. If 2, then R8C6 = 5. If 7, then also R8C6 = 5. So R8C6 = 5.',
    strategy: '1. Pick a cell with two or three pencil marks\n2. Follow the consequences of each mark\n3. Keep any result that every branch agrees on'
  },
  'Hypothesis Mode': {
    plain: 'A "what if" test. Suppose a cell is a certain number, then follow the forced moves. If that leads to a dead end (a cell with no possible number), the supposition was wrong, so the cell is not that number. This is closer to trial and error than to a pattern, and the mentor uses it only when nothing else applies.',
    description: 'Contradiction search: assume a candidate, propagate, and if some cell is left with no candidates, eliminate the assumption. Not a pattern-based deduction; used only when every named technique fails.',
    example: 'Assume R1C1 = 3. Propagation empties R5C5 of candidates, so R1C1 is not 3.',
    strategy: '1. Pick a cell with few pencil marks\n2. Assume one of them and follow the forced moves\n3. If you hit a dead end, erase that mark'
  }
};
