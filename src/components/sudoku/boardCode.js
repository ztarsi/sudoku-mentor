// A board as text, one format for everything that stores one: the undo
// history saved with a game (#106) and the practice drills (#139).
//
// A cell is written as nothing for a given, "=5" for a placed digit, or its
// pencil marks ("137", or nothing when it has none); a board is its 81
// cells, comma-separated. A placed cell has no pencil marks anywhere in the
// game (placing clears them, and so does every step), so a cell's code is
// its digit or its marks, never both. The givens are not in the text: a
// board is always read back over its puzzle's givens.

export const cellCode = (c) => (c.isFixed ? '' : c.value !== null ? `=${c.value}` : c.candidates.join(''));

// Boards in a history are never mutated, so each is encoded once, however
// many times it is saved or compared.
const encodedBoards = new WeakMap();
export const encodeCells = (grid) => {
  let text = encodedBoards.get(grid);
  if (text === undefined) {
    text = grid.map(cellCode).join(',');
    encodedBoards.set(grid, text);
  }
  return text;
};

/** One cell from its code over the given cell, or null if it does not fit. */
export const decodeCell = (code, given) => {
  if (given.isFixed) return code === '' ? given : null;
  if (/^=[1-9]$/.test(code)) return { ...given, value: Number(code[1]), candidates: [] };
  if (/^[1-9]*$/.test(code)) return { ...given, value: null, candidates: [...code].map(Number) };
  return null;
};

/** A board from its text over the givens' grid, or null if it does not fit them. */
export const decodeCells = (text, givensGrid) => {
  if (typeof text !== 'string') return null;
  const parts = text.split(',');
  if (parts.length !== 81) return null;
  const grid = parts.map((code, i) => decodeCell(code, givensGrid[i]));
  return grid.every(Boolean) ? grid : null;
};
