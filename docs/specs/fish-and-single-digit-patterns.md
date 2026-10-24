# Fish and single-digit patterns

Issue: [#72](https://github.com/ztarsi/sudoku-mentor/issues/72). Roadmap bucket: Next, part of the [coverage programme](technique-coverage.md) (#69). Player served: the improver on Expert, the enthusiast on Diabolical and Ultimate.

The shared bar for every batch is in the [programme spec](technique-coverage.md).

## The player problem

The fish family is the first place the product teaches a pattern that spans the whole board: X-Wing, then Swordfish. Then it stops, with one finned variant bolted on. A player who has just understood why an X-Wing works is ready for the rest of the family, and the mentor has nothing more to show them.

What is missing: the four-line fish (Jellyfish), the fins on the larger fish, the sashimi case where a corner of the pattern is empty, the box-based fish, and the Empty Rectangle, which is one of the most common single-digit patterns on hard puzzles and needs no fish machinery at all. Colouring exists for one digit at a time, in X-Cycle, but not across digits, so the strongest form of colouring is absent.

## The techniques

| Name | What it is | Tier |
| --- | --- | --- |
| Jellyfish | The fish at size four: a digit in four rows confined to the same four columns, or the other way round. The digit goes from those columns outside the pattern. | Expert |
| Empty Rectangle | In one box, a digit's candidates lie only in one row and one column of that box, leaving the 2x2 block off those two lines empty of the digit. Combined with a conjugate pair on that digit elsewhere, it eliminates on the far end. (Corrected 2026-10-24: an earlier wording said the crossing cell itself must be empty, which is not the pattern.) | Expert |
| Finned Swordfish | A Swordfish spoiled by one or two extra candidates in a base line. Only eliminations that also see every fin survive. | Ultimate |
| Finned Jellyfish | The same at size four. | Ultimate |
| Sashimi variants | A finned fish where the spoiled corner is empty rather than occupied. Same proof, different shape to spot. | Ultimate |
| Franken fish | A fish that uses a box as one of its lines. | Ultimate |
| Mutant fish | A fish whose lines mix rows, columns and boxes freely. | Ultimate |
| 3D Medusa | Colouring across every digit at once: strong links on digits and inside bi-value cells are coloured together, and a cell or unit that meets one colour twice kills that colour. | Ultimate |

Teaching order: Jellyfish goes directly after Swordfish, Empty Rectangle after it. The finned and sashimi forms go after Finned X-Wing, which already exists. Franken and Mutant go last in the Ultimate tier, next to each other. 3D Medusa goes directly after X-Cycle, because it is the same idea the player just learned, extended.

Three notes on detection, each a known source of wrong hints:

- A fish is only a fish when the cover lines are **exactly** covered. Report nothing when the pattern degenerates into a smaller fish already on the ladder; a Jellyfish that is really an X-Wing must be reported as the X-Wing, by the ladder order.
- A finned fish eliminates only in cells that see **every** fin. One fin missed is a wrong hint.
- 3D Medusa has two distinct conclusions, a cell holding two of one colour and a unit holding two of one colour, and both must be implemented, since the second is the common one.

## Done, from the player's side

- Jellyfish is taught as the next size of the same pattern, in the same words as Swordfish, with the lines drawn on the board the same way.
- Empty Rectangle is taught as its own simple idea, not as a fish, because it is simpler than the tier around it and the player can learn to spot it.
- Franken and Mutant fish carry plain wording that is honest: these are patterns the mentor finds and explains, and nobody is expected to spot them by eye. The reference text says that outright rather than pretending.
- 3D Medusa shows its two colours on the board in the same colouring style X-Cycle already uses, and names which of the two conclusions fired.
- Every entry appears in the Techniques list in its tier, with a live count where the budget allows and behind Scan where it does not.
- No fish hint ever fires where a smaller pattern of the same family already explains the position.

## Out of scope

- Fish above size four. A size-five fish on a 9x9 grid is the complement of a size-four fish, so it adds nothing. The reference text says why.
- Grouped fish nodes, which belong to the chain batch (#67).
- Kraken fish, which are fish crossed with chains. If the chain batch and this one both land and a position still needs one, file it then; speculating now would be building for a case we have never seen.

## How we will know it worked

- Shelf report from the oracle run: the what-if share on Expert and Diabolical falls, and the report names which new technique replaced each previously unexplained step.
- Every pattern this batch adds is checked against the true solution on every intermediate grid of every library puzzle, including the seven Ultimate puzzles, which is where these fire.
- A reader who has learned X-Wing and Swordfish from the product can read the Jellyfish entry and predict the eliminations before reaching the example.

## Outcome

Shipped in PR #81 to `staging` on 2026-10-24. All eight landed: Jellyfish and Empty Rectangle in Expert, and 3D Medusa, Finned Swordfish, Finned Jellyfish, Sashimi Fish, Franken Fish and Mutant Fish in Ultimate. Jellyfish reads as the Swordfish one size up and says why size five adds nothing. Empty Rectangle is taught as its own idea with no mention of fish, held by a test. The finned fish share one set of plain words across their sizes. Franken and Mutant say outright that nobody is expected to spot them by eye. 3D Medusa paints its two colours and names which of its two conclusions fired. Live-count pass 12 ms over 18 detectors against the 150 ms budget; named ladder 233 ms worst case against 1 s.

Verified by the product manager on 2026-10-24: lint, typecheck, 455 tests and build pass on `staging`, and the report reproduces. Coverage moved from 1204 of 1245 steps named to **1214 of 1251, 97.0%**, and the Ultimate shelf from 41 what-if steps to 37. **Night Owl is the first Ultimate puzzle the named ladder finishes on its own.** The 37 remaining are chain-shaped, not fish-shaped, and belong to #67.

Three calls the developer made, all accepted:

- **One Sashimi Fish rung rather than one per size,** since the shape the eye looks for is the same at every size, and Finned X-Wing now reports only the occupied-corner case so one pattern never carries two names.
- **Walkable colouring deferred to #67,** because chains need the same replay and one implementation should serve both. Filed as #82 rather than skipped.
- **The Empty Rectangle wording above was wrong in this spec** and is corrected; the implementation follows the standard pattern.

One finding, now #83: with Empty Rectangle on the ladder, no library puzzle's solve path reaches XYZ-Wing any more. The ladder order is right; a 20-puzzle library simply cannot exercise fifty-five techniques, so the analyser should report which techniques the library never teaches.
