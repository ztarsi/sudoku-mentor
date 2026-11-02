/**
 * The two blue gradients the header paints white text on: the primary
 * button and the app badge.
 *
 * Both were a shade too light to carry their own label. "Load puzzle"
 * measured 3.68:1 in dark and 4.09:1 in paper, and the badge's "9" 3.68:1,
 * against the 4.5:1 that 1.4.3 asks for (issue #109). They are named here
 * rather than written into the markup so a test can do the sum at both ends
 * of each gradient in both themes, instead of a review finding it again.
 *
 * Any shade used here has to clear 4.5:1 against `text-white`, which the
 * paper theme turns into ink; `accessibilityPass.spec.jsx` checks every one.
 */
export const PRIMARY_GRADIENT =
  'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700';

export const BADGE_GRADIENT = 'bg-gradient-to-br from-blue-600 to-indigo-700';
