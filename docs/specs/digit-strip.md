# One digit strip

Issue: [#29](https://github.com/ztarsi/sudoku-mentor/issues/29). Roadmap bucket: Now (UX pass, phase 1). Source: [UX review](../reviews/2026-09-18-ux-review.md) sections 3.5, 5.1 principle 4, 5.5. Player served: all three, the learner most.

## The player problem

Input works differently on each surface for no player reason. On desktop the player clicks a cell and types; Focus Mode is a separate full-width card with nine digit buttons and counts. On the phone the same nine digits are the input bar, and pencil marks need a mode switch plus a pad. A player who moves between a laptop and a phone learns two products.

## The outcome we want

One strip of the nine digits under the board on every device. It is the way to enter digits, the way to add pencil marks, and the way to focus on a digit, and it behaves the same everywhere.

## Done, from the player's side

- Under the board, on every width, a strip of digits 1 to 9, each showing how many are placed and greying out when all nine are in.
- Two habits both work everywhere: tap a digit then cells (digit-first), or select a cell then tap or type a digit (cell-first). A selected digit stays selected until the player taps it again or presses Escape.
- Selecting a digit with no cell selected highlights that digit and its candidates on the board. This replaces Focus Mode; the Focus Mode card goes.
- A pencil toggle on the strip switches the strip between placing digits and toggling pencil marks. Holding Shift on a keyboard does the same while held. The separate phone pencil-mark pad goes once the strip handles pencil marks in place.
- Undo, Redo and Erase are on the strip as labelled buttons, at least 44px tall. Clear the board is not on the strip (see the header spec).
- Digit buttons are at least 44px square on touch devices; nine fit at 360px wide.
- Keyboard behaviour on desktop is unchanged: digits, Shift+digit, arrows, Backspace, H, A, Z, Escape all work as today.
- Wrong entries still flash red and count; the strip briefly says which digit was refused and where ("4 can't go in R2C1").

## Out of scope

- The hint card, the header, the panel order, phones' hint sheet.
- Changing the board's own rendering.

## How we will know it worked

- A first-time visitor places a digit within ten seconds on phone and desktop without reading anything (quality bar, section 8).
- The desktop and phone tours (or their replacement) describe one input model, not two.
- Once analytics exist: wrong-entry rate per puzzle should not rise after the change.
