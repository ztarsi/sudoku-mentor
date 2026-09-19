/**
 * The first visit's three in-context prompts (inline-onboarding spec), as
 * a small pure state machine the page drives:
 *
 *   board  "Tap a cell, then a digit"        until the first digit is placed
 *   hint   "Stuck? Ask for a hint."          after the first placement, or
 *                                            after 30 s without one
 *   card   "Apply it, or place the digit     on the first hint card
 *           yourself to practise."
 *
 * Each prompt is shown once and ends by doing the thing or by dismissal.
 * `null` means no onboarding (a returning visitor).
 *
 * A prompt is 'pending' (not yet due), 'due' (shows when its anchor is on
 * screen), 'showing' (its anchor is on screen) or 'done'.
 */
export const HINT_PROMPT_DELAY_MS = 30000;

export const startOnboarding = () => ({ board: 'due', hint: 'pending', card: 'due' });

const done = (state, id) => (state && state[id] !== 'done' ? { ...state, [id]: 'done' } : state);

/** The first digit went in: the board prompt is done and the hint prompt is due. */
export const onFirstPlacement = (state) => {
  if (!state) return state;
  const next = done(state, 'board');
  return next.hint === 'pending' ? { ...next, hint: 'due' } : next;
};

/** Thirty seconds without a placement: offer the hint anyway. */
export const onHintDelay = (state) => (state && state.hint === 'pending' ? { ...state, hint: 'due' } : state);

/** The player asked for a hint: the hint prompt did its job. */
export const onHintAsked = (state) => done(state, 'hint');

/** A hint card is on screen: the card prompt shows with it. */
export const onStepShown = (state) => (state && state.card === 'due' ? { ...state, card: 'showing' } : state);

/** The hint card went away (applied, placed, or the board was touched). */
export const onStepCleared = (state) => (state && state.card === 'showing' ? { ...state, card: 'done' } : state);

/** Tapped away. */
export const dismissPrompt = (state, id) => done(state, id);

/** Which prompts to render right now. */
export const visiblePrompts = (state, { hasStep = false, canHint = true } = {}) => ({
  board: !!state && state.board === 'due',
  hint: !!state && state.hint === 'due' && canHint && !hasStep,
  card: !!state && (state.card === 'showing' || (state.card === 'due' && hasStep)) && canHint,
});

export const onboardingFinished = (state) => !state || (state.board === 'done' && state.hint === 'done' && state.card === 'done');
