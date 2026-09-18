# Code review: 2026-09-18

Scope: the whole repository at main `ae8aa60` (after PRs 2 to 8). Method: three independent read-only reviews (solving engines; UI and state; project health), each cross-checked against the code, plus an empirical probe that replayed every library puzzle through the hint engine and checked each step against the true solution. Measured baseline: lint clean, typecheck clean, 140 tests in 9 files, production bundle 729 kB raw / 224 kB gzip in a single chunk.

Severity: **S1** breaks a promise in `docs/PRODUCT.md` or is a security issue; **S2** is a real bug or a clear quality gap; **S3** is structure, performance headroom, or hygiene.

The good news first: **the deductive engines are sound.** The probe found zero wrong placements or eliminations across all twenty puzzles, including what-if search on the Ultimate shelf. Every finding below is about narrative, coverage, structure, or the UI, not about the mentor lying about a deduction.

---

## Outcome (2026-09-18, same day)

All 24 findings were worked in the order proposed below, one pull request per batch, each verified in the browser (desktop and a 390x844 touch viewport) before merge. Counts at the end: lint clean including `jsx-a11y`, typecheck clean, 202 tests in 17 files, JavaScript 752 kB in seven chunks with the pages and the what-if worker split out.

| Batch | PR | Findings | What changed |
| --- | --- | --- | --- |
| 1 | #10 | 1, 2, 3, 4 | Toasts auto-dismiss with a close button; print page escapes user text; engines emit `unit`, `orientation`, `pairDigits` so fish and hidden-pair explanations describe the real step; Hypothesis Mode says "case analysis" where it is one. |
| 2 | #11 | 5, 14 | Every Base44 read and write goes through `playerData.js` scoped by `created_by`; failures toast; one auth source. The dashboard-side rule is still the founder's to confirm. |
| 3 | #12 | 6, 7, 8, 9 | `usePuzzleBootstrap` with a user-load latch; auto-play calls the latest callbacks; one Logic Panel mounted; the clock pauses while hidden, saves on hide and unmount, and only clean solves (no hints) are recorded. |
| 4 | #13 | 12, 16 | `makeStep()` is the one step shape; Finned X-Wing scans both orientations; Hypothesis narration is built from the actual contradiction; `oracleAll.spec.js` checks every instance of every technique on every intermediate grid, plus what-if search on the Ultimate shelf. |
| 5 | #14 | 10, 13 | Mobile passes the focused digit (candidates light up, long-press toggle works, release after long-press no longer places); the pencil-mark pad stacks above the mode row; `useDialog` gives every dialog focus, trap, Escape and restore; names on icon buttons; pressed states; hint roles in cell names. |
| 6 | #16 | 11, 15 | What-if search runs in a Web Worker with a spinner and Cancel; propagation cascades hidden singles, so Cell Forcing Chains converge and hypothesis search takes milliseconds; derived placements are narrated; `React.memo(Cell)` with stable handlers; one keyboard listener per page. |
| 7 | #17, #18 | 17 to 24 | One cell-name helper; `applyLogicStep` clears peers itself; one colour source; dead pages, handlers and props removed; shared `AccountMenu`; mobile keyboard uses `resolveShortcut`; lazy pages and modals; unused packages removed; `jsx-a11y` lint; CI cancels superseded runs, smoke-tests the build and enforces a bundle budget; metadata, manifest, Dependabot, `ARCHITECTURE.md`; anonymous mode when the platform is unreachable. |

Left open on purpose:

- **LICENSE.** Choosing a licence is the owner's decision; nothing was added.
- **Five npm advisories** in the vite/vitest peer set. npm's resolver crashes on that set in this environment (`arborist` "edgesOut" TypeError), so `npm audit fix` and any `vite` bump need a newer npm. Everything else `npm audit` flagged was updated one package at a time.
- **Service worker.** Offline play is a "Later" item in `PRODUCT.md`; the manifest is in place, the worker is not.
- **Entity access rules** on `SudokuPuzzle` and `SolveRecord` must be checked in the Base44 dashboard; the repository cannot express them.

A second, independent review was run after batch 7b; its findings and their fixes are recorded at the end of this document.

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

---

## Second review (2026-09-18, after batch 7b)

An independent reviewer read the whole repository again at main `6d426da`, with probes against the solver's solution. It confirmed the deductive engines sound on consistent candidate sets and found the items below. All of them were fixed in PR #19 the same day; each fix carries a regression test or a browser check.

| Sev | Finding | Fix |
| --- | --- | --- |
| S1 | Hints computed from player-edited pencil marks could be wrong (a removed true mark made the next hint "Naked Single: 1", solution 2; an erased digit left a cell with no marks, invisible to every technique), and Apply wrote the digit unchecked. | Removing the pencil mark that is the answer is refused like a wrong digit (flash, sound, error count). Erasing a digit restores the cell's valid marks. The engines reason from `logicGrid`, the player's grid with empty or truth-less candidate sets repaired. `applyStep` refuses any step that contradicts the solution. Tests in `useSudokuGame.spec.jsx`. |
| S1 | Finned X-Wing beginner text said "rows ... columns" for every column-based instance (66 of 66 false). | The text follows `step.orientation`; `stepHonesty.spec.js` checks both orientations and that the eliminations lie on the named cover lines. |
| S2 | Hypothesis Mode always narrated "no possible number left", highlighted a stand-in cell for unit contradictions, and hid that the other option of a case split had also failed. | The card and the beginner text use the engine's own `contradictionText`; unit contradictions carry the unit and highlight all its cells; both-fail case splits add a note entry that the trace, the footer and the narrative show. Tests in `stepHonesty.spec.js` and `explainStep.spec.js`. |
| S2 | Naked Single and Hidden Single "why" claimed digits "already appear" nearby, false after any elimination technique (about 2% of singles). | The builder checks the claim against the grid and uses the weaker, true wording otherwise. Test walks every library puzzle. |
| S2 | A No Assist record could be earned after solving with live technique counts or a scan, then switching No Assist on for the last digit. | The game tracks `assistUsed` (persisted); live counts, scans, searches and hints all set it; records need it false. |
| S2 | Pasted puzzles with several solutions were accepted, then valid entries were rejected as wrong. | `countSolutions` in the solver; `loadPuzzle` returns `multiple-solutions`; the loader and both pages refuse with a clear message. |
| S2 | Mobile: a completed digit stayed selected and undeselectable, so every tap was a counted error; taps on filled cells counted as overwrites. | The selection clears when the ninth copy lands; the selected button is never disabled; taps on filled cells only select. |
| S2 | The grid was unreachable by Tab and DOM focus never followed the selection. | R1C1 (or the selected cell) is in the Tab order; focus follows the selection unless a dialog or text field has it. |
| S3 | One shared worker: cancelling either search killed the other. | One worker per search. |
| S3 | Hint search invisible in the narrow action bar. | The Hint button becomes a spinning Cancel while searching. |
| S3 | Ultimate scan could report counts for a grid that had changed. | The scan stops when the grid changes. |
| S3 | Narrow desktop windows lost click-to-place on pencil marks; `isMobile` ignored resizes. | Slot pass-through depends on a coarse pointer, layout on a live media query. |
| S3 | `eslint --quiet` hid 16 warnings. | `--max-warnings 0`, warnings cleared. |
| S3 | Second user source in `useSudokuPlayer`; bootstrap read the user before auth resolved; clipboard rejection unhandled; SVG `apple-touch-icon`; Shift stuck after window blur; Cell Forcing Chain had no trace. | `useSudokuPlayer` reads `AuthContext`; PNG icons; clipboard failure toasts with the string; window blur ends candidate mode; the card lists both paths of a Cell Forcing Chain. |

Still open after the second review: LICENSE (owner's decision), the five npm advisories in the vite/vitest peer set (npm resolver crash), no service worker, and the Base44 dashboard entity rules. The reviewer also noted, unconfirmed, that a pasted hard puzzle could keep the depth-100 panel search busy for a long time; it is cancellable and off the main thread, and a time budget is a reasonable follow-up.

