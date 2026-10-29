# Hint animation: one template for every technique

Issue: [#97](https://github.com/ztarsi/sudoku-mentor/issues/97). Blocked by [#98](https://github.com/ztarsi/sudoku-mentor/issues/98), the merge that reconciles `main` into `staging`. Roadmap bucket: Next, and release-blocking. Founder decision, 26 Oct 2026: the animation built in the Base44 editor is the template, and all animations follow it as far as possible. Player served: everyone who asks for a hint, the learner most.

## Why this spec exists

Two answers to the same problem arrived within hours of each other.

The founder built an X-Cycle animation in the Base44 editor, on `main`. The board becomes the stage, the caption and playback controls sit under the puzzle, and the picture builds one increment at a time with a sentence for each.

The coverage programme built a walkable proof on `staging`, for chains, colouring and forcing: a list of lines inside the hint card, with its own prev, play and next.

The founder's is the template. This spec writes it down so every technique can follow it, and says what the walk contributes.

## The template, from the player's side

- A hint whose proof has more than one step offers one button on the card: **Animate on the board**.
- Pressing it hands the board over. The card says the animation is playing and where to look. The **caption and the controls appear directly under the puzzle**, never over the board.
- **The picture builds.** Each frame adds one increment, and its caption says in plain English what just changed, naming real cells.
- **The controls are always the same set:** Previous, Play and Pause, Next, Show result, and Close, with Replay in place of Play once the last frame is reached, and "Step N of M" alongside.
- It **plays by itself** at about three and a half seconds a frame and can be paused, stepped, restarted or closed at any point. Closing gives the board back.
- The caption is **announced to screen readers** as it changes.
- The animation explains; it never changes the board. Nothing is placed or erased by watching.

## What makes it a template rather than one animation

- **One frame builder per family, chosen by what a step carries rather than by its name.** A builder takes a step and returns an ordered list of frames; a frame says how much of the picture to draw and carries exactly one caption. A technique joins in by carrying its family's shape, so a new technique animates without being added to a list. (Amended 2026-10-26: the first version said one builder per technique, which would not have fitted in the bundle at sixty-one techniques and would have needed editing for every new one.)
- **The card starts it, the board draws it.** A small shared store holds the current frame, so the frame never travels down the page's prop chain.
- **No technique invents its own playback.** One control set, one timer, one store, one overlay. A card with its own prev and next is a bug.
- **The board stands down while an animation plays.** Everything the board draws for a step at rest gives way: the highlighted cells, the chain, the colouring tints, the set outlines, and above all the red marks the step is about to erase. Without that last one the board shows the conclusion before the first frame and the animation has nothing left to reveal. (Added 2026-10-26, found by building it: the template on `main` already did this for the highlighted cells and said why.)
- **A frame is one idea.** If a caption needs two sentences to explain what changed, the frame is doing too much and should be two frames.
- **Changing the explanation level mid-animation keeps your place.** A player who toggles Beginner to Expert part-way through a proof wants the same frame in other words, not a closed animation. The picture is identical at both levels, so the frame number carries over. (Decided 2026-10-26.)
- **Captions follow the explanation level.** Beginner is the default and uses the vocabulary rules the lesson text already follows: no *candidate*, *unit*, *strong link*, *node* or *conjugate*, one idea per sentence, cells named like `R5C3`. Expert captions use the standard terms and notation. The template as built writes at one level; this is the one thing it must gain.
- **Reduced motion is honoured.** Where the player's system asks for reduced motion, frames still change but transitions do not animate, and the animation does not start playing by itself. A feature whose whole job is motion has to take that setting seriously.
- **A single-step proof gets no button.** One frame is not an animation, so singles, intersections and the simpler subsets do not offer one.

## The shape of each family's frames

The words belong to each technique. The shape is the template's.

| Family | Frames, in order |
| --- | --- |
| Colouring (X-Cycle, 3D Medusa) | The cells in play, then each link with the reason it holds, then the colours on, then the clash or the trap, then the erasure. This is the built template; the rest follow it. |
| Chains, grouped and plain | Each node in turn with its link's reason, a group drawn as one outlined region, both ends ringed, then what the two ends prove. |
| Continuous loops | As a chain, drawn closed, then each elimination the loop licenses. |
| Fish, finned and sashimi | The base lines, then the cover lines, then the fins, then the cells that survive seeing every fin. |
| Subsets and wings | The cells of the pattern, then the digits they share, then what cannot be. |
| Almost locked sets | Each set outlined with its digits, then the restricted common, then the lock, then the erasure. |
| Uniqueness | The rectangle or loop, then the two answers it would allow, then what cannot be true. |
| Forcing proofs and nets | One case per option, each case's forced moves, what became of that case, then the line that says every case was checked. The board draws every case at once, one colour each, because a proof by cases has no single line. |

## What the walk contributes

Its words, which are the expensive part and are already written and tested: the per-link sentences, the vocabulary rules, the Expert notation, the shortest-run choice that keeps a colouring to a median of three lines rather than walking a whole network, and the case-by-case structure for a forcing proof.

What goes is the second playback mechanism: the in-card list, its controls and its own board overlay. One walker, one stage.

## Done, from the player's side

- Every technique whose proof has more than one step animates, and all of them through the same mechanism.
- No hint card has its own playback controls.
- Captions read at the player's chosen explanation level.
- Reduced motion is respected, and every control is reachable and labelled by keyboard.
- A technique with no frame builder shows no animate button, rather than a button that does nothing. With 61 techniques in the catalog, this has to be checked rather than assumed.
- **Nothing about the engine moves.** No eliminations, tiers or ladder positions change, and the analyser's per-shelf report and the never-taught list come out byte-identical. This is presentation.

## Out of scope

- The phone, which has no lesson panel and is always No Assist until "learning on the phone" is answered. The captions-under-the-board shape would suit a phone well, so revisit this together with that question.
- New colours. The two tints and the base and target colours already in use are enough.
- Animating anything that is not a hint.
- Teaching the animation itself. It should need no explaining.

## How we will know it worked

- A player can watch any Ultimate hint explain itself without reading a paragraph, and can pause and step back when it goes too fast.
- Nobody has to ask for a hint again to see the explanation a second time.
- One playback implementation exists in the codebase. The way to check is to look for a second set of controls and find none.
- With reduced motion set, the animation is still usable and does not move on its own.

## Outcome

Rolled out in PR #102 to `staging` on 2026-10-26, on top of the `main` reconciliation in PR #101. Verified by the product manager on 2026-10-29: lint, typecheck, 760 tests and build pass, and the analyser's per-shelf report and never-taught list are byte-identical to before, so nothing about the engine moved.

**Built without this spec, which is my fault.** The pull request carrying this file sat unmerged for three days while I believed CI was blocking it, so the developer built from the issue body and said so on the issue twice. It landed close to the spec anyway, and improved on it in three places, all folded in above: builders dispatch on what a step carries rather than on a technique's name, the board stands down its at-rest drawing while an animation plays, and the elimination marks in particular have to stand down or the board gives the answer away before the first frame.

What shipped:

- **36 techniques animate from real library steps,** plus the five forcing techniques and Hypothesis Mode from their own engines and a hand-built rectangle for the uniqueness family. The two singles correctly offer no button.
- **Each family's frames:** chains and colouring grow a link at a time with the active link drawn heavier; forcing proofs draw each case in its own colour with the digits it forces as ghosts that reset when the next case opens; fish show the base lines, then the lines the eliminations come from, then the crosses; subsets, wings, sets, uniqueness and the box-line families show the shape, then the piece that makes it work, then what it erases, in the order their own lesson text names them.
- **The captions are the walk's sentences,** with each link now also given in the standard notation, so the Beginner and the Expert read the same proof in their own words. No new English was written. A test asserts the two levels differ for every technique, that the Beginner captions obey the vocabulary rules, and that the picture is identical at either level.
- **Reduced motion is honoured in all three places,** and a test caught that framer-motion's own hook caches globally, so it would have been read once per page load and never updated.
- **One playback survives.** The in-card list, its controls, its step counter and the playback index threaded through four components are gone: 215 lines fewer outside the new builder.
- **Nine lines of lesson text still pointed at the list that no longer exists** and now point at the animation. The developer found those only by driving the built app, which is the argument for doing that rather than trusting tests.

Two things to carry forward. **17 techniques have no library step of their own to animate**, the thirteen uniqueness ones, W-Wing, Remote Pairs and the two Sue de Coqs; they animate by sharing a family's builder but are not verified on a real step. They are named explicitly in the test, so one dropping out fails rather than passing quietly, and they are the same set [teaching coverage](teaching-coverage.md) (#88) is about. And the bundle is at **980,469 bytes of the 1,000,000 budget**, 19.5 kB of headroom, which makes [#91](first-board-payload.md) the next thing that will block work rather than a tidy-up.
