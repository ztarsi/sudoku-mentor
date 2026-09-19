# Architecture

How Sudoku Mentor is put together, for someone about to change it. What the
product is for lives in [PRODUCT.md](PRODUCT.md).

## Shape

A single-page React app served by Base44. There is no server code in this
repository: authentication, the two data entities and the OCR integration are
Base44 platform services reached through the SDK.

```
src/
  main.jsx, App.jsx        boot, router, auth gate, toast host
  pages.config.js          the one routed page (lazy-loaded)
  pages/
    SudokuMentor.jsx       the page: grid, digit strip, lesson panel, dialogs
  hooks/
    useSudokuGame.js       the game: grid, history, clock, saves, rejects
    useSudokuPlayer.js     the player: user, colours, best time, records
    usePuzzleBootstrap.js  what to load on arrival (saved game, starter, random)
    useArrangement.js      wide / medium / stacked / phone, from width and pointer
    useDialog.js           modal behaviour every dialog shares
    useMediaQuery.js
  api/
    base44Client.js        the SDK instance
    playerData.js          every read and write, scoped to the signed-in player
  components/sudoku/
    engines (below), grid, panel, dialogs, loaders
  components/ui/           button and the toast implementation
```

## One page, four arrangements

There is one page. `useArrangement` maps the viewport to an arrangement
and says where the lesson panel lives:

| Width | Arrangement | Lesson | Digit strip |
| --- | --- | --- | --- |
| 1200px and up | wide | right column (380px) | card under the board |
| 960px to 1199px | medium | right column (300px) | card under the board |
| 800px to 959px | medium | side sheet (`LessonSheet`), opens on Hint, pinnable | card under the board |
| 600px to 799px | stacked | bottom sheet above the strip bar | fixed bar at the bottom |
| under 600px | phone | none; No Assist stays on with the timer in the status strip | fixed bar at the bottom |

The sheets are not dialogs: the board stays live and shortcuts keep
working. A bottom sheet reports its height and the page sets scroll
padding so the hint's cells scroll clear of it. Where the lesson is a
sheet, the Hint button sits on the digit strip. All state is React state
on the one page, so resizing or rotating never loses anything. The old
`/SudokuMentorMobile` URL redirects to `/`.

## Themes

Two complete themes, dark and paper, from one set of class names. In
`tailwind.config.js` every shade of slate and of the accent palettes is a
CSS variable (`--c-blue-400` and so on) that a Tailwind plugin defines on
`:root` (Tailwind's own values) and again under `[data-theme="paper"]`
with the scale turned over (50 <-> 950, 400 <-> 600, ...), a warm paper
scale for slate, and `white` as ink. So `bg-slate-900 text-white` is a
dark card with white text on dark and a cream card with ink text on paper,
and nothing in the components knows which theme is on.

`src/lib/theme.js` holds the choice (dark, paper or system), remembered
in localStorage and painted on `<html data-theme>` by an inline script in
`index.html` before the first frame. `useSudokuPlayer` owns the choice and
the board colours, one set per theme, and saves both to the account as
`sudoku_colors` (`{ theme, dark, paper }`; a flat legacy set is the dark
one). The board's five colours come from `colors.js`, per theme.

## The engines

Everything that reasons about a board is pure and synchronous, takes a grid
(81 cells of `{ value, isFixed, candidates }`) and returns either a new grid
or a step. Nothing in here touches React or the network.

| Module | Job |
| --- | --- |
| `gridUnits.js` | rows, columns, boxes, peers, cell names (`R5C3`) |
| `solver.jsx` | backtracking solver; the source of truth for "the solution" |
| `logicEngine.jsx` | named techniques from Naked Single to XY-Wing, in order; `findNextLogicStep`, `findAllTechniqueInstances`, `applyLogicStep` |
| `chainEngine.jsx` | X-Cycle, Finned X-Wing, ALS-XZ, Unique Rectangle, BUG+1 |
| `forcingChainEngine.jsx` | what-if search: `applyValueAndPropagate` (naked and hidden singles to a fixpoint), Cell Forcing Chains by convergence, Hypothesis Mode by contradiction |
| `whatIfSearch.js`, `whatIf.worker.js` | the same search, off the main thread and cancellable |
| `difficultyAnalyzer.jsx` | rates a puzzle by the hardest technique the engines need |
| `stepShape.js` | `makeStep()`: the one shape every step has |
| `explainStep.js` | the Beginner and Expert explanations, derived from the step |
| `stepHighlights.js` | which cells and candidates a step colours |
| `techniqueCatalog.js` | names, tiers, colours, the learn-more text |
| `puzzles.js`, `puzzleSources.js` | the built-in library and how puzzles are picked |

A step is `{ technique, digit, baseCells, targetCells, placement,
eliminations, explanation, ... }`. Base cells form the pattern, target cells
lose candidates or take the placement. The UI never infers structure from
the explanation text.

## The hint path

1. `findNextLogicStep(grid)` walks the techniques in order and returns the
   first that applies. This is fast (milliseconds).
2. If nothing applies, the page asks `searchWhatIf(grid, depth)`. The worker
   runs `findForcingChain` then `findHypothesis`; the page shows a spinner
   with a Cancel button and drops the result if the grid changed meanwhile.
3. `presentStep` puts the step into the panel and highlights the grid;
   `applyStep` in the game hook applies it and counts a hint.

## State

`useSudokuGame` owns the board: grid, undo/redo history, the play clock
(paused while the tab is hidden), the solution used to reject wrong digits,
the save to `localStorage` (versioned; `persistKey`), hints used and the
completion callback. The pages own only view state: selection, focus digit,
which dialog is open, the presented step.

Player data goes through `playerData.js`, and every query and mutation is
scoped by `created_by`. The Base44 dashboard must also enforce creator
scoping on `SudokuPuzzle` and `SolveRecord`; the repo cannot express that.

## Invariants the tests hold

- **Soundness.** `oracle.spec.js` and `oracleAll.spec.js` run every technique
  on every intermediate grid of every library puzzle and compare each
  placement and elimination with the solver's solution. A technique that
  can remove a true digit fails CI.
- **Honesty.** `stepHonesty.spec.js` and `explainStep.spec.js` check that
  explanations describe the cells and digits the step actually carries.
- **Library.** Every built-in puzzle has exactly one solution and sits on a
  believable shelf.
- **Game rules.** `useSudokuGame.spec.jsx` covers rejection, saves, the
  clock and hint counting; `useDialog.spec.jsx` covers modal behaviour.

## Adding a technique

1. Implement the finder in `logicEngine.jsx` (or `chainEngine.jsx`), return
   through `makeStep`, and add it to `TECHNIQUE_ORDER()`.
2. Add its name, tier and learn-more text to `techniqueCatalog.js`.
3. Add Beginner and Expert explanations in `explainStep.js`.
4. Run the oracle tests. If the library never exercises it, add a puzzle
   that does; `oracleAll.spec.js` requires every named technique to appear.

## Offline

`public/sw.js` is a hand-written service worker registered in production
builds only. It serves navigations network-first (a deploy is picked up on
the next visit; the cached shell is the fallback), hashed `/assets/`
cache-first, icons and the manifest stale-while-revalidate, and never
touches `/api/` or another origin. Bump `VERSION` in it to drop old caches.

## Platform-generated files

`src/pages/OAuthConsent.jsx` and `src/components/AuthLayout.jsx` are
templates the Base44 builder writes to `main` on its own (it did so after
they were removed). They are not routed by `pages.config.js`, and lint and
typecheck skip them. Leave them alone.

The entity access rules live in `base44/entities/*.jsonc` under `rls`
(create by the signed-in user only; read, update and delete by the creator
or an admin). Base44 rebuilds the live data model from these files on every
GitHub sync, so that is where the rule is kept, not in the dashboard.

## Deploying

Base44 watches `main`. A merge creates a checkpoint; publishing that
checkpoint is a separate, explicit step in the Base44 dashboard or API.
