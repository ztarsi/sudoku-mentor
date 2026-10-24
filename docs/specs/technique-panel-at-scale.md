# The Techniques panel at scale, and the difficulty analyser

Issue: [#71](https://github.com/ztarsi/sudoku-mentor/issues/71). Roadmap bucket: Next, second batch of the [coverage programme](technique-coverage.md) (#69). Player served: everyone who opens the Techniques list, and the learner, who is protected by shelf labels that are true.

The shared bar for every batch is in the [programme spec](technique-coverage.md).

## The player problem

The Techniques list shows every technique the mentor knows, grouped in tiers, each with a live count of how many instances exist on the current board, click-to-highlight, and a reference dialog. At sixteen techniques it is one of the best things in the product. At fifty-five it breaks in three ways.

1. **It becomes a wall.** Six tiers of nine names each is a list nobody reads, and the player cannot tell which of fifty-five names is worth their attention right now.
2. **The counts stop being affordable.** A live count means running every detector on every board change. Today that is sixteen cheap detectors, with the expensive ones already hidden behind a Scan button. At fifty-five, including chains and nets, this is far past any budget, and the board would stutter on every digit the player enters.
3. **The learner meets the whole ladder at once.** A beginner on an Easy puzzle has no use for Mutant Fish in a list above their hint card.

There is a fourth problem that is not about the panel. Nobody can currently say what a puzzle needs. Shelf labels were set by hand, and the library's claim that the Ultimate shelf needs what-if search is an assumption, not a measurement. Without that measurement the coverage programme cannot be judged.

## The outcome we want

A Techniques list that stays useful at full coverage: it leads with what applies to the board in front of the player, lets them reach any technique they want to read about, and costs nothing when they are not looking at it. And a difficulty analyser that says, for any puzzle, what solving it actually requires.

## Done, from the player's side

### The panel

- **What applies now comes first.** The top of the list is the techniques with at least one instance on the current board, in teaching order, with their counts. This section is the default view and is short, because few techniques apply at once.
- **Everything else is browsable, not blocking.** Below it, the full ladder by tier, collapsed, each tier showing how many techniques it holds. Opening a tier shows its names. The player's open or closed choice is remembered, as the Techniques open-or-closed choice already is.
- **Finding a technique by name** works without scrolling the whole ladder: type part of a name and the list filters. It filters on the plain name and on the formal one, so "colouring" finds X-Cycle and 3D Medusa.
- **Counts never cost the player anything.** No count is computed while the player is entering digits unless the panel is open and that technique is visible. Entering a digit must not stutter. Where a count is not yet known, the row says so plainly and a tap computes it, rather than showing a stale or a wrong number.
- **Scan still exists** for the tiers that are too expensive to count live, and says what it is about to do.
- The reference dialog is reachable for every technique whether or not it applies to the current board, because reading about a technique is how the player learns it.
- Nothing above the hint card changes. The hint card stays first in the lesson panel.

### The analyser

- For any puzzle, the mentor can report the **solve path**: the sequence of steps the named ladder takes, each with its technique, and whether what-if was needed.
- From that path: the **hardest technique required**, the count of steps per tier, and whether the puzzle is solvable by named techniques alone.
- The **library shows what a puzzle teaches** from this analysis rather than from a hand-written label, and a shelf's label is true by construction. If the Ultimate shelf still needs what-if after the programme, it says so because it was measured.
- The analyser runs in the test suite over every library puzzle and prints the per-shelf report the programme is judged by: the share of steps that a named technique explains.
- It is available to the developer as a check, not as a player-facing feature. Players see its result in the library row, not the tool.

## Why this batch goes second

Every batch after it adds names to a list that does not scale and counts to a budget that is already tight. Doing the panel once, before forty names arrive, is cheaper than retrofitting it six times. The analyser is how we know whether any later batch worked, so it has to exist before the batches it measures.

## Out of scope

- Redesigning the hint card or the lesson panel. Those are settled.
- A player-facing difficulty rating in numbers. The shelf is the rating; the analyser just makes the shelf honest.
- Teaching recommendations ("learn this next"), which is close to the technique practice mode in the roadmap and should be decided with it.
- The puzzle generator, which will use the analyser later.

## How we will know it worked

- Entering a digit on a full board with the panel open stays visibly instant, measured on the staging build at phone width, which is the slowest device we serve.
- A player can find a named technique in the list in one action, without scrolling past tiers they do not care about.
- The per-shelf report exists and is produced by the test run, so every later batch can be judged against the number it moved.
- The library's shelf labels match what the analyser says. Any mismatch is a bug in the label, not in the analyser.
