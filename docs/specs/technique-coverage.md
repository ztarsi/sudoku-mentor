# Full technique coverage: the programme

Issue: [#69](https://github.com/ztarsi/sudoku-mentor/issues/69). Roadmap bucket: Next. Source: technique audit, 24 Oct 2026. Founder decision, 24 Oct 2026: cover everything, do not trim scope to save work. Player served: the improver and the enthusiast directly, the learner through the difficulty analyser that keeps the easy shelves easy.

This document is the programme. It holds the goal, the inventory, the batches, and the bar every batch must meet. Each batch has its own spec and its own issue, and each ships on its own. Read this one first; it is the part that does not change.

## The goal

The mentor can name and teach every step of every puzzle it serves. What-if search becomes the rare exception instead of the normal answer on the top shelves.

The promise in `docs/PRODUCT.md` is that every hint is a lesson and every hint is honest. Today those two pull against each other. Above XY-Wing the engine runs out of named techniques, so it stays honest by saying "no named technique applies, reasoning by trial", and the lesson is lost. On the Diabolical and Ultimate shelves that is the common case. Full coverage is how the two promises stop competing.

## What the mentor knows today

Sixteen techniques, in five tiers, plus two fallbacks.

| Tier | Techniques |
| --- | --- |
| Basic | Naked Single, Hidden Single |
| Intermediate | Pointing Pair, Pointing Triple, Claiming |
| Advanced | Naked Pair, Hidden Pair, Naked Triple |
| Expert | X-Wing, Swordfish, XY-Wing |
| Ultimate | X-Cycle, Finned X-Wing, ALS-XZ, Unique Rectangle Type 1, BUG+1 |
| Forcing chains | Cell Forcing Chain, Hypothesis Mode |

The library is 20 puzzles: 5 Easy, 3 Medium, 1 Hard, 2 Expert, 2 Diabolical, 7 Ultimate. The Ultimate shelf is labelled as needing what-if search, which is an honest admission that the ladder stops too early.

## What is missing

Grouped by family, with the batch that covers it.

| Family | Missing | Batch |
| --- | --- | --- |
| Subsets | Hidden Triple, Naked Quad, Hidden Quad | [Subsets and wings](subsets-and-wings.md), #70 |
| Wings | XYZ-Wing, WXYZ-Wing | [Subsets and wings](subsets-and-wings.md), #70 |
| Chains | Skyscraper, Two-String Kite, W-Wing, X-Chain, XY-Chain, Alternating Chain, Remote Pairs, grouped nodes, continuous loops, ALS nodes | [Alternating inference chains](alternating-inference-chains.md), #67 |
| Fish | Jellyfish, Finned Swordfish, Finned Jellyfish, sashimi variants, Franken fish, Mutant fish | [Fish and single-digit patterns](fish-and-single-digit-patterns.md), #72 |
| Single digit | Empty Rectangle, 3D Medusa | [Fish and single-digit patterns](fish-and-single-digit-patterns.md), #72 |
| Almost locked sets | ALS-XY-Wing, ALS chains, Death Blossom, Sue de Coq | [Almost locked sets](almost-locked-sets.md), #73 |
| Uniqueness | Unique Rectangle types 2 to 6, Hidden UR, Avoidable Rectangle 1 and 2, BUG+2, BUG+3, unique loops | [Uniqueness](uniqueness-techniques.md), #74 |
| Forcing | Unit Forcing Chain, Digit Forcing Chain, Double Forcing Chain, dynamic nets | [Forcing chains and nets](forcing-chains-and-nets.md), #75 |
| Everything | A panel and a ladder that work at this size, and a difficulty analyser | [The Techniques panel at scale](technique-panel-at-scale.md), #71 |

That is about forty new techniques. The product ends with roughly fifty-five.

## The order I recommend

One recommendation, with the reason, as the roadmap requires.

1. **Subsets and wings (#70).** Cheapest to find, easiest to explain, and they fire on the Medium and Hard shelves where most players are. Every missing subset today pushes the player to a harder technique than the position needs.
2. **The panel and the analyser (#71).** Small, and it unblocks everything after it. The Techniques list and its live counts do not survive forty more names, and the analyser is what tells us whether any of this worked.
3. **Alternating inference chains (#67), now including grouped nodes, continuous loops and ALS nodes.** The largest single reduction in what-if cards.
4. **Fish and single-digit patterns (#72).** Empty Rectangle and Jellyfish are common; the franken and mutant fish are completeness.
5. **Almost locked sets (#73).** Builds on ALS-XZ, which is already taught.
6. **Uniqueness (#74).** Held until here because it needs the single-solution guard, and because a wrong uniqueness hint is the most damaging kind.
7. **Forcing chains and nets (#75).** Last, because it only matters for what everything above still cannot reach, and because it settles where the honesty line sits.

Batches 1 and 2 are worth doing in order. After that, any order works; they do not depend on each other.

## The bar every batch must meet

This is the part that must not be negotiated away in any batch.

### Correctness

- **Solution-oracle tests.** Every instance of every new technique, on every intermediate grid of every library puzzle, checked against that puzzle's true solution. The harness already exists in `src/components/sudoku/__tests__/oracleAll.spec.js` and covers the current sixteen. A new technique joins it in the same change that adds it. No technique may ever erase a candidate the true solution needs, or place a digit the solution does not have.
- **Unit tests on hand-built grids,** one per technique name, asserting the exact eliminations or placement and the exact cells the card will highlight.
- **A ladder test per batch:** on a grid where an easy technique and a new one both apply, the hint is the easy one.
- The four checks pass before every push: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.

### Teaching

A technique with only an engine is not done. Each one ships with:

- **Plain wording** for someone who has never read a Sudoku guide. Everyday words, one idea per sentence, no notation beyond `R5C3`, which the card's legend explains.
- **Expert wording** in the vocabulary an experienced solver expects, including the standard notation where there is one.
- **A reference dialog entry** in the same four parts the existing ones use: plain words, the formal description, an example on a named cell, and how to find it as numbered steps.
- **A tier**, so the Techniques list can place it, and a position on the teaching ladder.

### Presentation

- The hint card shows the technique name and tier, a chip for every digit involved, and the cells on the board in the colours already in use. No batch invents a new colour vocabulary.
- A step whose proof is a chain, a net or a set must be walkable: the player can step through it rather than reading a wall of text. The colouring techniques, X-Cycle and 3D Medusa, are the exception until the chain batch (#67) builds the replay they share; that is tracked as #82 rather than left unsaid.
- A deduction is presented as a deduction. Only genuine trial and error carries the what-if heading and colour. Batch #75 settles the exact line.

### Performance

- The hint path's budget stays at 5 seconds, and it still includes the what-if fallback. The named ladder must finish well inside it: under 1 second on a mid-game grid.
- Any detector too slow for the ladder sits behind the Techniques panel's Scan button, the way the expensive ones already do.
- Live counts in the Techniques panel are the real constraint, because they run every detector on every board change. Batch #71 changes how counts are computed; until it lands, no batch may add a detector that costs more than 150 ms.

### Shelves and naming

- **No batch re-shelves a puzzle.** A new technique often makes a puzzle solvable by an easier rung than its shelf implies. The batch notes what it found and scores the new technique's difficulty so today's shelves still hold. Shelf assignment is recomputed once, deliberately, at the end of the programme, with the analyser's numbers in hand. Re-cutting the shelves every batch would move puzzles under players partway through them and make best times hard to compare.
- A batch may not rename a puzzle or edit the library's content. Those are the product manager's, and a finding goes on the issue.

### Honesty

- A uniqueness technique may only fire when the puzzle is known to have exactly one solution (batch #74).
- A step proved by cases is not the same as a step found by trial, and the card says which it is (batch #75).

## How we will know the programme worked

One number, produced by the test run and not by anyone's judgement: **for each shelf, the share of steps on the solve path that a named technique explains.**

The oracle run already walks every library puzzle step by step, so this is a report, not new machinery. Batch #71 builds it as part of the difficulty analyser.

| Shelf | Target at the end of the programme |
| --- | --- |
| Easy, Medium, Hard | 100% named, as today |
| Expert, Diabolical | 100% named; no what-if card on a vetted library puzzle |
| Ultimate | Named for all but a stated handful, which keep their label |

Secondary, once analytics exist: the hint-to-apply ratio on the Expert and Diabolical shelves, and the share of sessions on those shelves that end in a solve.

## Out of scope for the whole programme

- New puzzles and the generator. The analyser in #71 is the vetting step the generator will need, but generating is a separate roadmap item.
- The graduated-hint nudge. It is its own roadmap item and will apply to every technique once it exists.
- Solving modes that are not teaching: no auto-solve, no step-through-the-whole-puzzle button. That decision stands.
- Non-standard variants (Killer, Jigsaw, 16x16). Still a non-goal.

## How it ships

Every batch goes on a feature branch and opens a pull request against `staging`, never to `main`. `main` is the deploy branch that Base44 reads and it receives releases only. Work done inside the Base44 editor lands on `main` with no CI and no oracle tests, which is the one thing that must not happen to the hint engine. Verification is on https://sdm.pilia.net from the player's side before a release. Cells are named `R5C3`. No model identifiers in commits, code or comments. The process is in `docs/STAGING.md` and `CLAUDE.md`.
