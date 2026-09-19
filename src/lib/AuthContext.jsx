import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { appParams, hasPlatform } from '@/lib/app-params';

const AuthContext = createContext(null);

// A platform call that neither succeeds nor fails (captive portal, stalled
// mobile link, flaky proxy) must not hold anything up. The board never
// waits on this; the cap only bounds how long the request itself lives.
export const PLATFORM_CALL_TIMEOUT_MS = 8000;

// The platform's public-settings endpoint. Fetched directly (no deep import
// into the SDK's private axios helper) and shaped like the SDK's errors:
// { status, data, message }.
const fetchPublicSettings = async (signal) => {
  const headers = { 'X-App-Id': appParams.appId };
  if (appParams.token) headers.Authorization = `Bearer ${appParams.token}`;
  const response = await fetch(`/api/apps/public/prod/public-settings/by-id/${appParams.appId}`, { headers, signal });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const error = /** @type {any} */ (new Error(data?.message || `Request failed with status code ${response.status}`));
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  // "Loading" describes the sign-in state only. Nothing renders behind a
  // spinner because of it: the board shows at once and the header updates
  // when the answer arrives (issue #42).
  const [isLoadingAuth, setIsLoadingAuth] = useState(hasPlatform());
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(hasPlatform());
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings, setAppPublicSettings] = useState(null); // Contains only { id, public_settings }

  const checkUserAuth = useCallback(async () => {
    try {
      setIsLoadingAuth(true);
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setIsAuthenticated(true);
      setIsLoadingAuth(false);
    } catch (error) {
      console.error('User auth check failed:', error);
      setIsLoadingAuth(false);
      setIsAuthenticated(false);

      // If user auth fails, it might be an expired token
      if (error.status === 401 || error.status === 403) {
        setAuthError({
          type: 'auth_required',
          message: 'Authentication required'
        });
      }
    }
  }, []);

  const checkAppState = useCallback(async () => {
    // No app id: a staging or local build with no platform behind it. Make
    // no platform calls at all and start signed out.
    if (!hasPlatform()) {
      setAuthError(null);
      setIsAuthenticated(false);
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
      return;
    }

    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), PLATFORM_CALL_TIMEOUT_MS) : null;
    try {
      setIsLoadingPublicSettings(true);
      setAuthError(null);

      try {
        const publicSettings = await fetchPublicSettings(controller?.signal);
        setAppPublicSettings(publicSettings);

        // If we got the app public settings successfully, check if user is authenticated
        if (appParams.token) {
          await checkUserAuth();
        } else {
          setIsLoadingAuth(false);
          setIsAuthenticated(false);
        }
        setIsLoadingPublicSettings(false);
      } catch (appError) {
        // A platform verdict (auth required, not registered) is honoured.
        // Anything else - the network is down, the platform is unreachable,
        // the request timed out - must not brick a puzzle app that works
        // perfectly well signed out: continue in anonymous mode.
        if (appError.status === 403 && appError.data?.extra_data?.reason) {
          console.error('App state check failed:', appError);
          const reason = appError.data.extra_data.reason;
          if (reason === 'auth_required') {
            setAuthError({
              type: 'auth_required',
              message: 'Authentication required'
            });
          } else if (reason === 'user_not_registered') {
            setAuthError({
              type: 'user_not_registered',
              message: 'User not registered for this app'
            });
          } else {
            setAuthError({
              type: reason,
              message: appError.message
            });
          }
        } else {
          console.warn('Could not reach the platform; continuing signed out.', appError?.message || appError);
          setAuthError(null);
          setIsAuthenticated(false);
        }
        setIsLoadingPublicSettings(false);
        setIsLoadingAuth(false);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      setAuthError(null);
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }, [checkUserAuth]);

  useEffect(() => {
    checkAppState();
  }, [checkAppState]);

  const logout = (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);

    if (shouldRedirect) {
      // Use the SDK's logout method which handles token cleanup and redirect
      base44.auth.logout(window.location.href);
    } else {
      // Just remove the token without redirect
      base44.auth.logout();
    }
  };

  const navigateToLogin = () => {
    // Use the SDK's redirectToLogin method
    base44.auth.redirectToLogin(window.location.href);
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      logout,
      navigateToLogin,
      checkAppState
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
