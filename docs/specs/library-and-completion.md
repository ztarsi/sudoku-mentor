# Library and completion

Issue: [#35](https://github.com/ztarsi/sudoku-mentor/issues/35). Roadmap bucket: Next (UX pass, phase 4, after the Now specs). Source: [UX review](../reviews/2026-09-18-ux-review.md) sections 4.A5, 4.A7, 5.5; [product review](../reviews/2026-09-18-product-review.md) items 2 and 3 and the smaller notes. Player served: the improver, who chooses what to learn next and needs somewhere to go after a solve.

## The player problem

The library shows a name, a clue count and Play. It does not say what a puzzle will teach, whether the player has done it, or where they left off. Two Easy puzzles are named "Nightmare" and "X-Wing Territory"; a first-time visitor landed on the latter. The completion dialog celebrates and shows a time, then offers only Continue; there is no next puzzle, and nothing about which techniques the puzzle used or which the player found themselves.

## The outcome we want

Choosing a puzzle is choosing what to learn, and finishing one leads straight to the next step up.

## Done, from the player's side

- Each library row shows: name, shelf, clue count, and the techniques the mentor's analyser says the puzzle needs ("teaches: Pointing Pair, Naked Triple"). The puzzle in progress shows "Continue" and its progress. Signed-in players see a done mark and their best clean time.
- The Easy shelf's "Nightmare" and "X-Wing Territory" are renamed to fit the shelf.
- The library is reachable by tapping the puzzle name in the header, as well as from Load puzzle.
- Completion shows: the techniques this puzzle used, marking the ones the player placed without Apply; time and errors, with the time shown as a record only for a clean No Assist solve; and two actions, "Next puzzle on this shelf" and "Try the shelf above". Continue stays as the way to just close it.
- Text and photo import keep working exactly as today.

## Out of scope

- More puzzles per shelf (a content task, tracked separately) and the generator.
- Technique practice mode.

## How we will know it worked

- A player can say, before loading, which technique a Hard puzzle will make them use.
- Once analytics exist: level progression (section 9, measure 3) and the share of completions followed by another puzzle in the same session.
