// @vitest-environment jsdom
// Issue #42: the board never waits on the platform. With no app id there
// are no platform calls at all; with one, the children render at once and
// sign-in resolves in the background, even when the call hangs.
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';

const params = vi.hoisted(() => ({ appId: null, token: null }));
vi.mock('@/lib/app-params', () => ({
  appParams: params,
  hasPlatform: () => !!params.appId && params.appId !== 'null' && params.appId !== 'undefined',
}));
vi.mock('@/api/base44Client', () => ({
  base44: { auth: { me: vi.fn(), logout: vi.fn(), redirectToLogin: vi.fn() } },
}));

import { AuthProvider, useAuth } from '../AuthContext';

function Probe() {
  const { user, isLoadingAuth, isLoadingPublicSettings, authError } = useAuth();
  return (
    <div>
      <span data-testid="board">board</span>
      <span data-testid="state">{`${isLoadingPublicSettings}|${isLoadingAuth}|${authError?.type || 'none'}|${user ? user.email : 'anon'}`}</span>
    </div>
  );
}

const tick = () => act(() => new Promise((r) => setTimeout(r, 0)));

describe('AuthProvider (board first)', () => {
  let fetchMock;
  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); params.appId = null; params.token = null; });

  it('makes no platform call and starts signed out when there is no app id', async () => {
    params.appId = null;
    render(<AuthProvider><Probe /></AuthProvider>);
    await tick();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByTestId('state').textContent).toBe('false|false|none|anon');
  });

  it('treats the string "null" (an unset build variable) as no app id', async () => {
    params.appId = 'null';
    render(<AuthProvider><Probe /></AuthProvider>);
    await tick();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('renders the children at once while a hanging platform call is still pending', async () => {
    params.appId = 'app123';
    fetchMock.mockImplementation(() => new Promise(() => {})); // never settles
    render(<AuthProvider><Probe /></AuthProvider>);
    expect(screen.getByTestId('board')).toBeTruthy();
    await tick();
    expect(screen.getByTestId('state').textContent).toBe('true|true|none|anon');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toContain('/by-id/app123');
  });

  it('continues signed out when the platform answers with an error that is not a verdict', async () => {
    params.appId = 'app123';
    fetchMock.mockResolvedValue({ ok: false, status: 404, json: async () => ({ message: 'Not found' }) });
    render(<AuthProvider><Probe /></AuthProvider>);
    await tick(); await tick();
    expect(screen.getByTestId('state').textContent).toBe('false|false|none|anon');
  });

  it('honours the platform verdict that sign-in is required', async () => {
    params.appId = 'app123';
    fetchMock.mockResolvedValue({ ok: false, status: 403, json: async () => ({ extra_data: { reason: 'auth_required' } }) });
    render(<AuthProvider><Probe /></AuthProvider>);
    await tick(); await tick();
    expect(screen.getByTestId('state').textContent).toBe('false|false|auth_required|anon');
  });

  it('aborts the platform call after the timeout and continues signed out', async () => {
    vi.useFakeTimers();
    params.appId = 'app123';
    fetchMock.mockImplementation((_url, { signal }) => new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
    }));
    render(<AuthProvider><Probe /></AuthProvider>);
    await act(async () => { await vi.advanceTimersByTimeAsync(9000); });
    expect(screen.getByTestId('state').textContent).toBe('false|false|none|anon');
    vi.useRealTimers();
  });
});
