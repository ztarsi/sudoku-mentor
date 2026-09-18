// @vitest-environment jsdom
// Toasts are confirmations: they must go away on their own and on close.
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, act, screen, cleanup } from '@testing-library/react';
import { toast, TOAST_DURATION } from '../use-toast';
import { Toaster } from '../toaster';

describe('toasts', () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('dismiss themselves after the default duration', () => {
    vi.useFakeTimers();
    render(<Toaster />);
    act(() => {
      toast({ title: 'Resumed your puzzle' });
    });
    expect(screen.queryByText('Resumed your puzzle')).not.toBeNull();
    act(() => {
      vi.advanceTimersByTime(TOAST_DURATION + 300);
    });
    expect(screen.queryByText('Resumed your puzzle')).toBeNull();
  });

  it('close button dismisses immediately', () => {
    vi.useFakeTimers();
    render(<Toaster />);
    act(() => {
      toast({ title: 'Loaded: easy' });
    });
    const close = screen.getByRole('button', { name: 'Dismiss notification' });
    act(() => {
      close.click();
      vi.advanceTimersByTime(300);
    });
    expect(screen.queryByText('Loaded: easy')).toBeNull();
  });

  it('announces politely to assistive tech', () => {
    render(<Toaster />);
    expect(screen.getByRole('status').getAttribute('aria-live')).toBe('polite');
  });
});
