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

- **One frame builder per technique.** It takes a step and returns an ordered list of frames. A frame says how much of the picture to draw and carries exactly one caption.
- **The card starts it, the board draws it.** A small shared store holds the current frame, so the frame never travels down the page's prop chain.
- **No technique invents its own playback.** One control set, one timer, one store, one overlay. A card with its own prev and next is a bug.
- **A frame is one idea.** If a caption needs two sentences to explain what changed, the frame is doing too much and should be two frames.
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
