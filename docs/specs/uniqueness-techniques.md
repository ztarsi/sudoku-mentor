# Uniqueness techniques

Issue: [#74](https://github.com/ztarsi/sudoku-mentor/issues/74). Roadmap bucket: Next, part of the [coverage programme](technique-coverage.md) (#69). Player served: the enthusiast, and every player who types in or photographs a puzzle, who is protected by the guard this batch builds.

The shared bar for every batch is in the [programme spec](technique-coverage.md).

## The player problem

Unique Rectangle Type 1 and BUG+1 are in the engine. The rest of the family is missing, and types 2 and 3 are more common than type 1, so the mentor knows the rarer case and not the usual ones. A player who has read the Type 1 explanation, which turns on the fact that a real puzzle has one answer, is ready for every other technique that uses the same fact.

There is a second problem, and it is the reason this batch is sequenced late. Every technique in this family is only valid if the puzzle really does have exactly one solution. The library is vetted, so there it holds. A puzzle typed in by hand or imported from a photo may have two solutions or none, and on such a grid a uniqueness hint is not a hint, it is a wrong answer. The product's own rule is that one wrong hint costs more trust than a hundred right ones earn. Today that risk is small because Type 1 and BUG+1 fire rarely. After this batch it would be the most likely way for the mentor to be wrong.

## The guard, which is the first thing this batch builds

- Before any uniqueness technique may fire on a grid, the puzzle must be **known to have exactly one solution.** The product already has a solver; counting solutions and stopping at two is enough to establish it.
- The check runs **once per puzzle**, on the givens, not per hint, and the answer is remembered with the puzzle. It must not cost the player a pause on every hint.
- For library puzzles the answer is known in advance and stored with the puzzle, so no check is needed at play time.
- Where a puzzle turns out to have more than one solution, the mentor **says so plainly** and keeps playing. The player is told their grid has more than one answer, which is useful information about their photo or their typing, and uniqueness techniques are then switched off for it. Every other technique still works.
- Where uniqueness is off, the Techniques list shows the uniqueness tier as unavailable with the reason, rather than showing counts of zero.
- No uniqueness hint may ever be shown on a grid whose solution count is unknown.

## The techniques

| Name | What it is | Tier |
| --- | --- | --- |
| Unique Rectangle Type 2 | Four corners in two rows, two columns and two boxes; three are the same bare pair, the fourth has the pair plus one extra digit. That extra digit must be true somewhere, so it goes from every cell seeing both of the two cells that could hold it. | Ultimate |
| Unique Rectangle Type 3 | The fourth corner's extra digits form a subset with other cells in its unit. The subset's digits go from the rest of that unit. | Ultimate |
| Unique Rectangle Type 4 | A pair digit has only two places in one of the rectangle's units, both inside the rectangle. The other pair digit goes from those two corners. | Ultimate |
| Unique Rectangle Type 5 | Two diagonally opposite corners hold the extra digit; the eliminations follow as in Type 2. | Ultimate |
| Unique Rectangle Type 6 | A pair digit is confined to the rectangle's diagonal, so it goes from the two corners on that diagonal. | Ultimate |
| Hidden Unique Rectangle | The rectangle is read through strong links rather than bare pairs. | Ultimate |
| Avoidable Rectangle types 1 and 2 | The same argument over cells the player has already filled, so the deadly pattern is avoided rather than broken. | Ultimate |
| BUG+2, BUG+3 | The bivalue universal grave with two or three extra candidates instead of one. | Ultimate |
| Unique loops | The rectangle argument over six, eight or more cells forming a loop across two digits. | Ultimate |

Teaching order: the Unique Rectangle types in numerical order after Type 1, then Hidden UR, then the Avoidable Rectangles, then the BUG variants after BUG+1, then unique loops last.

## Done, from the player's side

- The guard above is in place before any of these techniques can fire, and there is a test that proves a uniqueness technique never fires on a grid with two solutions.
- Each type's plain wording leans on the Type 1 explanation the player has already read: the deadly pattern, the two answers it would allow, and therefore what cannot be true. The difference between the types is the shape of the fourth corner, and the wording says that in those terms.
- The card draws the rectangle as a rectangle, with the three matching corners and the odd one marked differently, so the shape is visible at a glance.
- Avoidable Rectangles make clear that the argument runs over digits the player has already placed, which is a different feeling from the other types and worth one sentence.
- The reference entry for every type names the assumption out loud: this technique works because the puzzle has one answer. Players should know which of their tools depend on that.
- All of them appear in the Techniques list in the Ultimate tier, with the tier showing as unavailable and why, on a grid where uniqueness is not established.

## Out of scope

- Proving uniqueness for a grid the solver cannot settle quickly. If the count does not finish inside the hint budget, uniqueness stays off and the mentor says so. It does not guess.
- Non-standard deadly patterns beyond the loops described here.
- Changing how photo import or text import work, beyond reporting what the solution count found.

## How we will know it worked

- A test suite of grids with two solutions, on which no uniqueness technique may fire. This is the test that matters most in the batch.
- Shelf report from the oracle run: the previously unexplained steps these types now name, on Diabolical and Ultimate.
- A player who imports a photo of an ambiguous puzzle is told it has more than one answer, instead of receiving a confident wrong hint. That is the real outcome of this batch.
