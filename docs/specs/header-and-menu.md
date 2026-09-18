# Header and menu

Issue: [#32](https://github.com/ztarsi/sudoku-mentor/issues/32). Roadmap bucket: Now (UX pass, phase 4). Source: [UX review](../reviews/2026-09-18-ux-review.md) sections 4.A1, 4.A8, 4.D, 5.4, 5.5. Founder decision, 18 Sep 2026: secondary icons go behind a hamburger menu. Player served: everyone; the learner most, because the header is the first thing they read.

## The player problem

The desktop header has seven unlabelled icon buttons (colours, about, No Assist, candidates, print, copy, load) at the same weight as Load puzzle and Sign in. No Assist, which changes what the whole product does, is a lightbulb icon with no words. Progress shows only on very wide windows; the error count never shows on desktop while playing. On the phone the No Assist state is a red badge with no label. Toasts land on top of the board.

## The outcome we want

A header that says where you are and how you are doing, with one primary action, and everything secondary behind one menu. Modes are visible in words.

## Done, from the player's side

- Left: puzzle name and shelf; tapping them opens the library.
- On every width, under the header or the board: progress and error count, in the quiet style the phone already has ("31% complete", "No errors").
- Right: No Assist as a labelled switch showing its state ("No Assist: on", with the timer when on); Load puzzle; Sign in or the account menu; and one hamburger menu.
- The menu holds: How to play, Keyboard shortcuts, Theme (see the paper theme spec), Colours, Print, Copy puzzle, Clear the board (with a confirm), About. Each item is labelled with words.
- Show or hide pencil marks moves to the digit strip's pencil control area, not the header.
- Toasts appear at the bottom of the window on desktop and above the strip on touch devices, never over the board. "Resumed your puzzle" is removed; the header already says which puzzle is loaded.
- No header control is icon-only without a visible label, except the hamburger itself.

## Out of scope

- The contents of the library, About, Colours and Keyboard shortcuts dialogs.
- The hint card and panel.

## How we will know it worked

- A first-time visitor can name what every header control does without hovering.
- The error count is visible while playing on desktop at 1366x768.
- Once analytics exist: wrong-entry rate per puzzle (section 9) becomes measurable and visible to the player at the same time.
