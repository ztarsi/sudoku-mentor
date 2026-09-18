# Product review: 18 September 2026

First review of Sudoku Mentor against the promise and quality bar in [PRODUCT.md](../PRODUCT.md).

## What was reviewed, and how

- **Build:** `main` at commit `ae8aa60` (18 Sep 2026), run locally. The live URL (sudoku-mentor-cd8c3b71.base44.app) is blocked by this environment's network policy, so I could not load it directly. The local build is the same code without Base44 behind it, which means sign-in, saved puzzles, photo import and solve records were not exercised. Everything else in this review is the play-and-learn loop, which PRODUCT.md says must work without Base44, and it does.
- **Method:** scripted walkthroughs in Chromium, as each of the three players in section 3, through the jobs in section 4. Desktop at 1920x1080, 1366x768, 1366x900 and a 900px-wide window; phone as an iPhone 13 (390x664 viewport, touch), portrait and landscape.
- **Coverage:** first visit and tour; placing a digit; a wrong entry; Hint, Beginner and Expert explanations, Apply, Undo; reload; every shelf in the library with hints applied to completion; the technique reference dialog; the hierarchy counts; Scan; what-if search; No Assist; pasting a puzzle (valid, invalid, malformed); candidates hidden; auto-solve; the phone's digit-first input, candidate pad, error count, reload and library.

## Verdict in three sentences

The core of the product is real: every hint I saw was correct, named its technique, highlighted the right cells and explained itself in plain words that name real cells. The biggest problem is that on the most common laptop screen the explanation is off-screen when the hint fires, so the lesson the product promises is not seen unless the player scrolls. After that, the improver runs out of material: the Hard shelf has one puzzle.

## What the app does well against the promise

**1. Every hint is a lesson.** Verified across 400+ applied hints on all six shelves. Each hint names the technique, colours the cells on the board (blue for the cells that make the pattern, red for the cells that lose a candidate) and explains in Look / Why it works / What to do. The Beginner text for Pointing Pair, Naked Pair, Hidden Pair, Naked Triple, XY-Wing, X-Cycle and ALS-XZ is genuinely readable by someone who has never heard the names. Example, XY-Wing: "Whatever the middle cell turns out to be, it forces one of the two outer cells to be 5. So 5 is guaranteed to land in one of those two outer cells."

**2. Every hint is honest.** Deductive techniques always came first. On the Ultimate shelf the mentor exhausted ALS-XZ before falling back to a what-if step, and that step carried an amber note saying no deductive technique applies and this is search, with a five-step chain replay. Scan reports counts per technique and, on a Diabolical board, found 18 ALS-XZ instances in under a second.

**3. Wrong entries are caught immediately.** On desktop a wrong digit flashes red in the cell and is refused. On the phone the same, plus the count ("1 error") updates in the header strip and a screen-reader announcement names the conflict.

**4. Progress is never lost.** Reloading on desktop and on the phone restored the exact board, without the tour, and with the puzzle name and shelf intact. Desktop and phone share the same saved game.

**Also good:** the technique reference dialog (plain words, formal version, how to find it, example) is exactly what section 6 asks for. Keyboard coverage is complete and the shortcuts card is accurate. Pasting 81 digits works signed out, and a contradictory puzzle is refused with a clear message. The phone board is clean and fits the viewport with no scrolling in portrait.

## Top five things to fix or add

Ordered by value to the improver, the primary player.

### 1. The explanation is off-screen when a hint fires (desktop)

- **Player:** improver, learner. **Promise protected:** every hint is a lesson.
- **What happens:** the right column stacks the Technique Hierarchy above the hint card. After pressing H, at 1366x768 (the most common laptop resolution) only the badge "Hidden Single, Digit: 1" is visible and all three explanation sections are below the fold. At 1920x1080 the "What to do" section is still cut off. In a window narrower than 1024px the explanation does not appear at all; the board highlights the cells and the player has to know to open the "Logic" drawer.
- **Done looks like:** press Hint on any desktop or laptop screen and the Look, Why and What to do text is readable without scrolling, with the board still visible. The hierarchy can collapse, move below, or the panel can scroll itself to the card. In a narrow window the explanation opens with the hint.
- **How we will know:** with analytics, hint-to-apply ratio should rise, because players who can read the hint will place the digit themselves. Without analytics: repeat this walkthrough at 1366x768 and 1920x1080.

### 2. The Hard shelf has one puzzle

- **Player:** improver. **Promise protected:** "teach me this technique on my own puzzle".
- **What happens:** Easy has 5 puzzles, Medium 3, Hard 1 ("Lunch Puzzle"), Expert 2, Diabolical 2, Ultimate 7. The player the product is tuned for exhausts their shelf in one sitting, and the shelf above it in another. Ultimate, which the product says needs what-if search and is the least teachable shelf, has the most.
- **Done looks like:** at least ten vetted puzzles on each of Hard, Expert and Diabolical, each solvable by the mentor with named techniques and no what-if step, and each shelf's technique mix documented. This is the interim step before the generator on the roadmap.
- **How we will know:** level progression (section 9) needs a shelf a player can live on for weeks. Until then: count puzzles per shelf.

### 3. Forty singles before the first real lesson

- **Player:** improver, enthusiast. **Promise protected:** "teach me this technique".
- **What happens:** applying hints from the start, the Expert puzzle "Deep Waters" needed 41 Naked and Hidden Singles before its one XY-Wing, then 16 more singles. "Devil's Den" (Diabolical) was 55 singles and one X-Cycle. "Lunch Puzzle" (Hard) had 6 non-single steps in 63. The teaching moment exists, but the player has to grind through the easy part to reach it, or use Auto-Solve, which is framed as the machine playing, not the player learning.
- **Done looks like:** the improver can get to the interesting step quickly and on purpose, for example "fill in the singles for me" as a single undoable move, and the library tells them which techniques a puzzle will teach before they load it. This is the seed of Technique practice mode on the roadmap, without the generator.
- **How we will know:** stuck rate on Hard and Expert should fall; hints requested per puzzle should fall because singles are not being requested one by one.

### 4. Small honesty gaps in the hint card

- **Player:** improver, learner. **Promise protected:** every hint is honest; plain words first.
- **What happens:** (a) The "Digit" badge shows only the first digit for multi-digit techniques: Naked Pair on 1 and 2 shows "Digit: 1", Hidden Pair on 3 and 6 shows "Digit: 3". A learner reading the badge before the text is misled. (b) The what-if step is headed "Technique Found!" with a green badge, the same framing as a deductive technique; the honest note sits below it in amber. (c) The legend under every explanation reads "R5C3 means row 5, column 3" even when the hint is about R4C1; a learner may look for R5C3.
- **Done looks like:** the badge shows all digits involved, or is omitted for eliminations. A what-if step is headed differently ("Reasoning by search", or similar) so the difference is visible at a glance. The legend uses a cell from the current hint.
- **How we will know:** these are correctness fixes; verify by reading the card for each technique.

### 5. The error count is invisible on desktop while playing

- **Player:** improver. **Promise protected:** wrong entries are counted.
- **What happens:** the phone shows "No errors" / "3 errors" in the header strip. Desktop shows nothing until the completion dialog ("Errors Made: 0"). The count is kept, but the player who wants to know how their session is going cannot see it, and the "experiment freely" promise reads differently when errors are hidden until the end.
- **Done looks like:** the same quiet count the phone has, next to the progress percentage on desktop.
- **How we will know:** wrong-entry rate per puzzle (section 9) needs the player to see the count for it to change behaviour.

## Smaller things noticed

- The Easy shelf contains puzzles named "Nightmare" and "X-Wing Territory". A first-time visitor landed on "X-Wing Territory" as their starter puzzle. Both solved with singles only, so the shelf is right and the names are wrong. Rename them.
- The phone is play-only: no hints, no auto pencil marks, and the red No Assist badge in the header has no label. This is the roadmap's "Mobile hints" item and section 12's open question, so it is noted, not counted above.
- The phone's digit buttons are 36px square, under the usual 44px touch target. Cells are 40px. No mis-taps in testing, but worth a look when the hint sheet is designed.
- On the phone a wrong digit stays selected after rejection, so the next tap on another cell repeats the wrong digit. That is consistent with digit-first input, but a learner may not realise why they are racking up errors.
- The welcome tour blocks the board on arrival. It is three lines and one tap, and the quality bar's "place a digit within ten seconds without reading anything" is still met, but the player cannot try the board while the tour is open.
- Pasting a puzzle names it "Custom Puzzle 9/18/2026 07:24 PM" and labels it "Easy" from the analyser. Fine, but the name field in the paste dialog is easy to miss.
- After completing a puzzle the completion dialog offers only "Continue". There is no "next puzzle on this shelf", so the improver goes back through Load puzzle each time.
- Scan says "Estimated time: ~10 seconds" and finished in half a second. The estimate is stale.

## Quality bar (section 8)

| Bar | Result |
| --- | --- |
| Every hint correct against the true solution | Pass in this walkthrough (all applied hints led to solved puzzles with zero errors); tests cover this |
| First-time visitor places a digit within ten seconds, phone and desktop | Pass (about 5 seconds desktop, 7 on phone, scripted) |
| Beginner explanations use no undefined vocabulary and name real cells | Pass for every technique seen; "pencil mark" and "box" are the only assumed terms |
| Nothing lost on reload | Pass, desktop and phone |
| All actions reachable by keyboard (desktop) and thumb (phone) | Pass on desktop. On phone, everything present is reachable; hints are absent |
| Lint, typecheck, tests, build pass on every change | CI runs these; not re-run here |

## Not verified

- The live URL itself. Confirm once from a browser outside this environment that the deployed build matches `ae8aa60`.
- Sign-in, saved puzzles, solve records, photo import, and best times.
- Sound on a wrong entry (headless browser).
- Long-press on a phone cell (could not be simulated reliably).

## One recommendation for the developer next

**Make the lesson visible: when a hint fires on desktop, the explanation must be on screen without scrolling, at every window size.**

Reasons. It is the first promise in section 5, and today it is broken on the most common laptop screen. It is one layout change with no engine work. Every roadmap item about hints (graduated hints, mobile hints) builds on a hint card the player can actually see, so this should land first. After that, the next call is between filling the Hard shelf (item 2) and graduated hints from the roadmap; I would fill the shelf, because the improver cannot learn on puzzles that do not exist.

## Appendix: technique mix per shelf, applying every hint from the start

| Puzzle | Shelf | Steps | Non-single steps |
| --- | --- | --- | --- |
| Gentle Start | Easy | 51 | none |
| Nightmare | Easy | 64 | none |
| Brain Teaser | Medium | 55 | Pointing Pair x1 |
| Lunch Puzzle | Hard | 63 | Pointing Pair x2, Naked Pair x1, Hidden Pair x2, Naked Triple x1 |
| Deep Waters | Expert | 58 | Pointing Pair x1, XY-Wing x1 |
| Devil's Den | Diabolical | 56 | X-Cycle x1 |
| Night Owl | Ultimate | 64 | Pointing Pair x4, Hidden Pair x1, ALS-XZ x1, what-if search x1 |
