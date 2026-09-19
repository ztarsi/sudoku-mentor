# Hint card states

Issue: [#30](https://github.com/ztarsi/sudoku-mentor/issues/30). Roadmap bucket: Now (UX pass, phase 2). Source: [UX review](../reviews/2026-09-18-ux-review.md) sections 3.4, 5.3; [product review](../reviews/2026-09-18-product-review.md) item 4. Player served: the improver and the learner; the enthusiast for the what-if and solved states.

## The player problem

The hint card has one look for every situation. A what-if search result is headed "Technique Found!" in green like a Naked Single, so the honesty promise is invisible at a glance. Pairs and triples show only their first digit in the "Digit" pill. The legend always reads "R5C3 means row 5, column 3" whatever cell the hint is about. After a hint there is nothing to press except H again, and after a solve the card says nothing about what was learned.

## The outcome we want

Each situation the player can be in has its own clear card, and the card always offers the next sensible action. The honesty promise is visible without reading: a deduction and a trial look different.

## Done, from the player's side

| State | What the player sees |
| --- | --- |
| Idle | One line, "Stuck? Ask for a hint," and the Hint button. |
| Found (deduction) | The technique name and tier as the heading. Chips for every digit involved (a Naked Pair on 1 and 2 shows both; eliminations show the digit erased). Look / Why it works / What to do at the chosen level. Buttons: Apply, Next hint. The legend names a cell from this hint. |
| What-if | A visibly different heading and colour, wording along the lines of "No named technique applies. Reasoning by trial." Then the chain replay as today. Same buttons. |
| Searching | "Looking for a what-if chain..." with Cancel, inside the same card. |
| No Assist | The card shows the timer and "Hints are off in No Assist." |
| Solved | The techniques this puzzle used, marking the ones the player placed themselves. Time and errors. "Next puzzle on this shelf" and "Try the shelf above". |
| Only singles left | Appears only when every remaining empty cell shows exactly one pencil mark, and never before the player has seen at least one single lesson on this puzzle. Wording: "Only singles left. Every empty cell now shows a single pencil mark; write them in to finish." Button "Show me the next one" behaves as a normal hint. Until then, Hint keeps explaining Naked and Hidden Singles as lessons like any other technique. (Amended 2026-09-19, issue #54: the first version fired on Easy puzzles from the first hint.) |

- Graduated hints (roadmap) will add a Nudge state later; the design leaves room for it but this spec does not build it.
- Beginner remains the default level; the choice is remembered as today.
- The same states appear wherever the card appears (desktop panel, side sheet, bottom sheet).

## Out of scope

- The graduated-hint nudge itself.
- Panel position (lesson-first panel spec) and the phone (one adaptive page spec).
- New explanation text for techniques.

## How we will know it worked

- A reader who has never used the product can tell a deduction card from a what-if card from across the room.
- Every pair and triple hint on the library shelves shows all of its digits (checkable with the solution-oracle test run).
- Once analytics exist: hint-to-apply ratio should rise; "Next hint" presses replace repeated H presses.

## Outcome

Shipped in PR #48 to `staging` on 2026-09-19; verified the same day by the product manager on a production build identical to the staging bundle (`index-DZL13nsI.js`). Idle, found (all digits as chips, Apply, Next hint, per-hint legend), No Assist (clock, no hint button) and solved (techniques used, next puzzle on this shelf, try the shelf above) verified as specified. Open: the "nothing left" state fired on Easy puzzles from the first hint and hid the singles lesson; the state's rules were amended below and the change is #54.
