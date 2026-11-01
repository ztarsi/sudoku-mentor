// When the mentor's code arrives (first-board payload, #91).
//
// The board needs none of the technique detectors, the reference prose or
// the lesson panel to accept a digit, so those load after it. Each loader
// is memoised: the first call starts the download and every later call gets
// the same promise, so a hint asked for mid-download waits for the one
// already in flight rather than starting another.
//
// Offline play: the service worker caches every /assets/ file it fetches
// (public/sw.js). The panel is fetched as soon as it renders, and warmMentor
// fetches it once the browser is idle where it does not render at once, so
// a player who opens the app once online has the mentor cached for offline,
// as before the split. A player who goes offline within a second or two of
// the first visit gets a board without the mentor, and the lesson column
// says so; precaching the whole build belongs to the offline roadmap item.

const once = (load) => {
  let promise = null;
  let loaded = null;
  const get = () => {
    if (!promise) {
      promise = load().then(
        (module) => {
          loaded = module;
          return module;
        },
        (error) => {
          promise = null; // a failed download may be retried
          throw error;
        }
      );
    }
    return promise;
  };
  get.loaded = () => loaded;
  return get;
};

export const loadLogicEngine = once(() => import('./logicEngine'));
export const loadLogicPanel = once(() => import('./LogicPanel'));

/** The engine module if it has already arrived, else null. No waiting. */
export const loadedLogicEngine = () => loadLogicEngine.loaded();

/**
 * Fetch the mentor once the browser is idle. Returns a cleanup that cancels
 * the wait if the page goes away first.
 */
export function warmMentor() {
  if (typeof window === 'undefined') return () => {};
  // The panel imports the engine, so this fetches both; the second call
  // only records the engine as loaded for loadedLogicEngine.
  const warm = () => {
    loadLogicPanel().catch(() => undefined);
    loadLogicEngine().catch(() => undefined);
  };
  if (typeof window.requestIdleCallback === 'function') {
    const id = window.requestIdleCallback(warm, { timeout: 2000 });
    return () => window.cancelIdleCallback?.(id);
  }
  const id = window.setTimeout(warm, 500);
  return () => window.clearTimeout(id);
}
