# Subsets and wings

Issue: [#70](https://github.com/ztarsi/sudoku-mentor/issues/70). Roadmap bucket: Next, first batch of the [coverage programme](technique-coverage.md) (#69). Player served: the improver on the Medium, Hard and Expert shelves. This is the batch most players will feel.

The shared bar for every batch, the tests, the teaching requirements, the performance budget and the process, is in the [programme spec](technique-coverage.md). This spec adds only what is specific to these five techniques.

## The player problem

The ladder teaches Naked Pair, Hidden Pair and Naked Triple, then jumps straight to X-Wing. Three gaps sit in that jump:

- **Hidden Triple** is missing although Hidden Pair is taught. The idea is identical, one size up.
- **Naked Quad and Hidden Quad** are missing, so a four-cell subset has to be found as something harder, or not at all.
- **XYZ-Wing** is missing although XY-Wing is taught, and it is the natural next step: the same hinge with one extra candidate in the pivot.
- **WXYZ-Wing** is missing, which is the same shape again with four digits.

A player in a position where a Hidden Triple applies gets a hint about an X-Wing somewhere else on the board, or a what-if card. Both are worse lessons than the one the position was offering. These techniques are also cheap to detect, so there is no performance reason for the gap.

## The techniques

| Name | What it is | Tier |
| --- | --- | --- |
| Hidden Triple | Three digits that, within one unit, appear only in the same three cells. Those cells lose every other candidate. | Advanced |
| Naked Quad | Four cells in one unit holding only the same four digits between them. Those digits go from the rest of the unit. | Advanced |
| Hidden Quad | Four digits that, within one unit, appear only in the same four cells. Those cells lose every other candidate. | Advanced |
| XYZ-Wing | A pivot with three candidates {X, Y, Z} sees two bi-value wings, {X, Z} and {Y, Z}. All three cells can be Z, so Z goes from every cell that sees all three. | Expert |
| WXYZ-Wing | Four cells spanning four digits where only one cell can hold Z outside the shared unit. Z goes from every cell that sees every Z in the set. | Expert |

Teaching order on the ladder: Hidden Triple, Naked Quad and Hidden Quad go directly after Naked Triple. XYZ-Wing goes after XY-Wing, and WXYZ-Wing after XYZ-Wing.

Two detection notes, because they are the usual source of wrong hints in this family:

- A subset only eliminates where it actually removes something. A Naked Quad whose digits appear nowhere else in the unit is real but useless, and must not be reported as a step with no eliminations.
- An XYZ-Wing's eliminations are only in cells that see **all three** of the pivot and both wings, not just the two wings. This is the difference from XY-Wing, and the test for it must be explicit.

## Done, from the player's side

- A position where a Hidden Triple, Naked Quad or Hidden Quad applies gives that as the hint, named, before anything from a higher tier.
- The card shows the subset's cells as the pattern and the cells losing candidates as targets, with a chip for each digit in the subset.
- Plain wording for Hidden Triple reads as the one-size-up version of Hidden Pair, in the same words, so the player sees the family. Same for the quads against the triples, and for XYZ-Wing against XY-Wing.
- XYZ-Wing's plain wording makes clear why the pivot counts as a third place the digit could be, which is the whole difference from XY-Wing.
- All five appear in the Techniques list in their tier with a live count and click-to-highlight, and each has a reference dialog entry.
- A player on the Medium or Hard shelf who asks for hints to the end of the puzzle never sees a what-if card. That is checkable on today's library.

## Out of scope

- Quints and larger subsets. Beyond four, the complement is always a smaller subset, so there is nothing a quint finds that a quad or a triple does not. Say so in the reference text rather than building it.
- Grouped or ALS-based wings. WXYZ-Wing here is the plain four-cell form; the ALS reading of the same pattern belongs to batch #73.

## How we will know it worked

- Shelf report from the oracle run: Medium and Hard reach 100% named steps with no what-if card, and the count of steps that needed a technique two or more tiers above the position's real difficulty falls to zero on those shelves.
- The reference dialog for Hidden Pair and Hidden Triple, read one after the other, teaches the generalisation. A reader who has just learned Hidden Pair can predict what Hidden Triple is before reading it.

## Outcome

Shipped in PR #77 to `staging` on 2026-10-24. All five techniques landed with their tiers, ladder positions, teaching text and reference entries, and all five fire on today's library, so the oracle coverage is real rather than nominal. The hidden subsets of every size now share one set of plain words, so Hidden Triple reads as Hidden Pair one size up; XYZ-Wing reads as XY-Wing with the pivot counted in and says why seeing the two wings is not enough. Both detection notes are pinned by tests, including a cell that sees both wings but not the pivot, which is the elimination an XY-Wing would wrongly have made. Slowest new detector 12 ms against the 150 ms limit.

Verified by the product manager on 2026-10-24: lint, typecheck, 380 tests and build pass on `staging`, and the analyser's report shows Medium, Hard and Expert at 100% named steps. One finding, not a defect in this batch: with XYZ-Wing on the ladder, Witching Hour on the Diabolical shelf now needs only an XYZ-Wing. The developer scored the new wings between XY-Wing and X-Cycle so no puzzle changed shelf, which was the right call; re-cutting the shelves is held to the end of the programme (decision log, 2026-10-24).
