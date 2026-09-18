# Lesson-first panel

Issue: [#28](https://github.com/ztarsi/sudoku-mentor/issues/28). Roadmap bucket: Now (UX pass, phase 1). Source: [UX review](../reviews/2026-09-18-ux-review.md) sections 3.1, 3.3, 5.2, 5.5. Player served: the improver first, then the learner.

## The player problem

On a laptop or desktop the hint explanation is the third thing in the right column, under a 540-pixel Technique Hierarchy that is open by default. At 1366x768 the whole explanation is below the fold when the hint fires; at 1920x1080 the "What to do" section is. The player asked for a lesson and has to scroll to find it. Auto-Solve and Keyboard Shortcuts sit in the same column at the same weight as the lesson.

## The outcome we want

When a hint fires on any desktop or laptop width, the player reads Look, Why it works and What to do without scrolling, with the board still in view. The panel is about the lesson; the expert tools are one click away, not in the way.

## Done, from the player's side

- The right column starts with the hint card. Nothing sits above it.
- The Technique Hierarchy becomes a "Techniques" section under the hint card, collapsed by default. Opening it is remembered per player. Its counts, Scan and Search stay as they are.
- Auto-Solve is removed from the player-facing product (founder decision, 18 Sep 2026). The playback engine can stay for tests and demonstrations but has no control on the page.
- The Keyboard Shortcuts card leaves the column. Its content is reachable from the menu (see the header spec) and by pressing "?".
- At 1366x768, 1536x864, 1440x900 and 1920x1080, pressing H shows all three explanation sections on screen for a Naked Single, a Pointing Pair and an XY-Wing, without scrolling. Longer explanations (X-Cycle, ALS-XZ, what-if) may scroll inside the panel, never the page.
- Nothing changes on the board or in the header.

## Out of scope

- The content and states of the hint card (separate spec: hint card states).
- Focus Mode and the digit strip (separate spec).
- Phones, tablets in portrait and windows under 1024px (separate spec: one adaptive page).

## How we will know it worked

- Repeat the fold measurement from the UX review at the four sizes above: three sections visible, zero scrolling.
- Once analytics exist: hint-to-apply ratio (section 9 of PRODUCT.md) should rise, because players who can read the hint place the digit themselves.
