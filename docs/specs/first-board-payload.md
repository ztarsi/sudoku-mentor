# What a player downloads before the first board

Issue: [#91](https://github.com/ztarsi/sudoku-mentor/issues/91). Roadmap bucket: Next. Source: raised by the developer in #74 on 24 Oct 2026, when the uniqueness family pushed the build past its budget. Player served: every first-time visitor, and every player on a phone.

## The player problem

The quality bar in `docs/PRODUCT.md` section 8 says a first-time visitor can place a digit within ten seconds of arriving, on phone and desktop, without reading anything. That is the product's first second and the promise it is easiest to break quietly.

The build is now about 935 kB of uncompressed JavaScript, up from 900 kB a few hours ago, and the coverage programme has one batch left. Everything loads before the board: every technique engine a player has not asked to use, and 61 kB of reference prose nobody has asked to read. A player who wants to put a 5 in a cell is waiting for Mutant Fish.

Nobody chose this. It accumulated one batch at a time, which is exactly how a quality bar erodes.

## The measure is wrong, and that is the part to fix first

CI guards the total of every chunk in the build. So splitting code into lazily loaded chunks does not move the number by a single byte. The check punishes the one change that would help, and the only way to pass it is to write less code or raise the number. We have now raised it once.

What matters to the player is what arrives before the first board. That is the entry chunks. Measure those, and the rest becomes a separate number that can grow with the catalog without lying about the thing we care about.

## Done, from the player's side

- **The board is live in the first second.** On a phone at a throttled connection, the first paint and the first accepted digit are well inside the ten-second bar, with room to spare rather than just inside it.
- **What the first board does not need, it does not download.** The reference prose, the technique detectors and anything else only a hint requires arrive when they are first wanted.
- **The first hint does not feel broken.** If its code is still arriving, the card says it is getting ready rather than sitting blank or dead. A player who presses Hint and sees nothing assumes the product is broken, which is worse than a wait that is labelled.
- **CI guards the entry chunks** and reports the rest separately, so a future batch that adds a technique cannot quietly cost the first board anything.
- No change to any technique, any explanation, the ladder, or what the mentor can teach. This is about when code arrives, not what it does.

## Two things that will bite if forgotten

- **Offline play.** The installable app with full offline play is on the roadmap. A lazily loaded hint engine that the service worker does not precache means an offline player gets a board and no mentor, which is a worse product than today's. Whoever builds this decides how the two fit together and writes it down, even if offline comes later.
- **No further nudges to the total.** The last batch of the coverage programme has been told to report rather than raise the number if its work does not fit. If this spec is late and that batch is blocked, the answer is to do this work, not to move the line again.

## Out of scope

- Rewriting or shrinking the engines. They are the product.
- Cutting reference text. It is one of the better things in the product; it just does not need to arrive first.
- The service worker's wider behaviour and installability, which belong to the offline roadmap item.

## How we will know it worked

- Measured on a production build at phone width with the connection and processor throttled: time to first paint, and time to first accepted digit. Both recorded in the issue so the next change has a number to beat.
- The entry-chunk budget in CI is a number with a reason written beside it, and the total is reported but not enforced.
- The first hint on a cold load is either instant or visibly getting ready, never silent.
