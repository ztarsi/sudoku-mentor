// Sudoku solver: bitmask backtracking with minimum-remaining-values ordering.
//
// Returns a solved copy of the grid, or null when the puzzle has no solution -
// including when the givens themselves conflict (two equal digits sharing a
// unit), which the previous implementation never checked and could hang on.

const boxOf = (index) =>
  Math.floor(index / 27) * 3 + Math.floor((index % 9) / 3);

const popcount = (mask) => {
  let count = 0;
  while (mask) {
    mask &= mask - 1;
    count++;
  }
  return count;
};

export function solveSudoku(grid) {
  const values = grid.map((cell) => cell.value ?? 0);

  // Digit d occupies bit d (bits 1..9); bit 0 stays unused.
  const rowMask = new Array(9).fill(0);
  const colMask = new Array(9).fill(0);
  const boxMask = new Array(9).fill(0);

  // Seed masks from the givens, rejecting contradictory ones outright.
  for (let i = 0; i < 81; i++) {
    if (!values[i]) continue;
    const row = Math.floor(i / 9);
    const col = i % 9;
    const box = boxOf(i);
    const bit = 1 << values[i];
    if ((rowMask[row] & bit) || (colMask[col] & bit) || (boxMask[box] & bit)) {
      return null; // duplicate given in a row, column, or box
    }
    rowMask[row] |= bit;
    colMask[col] |= bit;
    boxMask[box] |= bit;
  }

  const ALL_DIGITS = 0b1111111110;

  const solve = () => {
    // Pick the empty cell with the fewest remaining candidates.
    let best = -1;
    let bestMask = 0;
    let bestCount = 10;
    for (let i = 0; i < 81; i++) {
      if (values[i]) continue;
      const row = Math.floor(i / 9);
      const col = i % 9;
      const mask =
        ~(rowMask[row] | colMask[col] | boxMask[boxOf(i)]) & ALL_DIGITS;
      const count = popcount(mask);
      if (count === 0) return false; // dead end
      if (count < bestCount) {
        best = i;
        bestMask = mask;
        bestCount = count;
        if (count === 1) break;
      }
    }

    if (best === -1) return true; // no empty cells left

    const row = Math.floor(best / 9);
    const col = best % 9;
    const box = boxOf(best);
    for (let digit = 1; digit <= 9; digit++) {
      const bit = 1 << digit;
      if (!(bestMask & bit)) continue;
      values[best] = digit;
      rowMask[row] |= bit;
      colMask[col] |= bit;
      boxMask[box] |= bit;
      if (solve()) return true;
      values[best] = 0;
      rowMask[row] &= ~bit;
      colMask[col] &= ~bit;
      boxMask[box] &= ~bit;
    }
    return false;
  };

  if (!solve()) return null;

  return grid.map((cell, i) => ({ ...cell, value: values[i] }));
}

/**
 * Count solutions up to `cap` (2 is enough to know a puzzle is not a proper
 * Sudoku). Takes a grid of cells or an array of 81 digits (0 = empty).
 * Returns -1 when the givens already conflict.
 */
export function countSolutions(gridOrDigits, cap = 2) {
  const values = gridOrDigits.map((cell) =>
    typeof cell === 'number' ? cell : (cell?.value ?? 0)
  );
  const rowMask = new Array(9).fill(0);
  const colMask = new Array(9).fill(0);
  const boxMask = new Array(9).fill(0);
  const boxOf = (i) => Math.floor(i / 27) * 3 + Math.floor((i % 9) / 3);
  for (let i = 0; i < 81; i++) {
    if (!values[i]) continue;
    const bit = 1 << values[i];
    const r = Math.floor(i / 9);
    const c = i % 9;
    const b = boxOf(i);
    if ((rowMask[r] | colMask[c] | boxMask[b]) & bit) return -1;
    rowMask[r] |= bit;
    colMask[c] |= bit;
    boxMask[b] |= bit;
  }
  let count = 0;
  const solve = () => {
    if (count >= cap) return;
    let best = -1;
    let bestOptions = 10;
    for (let i = 0; i < 81; i++) {
      if (values[i]) continue;
      const used = rowMask[Math.floor(i / 9)] | colMask[i % 9] | boxMask[boxOf(i)];
      let n = 0;
      for (let d = 1; d <= 9; d++) if (!(used & (1 << d))) n++;
      if (n === 0) return;
      if (n < bestOptions) { bestOptions = n; best = i; if (n === 1) break; }
    }
    if (best === -1) { count++; return; }
    const r = Math.floor(best / 9);
    const c = best % 9;
    const b = boxOf(best);
    for (let d = 1; d <= 9; d++) {
      const bit = 1 << d;
      if ((rowMask[r] | colMask[c] | boxMask[b]) & bit) continue;
      values[best] = d; rowMask[r] |= bit; colMask[c] |= bit; boxMask[b] |= bit;
      solve();
      values[best] = 0; rowMask[r] &= ~bit; colMask[c] &= ~bit; boxMask[b] &= ~bit;
      if (count >= cap) return;
    }
  };
  solve();
  return count;
}
