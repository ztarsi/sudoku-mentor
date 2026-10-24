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
- Where uniqueness is off, the family's own rows in the Techniques list read as unavailable with the reason, and the tier carries the reason once above them. (Amended 2026-10-24: the first version said the tier was marked unavailable, but the family shares the Ultimate tier with eight techniques that work fine on a grid with two answers, so marking the tier would have been a lie about them.)
- No uniqueness hint may ever be shown on a grid whose solution count is unknown.

## The techniques

| Name | What it is | Tier |
| --- | --- | --- |
| Unique Rectangle Type 2 | Four corners in two rows, two columns and two boxes. Two corners in the same unit carry the pair plus the same single extra digit. One of those two must take the extra, or the rectangle becomes deadly, so the extra digit goes from every cell that sees both. (Corrected 2026-10-24: the first wording described Type 1's shape and Type 2's conclusion.) | Ultimate |
| Unique Rectangle Type 3 | The fourth corner's extra digits form a subset with other cells in its unit. The subset's digits go from the rest of that unit. | Ultimate |
| Unique Rectangle Type 4 | A pair digit has only two places in one of the rectangle's units, both inside the rectangle. The other pair digit goes from those two corners. | Ultimate |
| Unique Rectangle Type 5 | Three corners (or four, or two diagonally opposite ones) carry the pair plus the same single extra digit. The extra goes from every cell that sees all of them. (Corrected 2026-10-24: the first wording said only the diagonal pair, which can never eliminate anything, because diagonal corners of a two-box rectangle share no row, column or box, so no cell sees both.) | Ultimate |
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

## Outcome

Shipped in PR #87 to `staging` on 2026-10-24. The guard went in first, as the spec demanded. Eleven techniques landed: Unique Rectangle types 2 to 6, the Hidden Unique Rectangle, Avoidable Rectangle types 1 and 2, BUG+2, BUG+3 and unique loops. Each plain explanation leans on the Type 1 wording the player has already read, and every reference entry names the assumption out loud. Rectangles are drawn as rectangles and loops as the ring they are.

**The guard is the real outcome.** A grid with two answers is now played rather than refused: the mentor says so plainly, loads it, keeps teaching everything else, and switches this family off for that grid with the reason shown. Wrong-entry checking widens to match, so a digit is refused only when no answer allows it, and a mistake is still caught on the spot. A player who photographs an ambiguous puzzle is told what is wrong with their photo instead of receiving a confident wrong hint, which is exactly what this batch was sequenced late to achieve.

Verified by the product manager on 2026-10-24: lint, typecheck, 638 tests and build pass on `staging`. Coverage held at 97.6% and the Ultimate shelf stayed at 31 what-if steps, because the chain batch had already taken the positions this family would have taken. What it did instead was shorten the paths: Platinum Blonde from 99 steps to 79, and the library's solve paths 19 steps shorter in total, because this family explains in one step what a chain needed several for. Measured against the pre-chain base where the work started, it took the Ultimate shelf from 37 what-if steps to 36.

Four calls the developer made, all accepted:

- **The two spec errors above**, found by implementing them. Type 2 and Type 5 were wrong as written, and Type 5 as written could never have eliminated anything.
- **The family's rows read unavailable rather than the whole tier,** amended above.
- **Erasing a pencil mark on a two-answer grid still counts as a mistake** where some answer needs it. The conservative side: the alternative lets a player prune marks towards one of the two answers, after which the mentor is reasoning from a candidate set missing truths.
- **A soundness fix in passing:** BUG+1 now requires every empty cell to really be down to two candidates. The old detector ignored single-candidate cells, so it could in principle have fired where the theorem it rests on does not apply. No library puzzle ever caught it out, but the shape was wrong.

Two things this batch exposed rather than caused, each now its own issue: the library teaches only two of these thirteen techniques, which is [teaching coverage](teaching-coverage.md) (#88) with numbers; and the CI bundle budget had to be raised to fit the family, which is [what a player downloads before the first board](first-board-payload.md) (#91). Unique Rectangle Type 5 has no real-grid oracle instance because the library never reaches it; it is covered by a hand-built grid and shares its detector with Type 2, which the library does exercise.
