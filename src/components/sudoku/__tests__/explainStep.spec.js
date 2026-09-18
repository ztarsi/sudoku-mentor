// The plain-language explanations are derived from step data, so they must
// hold up for every technique the engines emit: no "undefined", no jargon
// in simple mode, and a concrete "what to do" line.
import { describe, it, expect } from 'vitest';
import { explainStep, plainCell, GLOSSARY } from '../explainStep';
import { generateCandidates, findAllTechniqueInstances, findNextLogicStep } from '../logicEngine';
import { findALSXZ, findXCycle, findUniqueRectangle, findFinnedXWing } from '../chainEngine';
import { PUZZLES } from '../puzzles';

const cellIndex = (row, col) => (row - 1) * 9 + (col - 1);

const gridFrom = (puzzle) =>
  generateCandidates(
    puzzle.map((v, i) => ({
      cellIndex: i,
      value: v || null,
      isFixed: !!v,
      candidates: [],
      isHighlighted: false,
      highlightColor: null,
      isBaseCell: false,
      isTargetCell: false,
    }))
  );

const JARGON = /\b(candidate|unit|conjugate|strong link|ALS|peer|bivalue|bi-value)\b/i;

const expectWellFormed = (out) => {
  expect(out).toBeTruthy();
  const text = [out.look, out.why, out.extra, out.action].filter(Boolean).join(' ');
  expect(text).not.toMatch(/undefined|NaN|null/);
  expect(text.length).toBeGreaterThan(40);
};

describe('explainStep helpers', () => {
  it('names cells the way a beginner reads them', () => {
    expect(plainCell(cellIndex(5, 1))).toBe('row 5, column 1');
    expect(plainCell(0)).toBe('row 1, column 1');
  });

  it('every glossary entry is a full sentence', () => {
    Object.values(GLOSSARY).forEach((meaning) => {
      expect(meaning.length).toBeGreaterThan(20);
      expect(meaning.trim().endsWith('.')).toBe(true);
    });
  });
});

describe('explainStep on real engine steps', () => {
  const stepsFound = {};

  // Collect one real instance of every technique the basic engine reports
  // across the built-in library.
  const library = Object.values(PUZZLES).flat();
  const techniques = [
    'Naked Single', 'Hidden Single', 'Pointing Pair', 'Pointing Triple', 'Claiming',
    'Naked Pair', 'Hidden Pair', 'Naked Triple', 'X-Wing', 'Swordfish', 'XY-Wing',
  ];
  for (const { puzzle } of library) {
    const grid = gridFrom(puzzle);
    for (const tech of techniques) {
      if (stepsFound[tech]) continue;
      const found = findAllTechniqueInstances(grid, tech);
      if (found.length) stepsFound[tech] = { step: found[0], grid };
    }
  }

  it('finds a live example of the common techniques in the library', () => {
    expect(Object.keys(stepsFound)).toEqual(
      expect.arrayContaining(['Naked Single', 'Hidden Single', 'Pointing Pair', 'Naked Pair'])
    );
  });

  Object.entries(stepsFound).forEach(([tech, { step, grid }]) => {
    it(`${tech}: simple mode is jargon-free and names concrete cells`, () => {
      const out = explainStep(step, grid, 'simple');
      expectWellFormed(out);
      expect(out.look).toMatch(/rows? \d|columns? \d|box \d/);
      expect(`${out.look} ${out.why}`).not.toMatch(JARGON);
      // Every simple explanation ends with something to do
      expect(out.action).toMatch(/^(Write|Erase)/);
    });

    it(`${tech}: detailed mode keeps the engine text and adds a glossary`, () => {
      const out = explainStep(step, grid, 'detailed');
      expectWellFormed(out);
      expect(out.why).toBe(step.explanation);
      expect(out.terms.length).toBeGreaterThan(0);
      out.terms.forEach(({ term, meaning }) => expect(GLOSSARY[term]).toBe(meaning));
    });
  });
});

describe('explainStep on advanced steps', () => {
  const ultimate = PUZZLES.ultimate.map((p) => gridFrom(p.puzzle));

  const firstOf = (finder) => {
    for (const grid of ultimate) {
      const step = finder(grid, null, true)?.[0] ?? finder(grid, null);
      if (step) return { step, grid };
    }
    return null;
  };

  it('ALS-XZ reads as two groups, a shared digit, and a guaranteed digit', () => {
    const found = firstOf(findALSXZ);
    if (!found) return; // library may not expose one; covered by the synthetic test below
    const out = explainStep(found.step, found.grid, 'simple');
    expectWellFormed(out);
    expect(out.look).toMatch(/Group A/);
    expect(out.look).toMatch(/Group B/);
    expect(out.why).toMatch(/only one group can end up holding/);
    expect(out.why).not.toMatch(/Almost Locked|bridge|ALS/i);
  });

  it('X-Cycle, Unique Rectangle and Finned X-Wing produce well-formed simple text', () => {
    [findXCycle, findUniqueRectangle, findFinnedXWing].forEach((finder) => {
      const found = firstOf(finder);
      if (!found) return;
      const out = explainStep(found.step, found.grid, 'simple');
      expectWellFormed(out);
      expect(`${out.look} ${out.why}`).not.toMatch(JARGON);
    });
  });

  it('ALS-XZ synthetic step: explains without reading the grid', () => {
    const step = {
      technique: 'ALS-XZ',
      digit: 5,
      baseCells: [cellIndex(5, 2), cellIndex(5, 3), cellIndex(1, 1)],
      targetCells: [cellIndex(5, 7)],
      eliminations: [{ cell: cellIndex(5, 7), digit: 5 }],
      als1: { cells: [cellIndex(5, 2), cellIndex(5, 3)], candidates: [2, 3, 5], unitName: 'row 5' },
      als2: { cells: [cellIndex(1, 1)], candidates: [3, 5], unitName: 'column 1' },
      xDigit: 3,
      zDigit: 5,
      explanation: 'engine text',
    };
    const out = explainStep(step, null, 'simple');
    expect(out.look).toContain('Group A is 2 cells in row 5 (row 5, column 2 and row 5, column 3)');
    expect(out.look).toContain('Group B is a single cell, row 1, column 1, with two pencil marks (3 and 5)');
    expect(out.action).toBe('Erase the pencil mark 5 from row 5, column 7.');
  });

  it('Hypothesis Mode explains the what-if and the dead end', () => {
    const step = {
      technique: 'Hypothesis Mode',
      digit: 3,
      contradictoryDigit: 3,
      baseCells: [0],
      targetCells: [40],
      contradictionCell: 40,
      placement: { cell: 0, digit: 8 },
      eliminations: [],
      chain: [{ action: 'place' }, { action: 'place' }, { action: 'place' }],
      explanation: 'engine narrative',
    };
    const out = explainStep(step, null, 'simple');
    expect(out.look).toBe('This is a "what if" test. Suppose row 1, column 1 were 3.');
    expect(out.why).toContain('row 5, column 5 is left with no possible number');
    expect(out.why).toContain('its only other option, 8, must be right');
    expect(out.action).toBe('Write 8 in row 1, column 1.');
  });

  it('unknown techniques fall back to the engine text instead of crashing', () => {
    const out = explainStep({ technique: 'Mystery', explanation: 'engine says so', eliminations: [] }, null, 'simple');
    expect(out.why).toBe('engine says so');
    expect(out.action).toBe('');
  });

  it('findNextLogicStep output is always explainable', () => {
    const grid = gridFrom(PUZZLES.hard[0].puzzle);
    const step = findNextLogicStep(grid);
    expect(step).toBeTruthy();
    expectWellFormed(explainStep(step, grid, 'simple'));
  });
});
