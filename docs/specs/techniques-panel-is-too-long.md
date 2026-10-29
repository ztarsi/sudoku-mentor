# The Techniques panel is a wall, not a tool

Issue: [#114](https://github.com/ztarsi/sudoku-mentor/issues/114). Roadmap bucket: Next, and it blocks a release. Founder, 29 Oct 2026: "The long long list on the right side panel is unacceptable UI." Player served: everyone who opens the panel, which is the product's main differentiator.

## What a player gets today

The right column lists every technique that applies to the board, in teaching order, each with a count. Measured on staging:

| Board | Rows under "on this board" |
| --- | --- |
| An Easy puzzle, part-solved | 12 |
| A Medium puzzle | 6 |
| After pressing Scan | 16 |

Below that sits the whole ladder in seven collapsed tiers. The column scrolls, and the first thing in it is always Naked Single, because teaching order puts the most trivial technique at the top of the most valuable surface.

## Why it happened, which is the part worth keeping

The panel was designed when the mentor knew sixteen techniques. It now knows sixty-one. "List everything that applies" is a reasonable design at sixteen and a wall at sixty-one, because on any real board a dozen patterns technically exist, most of them irrelevant to the player's next move.

This is the same failure as the Scan dialog, from the same cause: a component designed against the data we had, shipped against the data we built. The `break-ui` skill now vendored in this repository names it exactly, listing "huge counts" and "zero items" as the cases to try. We had both and tried neither, and a suite of 760 tests could not see it, because the panel was correct and unusable at the same time.

Two rules from the `better-layout` skill say what is wrong in the abstract:

- **"Prefer a short view that links deeper over one long view that shows everything at the top level."** The panel is the long view.
- **"The most important content sits near the top."** Teaching order guarantees the opposite.

## What the panel is actually for

The hint card already answers "what do I do next". The panel does not need to, and trying to makes it a worse version of the hint.

Its three real jobs:

1. **Discovery.** Show the player that there is a ladder, and where they are on it.
2. **Practice.** Let a player who wants to find a pattern themselves know that one is there.
3. **Reference.** Let them read how any technique works, whenever they like.

An inventory of everything present on the board serves none of those. It is a readout, and readouts are for us.

## Done, from the player's side

- **The panel opens short.** What applies to the board is answered in a line and at most a few rows, not a dozen. Something close to: "16 techniques apply here. The easiest is a Naked Single." with the rest one tap away.
- **The few rows shown are the ones worth showing.** The easiest applicable technique leads, because that is the one a player can act on. The developer may propose a better rule and say why; what is not acceptable is a full list in teaching order.
- **Hidden rows are visibly hidden.** A count, a disclosure control, or the next row peeking. A player must never wonder whether that is all of them.
- **Scanning does not undo this.** Scan's results join the same short view under the same rule; they do not reopen the wall by another route.
- **Browsing the ladder is unchanged and still collapsed by tier.** Search is unchanged. The reference dialog is unchanged.
- **Nothing is lost.** Every technique that applies is still reachable, still counted, still clickable to highlight. This is about what is shown first, not what exists.
- **It holds at sixty-one techniques and at a hundred.** The test is not "does it look right today" but "what does it do when the catalog doubles".

## Out of scope

- The hint card, the animation, and the lesson text.
- Re-ordering the teaching ladder itself. The ladder's order is the engine's and it is right; this is about presentation.
- Removing counts or the click-to-highlight behaviour.
- The accessibility work on this panel, which is #109, and the board and library pass, which is #107.

## How we will know it worked

- On every library puzzle, at every width, the panel's default state fits without scrolling beside the hint card, and a player can still reach any technique in one action.
- Running the `break-ui` approach against it with a catalog of a hundred techniques changes nothing about the default view.
- The founder opens it and does not call it a wall.
