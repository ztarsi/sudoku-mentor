// Single source of truth for the technique catalog: display metadata,
// teaching content, and the hierarchy tiers. Previously LogicPanel and
// TechniqueModal each carried their own parallel dictionary.
import { Lightbulb, Target, Zap, BookOpen } from 'lucide-react';

export const LEVEL_COLORS = {
  emerald: 'from-emerald-400 to-green-500',
  blue: 'from-blue-400 to-indigo-500',
  purple: 'from-purple-400 to-violet-500',
  orange: 'from-orange-400 to-red-500',
  violet: 'from-indigo-600 to-violet-800',
  fuchsia: 'from-fuchsia-600 to-pink-600',
};

export const TECHNIQUE_INFO = {
  'Naked Single': {
    level: 'Basic',
    color: 'emerald',
    description: 'A cell has only one possible candidate remaining.',
    icon: Target,
  },
  'Hidden Single': {
    level: 'Basic',
    color: 'emerald',
    description: 'A candidate appears only once in a row, column, or box.',
    icon: Target,
  },
  'Pointing Pair': {
    level: 'Intermediate',
    color: 'blue',
    description: 'Candidates in a box align in a row/column, eliminating candidates outside the box.',
    icon: Zap,
  },
  'Pointing Triple': {
    level: 'Intermediate',
    color: 'blue',
    description: 'Three candidates in a box align in a row/column.',
    icon: Zap,
  },
  'Claiming': {
    level: 'Intermediate',
    color: 'blue',
    description: 'Candidates in a row/column are confined to one box.',
    icon: Zap,
  },
  'Naked Pair': {
    level: 'Advanced',
    color: 'purple',
    description: 'Two cells in a unit have the same two candidates.',
    icon: BookOpen,
  },
  'Hidden Pair': {
    level: 'Advanced',
    color: 'purple',
    description: 'Two candidates appear only in two cells of a unit.',
    icon: BookOpen,
  },
  'Naked Triple': {
    level: 'Advanced',
    color: 'purple',
    description: 'Three cells share three candidates between them.',
    icon: BookOpen,
  },
  'X-Wing': {
    level: 'Expert',
    color: 'orange',
    description: 'A candidate forms a rectangle pattern, allowing eliminations.',
    icon: Lightbulb,
  },
  'Swordfish': {
    level: 'Expert',
    color: 'orange',
    description: 'An X-Wing extended to three rows and columns.',
    icon: Lightbulb,
  },
  'XY-Wing': {
    level: 'Expert',
    color: 'orange',
    description: 'Three bi-value cells form a chain for eliminations.',
    icon: Lightbulb,
  },
  'X-Cycle': {
    level: 'Ultimate',
    color: 'violet',
    description: 'Chain-based coloring technique using strong links.',
    icon: Lightbulb,
  },
  'Finned X-Wing': {
    level: 'Ultimate',
    color: 'violet',
    description: 'X-Wing pattern with additional fin cells.',
    icon: Lightbulb,
  },
  'ALS-XZ': {
    level: 'Ultimate',
    color: 'violet',
    description: 'Almost Locked Sets with restricted common digits.',
    icon: Lightbulb,
  },
  'Unique Rectangle Type 1': {
    level: 'Ultimate',
    color: 'violet',
    description: 'Avoids deadly patterns with multiple solutions.',
    icon: Lightbulb,
  },
  'BUG+1': {
    level: 'Ultimate',
    color: 'violet',
    description: 'Bivalue Universal Grave plus one tri-value cell.',
    icon: Lightbulb,
  },
};

// The tiers shown in the hierarchy browser, in teaching order.
export const TECHNIQUE_TIERS = [
  {
    level: 'Basic',
    color: 'emerald',
    techniques: [
      { name: 'Naked Single', full: 'Naked Single' },
      { name: 'Hidden Single', full: 'Hidden Single' },
    ],
  },
  {
    level: 'Intermediate',
    color: 'blue',
    techniques: [
      { name: 'Pointing Pair', full: 'Pointing Pair' },
      { name: 'Pointing Triple', full: 'Pointing Triple' },
      { name: 'Claiming', full: 'Claiming' },
    ],
  },
  {
    level: 'Advanced',
    color: 'purple',
    techniques: [
      { name: 'Naked Pair', full: 'Naked Pair' },
      { name: 'Hidden Pair', full: 'Hidden Pair' },
      { name: 'Naked Triple', full: 'Naked Triple' },
    ],
  },
  {
    level: 'Expert',
    color: 'orange',
    techniques: [
      { name: 'X-Wing', full: 'X-Wing' },
      { name: 'Swordfish', full: 'Swordfish' },
      { name: 'XY-Wing', full: 'XY-Wing' },
    ],
  },
  {
    level: 'Ultimate',
    color: 'violet',
    scanButton: true,
    techniques: [
      { name: 'X-Cycle', full: 'X-Cycle' },
      { name: 'Finned X-Wing', full: 'Finned X-Wing' },
      { name: 'ALS-XZ', full: 'ALS-XZ' },
      { name: 'Unique Rect.', full: 'Unique Rectangle Type 1' },
      { name: 'BUG+1', full: 'BUG+1' },
    ],
  },
  {
    level: 'Forcing Chains',
    color: 'fuchsia',
    isWhatIf: true,
    techniques: [
      { name: 'Cell Forcing Chain', full: 'Cell Forcing Chain' },
      { name: 'Hypothesis Mode', full: 'Hypothesis Mode' },
    ],
  },
];

export const TECHNIQUE_DETAILS = {
  'Naked Single': {
    description: 'When a cell has only one possible candidate remaining after eliminating all numbers that appear in its row, column, and 3x3 box.',
    example: 'If a cell can only be a 5 (all other digits 1-9 are already present in its row, column, or box), then it must be a 5.',
    strategy: '1. Look at the cell\n2. Check which numbers appear in its row, column, and box\n3. If only one number is missing, place it'
  },
  'Hidden Single': {
    description: 'When a candidate appears only once in a row, column, or box, even if that cell has other candidates.',
    example: 'If the digit 7 can only go in one cell within a row (even if that cell also has candidates 2, 4, 7), then it must be 7.',
    strategy: '1. Pick a digit to focus on\n2. Look at a row, column, or box\n3. If the digit can only fit in one cell, place it there'
  },
  'Pointing Pair': {
    description: 'When a candidate in a box appears in only two cells, and those cells are aligned in the same row or column, you can eliminate that candidate from other cells in that row/column outside the box.',
    example: 'If 3s in a box only appear in two cells that share a row, eliminate all other 3s from that row outside the box.',
    strategy: '1. Look at candidates within a box\n2. Find digits that appear in only 2-3 cells\n3. If aligned in a row/column, eliminate from that row/column outside the box'
  },
  'Pointing Triple': {
    description: 'Similar to Pointing Pair, but with three cells in the same row or column within a box.',
    example: 'If 6s only appear in three aligned cells within a box, eliminate 6s from the rest of that row/column.',
    strategy: 'Same as Pointing Pair, but look for three aligned cells instead of two'
  },
  'Claiming': {
    description: 'When all instances of a candidate in a row or column are confined to a single box, you can eliminate that candidate from other cells in that box.',
    example: 'If all 8s in a row appear only within one box, eliminate 8s from other cells in that box.',
    strategy: '1. Look at a row or column\n2. Find a digit whose candidates all fall in one box\n3. Eliminate that digit from other cells in the box'
  },
  'Naked Pair': {
    description: 'When two cells in a unit (row, column, or box) contain exactly the same two candidates, those candidates can be eliminated from all other cells in that unit.',
    example: 'If two cells both have only {2,5}, eliminate 2 and 5 from all other cells in their row/column/box.',
    strategy: '1. Find two cells with identical pair of candidates\n2. Ensure they are in the same unit\n3. Eliminate those numbers from other cells in the unit'
  },
  'Hidden Pair': {
    description: 'When two candidates appear only in the same two cells within a unit, all other candidates can be removed from those two cells.',
    example: 'If 3 and 7 only appear in cells A and B within a row, remove all other candidates from cells A and B.',
    strategy: '1. Look for two digits that appear in only two cells in a unit\n2. Remove all other candidates from those cells'
  },
  'Naked Triple': {
    description: 'When three cells in a unit collectively contain only three candidates distributed among them, eliminate those candidates from all other cells in that unit.',
    example: 'Three cells contain {1,4}, {1,9}, {4,9}. Eliminate 1, 4, and 9 from other cells in that unit.',
    strategy: '1. Find three cells that share only three candidates total\n2. Eliminate those candidates from other cells in the unit'
  },
  'X-Wing': {
    description: 'When a candidate appears in only two cells in each of two rows (or columns), and these cells align in the same columns (or rows), forming a rectangle, you can eliminate that candidate from other cells in those columns (or rows).',
    example: 'If 5 appears only in columns 2 and 7 in both rows 1 and 8, eliminate all other 5s from columns 2 and 7.',
    strategy: '1. Find a candidate in exactly two positions in a row\n2. Find another row where it appears in the same two columns\n3. Eliminate from those columns in other rows'
  },
  'Swordfish': {
    description: 'An extension of X-Wing to three rows and three columns. When a candidate appears 2-3 times in each of three rows, confined to the same three columns, eliminate from those columns in other rows.',
    example: 'Similar to X-Wing but with three rows and three columns forming the pattern.',
    strategy: 'Like X-Wing, but look for the pattern across three rows and three columns'
  },
  'XY-Wing': {
    description: 'Three cells form a chain: pivot cell with candidates {X,Y}, one wing with {X,Z}, another wing with {Y,Z}. Any cell that sees both wings cannot be Z.',
    example: 'Pivot: {2,5}, Wing 1: {2,8}, Wing 2: {5,8}. Eliminate 8 from cells seeing both wings.',
    strategy: '1. Find a bi-value cell (pivot) with {X,Y}\n2. Find two wings: {X,Z} and {Y,Z}\n3. Eliminate Z from cells seeing both wings'
  },
  'X-Cycle': {
    description: 'Chain-based coloring technique using strong links (conjugate pairs). Creates two color groups where if one is true, the other is false.',
    example: 'Build a chain where positions alternate colors. Any candidate seeing both color groups can be eliminated.',
    strategy: '1. Find conjugate pairs (digit appears exactly twice in a unit)\n2. Build a chain alternating colors\n3. Eliminate candidates seeing both colors'
  },
  'Finned X-Wing': {
    description: 'An X-Wing pattern with extra "fin" candidates that break the perfect rectangle, but still allow limited eliminations.',
    example: 'Standard X-Wing in R1,R5 / C2,C8 with a fin at R1C4. Only cells seeing the fin can be eliminated.',
    strategy: '1. Find an X-Wing pattern with 1-2 extra candidates\n2. Eliminations only apply to cells that see all fins'
  },
  'ALS-XZ': {
    description: 'Almost Locked Sets: two groups of N cells with N+1 candidates. They share a restricted common digit (X) and an eliminating digit (Z).',
    example: 'ALS1={2,3,5} in 2 cells, ALS2={3,5,7} in 2 cells. If X=3, Z=5 can be eliminated from cells seeing both.',
    strategy: '1. Find two ALS in different units\n2. Identify restricted common (X) and eliminating digit (Z)\n3. Eliminate Z from cells seeing both ALS'
  },
  'Unique Rectangle Type 1': {
    description: 'Prevents deadly patterns where four cells would have only two possible arrangements, violating uniqueness.',
    example: 'Three corners are {1,2}, fourth corner is {1,2,6}. The fourth corner cannot be 1 or 2 (that would allow two solutions), so remove 1 and 2 from it.',
    strategy: '1. Find 4 cells forming a rectangle over exactly two boxes\n2. Three corners hold the same bare pair, one has extras\n3. Remove the pair digits from the corner with extras'
  },
  'BUG+1': {
    description: 'Bivalue Universal Grave: all cells except one have exactly 2 candidates, each digit appears exactly twice per unit.',
    example: 'All cells bi-value except R5C5={4,7,9}. If 7 appears 3 times in row/col/box, R5C5 must be 7.',
    strategy: '1. Check if all cells are bi-value except one\n2. Find the digit appearing 3 times (not 2) in units\n3. Place that digit'
  },
  'Cell Forcing Chain': {
    description: 'A rigorous logical technique where ALL possible values of a cell lead to the same conclusion. This is proof by convergence, not trial-and-error.',
    example: 'Cell R3C4 has candidates {2,7}. Path A (if 2): forces R8C6=5. Path B (if 7): also forces R8C6=5. Therefore R8C6 must be 5!',
    strategy: '1. Find a bi-value or tri-value cell\n2. Explore each candidate path (up to 10 steps deep)\n3. Look for convergence: common placements or eliminations\n4. The convergence is logically proven!'
  },
  'Hypothesis Mode': {
    description: 'Contradiction-based search (not pure logic). Assumes a value and checks if it leads to an impossible state. Use only when all logical techniques fail.',
    example: 'Assume R1C1=3. This forces a chain of placements that leaves R5C5 with no valid candidates. Therefore R1C1 cannot be 3.',
    strategy: '1. Select a bi-value cell\n2. Assume one value and propagate\n3. If contradiction found, the other value must be correct\n4. This is trial-and-error, not deductive logic'
  }
};
