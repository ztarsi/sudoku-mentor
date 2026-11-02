# Almost locked sets

Issue: [#73](https://github.com/ztarsi/sudoku-mentor/issues/73). Roadmap bucket: Next, part of the [coverage programme](technique-coverage.md) (#69). Player served: the enthusiast on Diabolical and Ultimate, and the improver who has read the ALS-XZ explanation and wants the rest.

The shared bar for every batch is in the [programme spec](technique-coverage.md).

## The player problem

ALS-XZ is in the engine, and its plain-English explanation is one of the better pieces of writing in the product: a group of cells that is one number short of locked, two such groups sharing a digit, and the conclusion. A player who has read it owns a genuinely powerful idea.

Then nothing. A position that needs two shared digits instead of one, or a set joined to several others at once, or the row-and-box overlap that Sue de Coq reads, all fall through to what-if, even though the player has already been taught the concept those positions rest on. The idea was delivered and then abandoned.

## The techniques

| Name | What it is | Tier |
| --- | --- | --- |
| ALS-XY-Wing | Three almost locked sets in a row: a middle set restricted-common to each of two outer sets on different digits. Whatever the middle set does, one outer set is locked, so a third shared digit is eliminated where it sees all of its candidates in both outer sets. | Ultimate |
| ALS chains | Almost locked sets used as nodes in an alternating chain, so a chain may pass through a set as well as through single candidates. Built jointly with the chain batch (#67), which owns the chain machinery. | Ultimate |
| Death Blossom | A stem cell whose every candidate is restricted-common to an almost locked set of its own. Whatever the stem takes, one of the petals locks, so a digit shared by every petal is eliminated where it sees all of them. | Ultimate |
| Sue de Coq | Cells in the overlap of a box and a line, holding enough digits that the line's remaining cells and the box's remaining cells split the rest between them. Eliminations fall in both the line and the box. | Ultimate |
| Sue de Coq, extended | The same with an extra cell or an extra digit, which is the common form in practice. | Ultimate |

Teaching order: all of them after ALS-XZ, in the order above, with ALS chains sitting wherever the chain batch places chains.

Two notes on detection:

- **Restricted common** is the load-bearing condition in this whole family: every candidate of that digit in one set must see every candidate of it in the other. Nearly every wrong hint in this family comes from a restricted-common check that is too loose. It needs its own unit tests, separate from the techniques that use it.
- A set of N cells with N+1 digits is an ALS; a set with N digits is already a locked set and belongs to the subset techniques. Do not report a locked set as an ALS.

## Done, from the player's side

- Every entry's plain wording **builds on the ALS-XZ explanation the player has already read.** It begins from "one number short of locked", the phrase that entry uses, rather than restarting with set notation. This is the hardest writing in the programme and it is the point of the batch.
- The board shows each set as its own group, clearly separated, so the player can see two or three sets rather than a cloud of highlighted cells. The shared digit and the eliminated digit are named and chipped.
- Sue de Coq shows the overlap, the line and the box as three distinguishable regions, because the pattern is impossible to follow otherwise.
- A set-based step is walkable: the player can step through "if this set loses X, it locks, so it must hold Z".
- Each appears in the Techniques list in the Ultimate tier, behind Scan where the cost demands it, with a reference dialog entry.
- No step in this family is ever presented as a what-if. These are deductions.

## Out of scope

- Sets spanning more than two units. The payoff is thin and the explanation is not writable in plain English, which by our own rule means it is not shippable.
- ALS-based wings as separate names. WXYZ-Wing is taught in batch #70 as a four-cell wing; it is the same pattern an ALS reading would find, and two names for one thing would teach confusion.
- Kraken and other crosses with fish. Not until a real position needs one.

## How we will know it worked

- Shelf report from the oracle run: how many previously unexplained steps this batch names, on Diabolical and Ultimate.
- The restricted-common check has its own tests and they pass on hand-built cases, including the near-misses that should report nothing.
- A reader who has read the ALS-XZ entry can read the Death Blossom entry and recognise the same idea. If they cannot, the wording is not finished, whatever the engine does.

## Outcome

Shipped in PR #92 to `staging` on 2026-10-24. ALS-XY-Wing, Death Blossom, Sue de Coq and its extended form, all in the Ultimate tier behind Scan, all walkable, each drawing its sets as outlined regions with their digits. Every entry starts from the ALS-XZ lesson's own phrase, "one number short of locked", which was the point of the batch.

Verified by the product manager on 2026-10-25: lint, typecheck, 733 tests and build pass on `staging` after the forcing batch landed on top.

**The batch's own finding is a negative result, properly proved.** This family names none of the 31 what-if steps that were outstanding when it started. The developer went looking for a reason to doubt that: at every position where the ladder stalled there were 14 to 96 almost locked sets and up to 138 restricted-common pairs, so the raw material was there, but not one pair had a digit with a cell seeing all of its places in both, which is the elimination rule the whole family shares. Sue de Coq was measured separately and fails for a different reason: on boards that dense, an outside cell almost always carries a mark the overlap cannot use. Raising the set-size cap from three cells to four changed nothing. Those positions are simply not set-shaped, and the forcing batch is what reached them.

Where it does land: **ALS-XY-Wing is the hint on 7 steps across 3 Ultimate puzzles**, taking them from the generic chain family. Golden Nugget and Swordfish Hunt now report it as the hardest rung they need, where they used to say Grouped X-Chain and ALS Chain. A named shape instead of a chain saying the same thing a longer way round is the better lesson for the same position.

Death Blossom, Sue de Coq and Sue de Coq extended are never the hint on a library puzzle, though the oracle walk counts 152 blossoms and 50 Sue de Coqs across the library's intermediate grids. They are another entry in the [teaching coverage](teaching-coverage.md) gap (#88), not a fault in the detectors.

Five calls the developer made, all accepted:

- **The four sit ahead of the general chain block,** not behind it. An ALS-XY-Wing is a six-node chain through sets, so behind the ALS Chain rung it could never be the hint at all. Same rule that already puts Skyscraper ahead of X-Chain.
- **A two-petal Death Blossom is reported as an ALS-XY-Wing,** and three bi-value cells stay an XY-Wing. Plain before rich, one name per idea.
- **Sue de Coq needs at least two overlap cells.** A single overlap cell with three marks is the same deduction but it is really a naked triple spread over a line and a box, not what the name means.
- All four scored at 10, level with the chain they sit beside, so no puzzle changed shelf.
