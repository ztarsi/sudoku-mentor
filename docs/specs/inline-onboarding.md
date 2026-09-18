# Inline onboarding

Issue: [#34](https://github.com/ztarsi/sudoku-mentor/issues/34). Roadmap bucket: Now (UX pass, phase 4). Source: [UX review](../reviews/2026-09-18-ux-review.md) sections 4.A6, 5.5, decision 5. Founder decision, 18 Sep 2026: the PM decides based on research. Decision: replace the modal tour with in-context prompts. Player served: the learner and every first-time visitor.

## Why in-context prompts and not a tour

The research I know points one way. Nielsen Norman Group's studies of instructional overlays and coach marks found that people dismiss them to get to the product and cannot recall the instructions minutes later; guidance shown at the moment it is needed, tied to the thing on screen, is retained. Product-onboarding vendors report tour completion well under half of visitors. Our own tour blocks the board on arrival, which is the opposite of the quality bar's "place a digit within ten seconds without reading anything". I could not re-read the sources from the review environment; the conclusion is consistent across everything I have read on the topic.

## The player problem

The first thing a new visitor sees is a modal with three paragraphs. They cannot touch the board until they dismiss it. Afterwards, the same three ideas (enter a digit, ask for a hint, apply it or do it yourself) are not repeated anywhere, so a player who skipped the tour has no way back except the About dialog.

## The outcome we want

A new visitor is playing within seconds, and each of the three ideas arrives at the moment it is useful, on the element it concerns, once.

## Done, from the player's side

- No modal on arrival. The board is live immediately.
- Three small prompts, each anchored to its control, each shown once and dismissed by doing the thing or by tapping it away:
  1. On the board, until the first digit is placed: "Tap a cell, then a digit" (or "Pick a digit, then tap cells" on touch).
  2. On the Hint button, after the first placement or after 30 seconds without one: "Stuck? Ask for a hint."
  3. On the first hint card: "Apply it, or place the digit yourself to practise."
- "How to play" in the menu shows the same three ideas plus the one-line rules of Sudoku, any time.
- Prompts never cover the cell or control they point at, and never appear on the phone's lesson-less arrangement for ideas 2 and 3.
- Returning visitors see none of this.

## Out of scope

- Teaching the rules of Sudoku beyond one line.
- A per-technique first-time explainer (the technique reference already does this).

## How we will know it worked

- First placement on a fresh visit under ten seconds, measured the same way as the quality bar.
- Once analytics exist: return rate (section 9, measure 1) for first-time visitors, compared before and after; and the share of first sessions that ask for at least one hint.
