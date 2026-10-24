// The plain-language explanations are derived from step data, so they must
// hold up for every technique the engines emit: no "undefined", no jargon
// in simple mode, and a concrete "what to do" line.
import { describe, it, expect } from 'vitest';
import { explainStep, plainCell, chainWalk, GLOSSARY } from '../explainStep';
import { generateCandidates, findAllTechniqueInstances, findNextLogicStep } from '../logicEngine';
import { findALSXZ, findXCycle, findFinnedXWing } from '../chainEngine';
import { findUniqueRectangle } from '../uniquenessEngine';
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
    'Naked Pair', 'Hidden Pair', 'Naked Triple', 'Hidden Triple', 'Naked Quad', 'Hidden Quad',
    'X-Wing', 'Swordfish', 'Jellyfish', 'Empty Rectangle', 'XY-Wing', 'XYZ-Wing', 'WXYZ-Wing',
    '3D Medusa', 'Finned Swordfish', 'Finned Jellyfish', 'Sashimi Fish', 'Franken Fish', 'Mutant Fish',
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
      expect(out.look).toMatch(/R\dC\d|rows? \d|columns? \d|box \d/);
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
    expect(out.why).toMatch(/only one group can actually take/);
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
    expect(out.look).toContain('Group A is the 2 cells R5C2 and R5C3 in row 5. Between them they can only use 3 numbers: 2, 3, and 5.');
    expect(out.look).toContain('Group B is the single cell R1C1, which can only be 3 or 5.');
    expect(out.why).not.toMatch(/one more mark/);
    expect(out.action).toBe('Erase the pencil mark 5 from R5C7.');
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
      forcingBranches: [
        {
          assume: { cell: 0, digit: 3 },
          moves: [{ cell: 1, digit: 4, reason: 'Only candidate left in R1C2' }],
          proof: [{ cell: 1, digit: 4, reason: 'Only candidate left in R1C2' }],
          skipped: 0,
          outcome: { kind: 'contradiction', text: 'R5C5 has no valid candidates left', cell: 40 },
        },
      ],
      explanation: 'engine narrative',
    };
    const out = explainStep(step, null, 'simple');
    expect(out.look).toContain('Suppose R1C1 were 3');
    // The honesty line is in the lesson itself, not only in the heading.
    expect(out.look).toContain('not a proof');
    expect(out.why).toContain('R5C5 is left with no possible number');
    expect(out.why).toContain('its only other option, 8, must be right');
    expect(out.why).toContain('reasoning by trial');
    expect(out.action).toBe('Write 8 in R1C1.');
  });

  it('Hypothesis Mode repeats the contradiction the engine actually found', () => {
    const step = {
      technique: 'Hypothesis Mode',
      digit: 3,
      contradictoryDigit: 3,
      baseCells: [0],
      targetCells: [40],
      contradictionCell: 40,
      contradictionText: 'R5C5 would have to be both 6 and 9',
      placement: null,
      eliminations: [{ cell: 0, digit: 3 }],
      forcingBranches: [
        {
          assume: { cell: 0, digit: 3 },
          moves: [{ cell: 1, digit: 4, reason: 'Only candidate left in R1C2' }],
          proof: [{ cell: 1, digit: 4, reason: 'Only candidate left in R1C2' }],
          skipped: 0,
          outcome: { kind: 'contradiction', text: 'R5C5 would have to be both 6 and 9', cell: 40 },
        },
      ],
      explanation: 'engine narrative',
    };
    const out = explainStep(step, null, 'simple');
    expect(out.why).toContain('R5C5 would have to be both 6 and 9');
    expect(out.why).not.toContain('no possible number');
    expect(out.why).toContain('through 1 forced move ');
    expect(out.action).toBe('Erase the pencil mark 3 from R1C1.');
  });

  // A forcing proof is a deduction, and its lesson says what every case
  // was and what they prove together, case by case, rather than as a wall
  // of text (#75).
  describe('forcing proofs', () => {
    const unitStep = {
      technique: 'Unit Forcing Chain',
      digit: 7,
      baseCells: [28, 31, 34],
      targetCells: [48],
      placement: { cell: 48, digit: 2 },
      eliminations: [],
      forcingOrigin: {
        kind: 'unit',
        cells: [28, 31, 34],
        digit: 7,
        unitName: 'row 4',
        options: [{ cell: 28, digit: 7 }, { cell: 31, digit: 7 }, { cell: 34, digit: 7 }],
      },
      forcingConclusion: { kind: 'convergence', placement: { cell: 48, digit: 2 }, eliminations: [] },
      forcingBranches: [28, 31, 34].map((cell) => ({
        assume: { cell, digit: 7 },
        moves: [{ cell: 48, digit: 2, reason: 'Only candidate left in R6C4' }],
        proof: [{ cell: 48, digit: 2, reason: 'Only candidate left in R6C4' }],
        skipped: 2,
        outcome: { kind: 'forces', text: 'R6C4 is 2', cell: 48 },
      })),
      explanation: 'engine text',
    };

    it('names the origin and says why agreement is a proof', () => {
      const out = explainStep(unitStep, null, 'simple');
      expect(out.look).toContain('the number 7 in row 4');
      expect(out.look).toContain('R4C2, R4C5, and R4C8');
      expect(out.why).toContain('every one of them ends with R6C4 as 2');
      expect(out.why).toContain('proof, not a guess');
      expect(out.action).toBe('Write 2 in R6C4.');
    });

    it('walks one case at a time and ends on what they prove', () => {
      const walk = chainWalk(unitStep);
      // Three cases, each with its supposition, its forced move and its
      // outcome, and one last line for the conclusion.
      expect(walk).toHaveLength(3 * 4 + 1);
      expect(walk[0].text).toBe('Suppose R4C2 is 7.');
      expect(walk[0].label).toBe('Case A');
      expect(walk[1].text).toContain('R6C4 must be 2');
      expect(walk[2].text).toContain('2 more forced moves');
      expect(walk[3].text).toContain('This case ends with R6C4 is 2');
      expect(walk[4].label).toBe('Case B');
      const last = walk[walk.length - 1];
      expect(last.conclusion).toBe(true);
      expect(last.text).toBe('Every case was checked, so R6C4 is 2.');
      // Every line belongs to a case, or is the conclusion.
      for (const entry of walk.slice(0, -1)) expect(typeof entry.branch).toBe('number');
    });

    it('a refuted case says it broke the board, and the net says it is a net', () => {
      const step = {
        ...unitStep,
        technique: 'Forcing Net',
        forcingConclusion: { kind: 'refutation', placement: { cell: 28, digit: 7 }, eliminations: [] },
        forcingNet: { depth: 5, limited: true },
        forcingBranches: [
          {
            assume: { cell: 28, digit: 7 },
            moves: [],
            proof: [],
            skipped: 0,
            outcome: { kind: 'agrees', text: 'the same pencil marks disappear', cell: null },
            net: true,
            limited: true,
          },
          {
            assume: { cell: 31, digit: 7 },
            moves: [{ cell: 48, digit: 2, reason: 'R4C2 cannot be 3: that breaks the board. So it is 2', net: { cell: 10, digits: [2, 3] } }],
            proof: [{ cell: 48, digit: 2, reason: 'R4C2 cannot be 3: that breaks the board. So it is 2', net: { cell: 10, digits: [2, 3] } }],
            skipped: 0,
            outcome: { kind: 'contradiction', text: 'R9C9 has no valid candidates left', cell: 80 },
            net: true,
          },
        ],
        placement: { cell: 28, digit: 7 },
      };
      const walk = chainWalk(step);
      expect(walk.some((entry) => entry.label === 'breaks the board')).toBe(true);
      expect(walk.some((entry) => entry.label === 'net')).toBe(true);
      const out = explainStep(step, null, 'simple');
      expect(out.why).toContain('break the board');
      expect(out.why).toContain('needed a net');
      expect(out.why).toContain('stopped at the depth the mentor allows');
    });
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
