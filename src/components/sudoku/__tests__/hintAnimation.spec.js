// The hint animation's frames: the board becomes the stage and the picture
// builds one increment at a time, so what each frame draws and the sentence
// under it are the thing to pin. The engine's own fields are what the
// builder reads, which is exactly what the reconciliation of `main` into
// `staging` (#98) had to keep joined up.
import { describe, it, expect } from 'vitest';
import { findAllTechniqueInstances } from '../logicEngine';
import { buildXCycleFrames } from '../hintAnimation';
import { cellName } from '../gridUnits';

const ALL_DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const at = (row, col) => (row - 1) * 9 + (col - 1);

const emptyCell = (i) => ({
  cellIndex: i,
  value: null,
  isFixed: false,
  candidates: [...ALL_DIGITS],
  isHighlighted: false,
  highlightColor: null,
  isBaseCell: false,
  isTargetCell: false,
});

const gridWith = (without = []) => {
  const grid = Array.from({ length: 81 }, (_, i) => emptyCell(i));
  for (const [digit, cells] of without) {
    for (const cell of cells) {
      grid[cell] = { ...grid[cell], candidates: grid[cell].candidates.filter((d) => d !== digit) };
    }
  }
  return grid;
};

const rowExcept = (row, keep) =>
  ALL_DIGITS.map((_, c) => at(row, c + 1)).filter((i) => !keep.includes(i));
const colExcept = (col, keep) =>
  ALL_DIGITS.map((_, r) => at(r + 1, col)).filter((i) => !keep.includes(i));

/** Every frame draws a whole picture, in increments that never go backwards. */
const expectWellFormed = (frames, step) => {
  expect(frames.length).toBeGreaterThan(1);
  let drawn = -1;
  for (const frame of frames) {
    expect(frame.caption.trim().length).toBeGreaterThan(0);
    expect(frame.digit).toBe(step.digit);
    expect(frame.chain).toEqual(step.baseCells);
    expect(frame.links).toBeGreaterThanOrEqual(drawn);
    expect(frame.links).toBeLessThanOrEqual(frame.allLinks.length);
    drawn = frame.links;
  }
  // The colours come on once and stay on.
  const firstColoured = frames.findIndex((f) => f.colored);
  expect(firstColoured).toBeGreaterThan(0);
  expect(frames.slice(firstColoured).every((f) => f.colored)).toBe(true);
};

describe('X-Cycle animation frames', () => {
  // The same two-home links the walk is tested on: row 1 (R1C1, R1C3) and
  // column 3 (R1C3, R3C3) chain the 5s, so R1C1 and R3C3 come out the same
  // colour and share box 1.
  const wrap = gridWith([
    [5, rowExcept(1, [at(1, 1), at(1, 3)])],
    [5, colExcept(3, [at(1, 3), at(3, 3)])],
  ]);

  it('builds a wrap: every link, then the clash, then what it erases', () => {
    const [step] = findAllTechniqueInstances(wrap, 'X-Cycle');
    expect(step.colorRule).toBe('wrap');
    const frames = buildXCycleFrames(step);
    expectWellFormed(frames, step);

    // One frame names the two same-colour cells that cannot both be the digit.
    const clash = frames.find((f) => f.conflict);
    expect(clash).toBeTruthy();
    expect(clash.conflict).toHaveLength(2);
    for (const cell of clash.conflict) {
      expect(clash.caption).toContain(cellName(cell));
    }

    // The last frame erases exactly what the step erases, and no more.
    const last = frames[frames.length - 1];
    expect([...last.wrongCells].sort((a, b) => a - b)).toEqual(
      step.eliminations.map((e) => e.cell).sort((a, b) => a - b)
    );
    expect(last.links).toBe(step.strongLinks.length);
  });

  it('builds a trap: one frame per erased mark, naming what it sees', () => {
    // Row 2, column 9, row 7 and column 4 chain the 5s; R3C7 sees two
    // opposite-coloured marks, so it can never be the 5.
    const withFive = [at(2, 1), at(2, 9), at(7, 9), at(7, 4), at(3, 4), at(3, 7)];
    const grid = Array.from({ length: 81 }, (_, i) => {
      const row = Math.floor(i / 9) + 1;
      const col = (i % 9) + 1;
      const inLinkUnit = row === 2 || row === 7 || col === 4 || col === 9;
      const keepsFive = withFive.includes(i) || !inLinkUnit;
      return { ...emptyCell(i), candidates: keepsFive ? [1, 2, 3, 4, 5] : [1, 2, 3, 4] };
    });
    const step = findAllTechniqueInstances(grid, 'X-Cycle').find((s) =>
      s.eliminations.some((e) => e.cell === at(3, 7) && e.digit === 5)
    );
    expect(step).toBeTruthy();
    expect(step.colorRule).toBe('trap');

    const frames = buildXCycleFrames(step);
    expectWellFormed(frames, step);
    expect(frames.every((f) => !f.wrongCells)).toBe(true);

    // The proof frames build up one erased mark at a time, and between
    // them they account for every elimination the step makes.
    const last = frames[frames.length - 1];
    expect(last.proofs).toHaveLength(step.eliminations.length);
    expect(last.proofs.map((p) => p.cell).sort((a, b) => a - b)).toEqual(
      step.eliminations.map((e) => e.cell).sort((a, b) => a - b)
    );
    const target = frames.find((f) => f.focus === at(3, 7));
    expect(target).toBeTruthy();
    expect(target.caption).toContain('R3C7');
  });
});
