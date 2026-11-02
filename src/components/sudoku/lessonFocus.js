// Where focus goes when a lesson leaves the page (issue #109).
//
// Asking for a hint moves focus into the hint card; the card owns that, in
// CurrentStepCard. The other half is what happens when the lesson goes:
// Apply removes the button that had focus, and so does closing the lesson
// sheet. The browser then leaves focus on <body>, which puts a keyboard
// player back at the top of the document - the defect the UX review found.
//
// Focus goes back to the hint control instead, which is the one Hint button
// on this width: the card's where the lesson is a column, the strip's where
// it is a sheet. Kept out of React so it can be tested on its own.

/** The Hint button focus comes back to. */
export const HINT_CONTROL = '[data-hint-control]';
/** The lesson: the hint card, and the sheet it lives in on narrow widths. */
export const LESSON = '[data-lesson-card], [data-lesson-sheet]';

const defaultSchedule = (fn) =>
  typeof requestAnimationFrame === 'function' ? requestAnimationFrame(fn) : fn();

/**
 * Hand focus back to the hint control, once the page has re-rendered.
 *
 * Focus anywhere outside the lesson is the player's own and is never taken:
 * pressing A to apply a step from a board cell leaves focus on that cell.
 * This moves focus only when it was in the lesson that is going (a sheet
 * animates out, so it still holds focus for a moment after it closes) or
 * when it has already been dropped on the document.
 *
 * @param {(fn: () => void) => void} [schedule] when to look; a frame by default.
 */
export function restoreFocusAfterLesson(schedule = defaultSchedule) {
  const leaving = document.activeElement;
  const wasInLesson = leaving instanceof HTMLElement && !!leaving.closest(LESSON);
  schedule(() => {
    const active = document.activeElement;
    const dropped = !active || active === document.body || active === document.documentElement;
    if (!dropped && !wasInLesson) return;
    const control = document.querySelector(HINT_CONTROL);
    if (control instanceof HTMLElement) control.focus();
  });
}
