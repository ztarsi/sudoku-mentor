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
| Double Forcing Chain | Two chains from the same assumption reach contradicting conclusions, so the assumption is false. | Forcing |
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
