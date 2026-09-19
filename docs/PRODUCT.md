# Sudoku Mentor: Product Definition

This document says what Sudoku Mentor is, who it is for, what it promises, and how we decide what to build. It deliberately does not say how anything is built; that lives in the README and the code. Keep this file current: when the product changes, change this first.

Owner: the product manager. Last reviewed: 2026-09-18.

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

### 7.1 Playing

- A 9x9 board with pencil marks (candidates) that are filled in automatically when a puzzle loads and maintained as digits are placed.
- Desktop input: click a cell, type a digit; click a pencil mark to place it; hold Shift to work on pencil marks; keyboard shortcuts for every action.
- Mobile input: pick a digit, tap cells; a candidate mode with a numpad; undo and erase within reach of a thumb.
- Wrong entries are refused with a red flash of the refused digit, a sound, a screen-reader announcement, and an error count.
- Undo and redo across every move, including applied hints.
- The game in progress is saved locally and resumed on the next visit.

### 7.2 Learning

- **Hint** finds the easiest technique that applies right now, highlights its cells, and explains it. Explanations come in two levels, Beginner (plain words, Look / Why it works / What to do) and Expert (standard terminology plus a glossary), and the choice is remembered.
- **Apply** performs the hinted step as a single undoable move.
- **Technique hierarchy** shows every technique the mentor knows, in teaching order, with live counts of how many instances are on the current board. Any instance can be highlighted.
- **Learn this technique** opens a reference for each technique: in plain words, the formal version, how to find it, and an example.
- **Scan** searches the board for the expert-level patterns that are too slow to check on every move.
- **What-if search** (forcing chains and hypothesis testing) is available when no named technique applies, clearly labelled as reasoning by search rather than by pattern, with a step-by-step replay of the chain.
- **Focus a digit** to see only where it can go.

### 7.3 Puzzles

- A built-in library of vetted puzzles on six shelves: Easy, Medium, Hard, Expert, Diabolical, Ultimate. Each shelf is calibrated against the techniques the mentor can actually explain, and the Ultimate shelf is labelled as needing what-if search.
- New visitors start on an easy or medium puzzle with a short welcome tour.
- Any puzzle can be pasted as 81 digits. Signed-in players can also photograph a puzzle, and their puzzles are kept in a personal library.

### 7.4 Competing

- **No Assist mode** disables all help and records a clean solve time per puzzle for signed-in players. Best times appear in the library.
- The mobile page is always No Assist: it is the "just play" surface.

### 7.5 Account

- Optional sign-in. Adds: saved puzzles, solve records, and personal colour preferences.

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

1. [Lesson-first panel](specs/lesson-first-panel.md): the hint card first in the column, Techniques collapsed under it, Auto-Solve removed, shortcuts to the menu.
2. [One digit strip](specs/digit-strip.md): one input strip under the board on every device; absorbs Focus Mode and the phone pad.
3. [Hint card states](specs/hint-card-states.md): a designed card for idle, found, what-if, searching, No Assist, solved and nothing-left.
4. [One adaptive page](specs/one-adaptive-page.md): wide, medium, stacked and phone arrangements of one page; the mobile page goes.
5. [Header and menu](specs/header-and-menu.md): puzzle, progress and errors on every width; No Assist as a labelled switch; everything secondary behind a hamburger menu.
6. [Paper theme](specs/paper-theme.md): a light theme next to dark, switchable and remembered.
7. [Inline onboarding](specs/inline-onboarding.md): three in-context prompts instead of the tour modal.

Then:

- Analytics on the five measures above, privacy-respecting and off by default for signed-out players until we decide otherwise.
- Graduated hints: a nudge ("look at box 4") before the full step, so the player gets a chance to find it themselves. Becomes a state of the hint card.

### Next

- [Library and completion](specs/library-and-completion.md): library rows that say what a puzzle teaches and where you left off; completion that shows what you learned and offers the next puzzle.
- More vetted puzzles on the Hard, Expert and Diabolical shelves (today one, two and two). The improver runs out in a sitting.
- Learning on the phone: what teaching looks like on a phone-sized screen, which may not be the desktop hint card. The phone stays No Assist until this is answered.
- Technique practice mode: pick a technique, get a series of puzzles positioned so that technique is the next step, with the mentor checking the answer.
- Checking modes: let the player choose between immediate rejection of wrong entries (today), highlighting conflicts only, or no checking at all for a pure experience.
- Daily puzzle: one vetted puzzle a day at a chosen difficulty, with the same puzzle for everyone.
- Puzzle generator, so the library is never the limit, with every generated puzzle vetted against the mentor's difficulty analyser.

### Later

- Installable app (PWA) with full offline play.
- More techniques with explanations: XY-Chain, W-Wing, Skyscraper, Two-String Kite, Sue de Coq, Unique Rectangle types 2 to 4.
- Solve history and personal statistics for signed-in players.
- Shareable puzzle links.
- Localisation.

## 11. Non-goals

- Multiplayer, leaderboards, streaks, or any mechanic designed to create obligation rather than learning.
- Advertising.
- Variants (Killer, Samurai, Jigsaw) until classic Sudoku teaching is complete.
- Automatically solving a puzzle end to end as a feature for players. The auto-solve playback is kept for tests and demonstrations only and has no control in the player-facing product (decided 2026-09-18).

## 12. Risks and open questions

- **Trust in hints.** One wrong hint costs more trust than a hundred right ones earn. Every new technique ships with solution-checked tests before it ships to players.
- **Explanation quality at scale.** Plain-language explanations are hand-written per technique. Adding techniques means adding explanations, tests, and reference text together; a technique with only an engine is not done.
- **Base44 dependency.** Auth, saved puzzles, and solve records live in Base44. The core play-and-learn loop must keep working without it, which is the case today.
- **`main` is the deploy branch, and the platform writes to it.** Base44 only sees what is on `main`, so every change lands there, and the platform's own bot pushes boilerplate (auth templates and the like) straight to `main` without a pull request (decided 2026-09-18: this is by design, not to be blocked). Two consequences: CI must tolerate the platform's generated files, and a file the platform generates cannot be deleted for good. Our own work still goes through pull requests and CI before it reaches `main`.
- **Data scoping.** Saved puzzles and solve records are per player. The rules that enforce that live in the Base44 dashboard, not in this repository, and need to be verified whenever the schema changes.
- **Open question: what does learning look like on a phone?** Decided 2026-09-18: the phone stays No Assist for now, and tablets get the full lesson. The desktop hint card may be the wrong shape for a phone; the answer might be shorter hints, a nudge-only mode, or something else. This is a Next item, not a layout tweak.
- **Open question: how much difficulty labelling to expose?** Players like shelves; the analyser can give a finer rating. Finer ratings may be more honest and more confusing.

## 13. Decision log

Short record of product decisions and why, newest first.

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
