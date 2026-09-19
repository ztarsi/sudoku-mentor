import { createClient } from '@base44/sdk';
import { appParams, hasPlatform } from '@/lib/app-params';

const { appId, token, functionsVersion } = appParams;

// Without an app id (staging, local builds) the real client would still
// send analytics to /api/apps/null/... on load. The stand-in answers every
// call with a rejection, and the sign-in actions do nothing, so a build
// with no platform behind it makes no platform calls (issue #42).
const noPlatform = () => Promise.reject(new Error('No platform is configured for this build'));
const rejectingCallable = () => {
  const fn = () => noPlatform();
  return new Proxy(fn, { get: (_t, prop) => (typeof prop === 'symbol' ? undefined : rejectingCallable()), apply: () => noPlatform() });
};

/** @type {any} */
const stub = {
  auth: {
    me: noPlatform,
    logout: () => {},
    redirectToLogin: () => {},
  },
  entities: new Proxy({}, { get: () => rejectingCallable() }),
  integrations: { Core: new Proxy({}, { get: () => noPlatform }) },
  appLogs: { logUserInApp: noPlatform },
};

export const base44 = hasPlatform()
  ? createClient({
      appId,
      token,
      functionsVersion,
      serverUrl: '',
      requiresAuth: false
    })
  : stub;
