// The pure half of the first-board budget (#91): which chunks of a Vite
// manifest load before the first board, and the budget they are held to.
// Kept free of Node APIs so the test suite and the typecheck can read it;
// scripts/bundle-budget.mjs does the file reading and the reporting.

// The first board was 629 kB when this was set (1 Nov 2026): the router and
// platform SDK (397 kB) plus the board, the digit strip and the animation
// library (232 kB). 680 kB leaves room for the board to grow by about 8%,
// and is well short of what any one engine or the technique catalog would
// add if it slipped back in (the catalog alone is 101 kB). Raise it only
// for something the first board genuinely needs, and say why here.
export const FIRST_BOARD_BUDGET = 680_000;

// Modules that must arrive after the first board. Each is loaded with a
// dynamic import (src/components/sudoku/mentorLoader.js), so each has its
// own entry in the manifest; that entry must exist and must not be in the
// first-board payload. A static import from the board would either put it
// in the payload or fold it into the board's chunk and remove its entry,
// and both fail here. Between them they hold every technique detector, the
// technique catalog and the lesson prose.
export const MUST_BE_LAZY = [
  'src/components/sudoku/logicEngine.jsx',
  'src/components/sudoku/LogicPanel.jsx',
];

export function lazyViolations(manifest, closure) {
  return MUST_BE_LAZY.filter((key) => !manifest[key] || closure.has(key));
}

export function firstBoardClosure(manifest) {
  const entries = Object.entries(manifest).filter(([, chunk]) => chunk.isEntry);
  if (entries.length === 0) throw new Error('No entry chunk in the manifest');
  const routes = entries.flatMap(([, chunk]) => chunk.dynamicImports || []);
  const seen = new Set();
  const visit = (key) => {
    if (seen.has(key)) return;
    const chunk = manifest[key];
    if (!chunk) throw new Error(`Manifest has no chunk ${key}`);
    seen.add(key);
    for (const imported of chunk.imports || []) visit(imported);
  };
  for (const [key] of entries) visit(key);
  for (const key of routes) visit(key);
  return seen;
}
