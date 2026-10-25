# Forcing chains and nets, and the honesty line

Issue: [#75](https://github.com/ztarsi/sudoku-mentor/issues/75). Roadmap bucket: Next, last batch of the [coverage programme](technique-coverage.md) (#69). Player served: the enthusiast on Ultimate, and every player, through the honesty question this batch settles.

The shared bar for every batch is in the [programme spec](technique-coverage.md).

## The player problem

Cell Forcing Chain is in the engine: take a cell, try each of its candidates, and keep whatever every branch agrees on. That is a real proof, because every possibility was checked. The same proof shape over a unit, or over one digit across the board, is missing. So are nets, where a branch needs more than one consequence at a time to make progress.

Those are the last positions the named ladder cannot reach. Everything that falls past them lands on Hypothesis Mode, which assumes a candidate, hits a contradiction, and eliminates. That is trial and error, correctly labelled as such.

There is a second problem, about presentation rather than coverage. Cell Forcing Chain and Hypothesis Mode sit in the same tier today, under one what-if heading and colour. They are not the same thing. One checks every case and proves the answer. The other finds that one guess fails. Grouping them tells the player that a proof by cases is guesswork, which undersells the mentor, and it blurs the honesty promise it was meant to protect.

## The techniques

| Name | What it is | Tier |
| --- | --- | --- |
| Unit Forcing Chain | Every cell in one unit that could hold a digit is tried in turn. What all of them force is proved. | Forcing |
| Digit Forcing Chain | Both ends of a strong link on one digit are tried. What both force is proved. | Forcing |
| Double Forcing Chain | Every option of a cell or a unit is followed; an option whose own consequences contradict each other is impossible; the one option left standing is placed, or the impossible ones are erased. (Corrected 2026-10-24: the first wording described refuting a single assumption, which is Hypothesis Mode's shape and would have undone the very line this batch draws. Refuting each case is the mechanism; sweeping every case is what makes it a proof.) | Forcing |
| Dynamic forcing net | A branch that needs several simultaneous consequences to advance, explored to a stated depth. | Forcing |

Teaching order: after Cell Forcing Chain, in the order above, with the dynamic net last and Hypothesis Mode after all of them, as the final fallback it already is.

The depth limit must be a stated number, not an accident of the implementation, and the card must say when a net hit it rather than appearing to have finished.

## The honesty line, which this batch settles

Two kinds of step, two presentations. The product's promise is that a player can tell a deduction from a trial without reading the card.

| | Proved by cases | Found by trial |
| --- | --- | --- |
| Which steps | Cell, Unit and Digit Forcing Chains, Double Forcing Chains, dynamic nets | Hypothesis Mode |
| Why it is sound | Every possibility was checked and they agree | One assumption led to a contradiction |
| Heading | Named technique and its tier, in the deduction style | The what-if style already in use |
| Wording | "Every option leads to the same answer" | "No named technique applies. Reasoning by trial." |

So the Forcing tier moves to the deduction side of the line and keeps its own name, and the what-if styling narrows to Hypothesis Mode alone. The tier currently called Forcing Chains and shared by both splits in two: a Forcing tier of proofs, and what-if as the single last resort.

This is a change to the hint card's what-if state, which the [hint card states spec](hint-card-states.md) defines. That spec is amended by this batch rather than contradicted: the what-if state stays exactly as designed, and fewer steps use it.

A player who has turned the explanation level to Expert should also see the honest caveat these proofs carry: they are valid, and they are not patterns a person spots by eye. The reference text says so, in the same spirit as the franken fish entry.

## Done, from the player's side

- A position needing a unit or digit forcing chain gives a named step with a proof the player can step through branch by branch, not a what-if card.
- The card shows each branch and where they converge, with the shared conclusion marked. A net shows the assumptions it had to hold at once.
- The Forcing tier reads as deduction: no what-if heading, no what-if colour, its own name in the Techniques list.
- Hypothesis Mode alone keeps the what-if heading and wording, and its reference text explains why it is different from the tier above it.
- Where a net stops at its depth limit, the card says the search was cut short rather than implying nothing exists.
- Every forcing step is still checked against the true solution by the oracle, which already covers the two existing engines.

## Out of scope

- Removing Hypothesis Mode. It is the honest last resort and it stays.
- Nets without a depth limit. An unbounded search is a solver, not a mentor.
- Kraken fish and other crosses between families. Not until a real position needs one.

## How we will know it worked

- Shelf report from the oracle run: after this batch, the share of steps on every library puzzle that a named technique explains, with what-if remaining only where it is genuinely unavoidable. This is the number the whole programme is judged by, and this is the batch that finishes it.
- A reader can tell a proof-by-cases card from a trial card without reading either, which is the same test the hint card states spec set for what-if.
- The depth limit is a documented number, and a net that hits it says so.

## Outcome

Shipped in PR #94 to `staging` on 2026-10-24, closing the coverage programme. Unit Forcing Chain, Digit Forcing Chain, Double Forcing Chain and Forcing Net joined Cell Forcing Chain in a **Forcing** tier, and Hypothesis Mode became a **What-if** tier of one.

**The programme's result: the library has no trial steps left.** 1303 of 1303 solve-path steps across all twenty puzzles are explained by a named technique, every shelf at 100%, and the Ultimate shelf prints no what-if note at all. Before the programme it answered 41 steps with reasoning by trial. Verified by the product manager on 2026-10-25: lint, typecheck, 733 tests and build pass on `staging`.

**The honesty line is drawn.** A forcing card carries the deduction heading, its technique name, a "Forcing" tier chip and a "How this proof works" link, and ends on the reason it is a proof: every option was checked, so the result holds whichever one is right. Hypothesis Mode keeps the amber what-if card alone, says in as many words that only one candidate was tested, and now has an amber Search button to match. The two tiers sit next to each other in the Techniques list with their own notes, so the difference is visible without opening anything. Expert carries the caveat the franken fish entry set the tone for: valid, and not a pattern anybody spots by eye.

Six calls the developer made, all accepted:

- **The Double Forcing Chain correction above,** which found a contradiction in my own spec: its sentence described Hypothesis Mode's shape while its table put the technique on the proved side.
- **The net's depth limit is five, chosen by measurement.** Five is the lowest depth at which the mentor can name every step of every library puzzle; at four, Platinum Blonde still cannot be finished. The slowest search anywhere on the library is 0.43 s against the hint path's five-second budget. It is one named constant with the reasoning beside it.
- **How a branching proof walks:** one list, case by case, with each case's moves shown up to six at a time, while the board draws every case at once in its own colour, because a proof by cases has no single line for a cursor to follow. The old what-if replay and its bespoke overlay are gone, so there is one walker where there were three.
- **Search lost "Go Deeper".** Its depth was a number a caller could raise without limit, which is a solver rather than a mentor. When a search finds nothing the dialog now says it holds at most five suppositions, stopped there on purpose, and that this is not the same as there being nothing to find.
- **The timing test for ALS-XY-Wing keeps the quickest of three runs** on a fresh board. The same detector measured 105 ms and 159 ms back to back on the shared runner, so a single sample was mostly measuring the runner. The 150 ms bar is untouched and the detector's honest worst case on the library is 105 ms, which is inside it but not by much.
- No puzzle re-shelved, renamed or edited.

Three consequences worth keeping in view:

- **The what-if card is now unreachable from the built-in library.** It still fires on an imported puzzle the proofs cannot finish. Anyone verifying its styling has to get there through an import.
- **Avoidable Rectangle Type 1 and Unique Rectangle Type 6 lost their sighting** on a real solve path, because the proofs finish those puzzles by a different route. Both keep their hand-built tests; the library simply no longer teaches them. Another entry in #88.
- **The library's Ultimate shelf now takes 13.2 seconds to label its rows,** up from 7.7. Filed as #95 with the fix, which is to precompute labels for the fixed library with a staleness test against the live analyser.
