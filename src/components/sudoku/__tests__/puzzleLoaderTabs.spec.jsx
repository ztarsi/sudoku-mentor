// @vitest-environment jsdom
// The Load puzzle dialog's three tabs (issue #107).
//
// Two things were wrong with them. On a phone the third was clipped to
// "Tex", and typing or pasting a puzzle is one of the few routes a build
// with no platform behind it supports at all. And the Image tab was
// disabled with a padlock and a tooltip: a padlock explains nothing, a
// tooltip is not there on a touch screen, and a disabled button is not in
// the tab order, so a player had no way to find out what it wanted. On
// staging it could never unlock, because there is no platform to sign in to.
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, cleanup, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const hasPlatform = vi.fn(() => true);
vi.mock('@/lib/app-params', () => ({
  hasPlatform: () => hasPlatform(),
  appParams: { appId: 'test', token: null, fromUrl: 'http://localhost/', functionsVersion: null },
}));

const { default: UnifiedPuzzleLoader } = await import('../UnifiedPuzzleLoader');

const show = (props = {}) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <UnifiedPuzzleLoader isOpen onClose={() => {}} onPuzzleLoaded={() => {}} user={null} {...props} />
    </QueryClientProvider>
  );
};
const tabNames = (view) =>
  within(view.getByRole('dialog')).getAllByRole('button')
    .map((b) => (b.getAttribute('aria-label') || b.textContent || '').trim())
    .filter((name) => /^(Library|Image|Text)\b/.test(name));

afterEach(() => {
  cleanup();
  hasPlatform.mockReturnValue(true);
});

describe('the Load puzzle tabs', () => {
  it('does not offer photo import where there is no platform to sign in to', () => {
    hasPlatform.mockReturnValue(false);
    const view = show();
    expect(tabNames(view)).toEqual(['Library', 'Text']);
  });

  it('offers it where there is, and says in its name that it needs an account', () => {
    const view = show();
    expect(tabNames(view)).toEqual(['Library', 'Image, needs an account', 'Text']);
  });

  it('lets a signed-out player open it and read why, instead of locking them out', () => {
    const view = show();
    const image = view.getByRole('button', { name: 'Image, needs an account' });
    // The defect: disabled, so unreachable by keyboard, with a tooltip no
    // touch screen shows.
    expect(image.hasAttribute('disabled')).toBe(false);
    fireEvent.click(image);
    const dialog = view.getByRole('dialog');
    expect(within(dialog).getByText(/needs an account/)).toBeTruthy();
    expect(within(dialog).getByText(/Text tab never does/)).toBeTruthy();
    expect(within(dialog).getByRole('button', { name: 'Sign In' })).toBeTruthy();
  });

  it('wraps the row rather than clipping a tab off the end of it', () => {
    const view = show();
    const row = view.getByRole('button', { name: 'Library' }).parentElement;
    // Measured on a production build: the three fit one row from 360px up,
    // and at 320px the row wraps instead of hiding "Text" (#107).
    expect(row.className).toContain('flex-wrap');
  });
});
