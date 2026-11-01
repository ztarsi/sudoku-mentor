// What a player downloads before the first board (#91, docs/specs/first-board-payload.md).
//
// Reads the Vite manifest of a production build and measures the first-board
// payload: the entry chunk, the route chunks the router loads to show the
// board (the entry's dynamic imports), and every chunk those import
// statically. That payload is enforced. Everything else (the lesson panel,
// the technique detectors, the reference prose, the dialogs, the worker)
// arrives later and is reported, not enforced, so it can grow with the
// catalog without costing the first board anything.
//
// Usage: BUNDLE_BUDGET=1 npm run build && node scripts/bundle-budget.mjs [distDir]
// (the manifest is written only when BUNDLE_BUDGET=1, so it is never deployed)

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { FIRST_BOARD_BUDGET, firstBoardClosure, lazyViolations } from './bundleClosure.js';

function main() {
  const dist = process.argv[2] || 'dist';
  const manifestPath = join(dist, '.vite', 'manifest.json');
  if (!existsSync(manifestPath)) {
    console.error(`No ${manifestPath}. Build with BUNDLE_BUDGET=1 so Vite writes it.`);
    process.exit(1);
  }
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const closure = firstBoardClosure(manifest);
  const size = (file) => statSync(join(dist, file)).size;

  const firstFiles = [...new Set([...closure].map((key) => manifest[key].file))].filter((f) => f.endsWith('.js'));
  const first = firstFiles.reduce((sum, file) => sum + size(file), 0);
  const allJs = readdirSync(join(dist, 'assets')).filter((f) => f.endsWith('.js'));
  const total = allJs.reduce((sum, file) => sum + size(join('assets', file)), 0);

  console.log('First board (enforced):');
  for (const file of firstFiles.sort()) console.log(`  ${String(size(file)).padStart(9)}  ${file}`);
  console.log(`  ${String(first).padStart(9)}  total, budget ${FIRST_BOARD_BUDGET}`);
  console.log(`Loaded later (reported): ${total - first} bytes`);
  console.log(`All JavaScript (reported): ${total} bytes`);

  let failed = false;
  const leaked = lazyViolations(manifest, closure);
  if (leaked.length) {
    console.error(`These must load after the first board, and do not: ${leaked.join(', ')}`);
    failed = true;
  }
  if (first > FIRST_BOARD_BUDGET) {
    console.error(`The first board is ${first} bytes, over the ${FIRST_BOARD_BUDGET} budget.`);
    failed = true;
  }
  if (failed) process.exit(1);
}

main();
