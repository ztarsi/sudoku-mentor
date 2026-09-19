import { useMediaQuery } from './useMediaQuery';

/**
 * The one page arranges itself by width (one-adaptive-page spec):
 *
 *   wide     1200px and up      board + strip left, lesson column right
 *   medium   800px to 1199px    the same two columns with a smaller board;
 *                               under 960px the lesson is a side sheet that
 *                               opens on Hint and can be pinned open
 *   stacked  600px to 799px     one column; the lesson is a bottom sheet
 *   phone    under 600px        one column, no lesson, No Assist stays on
 *
 * `lesson` says where the lesson panel lives: 'column', 'side', 'bottom'
 * or 'none'. `stripFixed` says whether the digit strip is a fixed bar at
 * the bottom (thumb reach) or a card under the board.
 */
export const WIDE_QUERY = '(min-width: 1200px)';
export const TWO_COLUMN_QUERY = '(min-width: 960px)';
export const MEDIUM_QUERY = '(min-width: 800px)';
export const STACKED_QUERY = '(min-width: 600px)';
export const TOUCH_QUERY = '(pointer: coarse)';

/** Pure mapping from the four width flags to an arrangement; exported for tests. */
export function arrangementFor({ wide, twoColumns, medium, stacked, touch = false }) {
  if (wide) return { arrangement: 'wide', lesson: 'column', stripFixed: false, touch };
  if (medium) return { arrangement: 'medium', lesson: twoColumns ? 'column' : 'side', stripFixed: false, touch };
  if (stacked) return { arrangement: 'stacked', lesson: 'bottom', stripFixed: true, touch };
  return { arrangement: 'phone', lesson: 'none', stripFixed: true, touch };
}

export function useArrangement() {
  const wide = useMediaQuery(WIDE_QUERY);
  const twoColumns = useMediaQuery(TWO_COLUMN_QUERY);
  const medium = useMediaQuery(MEDIUM_QUERY);
  const stacked = useMediaQuery(STACKED_QUERY);
  const touch = useMediaQuery(TOUCH_QUERY);
  return arrangementFor({ wide, twoColumns, medium, stacked, touch });
}
