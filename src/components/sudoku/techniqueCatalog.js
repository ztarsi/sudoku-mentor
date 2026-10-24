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
    scanNote: 'These cost too much to count while you play. Scan runs all five on the board as it stands now; it takes about ten seconds.',
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
    name: 'Finned X-Wing',
    tier: 'Ultimate',
    count: COUNT_SCAN,
    formal: 'Finned Fish',
    aliases: ['finned fish', 'sashimi', 'fish'],
    description: 'X-Wing pattern with additional fin cells.',
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
  'X-Cycle': {
    plain: 'Pick a number and find places where it has exactly two possible cells in a row, column, or box. Those pairs link into a chain: if one end is not the number, the other end must be. Colour the chain alternately, like a checkerboard. Exactly one colour is the true set. If a cell sees both colours it can never be the number. And if two cells of one colour clash with each other, that whole colour is wrong.',
    description: 'Simple colouring: strong links (conjugate pairs) on one digit are chained and 2-coloured. A candidate that sees both colours is eliminated; a colour whose cells see each other is entirely false.',
    example: 'Colour the 6s along a chain. R2C4 sees a blue 6 and a green 6, so R2C4 cannot be 6.',
    strategy: '1. Pick a digit\n2. Mark units where it has exactly two spots and link them\n3. Colour the chain alternately\n4. Erase the digit from cells that see both colours'
  },
  'Finned X-Wing': {
    plain: 'Almost an X-Wing: a number is limited to two columns in two rows, except for one or two stray extra spots (the "fin") that spoil the rectangle. Either the fin is the number, or it is not. If it is not, the X-Wing works as usual. If it is, then cells near the fin cannot be the number. Cells that are ruled out both ways can be erased.',
    description: 'An X-Wing with one or two extra candidates (the fin) in one of the base rows. Eliminations survive only in cells that see the fin and lie in the cover columns.',
    example: 'An X-Wing on 3 in rows 1 and 5, columns 2 and 8, with a fin at R1C3. Remove 3 from R2C2 and R3C2, which see the fin.',
    strategy: '1. Find a near-X-Wing with one or two extra candidates in a base row\n2. Keep only the eliminations that see every fin cell'
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
