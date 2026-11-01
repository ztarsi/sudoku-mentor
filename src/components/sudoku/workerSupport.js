// What the two workers (the what-if search, and the panel's counts) share
// about crossing to another thread.

/** Whether this environment can run a module worker at all. */
export const workersSupported = () =>
  typeof Worker !== 'undefined' && typeof URL !== 'undefined' && typeof import.meta.url === 'string';

// Plain data only: the grid crosses a structured-clone boundary, and every
// worker gets the same shape of it.
export const serializeGrid = (grid) =>
  grid.map((cell) => ({
    value: cell.value,
    isFixed: !!cell.isFixed,
    candidates: [...cell.candidates],
  }));
