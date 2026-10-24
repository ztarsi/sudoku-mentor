# Teaching coverage: the library must exercise what the mentor knows

Issue: [#88](https://github.com/ztarsi/sudoku-mentor/issues/88). Roadmap bucket: Next, and it should be done before the second half of the [coverage programme](technique-coverage.md) is judged a success. Source: the never-taught report built in #83, read on 24 Oct 2026. Player served: everyone, but the improver above all, because this is the gap between what the product can explain and what a player will ever be shown.

## The player problem

The mentor knows 53 techniques as of this afternoon and will know around 55 when the coverage programme finishes. The library is twenty puzzles, and has been throughout. The report that shipped in #83 says what that means:

| | 24 Oct, when the report first ran | 24 Oct, after chains, uniqueness and the fish |
| --- | --- | --- |
| Techniques in the catalog | 31 | 53 |
| Taught by at least one library puzzle | 21 | 31 |
| Never the hint on any library puzzle | 10 | 22 |

The gap more than doubled in an afternoon, which is the point: the engine work is nearly done and the library has not moved. Every batch widens it. When the report first ran, six techniques were taught by exactly one puzzle each, four of them by a single step; that list grows the same way.

X-Wing is in the never-taught list. The most famous technique in Sudoku beyond the singles has an engine, a tier, plain and Expert wording, a reference entry, a live count in the Techniques list, and no puzzle on which a player will ever be shown it. Jellyfish, added the same day, is already in the same position: a Swordfish or an Empty Rectangle reaches those positions first every time. Hidden Triple and 3D Medusa are each taught by Night Owl and nothing else.

None of this is a broken detector. The ladder is right to give the easiest technique that applies. The problem is that twenty puzzles cannot exercise fifty-five techniques, and every batch of the programme makes the ratio worse rather than better.

## Why this matters more than the number we have been reporting

The programme's measure is the share of solve-path steps a named technique explains, now 97.6%. That number answers "can the mentor explain what the library contains". It does not answer "will a player ever meet what the mentor knows", and the second question is the product.

A mentor that knows fifty-five techniques and teaches twenty is not a better teacher than one that knows twenty. It is the same teacher with a longer reference section. The promise in `docs/PRODUCT.md` is that every hint is a lesson and that the product closes the gap between easy puzzles and hard ones. Shipping engines without puzzles to meet them on does not move that promise.

## The outcome we want

Every technique the mentor knows is taught by at least two library puzzles, so a player can meet it and then meet it again on a different board, which is how anyone learns a pattern.

Two rather than one, because a single step on a single puzzle is one re-shelving or one library edit away from nothing. That is precisely how the XYZ-Wing finding arose: it is taught once, at step 18 of Swordfish Hunt, and was invisible in every report we had until #83.

## Done, from the player's side

- **Every technique in the catalog is reachable.** A player who wants to learn X-Wing can open a puzzle where the mentor will teach them an X-Wing. The same for every other name in the Techniques list.
- **Each technique is taught by at least two puzzles,** and the never-taught list in the test output is empty.
- **Each shelf still means what it says.** New puzzles are added to the shelf their difficulty earns, not to whichever shelf makes the numbers work.
- **The Techniques list stops advertising what the library cannot deliver.** Until a technique has a puzzle, its row should not imply a lesson is available. How to say that is a design question for this spec's implementation; the honest version is better than a silent one.
- **No puzzle is removed or re-shelved to make this true,** except through the end-of-programme recalibration that is already planned.

## How we get the puzzles

This is mostly not engine work. It is a sourcing problem with a vetting tool already built.

- **The analyser is the gate.** It already reports the solve path and the hardest technique for any grid. A candidate puzzle is accepted only when the analyser confirms it teaches the intended technique, and at which step.
- **Curate first, generate second.** Hand-picked puzzles for the specific gaps are quicker to trust than a generator, and the never-taught list says exactly which gaps. The generator, already on the roadmap, then fills the long tail and uses the same gate.
- **Mind the thin list as well as the empty one.** A technique taught by exactly one puzzle is not covered. The target is two, and the report should say which techniques are at one.
- **Expect the ladder to keep moving.** A new technique can take positions away from an older one, as Empty Rectangle did from XYZ-Wing. Teaching coverage therefore has to be re-measured after every batch, not once.

## Out of scope

- Changing the ladder order to make a technique reachable. The ladder gives the easiest technique that applies, and that rule is right. If a technique is only reachable by breaking it, the technique is genuinely redundant on this library and the report should say so rather than the ladder bending.
- Technique practice mode, which is the other half of the answer and its own roadmap item: pick a technique, get a series of puzzles positioned so that technique is the next step. This spec is about the ordinary library; practice mode is about drilling.
- The puzzle generator itself, which is its own roadmap item and will use the analyser as its gate.
- Removing techniques. A technique the library never teaches is still worth having for imported and generated puzzles, and the enthusiast still meets them on their own grids.

## How we will know it worked

- **The never-taught list in the test output is empty, and no technique sits at one puzzle.** Both are printed by the report that shipped in #83, so this is a measurement rather than a judgement.
- The two numbers are reported together from now on: the share of solve-path steps a named technique explains, and the share of techniques the library teaches at least twice. The first is about the engine. The second is about the product.
- Once analytics exist: the share of players who are shown a technique above the Advanced tier at all, which today is bounded by the library rather than by their skill.
