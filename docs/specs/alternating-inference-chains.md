# Alternating inference chains

Issue: [#67](https://github.com/ztarsi/sudoku-mentor/issues/67). Roadmap bucket: Next. Source: technique audit, 24 Oct 2026. Player served: the improver on the Hard and Expert shelves, and the enthusiast on Diabolical and Ultimate.

This spec is written so it can be handed to a developer who has not worked on this repository. It says what the player must get and why, and it is precise about the technique itself, because the technique is the product. How to structure the code is the developer's call.

## The player problem

The mentor knows sixteen named techniques. Above XY-Wing the ladder has five Ultimate entries (X-Cycle, Finned X-Wing, ALS-XZ, Unique Rectangle Type 1, BUG+1) and then it stops. Every position those cannot crack falls through to Cell Forcing Chain or Hypothesis Mode, and the hint card honestly says so: no named technique applies, reasoning by trial. On the Diabolical and Ultimate shelves that is the common case, and the library labels the Ultimate shelf as needing what-if search.

The promise is that every hint is a lesson. A what-if card keeps the honesty promise and teaches nothing the player can carry to the next puzzle. The gap is not a missing pattern here and there. It is one missing idea: the chain of alternating strong and weak links. The player already meets that idea twice, in XY-Wing (a three-cell chain) and in X-Cycle (a one-digit chain, presented as colouring). Neither is presented as a chain, so neither generalises.

## The outcome we want

The mentor finds and teaches alternating inference chains. Where a chain applies, the player gets a named deduction with the links drawn on the board, in place of a trial card. The short chains that have well-known names are taught under those names, so the player gains a vocabulary rather than one general machine.

## What an alternating inference chain is

A **node** is one candidate in one cell: digit `d` in cell `RxCy`.

A **strong link** joins two nodes where at least one is true. Two forms:

- Two cells are the only places for `d` in a row, column or box (a conjugate pair).
- Two digits are the only two candidates left in one cell (a bi-value cell).

A **weak link** joins two nodes where at most one is true. Two forms:

- The same digit in two cells that share a row, column or box.
- Two different digits in the same cell.

A chain is an alternating sequence of nodes: strong link, weak link, strong link, and so on, beginning and ending with a strong link. The conclusion is that **at least one of the two endpoint nodes is true**. From that:

| Endpoints | What the player may erase or place |
| --- | --- |
| Same digit, two different cells | That digit goes from every cell that sees both endpoint cells. |
| Two different digits, same cell | Every other candidate in that cell goes. |
| The same node at both ends | That candidate is true. Place it. |

A node may appear only once in a chain. The chain must be verified against the live candidate grid, not against a cached one.

## The techniques the player meets

The engine finds chains. The card names the most recognisable pattern that fits, so the player learns names in a useful order. First match wins, top to bottom.

| Name | The chain it is | Tier |
| --- | --- | --- |
| Skyscraper | One digit. Conjugate pairs in two rows (or two columns) with one end of each in the same column (or row). Erase the digit from cells seeing both free ends. | Expert |
| Two-String Kite | One digit. One conjugate pair in a row and one in a column, their near ends in the same box. Erase the digit from the cell seeing both far ends. | Expert |
| W-Wing | Two cells holding the same bare pair, joined by a conjugate pair on one of the two digits. Erase the other digit from cells seeing both. | Expert |
| XY-Chain | A chain of bi-value cells whose two ends share a digit. Erase that digit from cells seeing both ends. | Ultimate |
| X-Chain | Every link on one digit, longer than the named cases above. | Ultimate |
| Alternating Chain | Mixed digits, anything the names above do not cover. Called an AIC in the Expert wording. | Ultimate |

Two rules on which chain to show, because the player must be able to follow it and because the tests need one answer:

1. **Shortest first.** Among all chains found, prefer the fewest nodes. Break ties by the most eliminations, then by the lowest cell index, so the result is deterministic.
2. **Length caps.** A hint shows at most 10 nodes. The Techniques panel's Scan may go to 16. A longer chain is not shown; the mentor falls through to what-if, as today.

## Where it sits on the ladder

The hint is always the easiest technique that applies, so the new entries go in teaching order:

```
... X-Wing, Swordfish, XY-Wing,
    Skyscraper, Two-String Kite, W-Wing,          <- new, Expert
    X-Cycle,
    X-Chain, XY-Chain,                            <- new, Ultimate
    Finned X-Wing, ALS-XZ, Unique Rectangle Type 1, BUG+1,
    Alternating Chain                             <- new, last deduction
then Cell Forcing Chain, then Hypothesis Mode.
```

A chain never pre-empts a single or a pair. X-Cycle keeps its place, because colouring is a familiar idea and the player has already learned it.

## Done, from the player's side

- Ask for a hint on a Diabolical puzzle in a position a chain can crack: the card shows a **named deduction**, in the deduction heading and colour, not the what-if heading and colour.
- The card names the pattern and its tier, shows a chip for every digit involved, and the legend names a cell from this hint.
- The board draws the chain: the nodes in order, strong links solid, weak links dashed, each node showing the digit it is about, both endpoints marked as the pair that one of is true, and the erased candidates in the target colour. No new colour vocabulary; the base and target colours already in use are enough.
- The player can step through the chain link by link and watch it build, the way a what-if chain can be replayed today.
- **Beginner wording** has no jargon and one idea per sentence, one sentence per link. For example: "In row 1, the only two places for 5 are R1C3 and R1C7. So if R1C3 is not 5, R1C7 is. R1C7 and R4C7 are both in column 7, so they cannot both be 5. So if R1C7 is 5, R4C7 is not, and then R4C9 must be the 5 in row 4. Either R1C3 or R4C9 is 5. R1C9 sees both of them, so R1C9 can never be 5."
- **Expert wording** gives the chain in the standard notation: `(5)R1C3 = (5)R1C7 - (5)R4C7 = (5)R4C9 => R1C9 <> 5`.
- Every new name appears in the Techniques list in its own tier, with a live count on the current board, click-to-highlight, and a reference dialog that reads like the existing ones: plain words first, then the formal version, how to find it, and an example.
- Apply and Next hint work exactly as they do for every other technique.
- No Assist still turns all of this off.
- On a phone the arrangement is unchanged. The phone stays No Assist until "learning on the phone" is answered.

## Shelf recalibration, part of this work

After the engine lands, re-measure every puzzle in the library: which techniques the deductive ladder needs to solve it, and whether it still needs what-if at all. Report the result per shelf. Where a shelf no longer needs what-if, its library label changes to match. Generating or adding puzzles is not part of this.

## Non-negotiable, because this is the hint engine

- **Oracle tests.** Every instance of every new technique, on every intermediate grid of every library puzzle, is checked against the puzzle's true solution. The existing harness in `src/components/sudoku/__tests__/oracleAll.spec.js` already does this for the sixteen techniques; the new names join it. No new technique may ever erase a candidate that the true solution needs.
- **Unit tests** on hand-built grids, one per new name, asserting the exact eliminations, the node order and each link's type.
- **A ladder test:** on a grid where both a Naked Single and a chain exist, the hint is the Naked Single.
- **Explanations ship with the engine.** Plain wording, Expert wording, reference dialog text and the catalog entry are part of the change. A technique with only an engine is not done.
- **Performance.** The ladder runs on every hint, and the Techniques panel asks every detector for live counts on the current board. The ladder must stay under one second on a mid-game grid, and the new detectors under 150 ms each. The general Alternating Chain finder may sit behind the Ultimate tier's Scan button if it cannot meet that, the way the expensive techniques already do. The hint path's own budget is five seconds and includes the what-if fallback, so chains must not eat it.

## Where this touches the code

The developer decides how to structure the new code. The integration points are:

| What | Where |
| --- | --- |
| The deductive ladder and the per-technique dispatch | `src/components/sudoku/logicEngine.jsx` (`TECHNIQUE_ORDER`, `findAllTechniqueInstances`) |
| The shape every step must have | `src/components/sudoku/stepShape.js`. A chain needs an ordered node list, each node with its cell, digit, truth state and the type of link to the next node. |
| Display metadata, tiers and teaching text | `src/components/sudoku/techniqueCatalog.js` (`TECHNIQUE_INFO`, `TECHNIQUE_TIERS`, `TECHNIQUE_DETAILS`) |
| Chain replay on the board | the existing what-if chain playback in the lesson panel and the hint overlay |
| Oracle | `src/components/sudoku/__tests__/oracleAll.spec.js` |

## Out of scope

- Grouped nodes (grouped AICs).
- Continuous loops, also called nice loops. Discontinuous chains first; loops are a follow-up once this is proven.
- ALS nodes inside chains. ALS-XZ already exists as its own technique.
- Sue de Coq and Unique Rectangle types 2 to 4. They stay in Later.
- New puzzles and the generator.
- The graduated-hint nudge, which is its own roadmap item and will later apply to chains like any other technique.

## How we will know it worked

- **A count from the oracle run, before and after.** For each shelf, how many steps on the solve path are named deductions and how many are what-if. The target: Diabolical solvable with named techniques only, and the what-if share on Ultimate reduced. This is a number the test run produces, not an estimate.
- A reader who has never used the product can tell a chain card from a what-if card without reading them.
- Once analytics exist: the hint-to-apply ratio on the Expert and Diabolical shelves, and the share of sessions on those shelves that end in a solve.

## How this ships

Every pull request targets `staging`, never `main`. `main` is the deploy branch that Base44 reads, and it receives releases only. If this is built inside the Base44 editor, the code reaches `main` without the oracle tests ever running, which is the one thing that must not happen to the hint engine. Build it on a feature branch, open the pull request against `staging`, and let the four checks run before every push:

```
npm run lint        # warnings are errors
npm run typecheck
npm test            # includes the oracle tests
npm run build
```

Then it is verified on the staging site at https://sdm.pilia.net from the player's side, and reaches players in the next release. Conventions: cells are named `R5C3`, player-facing wording is plain English for beginners with the Expert version behind the toggle, and no model identifiers appear in commits, code or comments. The full process is in `docs/STAGING.md` and `CLAUDE.md`.
