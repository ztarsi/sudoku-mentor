# Paper theme

Roadmap bucket: Now (UX pass, phase 4). Source: [UX review](../reviews/2026-09-18-ux-review.md) sections 5.5, 5.7, decision 2. Founder decision, 18 Sep 2026: do it now. Player served: everyone who plays in daylight or prefers a light screen; many Sudoku players come from newspaper puzzles.

## The player problem

The product is dark only. The board reads well in the dark palette, but a player at a sunny window or one who dislikes dark interfaces has no option. The colour editor lets a player change five colours by hand, which is not the same as a light theme and does not reach the chrome.

## The outcome we want

Two complete, designed themes, dark and paper (light), switchable in one tap and remembered. The hint colours (pattern cells, eliminations, the digit to place) read as well on paper as in the dark.

## Done, from the player's side

- Theme is a choice in the menu: Dark, Paper, or Match my device. The choice is remembered without an account; signed-in players keep it across devices along with their colour preferences.
- On Paper: a light board on a light page, givens in black, player digits in a clearly different colour, candidates readable at the same sizes as today, and the hint colouring (blue tint for pattern cells, red tint for cells losing a candidate, amber for the digit to place) still distinct. Text contrast meets the usual accessibility minimum on both themes.
- Every dialog, the panel, the strip, the header, toasts and the print page follow the theme.
- The colour editor still exists behind the menu and edits the current theme's five colours; "Reset to defaults" resets to the current theme's defaults.
- Switching theme never changes the board state.

## Out of scope

- More than two themes.
- High-contrast mode (a candidate for later, once the theme system exists).

## How we will know it worked

- Screenshots of the hint states on both themes, checked by eye and with a contrast checker.
- Once analytics exist: the share of players on Paper tells us whether the option mattered; if it is under a few percent after a month, stop investing in themes.
