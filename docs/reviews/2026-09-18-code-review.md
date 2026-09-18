# Code review: 2026-09-18

Scope: the whole repository at main `ae8aa60` (after PRs 2 to 8). Method: three independent read-only reviews (solving engines; UI and state; project health), each cross-checked against the code, plus an empirical probe that replayed every library puzzle through the hint engine and checked each step against the true solution. Measured baseline: lint clean, typecheck clean, 140 tests in 9 files, production bundle 729 kB raw / 224 kB gzip in a single chunk.

Severity: **S1** breaks a promise in `docs/PRODUCT.md` or is a security issue; **S2** is a real bug or a clear quality gap; **S3** is structure, performance headroom, or hygiene.

The good news first: **the deductive engines are sound.** The probe found zero wrong placements or eliminations across all twenty puzzles, including what-if search on the Ultimate shelf. Every finding below is about narrative, coverage, structure, or the UI, not about the mentor lying about a deduction.

---

## S1: must fix

### 1. Toasts never dismiss
`src/components/ui/use-toast.jsx`, `toast.jsx`, `toaster.jsx`. Confirmed.
When the Radix toast was replaced with plain elements, the state machine kept the old contract: removal is only scheduled after a dismiss, and nothing ever dismisses. The close button has no click handler. "Resumed your puzzle" sits over the grid until three newer toasts push it out. On a phone it covers the top rows. This is a regression from the toast rework in PR #2, and the claim in that PR that toasts auto-dismiss after five seconds was wrong.
Fix: schedule removal when a toast is added, wire the close button, drop closed toasts from the render list, and add `aria-live`.

### 2. Print window injects the puzzle name as raw HTML
`src/pages/SudokuMentor.jsx` around the print handler. Confirmed.
The puzzle name and difficulty are interpolated into `document.write` on a same-origin window. A puzzle named with a script tag, typed by the player or, if entity reads are not scoped, by another player, runs with access to the app origin.
Fix: build the print page with DOM APIs and `textContent`, or escape the strings.

### 3. Two beginner explanations can state something false
`src/components/sudoku/explainStep.js`. Confirmed by probe.
- X-Wing and Swordfish: orientation is guessed from the shape of the eliminations; ties resolve to "rows", so 7 of 16 library fish are described as row-based when they are column-based ("in each of rows 2 and 8, 5 can only go in columns...") which is not true of the board.
- Hidden Pair: the unit is taken as the first shared row, column, or box of the two cells, which can be a different unit from the one the engine found the pair in. 7 of 17 library instances name the wrong unit.
Both violate "every hint is honest". Fix: engines emit `orientation` and `unit` on the step; the explainer reads them instead of inferring. Remove the two remaining places that parse engine prose (`unitFromText`, `pairDigitsFromText`, and the row/column sniff in `stepHighlights.js`).

### 4. Hypothesis Mode narrates false reasons
`src/components/sudoku/forcingChainEngine.jsx` around line 712. Confirmed.
When the first value of a two-candidate cell contradicts, the second value is applied before its reason is computed, so propagation has already cleared it from peers and the "hidden single" check passes trivially. Nearly every chain step is labelled "Only place for N in row X", which is not why it was placed. The chain trace presents these as certain reasoning.
Fix: compute the reason before applying, and label these steps "the other value led to a contradiction".

### 5. Data scoping is invisible from the repo
`base44/entities/*.jsonc`, `useSudokuPlayer.js`, `PuzzleLibrary.jsx`, `UnifiedPuzzleLoader.jsx`. Plausible; depends on dashboard defaults.
No access rules live in the repository, and no client query filters by creator. If Base44 defaults to shared reads, "your best time" can be someone else's, rename and delete appear on other players' puzzles, and the duplicate check treats a stranger's puzzle as already in your library (and that branch loads it with no name or difficulty).
Fix: verify per-entity rules in the Base44 dashboard (creator-only for SolveRecord; creator write for SudokuPuzzle), and add `created_by` filters client-side as defence in depth.

## S2: should fix

### 6. Auto-load can overwrite a puzzle the player just chose
`SudokuMentor.jsx` and `SudokuMentorMobile.jsx` mount effect. Confirmed.
The random-puzzle fetch is only cancelled on unmount. If it resolves after the player picks from the library, the random puzzle replaces their choice. The hook's "superseded" guard cannot trigger because loading is synchronous.
Fix: a "user loaded" ref checked after the await, and reuse the same bootstrap hook on both pages.

### 7. Auto-play applies each step twice
`src/components/sudoku/LogicPanel.jsx` play and skip handlers. Confirmed.
"Apply, then next step" calls the `onNextStep` captured before the apply, which searches the pre-apply grid and re-finds the step just applied. Each real step costs two moves in history and half the speed.
Fix: hold the callbacks in refs, or have apply return the new grid.

### 8. Two Logic Panels are mounted; scans run while hidden
`SudokuMentor.jsx` (the `hidden lg:block` instance and the drawer instance). Confirmed.
Both instances keep their own state and timers, and the hierarchy defaults to expanded, so eleven full-grid scans run on every grid change even when the panel is not visible. Ultimate scan counts are never cleared when the grid changes, so stale badges show and clicking them does nothing.
Fix: one instance placed by a viewport hook; lift panel state to the page; reset scan results on grid change.

### 9. No Assist times can be wrong or gamed
`SudokuMentor.jsx` No Assist toggle; `useSudokuGame.js` start time. Confirmed.
Enabling No Assist after solving most of a puzzle with hints records a fast "clean" time. A restored game's start time includes the days away, so times after a resume are inflated.
Fix: track hints used and elapsed play time in the hook, persist it, pause it while away, and refuse a record when hints were used.

### 10. Mobile promises that do not work
`SudokuGrid.jsx`, `SudokuMentorMobile.jsx`, `CandidateNumpad.jsx`. Confirmed.
Long-press "Toggle candidates", advertised in the mobile tour, does nothing because the mobile page passes no focused digit. The selected digit's candidates never highlight on the phone. The candidate numpad and the bottom bar share the same fixed position, so the pad covers Undo and the mode switch.
Fix: pass the focused digit; let candidate colouring apply to any cell; stack the pad above the bar.

### 11. The hint path can freeze the page for seconds
`SudokuMentor.jsx` hint handler; `forcingChainEngine.jsx`. Confirmed by measurement (1.5 to 2.5 s on Platinum Blonde).
Forcing-chain and hypothesis search run synchronously on the main thread with depth 100. Cell Forcing Chain never fires on any library grid because propagation only cascades naked singles, so the mentor falls straight to hypothesis search.
Fix: move search to a Web Worker with a spinner and a cancel; add hidden-single propagation so forcing chains can converge; cap depth on the hint path.

### 12. Solution-checked coverage has holes
`src/components/sudoku/__tests__/oracle.spec.js`. Confirmed by probe.
The oracle only checks techniques the hint path happens to reach. Never solution-checked: Claiming, X-Wing, Swordfish, Finned X-Wing, Unique Rectangle, BUG+1, Cell Forcing Chain, Hypothesis Mode. Finned X-Wing also only scans rows as the base set, so it misses column-based cases.
Fix: a second oracle loop that, on every intermediate grid, checks every instance of every technique; a what-if oracle on the Ultimate shelf; column-based Finned X-Wing.

### 13. Accessibility gaps
Across dialogs and controls. Confirmed.
No dialog traps or restores focus. The App Info and No Assist modals lack dialog semantics and Escape handling. Several icon-only buttons have no name. Two places nest a role="button" span inside a button. Mobile digit and mode buttons lack a pressed state. Cell highlighting for hints is colour-only and absent from the cell's accessible name.
Fix: a shared `useDialog` (focus trap, restore, Escape, role) used by all nine dialogs; names on every icon button; pressed states; highlight roles in the cell label.

### 14. Silent failures on saved data
Confirmed. A failed solve-record save or preference update only logs to the console. Five separate places re-fetch the current user instead of reading it from the auth context.
Fix: toast on failure; read the user from context.

### 15. Grid re-render cost
`SudokuGrid.jsx`, `Cell.jsx`. Confirmed.
`Cell` is not memoised, receives three fresh closures per render, and is an animated element, so every keystroke re-renders 81 animated cells. The keyboard effect resubscribes on every render because the game object is new each time.
Fix: memoise `Cell` with stable per-index callbacks; narrow the effect dependencies.

## S3: structure and hygiene

16. **Step shape is inconsistent across engines.** `digit` is null for some techniques and the contradicted digit for Hypothesis Mode (so the wrong digit is highlighted); `chains` has two different shapes; `placement` is sometimes omitted; BUG+1 ignores `returnAll`. One documented shape and a `makeStep()` helper.
17. **Duplicated helpers.** The 27-unit list is rebuilt six times; cell naming appears about thirty times; the solver's box function duplicates `getBox`; a test re-implements the solver. Export `ALL_UNITS` and `cellName` from `gridUnits.js`, and `countSolutions` from the solver.
18. **Dead code.** Unused strong-link builder, unused parameters, two 55-line copy-pastes in Hypothesis Mode, the platform-generated `OAuthConsent` and `AuthLayout` pages that are not routed, an unused mobile copy handler, unused `Cell` props, and three different sets of default colours so "reset" differs from a fresh account.
19. **Duplicated page scaffolding.** The desktop and mobile pages share about 250 lines of bootstrap, solve recording, header, and audio. Extract `usePuzzleBootstrap`, `useSolveRecorder`, and shared header pieces; the mobile keyboard handler should reuse the shortcut resolver.
20. **Single 729 kB bundle.** Dynamic imports are defeated by static imports elsewhere; nothing is lazily loaded. React DOM, framer-motion, axios, and the Base44 SDK's socket client dominate. Lazy-load the two pages and the heavy modals; consider framer's lightweight `LazyMotion`; add a bundle-size check in CI.
21. **App cannot start offline.** The auth context blocks on a public-settings request, so a Playwright smoke test in CI must stub it, and an installable offline app is impossible as-is. Treat the failure as anonymous mode.
22. **Dependencies.** Three unused packages (`@radix-ui/react-toast`, `eslint-plugin-react-refresh`, `baseline-browser-mapping`); one fragile deep import into the Base44 SDK; 28 packages behind, several majors; 11 build-time audit findings fixable with `npm audit fix`; no Dependabot. `src/utils/index.ts` is imported but neither linted nor typechecked.
23. **CI.** Lint, typecheck, test, and build are enforced. Missing: cancel-in-progress, an audit step, a bundle-size check, a browser smoke test, and accessibility linting (`eslint-plugin-jsx-a11y`).
24. **Metadata.** No meta description, social tags, theme colour, local icons, manifest, or service worker. Package is still named `base44-app` at version 0.0.0. No LICENSE, CONTRIBUTING, or architecture note for the engine pipeline and step contract.

---

## Proposed order of work

Each line is one pull request, verified in the browser before merge.

1. S1 items 1 to 4: toasts, print escaping, honest fish and hidden-pair explanations (with engine-emitted `orientation` and `unit`), honest Hypothesis reasons. Small, high value, all mine to fix.
2. S1 item 5 plus S2 item 14: creator filters client-side, failure toasts, one auth source. Needs the dashboard check from the founder.
3. S2 items 6, 7, 8, 9: bootstrap race, auto-play double apply, single Logic Panel, honest No Assist timing.
4. S2 item 12 and S3 item 16: full solution-checked coverage for every technique, one step shape, column-based Finned X-Wing. This is the safety net for everything after.
5. S2 items 10 and 13: mobile fixes and the shared dialog helper with accessibility fixes.
6. S2 items 11 and 15: search in a Web Worker, memoised grid.
7. S3 items 17 to 24 as a hygiene batch: dedupe, dead code, lazy loading, dependencies, CI additions, metadata.

## What is solid

`useSudokuGame` (pure conflict computation, latched completion, history kept out of updaters, cancellation guards) and its StrictMode tests. The technique detectors themselves, all sixteen of them, traced and probe-verified. The bitmask solver. The difficulty analyser, which now rates every shelf as labelled. `keyboardShortcuts.js` and `stepHighlights.js` as small pure modules with tests. The oracle test design, which just needs wider coverage. The README is accurate and now points to the product definition.
