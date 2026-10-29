# Sudoku Mentor: Product Definition

This document says what Sudoku Mentor is, who it is for, what it promises, and how we decide what to build. It deliberately does not say how anything is built; that lives in the README and the code. Keep this file current: when the product changes, change this first.

Owner: the product manager. Last reviewed: 2026-10-26.

---

## 1. One sentence

Sudoku Mentor is a Sudoku tutor that teaches you to solve harder puzzles by showing you the next logical step on your own board and explaining it in words you understand.

## 2. The problem

Most Sudoku apps do one of two things when you are stuck: nothing, or they fill in a cell for you. Neither teaches anything. The techniques that unlock harder puzzles (pointing pairs, X-Wings, XY-Wings, colouring, and so on) are documented in forum posts and guides written in dense jargon, on example grids that are not the one in front of you. The gap between "I can do easy puzzles" and "I can do hard ones" is where most players give up.

## 3. Who it is for

Three players, in priority order.

1. **The improver.** Solves easy and medium puzzles comfortably, gets stuck on hard ones, and wants to get better rather than be given the answer. This is the primary user. Every default in the product is tuned for them.
2. **The learner.** New to Sudoku or returning after years. Needs the rules of the game reinforced, a gentle first puzzle, and explanations with no vocabulary to learn first.
3. **The enthusiast.** Already knows the technique names, wants to find expert-level patterns on real puzzles, check their own reasoning, and time clean solves.

Not for: people who want a puzzle solved for them, or a daily casual game with streaks and ads. Those products exist and we do not compete with them.

## 4. Jobs to be done

When a player opens Sudoku Mentor they are trying to do one of these:

- "I am stuck. Show me one thing I could see myself, and explain why it works."
- "Teach me this technique on my own puzzle, not on a textbook example."
- "Let me check whether the step I am about to take is sound."
- "Let me solve this cleanly with no help and record my time."
- "I have a puzzle from a newspaper or a book; let me work on it here."

## 5. The promise

Sudoku Mentor promises four things. If a change breaks any of them, it is the wrong change.

1. **Every hint is a lesson.** A hint names the technique, shows the cells involved on the board, and explains the reasoning in plain language. It never just fills a cell.
2. **Every hint is honest.** The mentor only presents a step as a technique when it is one. When it has to fall back to trial and error (what-if search), it says so, and the player can see the difference.
3. **Wrong entries are caught immediately.** The player can experiment freely because a mistake is refused on the spot, visibly and audibly, and counted.
4. **Progress is never lost.** Leaving and coming back resumes the same puzzle at the same point, without an account.

## 6. Principles for deciding what to build

- **Plain words first.** The beginner explanation is the default. Expert vocabulary is one click away, never the starting point.
- **Show it on this board.** Explanations always reference the actual cells and digits in front of the player. Generic examples belong in the reference dialog, not in a hint.
- **Deduction before search.** Named, deductive techniques always take precedence. Search-based reasoning is a last resort and is labelled as such.
- **No account required to play or learn.** Sign-in unlocks saving and history; it never gates the core loop.
- **Mobile is a first-class player, not a shrunken desktop.** Touch input has its own model (pick a digit, tap cells). Anything the desktop teaches, the phone should be able to teach too, even if the layout differs.
- **Quiet UI.** The board is the hero. Chrome, badges, and toasts exist to support the board, and disappear when they have done their job.

## 7. What the product is today

As of the first release of the UX pass (2026-09-19, PR #61 from `staging` to `main`). Players see it once the Base44 checkpoint for that commit is deployed; the previous layout (a separate phone page, a technique hierarchy above the hint, a Focus Mode card, Auto-Solve) is gone.

### 7.1 One page, four arrangements

- One page that arranges itself by width and pointer. Wide (about 1200px and up): board on the left, the lesson panel on the right. Medium (800 to 1199px): the same, or a side sheet that opens on Hint where both do not fit. Stacked (600 to 799px, tablets in portrait): board over the strip, the lesson as a bottom sheet. Phone (under 600px): board and strip only, always No Assist, labelled "No Assist: timed, no hints" with a visible timer.
- The board keeps its size within the viewport so the digit strip is always on screen with it.
- The game in progress, the explanation level, the theme and the Techniques choice are saved locally and survive a reload, a resize and a rotation.

### 7.2 Playing

- A 9x9 board with pencil marks filled in automatically when a puzzle loads and maintained as digits are placed.
- One digit strip under the board on every width: digits 1 to 9 with placed counts (a completed digit greys out), Pencil, Marks (show or hide pencil marks), Undo, Redo, Erase, and Hint wherever the lesson lives in a sheet. Both habits work everywhere: pick a digit then tap cells, or select a cell then tap or type a digit. A digit picked with no cell selected is highlighted on the board. Keyboard shortcuts cover every action; "?" opens the reference.
- Wrong entries are refused with a red flash, named on the strip ("4 can't go in R2C1"), announced to screen readers and counted. Progress and the error count sit above the board on every width.
- Undo and redo across every move, including applied hints.

### 7.3 Learning

- The hint card is the first thing in the lesson panel. Its states: idle ("Stuck? Ask for a hint"); found (technique name and tier, chips for every digit involved, Look / Why it works / What to do at the Beginner or Expert level, a legend naming a cell from this hint, Apply and Next hint); what-if, which since 2026-10-24 means Hypothesis Mode alone (a distinct heading and colour, with the replay); searching (with Cancel); No Assist (the timer, no hint); only singles left (only when every remaining empty cell shows one pencil mark and a single has already been taught on this puzzle; "Show me the next one" gives a lesson); solved (the techniques the puzzle used, time and errors, "Next puzzle on this shelf", "Try the shelf above").
- Beginner explanations are the default and use R5C3 notation with a legend; the Expert level adds standard terminology and a glossary. The choice is remembered.
- **Techniques**, collapsed under the hint card and remembered. What applies to the board in front of the player comes first, in teaching order, with counts and click-to-highlight; the whole ladder sits below it by tier, collapsed, each tier saying how many techniques it holds and how many are on this board, and a box at the top finds a technique by name as you type, on the plain name, the formal one and the name a guide would use. Every technique has a reference dialog (plain words, formal version, how to find it, example), reachable whether or not it applies right now. Scan covers the tiers too expensive to count while playing and says what it is about to do. The bottom two tiers are Forcing, five techniques that prove a placement by checking every case, and What-if, which is Hypothesis Mode alone: a proof by cases is presented as the deduction it is, and only trial and error carries the what-if styling. Counts never run in the input path: entering a digit computes nothing, a board change drops every count, and a count that is not known says so and offers a button rather than showing a number from the previous board.
- First visit: no dialog. Three prompts, each once and in place: on the board until the first digit, on the Hint button after the first placement, on the first hint card. "How to play" in the menu repeats them with the one-line rules.

### 7.4 Puzzles

- A built-in library on six shelves: Easy, Medium, Hard, Expert, Diabolical, Ultimate. Every row says what that puzzle teaches, measured by the difficulty analyser rather than written by hand ("Teaches up to XY-Wing", "Teaches up to ALS-XZ, then what-if search"), and a shelf's what-if note is derived from the same measurement, so a shelf cannot claim something the engine does not do. Opened from the puzzle name in the header or from Load puzzle.
- New visitors start on an easy or medium starter puzzle.
- Any puzzle can be pasted as 81 digits. Signed-in players can also photograph a puzzle, and their puzzles are kept in a personal library.
- A grid with more than one answer is played rather than refused. The mentor says so plainly and keeps teaching; only the techniques that depend on there being one answer switch off, with the reason shown, and their reference dialogs still open. A wrong entry is then refused only when no answer allows it, so a mistake is still caught on the spot.

### 7.5 Competing

- **No Assist** is a labelled switch in the header ("No Assist: off" / "No Assist: on" with the timer). It disables hints, the Techniques counts, Scan and Search, and says so; the reference dialogs stay readable, because reading how a technique works is not assistance (decided 2026-10-24). A solve counts as clean only if nothing assisted at any point, and clean solves are recorded for signed-in players with best times in the library.
- The phone is always No Assist: it is the "just play" surface for now.

### 7.6 Header, menu and appearance

- Header: puzzle name and shelf (opens the library), the No Assist switch, Load puzzle, Sign in or the account, and one menu. Nothing in the header is icon-only except the menu.
- Menu: How to play, Keyboard shortcuts, Theme (Dark, Paper, Match my device), Colours, Print puzzle, Copy puzzle, Clear the board (with a confirm), About.
- Two themes, dark and paper, remembered without an account and synced with the account when signed in; the colour editor adjusts the current theme's five board colours.
- Toasts appear at the bottom on desktop and above the strip on touch devices, never over the board.

### 7.7 Account

- Optional sign-in. Adds: saved puzzles, solve records and best times, and theme and colour preferences across devices. Everything else works signed out, including when the platform is unreachable: the board never waits on it.

## 8. Quality bar

A release is acceptable when:

- Every hint the mentor shows is correct against the puzzle's true solution (this is checked automatically for every technique).
- A first-time visitor can place a digit within ten seconds of arriving, on phone and desktop, without reading anything.
- Every explanation in Beginner mode uses no undefined vocabulary and names real cells.
- Nothing the player did is lost by a reload, a tab switch, or closing the app.
- All actions are reachable by keyboard on desktop and by thumb on a phone.
- Lint, type checks, tests, and the production build pass on every change.

## 9. How we measure success

We do not have analytics yet, so these are the measures we intend to track, in priority order.

1. **Return rate**: share of visitors who come back within a week. This is the one number that says the product teaches.
2. **Hint-to-apply ratio**: how often a player who reads a hint then places the digit themselves rather than pressing Apply. Rising is good; it means hints are teaching, not doing.
3. **Level progression**: share of players whose hardest completed shelf goes up over a month.
4. **Stuck rate**: puzzles started but abandoned with no hint used and no completion.
5. **Wrong-entry rate per puzzle**, as a proxy for whether explanations land.

Vanity measures we will not optimise: time in app, number of hints requested, sign-up count.

## 10. Roadmap

Ordered by value to the improver. "Now" is committed; "Next" is agreed in principle; "Later" is a parking lot.

### Now

The UX pass, in order. Audit and target experience: [the UX review](reviews/2026-09-18-ux-review.md). One spec per item in `docs/specs/`.

1. [Lesson-first panel](specs/lesson-first-panel.md): the hint card first in the column, Techniques collapsed under it, Auto-Solve removed, shortcuts to the menu. Shipped to staging and verified 2026-09-19.
2. [One digit strip](specs/digit-strip.md): one input strip under the board on every device; absorbs Focus Mode and the phone pad. Shipped and verified 2026-09-19; follow-ups #53, #55.
3. [Hint card states](specs/hint-card-states.md): a designed card for idle, found, what-if, searching, No Assist, solved and only-singles-left. Shipped and verified 2026-09-19; the only-singles state amended, follow-up #54.
4. [One adaptive page](specs/one-adaptive-page.md): wide, medium, stacked and phone arrangements of one page; the mobile page goes. Shipped and verified 2026-09-19; follow-up #55.
5. [Header and menu](specs/header-and-menu.md): puzzle, progress and errors on every width; No Assist as a labelled switch; everything secondary behind a hamburger menu. Shipped and verified 2026-09-19.
6. [Paper theme](specs/paper-theme.md): a light theme next to dark, switchable and remembered. Shipped and verified 2026-09-19.
7. [Inline onboarding](specs/inline-onboarding.md): three in-context prompts instead of the tour modal. Shipped and verified 2026-09-19.
8. UX pass follow-ups from verification (#53, #54, #55): shipped and verified 2026-09-19.
9. First release of the UX pass from `staging` to `main`: merged 2026-09-19 (PR #61) on the founder's go. Remaining from the release checklist in docs/STAGING.md: deploy the Base44 checkpoint, then spot-check sign-in, saved puzzles, solve records, best times and photo import on the live app.

Then:

- Analytics on the five measures above, privacy-respecting and off by default for signed-out players until we decide otherwise.
- Graduated hints: a nudge ("look at box 4") before the full step, so the player gets a chance to find it themselves. Becomes a state of the hint card.

### Next

- [Full technique coverage](specs/technique-coverage.md) (#69): **complete on `staging`, 24 October 2026.** All seven batches shipped and verified. 1303 of 1303 library solve-path steps are explained by a named technique, every shelf at 100%, and the Ultimate shelf answers none of its 41 former trial steps by trial any more. The catalog went from 16 techniques to 61. What it did not fix: the library teaches 32 of those 61, which is #88 below. The batches were:
  1. [Subsets and wings](specs/subsets-and-wings.md) (#70): Hidden Triple, Naked Quad, Hidden Quad, XYZ-Wing, WXYZ-Wing. Shipped to `staging` 2026-10-24 (PR #77).
  2. [The Techniques panel at scale](specs/technique-panel-at-scale.md) (#71): a panel and live counts that survive fifty-five techniques, plus the difficulty analyser that measures what a puzzle actually needs. Shipped to `staging` 2026-10-24 (PR #78), with the coverage baseline below.
  3. [Alternating inference chains](specs/alternating-inference-chains.md) (#67): the chain of strong and weak links, including grouped nodes, continuous loops and almost-locked-set nodes. Shipped to `staging` 2026-10-24 (PR #86), eleven names and the largest single reduction in what-if cards.
  4. [Fish and single-digit patterns](specs/fish-and-single-digit-patterns.md) (#72): Jellyfish, sashimi and finned fish, Empty Rectangle, franken and mutant fish, 3D Medusa. Shipped to `staging` 2026-10-24 (PR #81).
  5. [Almost locked sets](specs/almost-locked-sets.md) (#73): ALS-XY-Wing, ALS chains, Death Blossom, Sue de Coq. Shipped to `staging` 2026-10-24 (PR #92). Its honest finding: the family named none of the then-remaining trial steps, proved by measurement, and ALS-XY-Wing became the hint on 7 steps that a longer chain used to explain.
  6. [Uniqueness](specs/uniqueness-techniques.md) (#74): Unique Rectangle types 2 to 6, Hidden UR, Avoidable Rectangle, BUG variants, unique loops. Shipped to `staging` 2026-10-24 (PR #87), with the single-solution guard that makes them safe on imported puzzles.
  7. [Forcing chains and nets](specs/forcing-chains-and-nets.md) (#75): unit and digit forcing, double chains, dynamic nets, and the line between a proof by cases and a guess. Shipped to `staging` 2026-10-24 (PR #94), closing the programme and taking the library's trial steps to zero.

  **The coverage baseline, measured 2026-10-24 on `staging` after batches 1 and 2.** The analyser prints it in the test run, so it is a report and not an estimate. Across the 20 library puzzles, 1204 of 1245 solve-path steps are explained by a named technique, 96.7%. Easy, Medium, Hard, Expert and Diabolical are all at 100%, and a test fails if that stops being true. The whole remaining gap is the Ultimate shelf: 41 what-if steps out of 493, spread across all seven of its puzzles. Every later batch is judged by what it does to those 41 steps.

  **Where it stands, 2026-10-24, after six of the seven batches.** **1251 of 1282 steps named, 97.6%**, with Easy through Diabolical at 100% and the Ultimate shelf down to **31** what-if steps from 41. Night Owl is the first Ultimate puzzle the named ladder finishes alone. The 31 that remain are positions no chain of ten nodes or fewer reaches, in Easter Monster, Golden Nugget, Platinum Blonde, World's Hardest, Swordfish Hunt and AI Escargot, and the forcing batch is what is left to reach them. The uniqueness family did not move that count, because the chains had taken those positions first; what it did was shorten the library's solve paths by 19 steps, explaining in one step what a chain needed several for.

  **The second measure, added 2026-10-24.** Steps named is about the engine. It says nothing about whether a player ever meets what the mentor knows, and the never-taught report (#83) showed the gap: by the end of the day the catalog held 53 techniques and the library taught 31 of them, with 22 never the hint on any puzzle, X-Wing among them. The gap more than doubled in an afternoon, because the engine work moved and the library did not. Both numbers are reported together from now on, and [teaching coverage](specs/teaching-coverage.md) (#88) is the work that closes the second one.
- [Library and completion](specs/library-and-completion.md): library rows that say what a puzzle teaches and where you left off; completion that shows what you learned and offers the next puzzle.
- Reconcile `main` into `staging` (#98): keep the Base44 animation, keep the walk's wording, restore the desktop pencil button. Release-blocking and in progress.
- [Hint animation: one template for every technique](specs/hint-animation.md) (#97): the animation the founder built in the Base44 editor becomes the template every technique's animation follows. The board is the stage, captions and controls sit under the puzzle, and the picture builds one idea at a time. Adds two things neither version had: captions that follow the explanation level, and respect for reduced motion.
- [Teaching coverage](specs/teaching-coverage.md) (#88): every technique the mentor knows is taught by at least two library puzzles. Today the library teaches 32 of 61, and X-Wing is taught by none of them. Mostly a puzzle-sourcing job, gated by the analyser. This is the biggest gap in the product.
- [What a player downloads before the first board](specs/first-board-payload.md) (#91): the build reached 956 kB and every technique engine loads before a player can place a digit, against a quality bar that promises a digit within ten seconds on a phone. Budget the entry chunks, load the rest on demand.
- The library's Ultimate shelf takes 13 seconds to label its rows (#95), because it re-measures twenty fixed puzzles on every visit. Precompute the labels with a staleness test against the live analyser, so they cannot go stale quietly.
- The shelf re-cut the coverage programme deferred: with the analyser's numbers in hand, decide whether any puzzle now sits on the wrong shelf. Six library puzzles' hardest technique moved during the programme.
- More vetted puzzles on the Hard, Expert and Diabolical shelves (today one, two and two). The improver runs out in a sitting, and the never-taught list says exactly which puzzles to add first.
- Learning on the phone: what teaching looks like on a phone-sized screen, which may not be the desktop hint card. The phone stays No Assist until this is answered.
- Technique practice mode: pick a technique, get a series of puzzles positioned so that technique is the next step, with the mentor checking the answer.
- Checking modes: let the player choose between immediate rejection of wrong entries (today), highlighting conflicts only, or no checking at all for a pure experience.
- Daily puzzle: one vetted puzzle a day at a chosen difficulty, with the same puzzle for everyone.
- Puzzle generator, so the library is never the limit, with every generated puzzle vetted against the mentor's difficulty analyser.

### Later

- Installable app (PWA) with full offline play.
- Kraken fish and other crosses between the technique families, if a real position ever needs one. Everything else in the standard taxonomy is in the coverage programme above.
- Solve history and personal statistics for signed-in players.
- Shareable puzzle links.
- Localisation.

## 11. Non-goals

- Multiplayer, leaderboards, streaks, or any mechanic designed to create obligation rather than learning.
- Advertising.
- Variants (Killer, Samurai, Jigsaw) until classic Sudoku teaching is complete.
- Automatically solving a puzzle end to end as a feature for players. The auto-solve playback is kept for tests and demonstrations only and has no control in the player-facing product (decided 2026-09-18).

## 12. Risks and open questions

- **`main` and `staging` disagreed about the same screens, and the reconciliation is in progress** (#98). Eight platform-bot commits from work in the Base44 editor sat on `main` only, conflicting in three files the coverage programme had rewritten. Resolved on 26 October by the founder's decision: the Base44 animation is the template, the walk's wording survives, and the desktop pencil button returns. Nothing reaches players until that merge lands. The standing lesson is in docs/HANDOVER.md: check `git log origin/staging..origin/main` at the start of every session, because a bot push to `main` left unmerged for a few days cost three file conflicts in the most heavily rewritten part of the product.


- **Trust in hints.** One wrong hint costs more trust than a hundred right ones earn. Every new technique ships with solution-checked tests before it ships to players.
- **Explanation quality at scale.** Plain-language explanations are hand-written per technique. Adding techniques means adding explanations, tests, and reference text together; a technique with only an engine is not done.
- **Base44 dependency.** Auth, saved puzzles, and solve records live in Base44. The core play-and-learn loop must keep working without it, which is the case today.
- **`main` is the deploy branch, and the platform writes to it.** Base44 only sees what is on `main`, so every change lands there, and the platform's own bot pushes boilerplate (auth templates and the like) straight to `main` without a pull request (decided 2026-09-18: this is by design, not to be blocked). Two consequences: CI must tolerate the platform's generated files, and a file the platform generates cannot be deleted for good. Our own work goes through pull requests to `staging`, is verified on the staging server, and reaches `main` only as a release (docs/STAGING.md).
- **Data scoping.** Saved puzzles and solve records are per player. The rules that enforce that live in the Base44 dashboard, not in this repository, and need to be verified whenever the schema changes.
- **Open question: what does learning look like on a phone?** Decided 2026-09-18: the phone stays No Assist for now, and tablets get the full lesson. The desktop hint card may be the wrong shape for a phone; the answer might be shorter hints, a nudge-only mode, or something else. This is a Next item, not a layout tweak.
- **Open question: how much difficulty labelling to expose?** Players like shelves; the analyser can give a finer rating. Finer ratings may be more honest and more confusing.

## 13. Decision log

Short record of product decisions and why, newest first.

- 2026-10-26: The hint animation the founder built in the Base44 editor is the template, and every technique's animation follows it as far as possible. The board is the stage, the caption and the playback controls sit under the puzzle, and the picture builds one increment at a time. Reason: the founder's call between two answers that arrived within hours of each other, his animation on `main` and the coverage programme's in-card walk on `staging`. His is the better shape: the board is where the proof lives, and a list inside the card competes with the lesson text beside it. The walk's contribution survives as the words, which are the expensive part and already tested. Spec in docs/specs/hint-animation.md, issue #97; it adds captions that follow the Beginner or Expert level and respect for reduced motion, which neither version had.
- 2026-10-26: The desktop pencil button returns to the digit strip, against the platform bot's removal of it. Reason: one strip with the same controls at every width is a decision of 18 September, and `Shift`+digit is a shortcut with no visible affordance, so a desktop player with a mouse had no way to place a pencil mark at all. The shortcut stays and is listed under Keyboard shortcuts. If the removal was deliberate, the founder says so and this reverts.
- 2026-10-26: A full handover document, docs/HANDOVER.md, for the project moving to a different Claude account. It carries what no other file states: how work is dispatched and verified, the verification gap on the coverage programme, the standing decisions not to re-litigate, and the process failures worth not repeating.
- 2026-10-25: The coverage programme is complete on `staging` and the library has no trial steps left: 1303 of 1303 solve-path steps are explained by a named technique, where the Ultimate shelf used to answer 41 of them by trial. The catalog went from 16 techniques to 61 in a day. The two promises that used to pull against each other, every hint a lesson and every hint honest, no longer do on any library puzzle. Three things stand between this and players: `main` has diverged (section 12), nobody has played any of it, and the shelf re-cut is outstanding.
- 2026-10-24: A proof by cases is presented as a deduction, and only trial and error carries the what-if card. The Forcing tier holds five techniques that check every option; What-if is Hypothesis Mode alone and says that only one candidate was tested. Reason: grouping them told the player that a proof was guesswork, which undersold the mentor and blurred the honesty promise the grouping was meant to protect. Amends the hint card states spec rather than contradicting it: the state is unchanged and fewer steps use it.
- 2026-10-24: Another error in my own spec, the third of the programme: the Double Forcing Chain definition described refuting a single assumption, which is Hypothesis Mode's shape, while the same spec's table put the technique on the proved-by-cases side. The developer built the exhaustive form and said why. Corrected. Recorded because three spec errors in one programme is a pattern: I was writing techniques' shapes from memory instead of from a worked example.
- 2026-10-24: The forcing net's depth limit is five, and it is a measurement rather than a preference: five is the lowest depth at which the mentor can name every step of every library puzzle, and at four Platinum Blonde cannot be finished. Search also lost its "Go Deeper" control, because an unbounded depth makes a solver rather than a mentor; when a search finds nothing it now says it stopped at its own limit on purpose, which is not the same as there being nothing to find.
- 2026-10-24: What a player downloads before the first board becomes its own piece of work (#91, docs/specs/first-board-payload.md), and the CI bundle number is not to be nudged again. Reason: the uniqueness family pushed the build past its 900 kB budget and the developer raised it to 1 MB, flagging it rather than slipping it through. The real fault is the measure: it sums every chunk, so lazy loading cannot move it, while every technique engine and 61 kB of reference prose load before a player can place a digit. Section 8 promises a digit within ten seconds on a phone, and that bar was eroding one batch at a time. The fix is to budget the entry chunks and load the rest on demand.
- 2026-10-24: A puzzle with more than one answer is played rather than refused, with the uniqueness family switched off for it and the reason shown. Reason: the guard this batch had to build could have been a refusal, and playing the grid is the better product: the player learns their photo or their typing is ambiguous, which is useful, and everything else the mentor knows still works. Erasing a pencil mark some answer needs still counts as a mistake, the conservative side, so the mentor never reasons from a candidate set missing truths.
- 2026-10-24: Two errors in my own uniqueness spec, found by the developer implementing it: the Type 2 description was Type 1's shape, and Type 5 as written could never eliminate anything, since diagonal corners of a two-box rectangle share no unit. Both corrected in the spec. Recorded because a spec that is wrong in the detail costs a developer real time, and the pattern to watch is me writing a technique's shape from memory rather than from a worked example.
- 2026-10-24: The library, not the engine, is now the binding constraint on teaching, and it gets its own measure and its own spec (#88, docs/specs/teaching-coverage.md). Reason: the mentor knows 31 techniques and the library teaches 21 of them; X-Wing, the most famous technique beyond the singles, is taught by none of the twenty puzzles, and six techniques rest on a single puzzle each. A mentor that knows fifty-five techniques and teaches twenty is not a better teacher, so every batch of the programme makes this ratio worse until puzzles arrive. The target is every technique taught by at least two puzzles; the analyser is the gate that vets a candidate puzzle.
- 2026-10-24: The hint's ten-node cap on a chain stands, and the Techniques panel is aligned to it rather than to the Scan's sixteen. Reason: raised in #67, where the panel could count a chain the hint would refuse to teach, which reads as the product contradicting itself. Ten nodes is already at the limit of what a person can follow, and coverage for its own sake is not the goal: the remaining positions are better served by the forcing batch's proofs by cases than by a fourteen-link chain. Scan may still look deeper and says what it found, but it does not advertise a lesson the mentor will not give.
- 2026-10-24: "What this puzzle teaches" is accepted as a label that moves. Devil's Den's hardest step has changed three times in a day as the mentor improved, and it will change again. Reason: the label describes what the mentor will show you on that puzzle today, not a property of the puzzle, and that is the honest reading. The shelf stays the stable promise about difficulty, and the end-of-programme recalibration is where shelves move.
- 2026-10-24, corrected the same day: with Empty Rectangle on the ladder, XYZ-Wing is reduced to a single step on a single puzzle, step 18 of Swordfish Hunt. My first record of this said no puzzle reached it at all; that was wrong, and the never-taught report (#83) corrected it. The per-shelf table names only each puzzle's hardest technique, so a technique taught once mid-path was invisible in every report we had. The substance held: one step on one puzzle is as good as nothing for a player who never opens that puzzle. The ladder order stays as it is. Reason: Empty Rectangle is the easier pattern to spot, so "easiest technique that applies" rightly prefers it; the problem is that twenty puzzles cannot exercise fifty-five techniques. The analyser will report which techniques the library never teaches (#83), which turns "add more puzzles" into a list of exactly which ones. Technique practice mode is the other half of the answer.
- 2026-10-24: Colouring steps, X-Cycle and 3D Medusa, stay un-walkable until the chain batch builds the replay they share (#82). Reason: chains need the same thing, and one implementation serving both beats two half ones. Recorded as an exception in the programme bar rather than left as a silent gap.
- 2026-10-24: Sashimi fish are one rung, not one per size, and Finned X-Wing now reports only the occupied-corner case. Reason: the shape a player looks for is the same at every size, and one pattern should never carry two names in the Techniques list.
- 2026-10-24: Shelf assignment is recomputed once, deliberately, at the end of the coverage programme, not batch by batch. Reason: each batch can make a puzzle solvable by an easier rung, and re-cutting the shelves seven times would move puzzles under players who are partway through them and would make best times hard to compare. Batches note what they found and score a new technique's difficulty so today's shelves still hold; #70 did exactly that with XYZ-Wing. The re-cut is a product decision with the analyser's numbers in hand.
- 2026-10-24: In No Assist the Techniques list stays readable but inert: no counts, no Scan, no Search, and a line saying so, while every reference dialog can still be opened. Reason: reading how a technique works is studying, not being helped, and a player who wants a clean timed solve is not assisted by a page of explanation. Raised by the developer in #71 and agreed; section 7.5 updated.
- 2026-10-24: Coverage baseline recorded: 1204 of 1245 library solve-path steps are named, 96.7%, with Easy through Diabolical at 100% and all 41 remaining what-if steps on the Ultimate shelf. The difficulty analyser in #71 prints it in the test run, so the programme is judged by a measured number rather than an impression. It also replaces the hand-written shelf labels, which were an assumption.
- 2026-10-24: Full technique coverage goes into Next as a programme of seven batches, on the founder's decision to cover everything rather than trim scope. Reason: above XY-Wing the ladder stops, so the Diabolical and Ultimate shelves answer most hints with what-if search, which is honest and teaches nothing. The two promises, every hint a lesson and every hint honest, currently pull against each other, and coverage is how they stop competing. About forty techniques, taking the product from sixteen to roughly fifty-five. Programme spec in docs/specs/technique-coverage.md, issue #69, one spec and one issue per batch. Three things the programme decides on the way: uniqueness techniques may only fire on a puzzle known to have one solution, because a wrong uniqueness hint on an imported photo is the most damaging error the mentor could make (#74); the Techniques panel and its live counts are rebuilt before the bulk of the techniques arrive, because neither survives fifty-five names (#71); and a proof by cases stops being presented as a guess, so the what-if styling narrows to Hypothesis Mode alone (#75). Earlier the same day the chain spec deliberately deferred grouped nodes, continuous loops and ALS nodes; that was reversed by the same decision and they are in scope.
- 2026-09-19: First release of the UX pass from `staging` to `main` (PR #61), on the founder's "release". `main` had not moved since `staging` branched, so nothing from the platform bot had to be folded in first. What it carries: the seven UX-pass specs (#28 to #34), the three follow-ups (#53 to #55), the startup fix (#42), the staging plumbing (#40) and the docs. Merging to `main` does not publish: the Base44 checkpoint is deployed as a separate step, and the five Base44-dependent features are spot-checked on the live app after that. Section 7 now describes what is on `main`.
- 2026-09-19: The UX pass is complete on `staging` and verified: all seven specs and the three follow-ups shipped (PRs #46 to #52 and #57 to #59), each verified from the player's side on a build identical to the staging bundle. Section 7 now describes this product. Ready for the first release from `staging` to `main` on the founder's go; the checklist in docs/STAGING.md applies (CI green, play-and-learn loop verified on staging, the five Base44-dependent features spot-checked on the live app after deploy).
- 2026-09-19: Six of the seven UX-pass specs shipped to `staging` in one evening (PRs #46 to #51) and were verified from the player's side on a build identical to the staging bundle. Verified: the lesson is on screen without scrolling at 1366x768; one digit strip everywhere; designed hint card states; one adaptive page with side and bottom sheets; a header in words with one menu; the paper theme. Three follow-ups filed (#53 tour click-through arms a digit, #54 only-singles state on Easy puzzles, #55 strip below the fold). Section 7 still describes the released product on `main`; it is rewritten at the first release of the UX pass.
- 2026-09-19: The "nothing left" hint state is narrowed to "only singles left": it appears only when every remaining empty cell shows exactly one pencil mark, and never before the player has seen a single lesson on the puzzle. Reason: the first version told a learner on an Easy puzzle there was nothing to teach at the first press of Hint, while the board showed cells with three pencil marks. Singles are the learner's lesson.
- 2026-09-19: Staging is live at https://sdm.pilia.net and verified from the product manager's session. Finding on the way: startup waits on the platform with no time limit, so a hanging connection leaves the player on a spinner; filed as issue #42 with the fix expected before the UX pass lands on staging.
- 2026-09-19: A staging server, without Base44, becomes where work integrates and is verified; `main` only receives releases. Reason: the developer session was blocked on Base44 permissions for everyday work, and half-finished work was landing on the deploy branch. The builder stays in the cloud; the server is a passive deploy target that pulls `staging`. Rules in docs/STAGING.md.
- 2026-09-18: One adaptive page replaces the separate desktop and mobile pages. Reason: only the wide desktop page teaches today; tablets and narrow windows get the least. Spec: docs/specs/one-adaptive-page.md.
- 2026-09-18: The phone keeps No Assist (timed, no hints) for now. Reason: learning on a phone may need different capabilities than a shrunken hint card; we will find better ways to teach on the phone as we go rather than force the desktop lesson onto a small screen. Open question in section 12.
- 2026-09-18: A light "paper" theme ships now, alongside dark. Reason: many players come from newspaper puzzles and play in daylight. Spec: docs/specs/paper-theme.md.
- 2026-09-18: All secondary header actions move behind one hamburger menu; No Assist becomes a labelled switch. Reason: seven unlabelled icons competed with the board. Spec: docs/specs/header-and-menu.md.
- 2026-09-18: Auto-Solve is removed from the player-facing product. Reason: automatic solving is a non-goal; the playback engine stays for tests and demonstrations only. Spec: docs/specs/lesson-first-panel.md.
- 2026-09-18: The welcome tour modal is replaced by in-context prompts shown once, at the moment each is useful, plus a "How to play" menu item. Reason: research on onboarding overlays (Nielsen Norman Group and onboarding vendors' completion figures) finds tours are dismissed and forgotten, while in-context guidance is retained; our tour also blocked the board on arrival. Spec: docs/specs/inline-onboarding.md.
- 2026-09-18: A full UX/UI pass comes before any new capability, and nothing in the current layout is protected. Reason: the first product review found the lesson off-screen on the most common laptop size and the phone unable to teach; the founder chose to fix the experience as a whole rather than patch it feature by feature. See the UX review.
- 2026-09-18: First product review recorded (docs/reviews/2026-09-18-product-review.md). Top finding: the hint explanation is below the fold at 1366x768 and cut off at 1920x1080. Recommendation to the developer: make the lesson visible without scrolling on every desktop width.
- 2026-09-18: Beginner explanations are the default and use R5C3 notation with a legend. Reason: long-form "row 5, column 3" made explanations harder to scan, and the notation is learnable in one line.
- 2026-09-18: Wrong entries flash the refused digit in red. Reason: sound-off players had no feedback at all.
- 2026-09-18: New visitors get an easy or medium starter puzzle and a three-step tour. Reason: the previous random first puzzle was often too hard and the first hint was often a what-if search, which taught nothing.
- 2026-09-18: Text puzzle entry works without an account. Reason: sign-in must not gate the core loop.
- 2026-09-18: The Ultimate shelf is labelled as needing what-if search. Reason: honesty about what the mentor can teach.
- 2026-08: Puzzle shelves are calibrated against the mentor's own difficulty analyser. Reason: a "hard" puzzle that the mentor solved with singles was mislabelled, and vice versa.

## 14. Glossary (product terms)

- **Candidate / pencil mark**: a small digit noting that a cell could still be that number.
- **Technique**: a named, deductive pattern that yields a placement or eliminations with certainty.
- **What-if search**: reasoning by assuming a value and following consequences; correct, but not a pattern a person spots.
- **Shelf**: a difficulty level in the library.
- **No Assist**: play with all help disabled; the only mode in which times are recorded.
- **Beginner / Expert**: the two explanation levels.
