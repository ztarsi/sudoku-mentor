# Practice mode: find this technique, on a real board

Issue: to be filed with this spec. Roadmap bucket: Next. Founder, 2 November 2026: "start on the practice mode". Player served: the improver, above all the one who has just read how a technique works and wants to try it.

## The player problem

A player who reads how a Swordfish works has, today, two ways to meet one: play the puzzles the reference names until the hint happens to reach it, or wait for a hint to bring it up by chance. Reading a technique and finding one are different skills, and the product only teaches the first on demand. The hint gives the answer; nothing asks the player to find it.

Teaching coverage (#88) found the other half of the problem. Seven techniques were never once the hint in 133,000 generated boards, because an easier technique always reaches their positions first. They are on real boards, counted and correct, and no puzzle will ever teach them through the hint. The ladder is right not to bend for them. Practice is where they can be met.

## What practice is

From a technique's reference, the player presses **Practise this**. The board becomes a real position, taken from a library puzzle's solve path, on which that technique is present, and a line above the board says what to do: "Find a Swordfish on this board." The player looks, and makes the move the technique allows: erases the pencil marks it rules out, or places the digit it proves. The mentor says when they have found it.

- **A position, not a puzzle.** The drill starts mid-solve, with the pencil marks the mentor's own steps would have produced, because that is where the pattern lives. The player can keep playing from there if they like.
- **Real boards only.** Every position comes from a puzzle in the library, with one answer, and the technique on it is checked against that answer by the same oracle that checks every hint.
- **The next step where possible.** Where the technique is also what the hint would give on that board, the drill says so; where an easier move is also on the board, the line says that too ("an easier move is also here; this drill is about the Swordfish"), because pretending otherwise would be the kind of small lie the product does not tell.
- **Help on request, never by default.** "Show me" highlights one instance the way the Techniques list does. "Next position" moves on. "Stop" returns the player to the puzzle they were on.
- **Checking is the game's own.** A wrong digit or erasing the answer's mark is refused as it always is. A move that is legal but not the technique's is allowed and not praised. The drill is found when the player's board shows every erasure (or the placement) of any one instance of the technique.

## Done, from the player's side

- Every technique that is counted on a board, and is present on some board of the library's solve paths, can be practised from its reference. For a technique with no such position, the reference offers no button rather than a button that fails.
- Two or three positions per technique, from different puzzles where the library has them.
- The drill line is above the board on every width that has the lesson panel, and announced to screen readers; "Found it" is announced too.
- Practice is assistance: it is not offered in No Assist, and a practice board earns no solve record.
- Stopping practice returns the puzzle the player left, as they left it.

## How the positions stay honest

The drills are a cache of the engine's answers, like the library's labels (#95): generated from the live engine by their own test, and held to it by the same test. Every drill must still have its technique on its board, and every drill marked as the next step must still be the next step. A drill that goes stale fails the build rather than misleading a player.

## Out of scope

- The phone, which has no lesson panel and is No Assist until learning on the phone is answered.
- Scoring, streaks and timed drills.
- Positions built by hand. A hand-built grid with two answers is how the uniqueness tests prove a deadly pattern, and it is exactly the wrong thing to give a player.
- The Search tiers. A forcing proof is not a pattern to find by eye.

## How we will know it worked

- From any technique's reference, a player can reach a board with that technique on it in one press, for every technique the library's paths contain.
- The seven techniques the hint never reaches each have practice positions.
