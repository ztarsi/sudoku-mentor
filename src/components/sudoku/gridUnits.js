// Shared grid geometry helpers for the Sudoku engines.
// Cell indices are 0..80, rows/cols/boxes are 0..8.

export const getRow = (index) => Math.floor(index / 9);
export const getCol = (index) => index % 9;
export const getBox = (index) =>
  Math.floor(getRow(index) / 3) * 3 + Math.floor(getCol(index) / 3);

export const getRowIndices = (row) =>
  Array.from({ length: 9 }, (_, i) => row * 9 + i);
export const getColIndices = (col) =>
  Array.from({ length: 9 }, (_, i) => i * 9 + col);
export const getBoxIndices = (box) => {
  const startRow = Math.floor(box / 3) * 3;
  const startCol = (box % 3) * 3;
  const indices = [];
  for (let r = startRow; r < startRow + 3; r++) {
    for (let c = startCol; c < startCol + 3; c++) {
      indices.push(r * 9 + c);
    }
  }
  return indices;
};

export const getPeers = (index) => {
  const peers = new Set([
    ...getRowIndices(getRow(index)),
    ...getColIndices(getCol(index)),
    ...getBoxIndices(getBox(index)),
  ]);
  peers.delete(index);
  return Array.from(peers);
};

export const arePeers = (cell1, cell2) =>
  getRow(cell1) === getRow(cell2) ||
  getCol(cell1) === getCol(cell2) ||
  getBox(cell1) === getBox(cell2);

/** "R5C3" - the compact cell name used in explanations and tests. */
export const cellName = (index) => `R${getRow(index) + 1}C${getCol(index) + 1}`;

/** Describe a unit for step objects: { type, index, name }. */
export const unitOf = (type, index) => ({
  type,
  index,
  name: `${type} ${index + 1}`,
});

/**
 * All 27 units with their cell indices, in row / column / box order.
 * `type` is 'row' | 'column' | 'box'.
 */
export const ALL_UNITS = [
  ...Array.from({ length: 9 }, (_, i) => ({ ...unitOf('row', i), indices: getRowIndices(i) })),
  ...Array.from({ length: 9 }, (_, i) => ({ ...unitOf('column', i), indices: getColIndices(i) })),
  ...Array.from({ length: 9 }, (_, i) => ({ ...unitOf('box', i), indices: getBoxIndices(i) })),
];
