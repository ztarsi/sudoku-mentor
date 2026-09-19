import { describe, it, expect } from 'vitest';
import {
  startOnboarding,
  onFirstPlacement,
  onHintDelay,
  onHintAsked,
  onStepShown,
  onStepCleared,
  dismissPrompt,
  visiblePrompts,
  onboardingFinished,
} from '../onboarding';

describe('inline onboarding', () => {
  it('shows only the board prompt on arrival, and nothing for a returning visitor', () => {
    expect(visiblePrompts(startOnboarding())).toEqual({ board: true, hint: false, card: false });
    expect(visiblePrompts(null)).toEqual({ board: false, hint: false, card: false });
    expect(onboardingFinished(null)).toBe(true);
  });

  it('moves from the board to the hint prompt on the first placement', () => {
    const s = onFirstPlacement(startOnboarding());
    expect(visiblePrompts(s)).toEqual({ board: false, hint: true, card: false });
  });

  it('offers the hint after the delay even without a placement, and keeps the board prompt', () => {
    const s = onHintDelay(startOnboarding());
    expect(visiblePrompts(s)).toEqual({ board: true, hint: true, card: false });
    // The placement afterwards does not re-arm anything.
    expect(visiblePrompts(onFirstPlacement(s))).toEqual({ board: false, hint: true, card: false });
  });

  it('never shows the hint or card prompts where hints are off (phone, No Assist)', () => {
    const s = onFirstPlacement(startOnboarding());
    expect(visiblePrompts(s, { canHint: false })).toEqual({ board: false, hint: false, card: false });
    expect(visiblePrompts(onStepShown(s), { hasStep: true, canHint: false }).card).toBe(false);
  });

  it('ends the hint prompt when a hint is asked and shows the card prompt with the first card only', () => {
    let s = onHintAsked(onFirstPlacement(startOnboarding()));
    expect(visiblePrompts(s, { hasStep: false }).hint).toBe(false);
    s = onStepShown(s);
    expect(visiblePrompts(s, { hasStep: true })).toEqual({ board: false, hint: false, card: true });
    s = onStepCleared(s);
    expect(visiblePrompts(onStepShown(s), { hasStep: true }).card).toBe(false);
    expect(onboardingFinished(s)).toBe(true);
  });

  it('can be tapped away, once', () => {
    let s = dismissPrompt(startOnboarding(), 'board');
    expect(visiblePrompts(s).board).toBe(false);
    s = onFirstPlacement(s);
    expect(s.board).toBe('done');
    expect(visiblePrompts(s).hint).toBe(true);
    s = dismissPrompt(s, 'hint');
    expect(visiblePrompts(s).hint).toBe(false);
    expect(visiblePrompts(onHintDelay(s)).hint).toBe(false);
  });
});
