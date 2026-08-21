# Sudoku Mentor

**Sudoku Mentor** is a React application that teaches advanced Sudoku solving techniques through interactive logical deduction. Rather than just providing solutions, it acts as a tutor, guiding you through strategies from naked singles up to X-Wings, XY-Chains, Almost Locked Sets (ALS-XZ), and forcing chains.

Built on [Base44](https://base44.com) for hosting, auth, data persistence (solve records, uploaded puzzles), and OCR-based puzzle import.

## Key Features

- **Logic Engine Tutor** - scans for the next logical step, from basic singles to expert-level techniques, and explains the reasoning.
- **Ghost Mode Visualization** - demonstrates what-if scenarios by temporarily placing ghost candidates on the grid, with step-by-step chain playback.
- **Technique Hierarchy** - live counts of every technique currently available on the board, with click-to-highlight instances.
- **Difficulty Analyzer** - rates puzzles from Easy to Ultimate based on the human techniques actually required to solve them.
- **Unified Puzzle Loader** - built-in library, manual text entry, or OCR image upload.
- **No Assist Mode** - timed competitive solving with per-puzzle best times saved to your account.
- **Mobile page** - a dedicated touch-first layout with digit-first input and a candidate numpad.

## Tech Stack

- [React 18](https://react.dev/) + [Vite](https://vite.dev/)
- [Tailwind CSS](https://tailwindcss.com/) with a small set of [shadcn/ui](https://ui.shadcn.com/) components
- [Framer Motion](https://www.framer.com/motion/) for highlights and transitions
- [Base44 SDK](https://base44.com) for auth, entities, and integrations
- [Vitest](https://vitest.dev/) for the test suite
- Custom constraint-propagation and search engines for the Sudoku logic

## Development

```bash
npm install
npm run dev        # development server
npm test           # run the test suite (unit + solution-oracle tests)
npm run lint       # eslint
npm run typecheck  # tsc over the JS sources (checkJs)
npm run build      # production build
```

CI (GitHub Actions) runs lint, typecheck, tests, and build on every push and pull request.

## Project Structure

| Path | Description |
| --- | --- |
| `src/pages/SudokuMentor.jsx` | Desktop page: layout, hint flow, modals. |
| `src/pages/SudokuMentorMobile.jsx` | Touch-first mobile page (digit-first input). |
| `src/hooks/useSudokuGame.js` | Shared game state: grid, history/undo/redo, validation, completion. |
| `src/hooks/useSudokuPlayer.js` | Shared account state: user, colors, best times. |
| `src/components/sudoku/logicEngine.jsx` | Core techniques: singles, pointing/claiming, pairs/triples, fish, XY-Wing. |
| `src/components/sudoku/chainEngine.jsx` | Expert techniques: X-Cycle coloring, ALS-XZ, Unique Rectangle, BUG+1, Finned X-Wing. |
| `src/components/sudoku/forcingChainEngine.jsx` | What-if engines: cell forcing chains and hypothesis (contradiction) search. |
| `src/components/sudoku/solver.jsx` | Bitmask MRV backtracking solver (computes the reference solution). |
| `src/components/sudoku/difficultyAnalyzer.jsx` | Rates puzzle difficulty by simulating a solve. |
| `src/components/sudoku/puzzles.js` | Built-in puzzle library (pure data). |
| `src/components/sudoku/__tests__/` | Vitest specs, including solution-oracle tests that verify every engine step against the true solution. |

## How to Use

1. **Load a puzzle** - pick from the library or upload your own (text or photo).
2. **Seek guidance** - click **Hint** to find the most appropriate technique for the current board.
3. **Watch the proof** - for advanced steps, use the playback controls in the Logic Panel to watch ghost values populate the grid.
4. **Apply the step** - or place digits yourself; wrong entries are rejected and counted.
