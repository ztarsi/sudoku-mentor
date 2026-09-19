# One adaptive page

Issue: [#31](https://github.com/ztarsi/sudoku-mentor/issues/31). Roadmap bucket: Now (UX pass, phase 3). Source: [UX review](../reviews/2026-09-18-ux-review.md) sections 3.2, 4.B to 4.D, 5.2. Founder decisions, 18 Sep 2026: one adaptive page; the phone keeps No Assist for now. Player served: every player on a tablet or a narrow window; phone players get consistency, not hints yet.

## The player problem

There are three experiences. A wide desktop window teaches. A narrow window colours the board on Hint and hides the explanation in a drawer, under the hierarchy. Tablets in landscape get the desktop page with the Hint button off-screen and no keyboard for H. Tablets in portrait and phones get a separate page with no hints, no pencil marks on load and no technique reference. A tablet, the largest touch screen, gets the least.

## The outcome we want

One page that arranges itself by width and pointer, so that everything the desktop teaches, every screen above phone size can teach too. The phone stays a clean "just play" surface for now, with the same board, strip and header as everything else.

## Done, from the player's side

- **Wide** (about 1200px and up): board and digit strip on the left, lesson panel on the right (lesson-first panel spec).
- **Medium** (about 800px to 1200px, mouse or touch, including tablets in landscape): the same two columns with a smaller board. Where both do not fit, the lesson panel is a side sheet that opens on Hint and can be pinned open. Hint is a visible button, not only a key.
- **Stacked** (about 600px to 800px, including tablets in portrait): one column, board over the digit strip, the board capped so the strip stays within thumb reach. Hint is on the strip. A hint opens a bottom sheet over the lower part of the screen; the board scrolls or shrinks so the hint's cells stay visible above it. The sheet holds the same hint card with the same states.
- **Phone** (under about 600px): the stacked arrangement without the lesson. No Assist stays on, clearly labelled in words ("No Assist: timed, no hints"), with the timer visible. Pencil marks, the strip, Undo, Erase and the status strip (progress, errors) are all present.
- There is no separate mobile page or URL. Opening any old link lands on the one page.
- The saved game, the explanation level and the collapsed-or-open Techniques choice carry across arrangements, so resizing a window or rotating a tablet never loses state.
- The technique reference dialog and the library work at every width with no horizontal scrolling.

## Out of scope

- Hints on phone-width screens. That is a separate track: "learning on the phone" in the roadmap's Next bucket.
- Offline play and installability (Later).

## How we will know it worked

- Walk the improver journey (load a Hard puzzle, ask for a hint, read it, place the digit yourself) on a laptop at 1366x768, a tablet in both orientations and a phone; every step works without scrolling to find the lesson, except on the phone where the lesson is not offered.
- Once analytics exist: the share of sessions on tablets that use a hint should approach the desktop share.

## Outcome

Shipped in PR #49 to `staging` on 2026-09-19; verified the same day by the product manager on a production build identical to the staging bundle (`index-DZL13nsI.js`). Wide (two columns), medium 900x800 (side sheet on Hint, board shrinks clear of it), stacked 768x1024 touch (Hint on the fixed strip, bottom sheet), iPad portrait (side sheet) and phone 390 (no lesson, "No Assist: timed, no hints" with a timer, pencil marks on load, no horizontal scroll, H inert) verified. Open: at 900x800 the strip's Hint button is below the fold (#55). Follow-up closed 2026-09-19: the strip and its Hint button fit the viewport at 900x800 (#55, PR #59).
