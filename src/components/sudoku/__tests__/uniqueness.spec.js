// The uniqueness family, and the guard that makes it safe.
//
// Three things are checked here, in order of how much they matter.
//
//   1. The guard. On a grid that is not known to have exactly one answer,
//      no technique in this family may fire - and the grids used are ones
//      where the detectors themselves do find patterns, so the test proves
//      the guard is what stops them rather than the absence of a pattern.
//      It also shows what would otherwise happen: on a grid with two
//      answers the unguarded detectors erase digits one of those answers
//      needs. That is the wrong hint this batch exists to prevent.
//   2. Each technique, on a hand-built grid, with the exact eliminations
//      and the exact cells the card will draw.
//   3. The teaching: every entry names its assumption out loud, and the
//      plain wording stays free of jargon.
import { describe, it, expect } from 'vitest';
import {
  findAllTechniqueInstances,
  findNextLogicStep,
  generateCandidates,
  applyLogicStep,
  eliminateCandidatesFromPeers,
} from '../logicEngine';
import {
  UNIQUENESS_FINDERS,
  UNIQUENESS_TECHNIQUE_NAMES,
  DEADLY_RECTANGLES,
} from '../uniquenessEngine';
import {
  UNIQUENESS_MANY,
  UNIQUENESS_NONE,
  UNIQUENESS_ONE,
  UNIQUENESS_UNKNOWN,
  establishUniqueness,
  uniquenessAllowed,
  uniquenessNote,
  uniquenessShortNote,
} from '../uniqueness';
import { countSolutionsWithin } from '../solver';
import { findWhatIfStep } from '../forcingChainEngine';
import {
  TECHNIQUE_DETAILS,
  UNIQUENESS_TECHNIQUES,
  needsUniqueness,
  teachingRank,
  techniqueTier,
} from '../techniqueCatalog';
import { explainStep } from '../explainStep';
import { PUZZLES } from '../puzzles';
import { cellName } from '../gridUnits';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** R1C1 -> 0, one-based row and column, the way the cards name cells. */
const at = (row, col) => (row - 1) * 9 + (col - 1);

const emptyGrid = () =>
  Array.from({ length: 81 }, (_, i) => ({
    cellIndex: i,
    value: null,
    isFixed: false,
    candidates: [],
    isHighlighted: false,
    highlightColor: null,
    isBaseCell: false,
    isTargetCell: false,
  }));

/**
 * A hand-built board: the pattern's cells get the pencil marks the test
 * cares about, and every other cell gets `rest` so no second pattern forms
 * by accident. These are candidate-level fixtures - the point is what the
 * detector makes of a particular arrangement of pencil marks.
 */
const handBuilt = (marks, rest = [4, 5, 6, 7, 8, 9]) => {
  const grid = emptyGrid();
  for (const [cell, candidates] of Object.entries(marks)) {
    grid[Number(cell)] = { ...grid[Number(cell)], candidates: [...candidates] };
  }
  for (const cell of grid) {
    if (cell.candidates.length === 0 && cell.value === null) cell.candidates = [...rest];
  }
  return grid;
};

/** A board of placed digits, for the Avoidable Rectangles. */
const withValues = (grid, values, { given = false } = {}) => {
  for (const [cell, value] of Object.entries(values)) {
    grid[Number(cell)] = {
      ...grid[Number(cell)],
      value,
      isFixed: given,
      candidates: [],
    };
  }
  return grid;
};

const buildGrid = (digits) =>
  generateCandidates(
    digits.map((value, index) => ({
      cellIndex: index,
      value: value || null,
      isFixed: value !== 0,
      candidates: [],
      isHighlighted: false,
      highlightColor: null,
      isBaseCell: false,
      isTargetCell: false,
    }))
  );

const ONE = { uniqueness: UNIQUENESS_ONE };

const elimsOf = (step) =>
  [...step.eliminations]
    .sort((a, b) => a.cell - b.cell || a.digit - b.digit)
    .map((e) => `${cellName(e.cell)}=${e.digit}`);

/** Every solution of a set of givens, up to `cap`. */
const solutionsOf = (digits, cap = 2) => {
  const values = [...digits];
  const found = [];
  const ok = (i, d) => {
    const r = Math.floor(i / 9);
    const c = i % 9;
    const br = Math.floor(r / 3) * 3;
    const bc = Math.floor(c / 3) * 3;
    for (let k = 0; k < 9; k++) {
      if (values[r * 9 + k] === d || values[k * 9 + c] === d) return false;
      if (values[(br + Math.floor(k / 3)) * 9 + bc + (k % 3)] === d) return false;
    }
    return true;
  };
  const walk = () => {
    if (found.length >= cap) return;
    const i = values.indexOf(0);
    if (i === -1) {
      found.push([...values]);
      return;
    }
    for (let d = 1; d <= 9; d++) {
      if (!ok(i, d)) continue;
      values[i] = d;
      walk();
      values[i] = 0;
      if (found.length >= cap) return;
    }
  };
  walk();
  return found;
};

// ---------------------------------------------------------------------------
// 1. The guard
// ---------------------------------------------------------------------------

describe('establishing how many answers a puzzle has', () => {
  it('says one for a vetted library puzzle', () => {
    for (const [shelf, list] of Object.entries(PUZZLES)) {
      for (const { name, puzzle } of list) {
        expect(establishUniqueness(puzzle), `${shelf}/${name}`).toEqual({
          state: UNIQUENESS_ONE,
          solutions: 1,
        });
      }
    }
  });

  it('says more than one for a grid with two answers, and keeps the count at two', () => {
    const loose = ambiguous(PUZZLES.easy[0].puzzle);
    expect(establishUniqueness(loose)).toEqual({ state: UNIQUENESS_MANY, solutions: 2 });
  });

  it('says none for a grid with no answer at all', () => {
    const broken = [...PUZZLES.easy[0].puzzle];
    // Two 5s in row 1: the givens themselves clash.
    broken[at(1, 3)] = 5;
    broken[at(1, 4)] = 5;
    expect(establishUniqueness(broken).state).toBe(UNIQUENESS_NONE);

    const unsolvable = [...PUZZLES.easy[0].puzzle];
    // A given that no answer can accommodate, without clashing outright.
    const solved = solutionsOf(PUZZLES.easy[0].puzzle, 1)[0];
    const empty = unsolvable.findIndex((v) => v === 0);
    unsolvable[empty] = solved[empty] === 9 ? 8 : 9;
    const outcome = establishUniqueness(unsolvable);
    expect([UNIQUENESS_NONE, UNIQUENESS_ONE]).toContain(outcome.state);
  });

  it('says unknown rather than guessing when the count runs out of budget', () => {
    // An almost empty grid has astronomically many answers; a tiny budget
    // is the pathological photo import that must not hang the page.
    const nearlyEmpty = new Array(81).fill(0);
    nearlyEmpty[0] = 1;
    const { state, solutions } = establishUniqueness(nearlyEmpty, { maxNodes: 1 });
    expect(state).toBe(UNIQUENESS_UNKNOWN);
    expect(solutions).toBeNull();
    // And with a budget it finds the two it needs and stops.
    expect(establishUniqueness(nearlyEmpty).state).toBe(UNIQUENESS_MANY);
  });

  it('reports whether it finished, so a caller can tell a floor from a count', () => {
    const vetted = PUZZLES.easy[0].puzzle;
    expect(countSolutionsWithin(vetted)).toEqual({ count: 1, complete: true, conflict: false });
    const cut = countSolutionsWithin(new Array(81).fill(0), { maxNodes: 2 });
    expect(cut.complete).toBe(false);
  });

  it('only "one" lets the family run, and every other state says why', () => {
    expect(uniquenessAllowed(UNIQUENESS_ONE)).toBe(true);
    expect(uniquenessNote(UNIQUENESS_ONE)).toBeNull();
    expect(uniquenessShortNote(UNIQUENESS_ONE)).toBeNull();
    for (const state of [UNIQUENESS_MANY, UNIQUENESS_NONE, UNIQUENESS_UNKNOWN]) {
      expect(uniquenessAllowed(state), state).toBe(false);
      expect(uniquenessNote(state), state).toMatch(/switched off/);
      expect(uniquenessShortNote(state), state).toMatch(/one answer/);
    }
  });

  it('says unknown for anything that is not a board', () => {
    expect(establishUniqueness(null).state).toBe(UNIQUENESS_UNKNOWN);
    expect(establishUniqueness([1, 2, 3]).state).toBe(UNIQUENESS_UNKNOWN);
  });
});

/** A library puzzle with one given dropped, until it has two answers. */
function ambiguous(puzzle) {
  for (let i = 0; i < 81; i++) {
    if (!puzzle[i]) continue;
    const loose = [...puzzle];
    loose[i] = 0;
    if (countSolutionsWithin(loose).count >= 2) return loose;
  }
  throw new Error('no ambiguous variant found');
}

describe('no uniqueness technique fires on a grid that may have two answers', () => {
  // Library puzzles with one given removed: every one of these has more
  // than one answer, which is exactly the state a typed-in or photographed
  // puzzle can arrive in.
  const grids = Object.values(PUZZLES)
    .flat()
    .slice(0, 12)
    .map((p) => ({ name: p.name, digits: ambiguous(p.puzzle) }));

  it('the grids really do have more than one answer', () => {
    for (const { name, digits } of grids) {
      expect(establishUniqueness(digits).state, name).toBe(UNIQUENESS_MANY);
    }
  });

  for (const state of [UNIQUENESS_MANY, UNIQUENESS_UNKNOWN, UNIQUENESS_NONE]) {
    it(`the hint path offers nothing from the family when the count is "${state}"`, () => {
      for (const { name, digits } of grids) {
        let grid = buildGrid(digits);
        for (let i = 0; i < 40; i++) {
          const step = findNextLogicStep(grid, null, { uniqueness: state });
          if (!step) break;
          expect(
            UNIQUENESS_TECHNIQUE_NAMES,
            `${name}: the hint was ${step.technique} on a grid whose answer count is ${state}`
          ).not.toContain(step.technique);
          grid = applyLogicStep(grid, step);
          if (step.placement) {
            grid = eliminateCandidatesFromPeers(grid, step.placement.cell, step.placement.digit);
          }
        }
      }
    });

    it(`the panel counts nothing from the family when the count is "${state}"`, () => {
      for (const { name, digits } of grids) {
        let grid = buildGrid(digits);
        for (let i = 0; i < 25; i++) {
          for (const technique of UNIQUENESS_TECHNIQUE_NAMES) {
            expect(
              findAllTechniqueInstances(grid, technique, { uniqueness: state }),
              `${name}: ${technique} counted on a grid whose answer count is ${state}`
            ).toEqual([]);
          }
          const step = findNextLogicStep(grid, null, { uniqueness: state });
          if (!step) break;
          grid = applyLogicStep(grid, step);
          if (step.placement) {
            grid = eliminateCandidatesFromPeers(grid, step.placement.cell, step.placement.digit);
          }
        }
      }
    });
  }

  it('and the default, with nothing said about the puzzle, is silence', () => {
    // A caller that never establishes anything gets a mentor with the
    // family switched off. Failing in that direction is the whole design.
    for (const { digits } of grids) {
      const grid = buildGrid(digits);
      for (const technique of UNIQUENESS_TECHNIQUE_NAMES) {
        expect(findAllTechniqueInstances(grid, technique)).toEqual([]);
      }
      for (let i = 0; i < 5; i++) {
        const step = findNextLogicStep(grid, null);
        if (!step) break;
        expect(UNIQUENESS_TECHNIQUE_NAMES).not.toContain(step.technique);
        break;
      }
    }
  });

  it('what the guard is for: unguarded, the detectors erase digits an answer needs', () => {
    // The same grids, with the family let loose. Collect every instance the
    // detectors report and check it against both answers. A deduction that
    // is valid for the puzzle holds for every one of its answers; these do
    // not, which is precisely the confident wrong hint the guard prevents.
    const wrong = [];
    for (const { name, digits } of grids.slice(0, 5)) {
      const answers = solutionsOf(digits, 2);
      expect(answers.length, name).toBe(2);
      let grid = buildGrid(digits);
      for (let i = 0; i < 12 && wrong.length === 0; i++) {
        for (const technique of UNIQUENESS_TECHNIQUE_NAMES) {
          for (const step of findAllTechniqueInstances(grid, technique, ONE)) {
            for (const answer of answers) {
              if (step.placement && answer[step.placement.cell] !== step.placement.digit) {
                wrong.push(`${name}: ${technique} would write ${step.placement.digit} in ${cellName(step.placement.cell)}`);
              }
              for (const e of step.eliminations) {
                if (answer[e.cell] === e.digit) {
                  wrong.push(`${name}: ${technique} would erase the ${e.digit} in ${cellName(e.cell)}`);
                }
              }
            }
          }
        }
        const step = findNextLogicStep(grid, null);
        if (!step) break;
        grid = applyLogicStep(grid, step);
        if (step.placement) {
          grid = eliminateCandidatesFromPeers(grid, step.placement.cell, step.placement.digit);
        }
      }
    }
    expect(
      wrong.length,
      'the family should be dangerous on these grids - if it is not, this test proves nothing'
    ).toBeGreaterThan(0);
  }, 120_000);
});

describe('the guard cannot be forgotten', () => {
  it('the catalog and the engine agree on which techniques need one answer', () => {
    expect([...UNIQUENESS_TECHNIQUES].sort()).toEqual([...UNIQUENESS_TECHNIQUE_NAMES].sort());
    for (const name of UNIQUENESS_TECHNIQUE_NAMES) expect(needsUniqueness(name)).toBe(true);
    expect(needsUniqueness('X-Wing')).toBe(false);
  });

  it('every finder in the family is reachable by name, and only by name', () => {
    for (const [name, finder] of Object.entries(UNIQUENESS_FINDERS)) {
      expect(typeof finder, name).toBe('function');
      // The name the detector puts on its steps is the name it is filed
      // under, so the panel's count and the card's title cannot disagree.
      const grid = buildGrid(PUZZLES.ultimate[0].puzzle);
      for (const step of findAllTechniqueInstances(grid, name, ONE)) {
        expect(step.technique).toBe(name);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// 2. The techniques, one hand-built grid each
// ---------------------------------------------------------------------------

describe('Unique Rectangle Type 1', () => {
  it('three bare corners leave the fourth unable to hold either digit', () => {
    const grid = handBuilt({
      [at(1, 1)]: [1, 2],
      [at(1, 4)]: [1, 2],
      [at(2, 1)]: [1, 2],
      [at(2, 4)]: [1, 2, 3],
    });
    const found = findAllTechniqueInstances(grid, 'Unique Rectangle Type 1', ONE);
    expect(found).toHaveLength(1);
    expect(elimsOf(found[0])).toEqual(['R2C4=1', 'R2C4=2']);
    expect(found[0].rectangle.floor.map(cellName)).toEqual(['R1C1', 'R1C4', 'R2C1']);
    expect(found[0].rectangle.roof.map(cellName)).toEqual(['R2C4']);
  });
});

describe('Unique Rectangle Type 2', () => {
  it('two corners in one unit share an extra, which then leaves their peers', () => {
    const grid = handBuilt({
      [at(1, 1)]: [1, 2],
      [at(1, 4)]: [1, 2],
      [at(2, 1)]: [1, 2, 3],
      [at(2, 4)]: [1, 2, 3],
      [at(2, 7)]: [3, 7],
    });
    const found = findAllTechniqueInstances(grid, 'Unique Rectangle Type 2', ONE);
    expect(found).toHaveLength(1);
    const [step] = found;
    expect(step.digit).toBe(3);
    expect(step.pairDigits).toEqual([1, 2]);
    expect(step.extraDigits).toEqual([3]);
    expect(elimsOf(step)).toEqual(['R2C7=3']);
    // The card draws the rectangle, with the odd corners marked apart.
    expect(step.baseCells.map(cellName)).toEqual(['R1C1', 'R1C4', 'R2C1', 'R2C4']);
    expect(step.rectangle.roof.map(cellName)).toEqual(['R2C1', 'R2C4']);
    expect(step.targetCells.map(cellName)).toEqual(['R2C7']);
  });

  it('says nothing when no cell sees both corners', () => {
    const grid = handBuilt({
      [at(1, 1)]: [1, 2],
      [at(1, 4)]: [1, 2],
      [at(2, 1)]: [1, 2, 3],
      [at(2, 4)]: [1, 2, 3],
      // The only other 3 on the board sees neither corner.
      [at(9, 9)]: [3, 7],
    });
    expect(findAllTechniqueInstances(grid, 'Unique Rectangle Type 2', ONE)).toEqual([]);
  });
});

describe('Unique Rectangle Type 3', () => {
  it('the two roofs act as one cell and lock a subset in their unit', () => {
    const grid = handBuilt(
      {
        [at(2, 1)]: [1, 2],
        [at(2, 4)]: [1, 2],
        [at(1, 1)]: [1, 2, 3],
        [at(1, 4)]: [1, 2, 4],
        [at(1, 7)]: [3, 4],
        [at(1, 2)]: [3, 5],
        [at(1, 5)]: [4, 6],
      },
      [5, 6, 7, 8, 9]
    );
    const found = findAllTechniqueInstances(grid, 'Unique Rectangle Type 3', ONE);
    expect(found).toHaveLength(1);
    const [step] = found;
    expect(step.extraDigits).toEqual([3, 4]);
    expect(step.subsetDigits).toEqual([3, 4]);
    expect(step.zCells.map(cellName)).toEqual(['R1C7']);
    expect(step.unit.name).toBe('row 1');
    expect(elimsOf(step)).toEqual(['R1C2=3', 'R1C5=4']);
  });

  it('leaves the one-extra case to Type 2, which says more', () => {
    const grid = handBuilt({
      [at(2, 1)]: [1, 2],
      [at(2, 4)]: [1, 2],
      [at(1, 1)]: [1, 2, 3],
      [at(1, 4)]: [1, 2, 3],
      [at(1, 7)]: [3, 7],
    });
    expect(findAllTechniqueInstances(grid, 'Unique Rectangle Type 3', ONE)).toEqual([]);
    expect(findAllTechniqueInstances(grid, 'Unique Rectangle Type 2', ONE)).toHaveLength(1);
  });
});

describe('Unique Rectangle Type 4', () => {
  it('a pair digit locked in two corners pushes the other pair digit out', () => {
    const grid = emptyGrid();
    grid[at(2, 1)].candidates = [1, 2];
    grid[at(2, 4)].candidates = [1, 2];
    grid[at(1, 1)].candidates = [1, 2, 3];
    grid[at(1, 4)].candidates = [1, 2, 3];
    // Row 1 keeps a home for 1 outside the rectangle but none for 2, so 2
    // is locked in the two corners with extras.
    for (let c = 1; c <= 9; c++) {
      if (c === 1 || c === 4) continue;
      grid[at(1, c)].candidates = [1, 4, 5, 6, 7, 8, 9];
    }
    for (const cell of grid) {
      if (cell.candidates.length === 0) cell.candidates = [4, 5, 6, 7, 8, 9];
    }
    const found = findAllTechniqueInstances(grid, 'Unique Rectangle Type 4', ONE);
    expect(found).toHaveLength(1);
    const [step] = found;
    expect(step.digit).toBe(1);
    expect(step.unit.name).toBe('row 1');
    expect(elimsOf(step)).toEqual(['R1C1=1', 'R1C4=1']);
    expect(step.strongLinks[0].from.digit).toBe(2);
  });

  it('does not fire when the pair digit has a third home in the unit', () => {
    const grid = handBuilt({
      [at(2, 1)]: [1, 2],
      [at(2, 4)]: [1, 2],
      [at(1, 1)]: [1, 2, 3],
      [at(1, 4)]: [1, 2, 3],
      [at(1, 7)]: [1, 2, 9],
    });
    expect(findAllTechniqueInstances(grid, 'Unique Rectangle Type 4', ONE)).toEqual([]);
  });
});

describe('Unique Rectangle Type 5', () => {
  it('the same extra in three corners leaves every cell that sees all three', () => {
    const grid = handBuilt({
      [at(2, 4)]: [1, 2],
      [at(1, 1)]: [1, 2, 3],
      [at(1, 4)]: [1, 2, 3],
      [at(2, 1)]: [1, 2, 3],
      [at(1, 2)]: [3, 9],
    });
    const found = findAllTechniqueInstances(grid, 'Unique Rectangle Type 5', ONE);
    expect(found).toHaveLength(1);
    const [step] = found;
    expect(step.digit).toBe(3);
    expect(step.rectangle.roof.map(cellName)).toEqual(['R1C1', 'R1C4', 'R2C1']);
    expect(elimsOf(step)).toEqual(['R1C2=3']);
    // Two corners in one unit is Type 2's shape, not this one.
    expect(findAllTechniqueInstances(grid, 'Unique Rectangle Type 2', ONE)).toEqual([]);
  });
});

/**
 * Confine the digit 1 to the rectangle's corners along rows 1 and 2, and
 * only there: the other digit keeps homes in both lines, and so does 1 in
 * the two columns. A board where both pair digits were confined in both
 * lines would be the deadly pattern itself, and so could not be a puzzle.
 */
const confineToRows = (grid) => {
  for (const r of [1, 2]) {
    for (let c = 1; c <= 9; c++) {
      if (c === 1 || c === 4) continue;
      grid[at(r, c)].candidates = [2, 4, 5, 6, 7, 8, 9];
    }
  }
  for (const r of [3, 4, 5, 6, 7, 8, 9]) {
    for (const c of [1, 4]) grid[at(r, c)].candidates = [1, 2, 4, 5, 6, 7, 8, 9];
  }
  for (const cell of grid) {
    if (cell.candidates.length === 0) cell.candidates = [4, 5, 6, 7, 8, 9];
  }
  return grid;
};

describe('Unique Rectangle Type 6', () => {
  it('a pair digit confined to the corners runs down the bare diagonal', () => {
    const grid = emptyGrid();
    grid[at(1, 1)].candidates = [1, 2];
    grid[at(2, 4)].candidates = [1, 2];
    grid[at(1, 4)].candidates = [1, 2, 3];
    grid[at(2, 1)].candidates = [1, 2, 3];
    confineToRows(grid);
    const found = findAllTechniqueInstances(grid, 'Unique Rectangle Type 6', ONE);
    expect(found).toHaveLength(1);
    const [step] = found;
    expect(step.digit).toBe(1);
    expect(elimsOf(step)).toEqual(['R1C4=1', 'R2C1=1']);
    expect(step.rectangle.floor.map(cellName)).toEqual(['R1C1', 'R2C4']);
    expect(step.strongLinks).toHaveLength(2);
  });

  it('does not fire when the two bare corners are side by side', () => {
    const grid = emptyGrid();
    grid[at(1, 1)].candidates = [1, 2];
    grid[at(1, 4)].candidates = [1, 2];
    grid[at(2, 1)].candidates = [1, 2, 3];
    grid[at(2, 4)].candidates = [1, 2, 3];
    confineToRows(grid);
    expect(findAllTechniqueInstances(grid, 'Unique Rectangle Type 6', ONE)).toEqual([]);
  });
});

describe('Hidden Unique Rectangle', () => {
  it('one bare corner and two strong links settle the far corner', () => {
    const grid = emptyGrid();
    grid[at(1, 1)].candidates = [1, 2];
    grid[at(1, 4)].candidates = [1, 2, 3];
    grid[at(2, 1)].candidates = [1, 2, 3];
    grid[at(2, 4)].candidates = [1, 2, 3];
    // In row 2 and column 4, the digit 2 can only go in the rectangle.
    for (let c = 1; c <= 9; c++) {
      if (c === 1 || c === 4) continue;
      grid[at(2, c)].candidates = [1, 4, 5, 6, 7, 8, 9];
    }
    for (let r = 1; r <= 9; r++) {
      if (r === 1 || r === 2) continue;
      grid[at(r, 4)].candidates = [1, 4, 5, 6, 7, 8, 9];
    }
    for (const cell of grid) {
      if (cell.candidates.length === 0) cell.candidates = [4, 5, 6, 7, 8, 9];
    }
    const found = findAllTechniqueInstances(grid, 'Hidden Unique Rectangle', ONE);
    expect(found).toHaveLength(1);
    const [step] = found;
    expect(elimsOf(step)).toEqual(['R2C4=1']);
    expect(step.rectangle.floor.map(cellName)).toEqual(['R1C1']);
    expect(step.strongLinks.map((l) => cellName(l.to.cell))).toEqual(['R2C1', 'R1C4']);
  });
});

describe('Avoidable Rectangle Type 1', () => {
  const build = (opts = {}) => {
    const grid = handBuilt({ [at(2, 4)]: [5, 9] });
    return withValues(grid, { [at(1, 1)]: 5, [at(1, 4)]: 7, [at(2, 1)]: 7 }, opts);
  };

  it('the empty corner cannot complete the pattern', () => {
    const found = findAllTechniqueInstances(build(), 'Avoidable Rectangle Type 1', ONE);
    expect(found).toHaveLength(1);
    const [step] = found;
    expect(step.digit).toBe(5);
    expect(elimsOf(step)).toEqual(['R2C4=5']);
    expect(step.placedDigits.map((p) => `${cellName(p.cell)}=${p.digit}`).sort()).toEqual([
      'R1C1=5',
      'R1C4=7',
      'R2C1=7',
    ]);
  });

  it('refuses to use a given: a clue cannot take part in a swap', () => {
    expect(findAllTechniqueInstances(build({ given: true }), 'Avoidable Rectangle Type 1', ONE)).toEqual([]);
  });

  it('needs the two corners beside the empty one to match', () => {
    const grid = handBuilt({ [at(2, 4)]: [5, 9] });
    withValues(grid, { [at(1, 1)]: 5, [at(1, 4)]: 7, [at(2, 1)]: 6 });
    expect(findAllTechniqueInstances(grid, 'Avoidable Rectangle Type 1', ONE)).toEqual([]);
  });
});

describe('Avoidable Rectangle Type 2', () => {
  it('the shared extra is true in one of the two empty corners', () => {
    const grid = handBuilt({
      [at(2, 1)]: [7, 3],
      [at(2, 4)]: [5, 3],
      [at(2, 7)]: [3, 8],
    });
    withValues(grid, { [at(1, 1)]: 5, [at(1, 4)]: 7 });
    const found = findAllTechniqueInstances(grid, 'Avoidable Rectangle Type 2', ONE);
    expect(found).toHaveLength(1);
    const [step] = found;
    expect(step.digit).toBe(3);
    expect(elimsOf(step)).toEqual(['R2C7=3']);
    expect(step.rectangle.roof.map(cellName)).toEqual(['R2C1', 'R2C4']);
  });

  it('needs the same one extra in both empty corners', () => {
    const grid = handBuilt({
      [at(2, 1)]: [7, 3],
      [at(2, 4)]: [5, 4],
      [at(2, 7)]: [3, 4, 8],
    });
    withValues(grid, { [at(1, 1)]: 5, [at(1, 4)]: 7 });
    expect(findAllTechniqueInstances(grid, 'Avoidable Rectangle Type 2', ONE)).toEqual([]);
  });
});

// The grave fixtures. A bivalue universal grave is made of rectangles that
// span exactly two boxes: each one gives its two digits exactly two homes in
// every row, column and box it touches, which is the condition. Build the
// board from a few disjoint rectangles, fill everything else in, and add
// the extras that stop it from being a grave.
const graveBoard = (extras) => {
  const grid = emptyGrid();
  const marks = {
    // {1, 2} over rows 1-2, columns 1 and 4
    [at(1, 1)]: [1, 2],
    [at(1, 4)]: [1, 2],
    [at(2, 1)]: [1, 2],
    [at(2, 4)]: [1, 2],
    // {3, 4} over rows 4 and 7, columns 1 and 2
    [at(4, 1)]: [3, 4],
    [at(4, 2)]: [3, 4],
    [at(7, 1)]: [3, 4],
    [at(7, 2)]: [3, 4],
    // {5, 6} over rows 4 and 7, columns 5 and 6
    [at(4, 5)]: [5, 6],
    [at(4, 6)]: [5, 6],
    [at(7, 5)]: [5, 6],
    [at(7, 6)]: [5, 6],
    // {7, 8} over rows 5 and 8, columns 2 and 3
    [at(5, 2)]: [7, 8],
    [at(5, 3)]: [7, 8],
    [at(8, 2)]: [7, 8],
    [at(8, 3)]: [7, 8],
  };
  for (const [cell, candidates] of Object.entries(marks)) {
    grid[Number(cell)].candidates = [...candidates];
  }
  for (const [cell, digit] of Object.entries(extras)) {
    grid[Number(cell)].candidates = [...grid[Number(cell)].candidates, digit].sort((a, b) => a - b);
  }
  // Every other cell is filled in. What with does not matter to a detector
  // that only asks which cells are still empty and what they could hold.
  for (const cell of grid) {
    if (cell.candidates.length === 0) cell.value = 9;
  }
  return grid;
};

describe('BUG+2', () => {
  it('one of the two extras must be true, so what both rule out goes', () => {
    // Two spare 3s: one in R1C1 (column 1), one in R4C5 (row 4). R4C1 sees
    // both, so its own 3 cannot survive either way.
    const grid = graveBoard({ [at(1, 1)]: 3, [at(4, 5)]: 3 });
    const found = findAllTechniqueInstances(grid, 'BUG+2', ONE);
    expect(found).toHaveLength(1);
    const [step] = found;
    expect(step.bugExtras.map((e) => `${cellName(e.cell)}=${e.digit}`).sort()).toEqual([
      'R1C1=3',
      'R4C5=3',
    ]);
    expect(elimsOf(step)).toEqual(['R4C1=3']);
  });

  it('two extras in one cell leave that cell nothing else', () => {
    const grid = graveBoard({});
    grid[at(1, 1)].candidates = [1, 2, 3, 5];
    const found = findAllTechniqueInstances(grid, 'BUG+2', ONE);
    expect(found).toHaveLength(1);
    expect(elimsOf(found[0])).toEqual(['R1C1=1', 'R1C1=2']);
  });

  it('says nothing when the board is not a grave with two extras', () => {
    const grid = graveBoard({ [at(1, 1)]: 3 });
    expect(findAllTechniqueInstances(grid, 'BUG+2', ONE)).toEqual([]);
    // One extra is BUG+1, and that one places a digit.
    const bug1 = findAllTechniqueInstances(grid, 'BUG+1', ONE);
    expect(bug1).toHaveLength(1);
    expect(bug1[0].placement).toEqual({ cell: at(1, 1), digit: 3 });
  });

  it('is not fooled by a board that only looks like a grave', () => {
    // The cell counts are right but one digit has four homes in a unit, so
    // removing the extras would not leave a grave at all.
    const grid = graveBoard({ [at(1, 1)]: 3, [at(4, 5)]: 3 });
    grid[at(9, 1)].value = null;
    grid[at(9, 1)].candidates = [3, 4];
    expect(findAllTechniqueInstances(grid, 'BUG+2', ONE)).toEqual([]);
  });
});

describe('BUG+3', () => {
  it('one of the three extras must be true', () => {
    // Three spare 3s, all seen by R4C1: down its column, along its row and
    // inside its box.
    const grid = graveBoard({ [at(1, 1)]: 3, [at(4, 5)]: 3, [at(5, 2)]: 3 });
    const found = findAllTechniqueInstances(grid, 'BUG+3', ONE);
    expect(found).toHaveLength(1);
    const [step] = found;
    expect(step.bugExtras).toHaveLength(3);
    expect(elimsOf(step)).toEqual(['R4C1=3']);
    expect(findAllTechniqueInstances(grid, 'BUG+2', ONE)).toEqual([]);
  });
});

describe('Unique Loop', () => {
  // Six cells over rows 1-3, columns 1, 4 and 7, two in every row, column
  // and box they touch, closing one ring.
  const loop = [at(1, 1), at(1, 4), at(2, 4), at(2, 7), at(3, 7), at(3, 1)];

  const loopBoard = (extras = {}) => {
    const marks = {};
    for (const cell of loop) marks[cell] = [1, 2];
    for (const [cell, digit] of Object.entries(extras)) {
      marks[Number(cell)] = [1, 2, digit];
    }
    // One pencil mark everywhere else, so no second ring can form and the
    // search has only this one to find.
    return handBuilt(marks, [9]);
  };

  it('one cell with something extra loses both loop digits', () => {
    const found = findAllTechniqueInstances(loopBoard({ [at(2, 7)]: 3 }), 'Unique Loop', ONE);
    expect(found).toHaveLength(1);
    const [step] = found;
    expect(step.pairDigits).toEqual([1, 2]);
    expect([...step.loopCells].sort((a, b) => a - b)).toEqual([...loop].sort((a, b) => a - b));
    expect(elimsOf(step)).toEqual(['R2C7=1', 'R2C7=2']);
  });

  it('two cells sharing an extra put it in one of them', () => {
    const grid = loopBoard({ [at(1, 1)]: 3, [at(1, 4)]: 3 });
    // A cell that sees both: the rest of row 1.
    grid[at(1, 9)].candidates = [3, 9];
    const found = findAllTechniqueInstances(grid, 'Unique Loop', ONE);
    expect(found.length).toBeGreaterThan(0);
    expect(elimsOf(found[0])).toEqual(['R1C9=3']);
  });

  it('a loop that is all bare pairs proves nothing, because nothing breaks it', () => {
    expect(findAllTechniqueInstances(loopBoard(), 'Unique Loop', ONE)).toEqual([]);
  });

  it('will not call a broken ring a loop', () => {
    // Move one cell so column 7 holds only one loop cell: after the swap
    // that column would need two of the same digit, so the argument fails.
    const marks = {};
    for (const cell of [at(1, 1), at(1, 4), at(2, 4), at(2, 7), at(3, 8), at(3, 1)]) {
      marks[cell] = [1, 2];
    }
    marks[at(2, 7)] = [1, 2, 3];
    expect(findAllTechniqueInstances(handBuilt(marks, [9]), 'Unique Loop', ONE)).toEqual([]);
  });
});

describe('the rectangles the family looks at', () => {
  it('are the ones that span exactly two boxes, and there are 486 of them', () => {
    expect(DEADLY_RECTANGLES).toHaveLength(486);
    for (const { corners } of DEADLY_RECTANGLES) {
      expect(new Set(corners.map((c) => Math.floor(c / 27) * 3 + Math.floor((c % 9) / 3))).size).toBe(2);
    }
  });

  it('never a rectangle over four boxes, which cannot be swapped', () => {
    const grid = handBuilt({
      [at(1, 1)]: [1, 2],
      [at(1, 4)]: [1, 2],
      [at(4, 1)]: [1, 2],
      [at(4, 4)]: [1, 2, 3],
    });
    for (const technique of UNIQUENESS_TECHNIQUE_NAMES) {
      expect(findAllTechniqueInstances(grid, technique, ONE), technique).toEqual([]);
    }
  });
});

const seenOnThePath = new Set();

describe('the ladder', () => {
  it('a uniqueness step waits until everything easier is gone', () => {
    // The Type 2 rectangle from above, with a plain naked pair planted in
    // row 9. Both apply; the hint must be the easy one, because every hint
    // is a lesson and this one is a lesson the player can use.
    const grid = handBuilt({
      [at(1, 1)]: [1, 2],
      [at(1, 4)]: [1, 2],
      [at(2, 1)]: [1, 2, 3],
      [at(2, 4)]: [1, 2, 3],
      [at(2, 7)]: [3, 7],
      [at(9, 1)]: [4, 5],
      [at(9, 2)]: [4, 5],
    });
    expect(findAllTechniqueInstances(grid, 'Unique Rectangle Type 2', ONE)).toHaveLength(1);
    expect(findAllTechniqueInstances(grid, 'Naked Pair', ONE).length).toBeGreaterThan(0);

    const step = findNextLogicStep(grid, null, ONE);
    expect(UNIQUENESS_TECHNIQUE_NAMES).not.toContain(step.technique);
    expect(
      teachingRank(step.technique),
      `${step.technique} should sit below the uniqueness family on the ladder`
    ).toBeLessThan(teachingRank('Unique Rectangle Type 2'));
  });

  it('and the family itself is taught in order, Type 1 first and the loops last', () => {
    const ranks = UNIQUENESS_TECHNIQUE_NAMES.map(teachingRank);
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
    expect(UNIQUENESS_TECHNIQUE_NAMES[0]).toBe('Unique Rectangle Type 1');
    expect(UNIQUENESS_TECHNIQUE_NAMES[UNIQUENESS_TECHNIQUE_NAMES.length - 1]).toBe('Unique Loop');
    for (const name of UNIQUENESS_TECHNIQUE_NAMES) expect(techniqueTier(name)).toBe('Ultimate');
  });
});

describe('the family on the real solve path of the top shelf', () => {
  // oracleAll walks the ladder of patterns and stops where it stalls. This
  // walk carries on through the search the way the hint path does, and
  // checks every instance the family reports on every board it passes
  // against the puzzle's one true answer, which is the whole promise of
  // the oracle tests.
  //
  // Which boards those are depends on what the ladder and the search hand
  // back, so the forcing batch (#75) moved them: the proofs finish these
  // puzzles by a different route from the trial search they replaced, and
  // that route no longer passes a board carrying an Avoidable Rectangle or
  // a Unique Rectangle Type 6. Both keep their own hand-built tests above,
  // with their exact eliminations; what they have lost is a sighting on a
  // library board, which is a gap in the library rather than in a
  // detector, and the teaching report (#83) counts it as one.
  for (const { name, puzzle } of PUZZLES.ultimate) {
    it(`${name}: every uniqueness instance agrees with the answer`, () => {
      const solution = solutionsOf(puzzle, 1)[0];
      const { state: uniqueness } = establishUniqueness(puzzle);
      expect(uniqueness).toBe(UNIQUENESS_ONE);
      let grid = buildGrid(puzzle);
      for (let i = 0; i < 300; i++) {
        // The loop search is the one detector too slow to run on every
        // grid; every eighth is what oracleAll does with the dear ones.
        const techniques = UNIQUENESS_TECHNIQUE_NAMES.filter(
          (t) => t !== 'Unique Loop' || i % 8 === 0
        );
        for (const technique of techniques) {
          for (const step of findAllTechniqueInstances(grid, technique, { uniqueness })) {
            expect(step.technique).toBe(technique);
            if (step.placement) {
              expect(
                step.placement.digit,
                `${name} step ${i}: ${technique} writes ${step.placement.digit} in ${cellName(step.placement.cell)}, the answer has ${solution[step.placement.cell]}`
              ).toBe(solution[step.placement.cell]);
            }
            for (const e of step.eliminations) {
              expect(
                e.digit,
                `${name} step ${i}: ${technique} erases the ${e.digit} in ${cellName(e.cell)}, which is the answer there`
              ).not.toBe(solution[e.cell]);
            }
            expect(step.placement || step.eliminations.length > 0).toBeTruthy();
            seenOnThePath.add(technique);
          }
        }
        let step = findNextLogicStep(grid, null, { uniqueness });
        if (!step) step = findWhatIfStep(grid);
        if (!step) break;
        grid = applyLogicStep(grid, step);
        if (step.placement) {
          grid = eliminateCandidatesFromPeers(grid, step.placement.cell, step.placement.digit);
        }
      }
    }, 120_000);
  }

  it('and the walk really does reach the family, by name', () => {
    // Exact on purpose: a technique that quietly stopped firing on these
    // boards would fail here, and so would one that started.
    expect([...seenOnThePath].sort()).toEqual([
      'Hidden Unique Rectangle',
      'Unique Rectangle Type 1',
      'Unique Rectangle Type 2',
      'Unique Rectangle Type 3',
      'Unique Rectangle Type 4',
    ]);
  });
});

describe('the ones the library never shows, on real grids', () => {
  // A puzzle with exactly one answer, and the board as it stood when the
  // technique fired on it. Both were found by generating and digging until
  // the technique turned up, and the board is frozen here rather than
  // re-walked: the ladder gains rungs with every batch of the programme,
  // and what this test is about does not depend on how a player got to this
  // position. The pencil marks are ones the mentor's own steps produced.
  //
  // The hand-built grids above pin the exact eliminations. These pin the
  // thing a hand-built grid cannot, and the thing every oracle test in this
  // repo is for: on a real puzzle with a real answer, no instance may
  // disagree with that answer. (A hand-built deadly pattern has two answers
  // by construction - that is the point of it - so there is nothing there
  // to compare against.)
  //
  // A cell is "=5" where a digit is placed and its pencil marks otherwise.
  const REAL_GRIDS = {
    'Avoidable Rectangle Type 2': {
      puzzle: '043000008000507000000090205070000016000003000604905000000250000061300002000070081',
      board:
        '=5 =4 =3 =1 =2 =6 79 79 =8 29 28 289 =5 =3 =7 =1 =6 =4 =7 =1 =6 48 =9 48 =2 =3 =5 39 =7 59 48 48 =2 35 =1 =6 =1 258 258 =7 =6 =3 458 45 =9 =6 38 =4 =9 =1 =5 38 =2 =7 =8 =9 =7 =2 =5 =1 =6 4 =3 =4 =6 =1 =3 8 89 57 57 =2 23 235 25 =6 =7 49 49 =8 =1',
    },
    'BUG+2': {
      puzzle: '800090000000078000072000006010089503004002000050030000940000005008007900003010408',
      board:
        '=8 =3 56 126 =9 46 12 45 =7 14 =9 56 126 =7 =8 =3 45 12 14 =7 =2 13 =5 34 =8 =9 =6 26 =1 =7 =4 =8 =9 =5 26 =3 =3 =8 =4 =5 =6 =2 17 17 =9 26 =5 =9 =7 =3 =1 26 =8 =4 =9 =4 =1 =8 =2 36 67 37 =5 =5 26 =8 36 =4 =7 =9 13 12 =7 26 =3 =9 =1 =5 =4 26 =8',
    },
    'BUG+3': {
      puzzle: '000120000050400000360000000605000900400005070001270030000019702007000185200000060',
      board:
        '=7 48 =9 =1 =2 368 48 =5 368 =1 =5 28 =4 68 37 268 =9 37 =3 =6 24 =5 =9 78 24 =1 78 =6 =7 =5 38 34 =1 =9 =2 48 =4 =2 =3 =9 68 =5 68 =7 =1 =8 =9 =1 =2 =7 46 =5 =3 46 =5 38 =6 38 =1 =9 =7 =4 =2 =9 34 =7 =6 34 =2 =1 =8 =5 =2 =1 48 =7 =5 48 =3 =6 =9',
    },
    'Unique Loop': {
      puzzle: '005009000007600001000070008000004000000100030679000084400000020058060300063020000',
      board:
        '=8 =4 =5 =2 =1 =9 =6 =7 =3 39 23 =7 =6 =4 =8 259 59 =1 139 123 =6 35 =7 35 2459 459 =8 13 13 =2 =7 =8 =4 59 569 569 =5 =8 =4 =1 =9 =6 =7 =3 =2 =6 =7 =9 35 35 =2 =1 =8 =4 =4 =9 =1 358 35 357 58 =2 567 =2 =5 =8 49 =6 17 =3 149 79 =7 =6 =3 4589 =2 15 4589 1459 59',
    },
  };

  const readBoard = (puzzle, board) =>
    board.split(' ').map((mark, i) => ({
      cellIndex: i,
      value: mark.startsWith('=') ? Number(mark.slice(1)) : null,
      isFixed: puzzle[i] !== 0,
      candidates: mark.startsWith('=') ? [] : mark.split('').map(Number),
      isHighlighted: false,
      highlightColor: null,
      isBaseCell: false,
      isTargetCell: false,
    }));

  for (const [technique, fixture] of Object.entries(REAL_GRIDS)) {
    it(`${technique}: every instance on a real grid agrees with its answer`, () => {
      const puzzle = fixture.puzzle.split('').map(Number);
      expect(establishUniqueness(puzzle).state).toBe(UNIQUENESS_ONE);
      const solution = solutionsOf(puzzle, 1)[0];
      const grid = readBoard(puzzle, fixture.board);
      expect(grid).toHaveLength(81);

      // The board is honest before anything is asked of it: it keeps the
      // puzzle's givens, every digit on it is the answer's digit, and no
      // cell has lost the pencil mark the answer needs. A fixture that
      // failed this would prove nothing about soundness.
      for (let i = 0; i < 81; i++) {
        if (puzzle[i]) expect(grid[i].value, cellName(i)).toBe(puzzle[i]);
        if (grid[i].value !== null) expect(grid[i].value, cellName(i)).toBe(solution[i]);
        else expect(grid[i].candidates, cellName(i)).toContain(solution[i]);
      }

      const found = findAllTechniqueInstances(grid, technique, ONE);
      expect(found.length, `${technique} should fire on this grid`).toBeGreaterThan(0);
      for (const step of found) {
        expect(step.technique).toBe(technique);
        if (step.placement) {
          expect(
            step.placement.digit,
            `${technique} writes ${step.placement.digit} in ${cellName(step.placement.cell)}, the answer has ${solution[step.placement.cell]}`
          ).toBe(solution[step.placement.cell]);
        }
        for (const e of step.eliminations) {
          expect(
            e.digit,
            `${technique} erases the ${e.digit} in ${cellName(e.cell)}, which is the answer there`
          ).not.toBe(solution[e.cell]);
        }
        expect(step.placement || step.eliminations.length > 0).toBeTruthy();
      }
    });
  }
});

// ---------------------------------------------------------------------------
// 3. The teaching
// ---------------------------------------------------------------------------

describe('what the player reads', () => {
  const JARGON = /\b(candidate|unit|conjugate|strong link|ALS|peer|bivalue|bi-value|roof|floor)\b/i;

  it('every entry in the family names its assumption out loud', () => {
    for (const name of UNIQUENESS_TECHNIQUE_NAMES) {
      const details = TECHNIQUE_DETAILS[name];
      expect(details, name).toBeTruthy();
      expect(
        `${details.plain} ${details.description}`,
        `${name} must say that it depends on the puzzle having one answer`
      ).toMatch(/exactly one answer/);
    }
  });

  it('every step the family emits explains itself in plain words', () => {
    const steps = uniquenessExamples();
    expect(Object.keys(steps).sort()).toEqual([...UNIQUENESS_TECHNIQUE_NAMES].sort());
    for (const [name, { step, grid }] of Object.entries(steps)) {
      const simple = explainStep(step, grid, 'simple');
      const text = `${simple.look} ${simple.why}`;
      expect(text, name).not.toMatch(/undefined|NaN|null/);
      expect(text, name).not.toMatch(JARGON);
      expect(simple.look, name).toMatch(/R\dC\d/);
      expect(simple.why.length, name).toBeGreaterThan(80);
      // Every one of them leans on the same fact, in words.
      expect(simple.why, name).toMatch(/two answers|two different ways|exactly one answer|one answer/);
      expect(simple.action, name).toMatch(/^(Write|Erase)/);

      const detailed = explainStep(step, grid, 'detailed');
      expect(detailed.why, name).toBe(step.explanation);
      expect(detailed.terms.length, name).toBeGreaterThan(0);
      // The engine's own text says it too, so the detailed reader is told.
      expect(step.explanation, name).toMatch(/exactly one answer/);
    }
  });
});

// ---------------------------------------------------------------------------
// What it costs
// ---------------------------------------------------------------------------

describe('what the family costs', () => {
  // Output, not an assertion: vitest keeps console.log to itself.
  const print = (text) => {
    const stdout = /** @type {any} */ (globalThis).process?.stdout;
    if (stdout && typeof stdout.write === 'function') stdout.write(`${text}\n`);
    else console.log(text);
  };

  /** A board played forward until `filled` cells carry a digit. */
  const playTo = (puzzle, filled) => {
    const { state: uniqueness } = establishUniqueness(puzzle);
    let grid = buildGrid(puzzle);
    for (let i = 0; i < 400; i++) {
      if (grid.filter((c) => c.value !== null).length >= filled) break;
      const step = findNextLogicStep(grid, null, { uniqueness });
      if (!step) break;
      grid = applyLogicStep(grid, step);
      if (step.placement) {
        grid = eliminateCandidatesFromPeers(grid, step.placement.cell, step.placement.digit);
      }
    }
    return grid;
  };

  const boards = [
    playTo(PUZZLES.ultimate[1].puzzle, 30),
    playTo(PUZZLES.ultimate[3].puzzle, 30),
    playTo(PUZZLES.diabolical[0].puzzle, 30),
  ];

  it('is cheap enough to scan, and the loops are the only dear one', () => {
    const costs = UNIQUENESS_TECHNIQUE_NAMES.map((name) => {
      let max = 0;
      for (const grid of boards) {
        const started = performance.now();
        findAllTechniqueInstances(grid, name, ONE);
        max = Math.max(max, performance.now() - started);
      }
      return { name, ms: max };
    });
    const total = costs.reduce((sum, c) => sum + c.ms, 0);
    print(`  uniqueness scan, mid-game board: ${costs.length} detectors, ${total.toFixed(1)} ms in all`);
    for (const { name, ms } of costs) print(`    ${name.padEnd(28)} ${ms.toFixed(1)} ms`);
    // These are scan-tier, not live counts, so the budget is the one the
    // programme sets for the whole named ladder rather than one frame.
    expect(total).toBeLessThan(500);
    // Every rectangle detector is a rounding error; only the loop search
    // costs anything worth knowing about.
    for (const { name, ms } of costs) {
      if (name !== 'Unique Loop') expect(ms, name).toBeLessThan(25);
    }
  });

  it('leaves the hint path well inside its budget', () => {
    let worst = 0;
    for (const grid of boards) {
      const started = performance.now();
      findNextLogicStep(grid, null, ONE);
      worst = Math.max(worst, performance.now() - started);
    }
    // The worst case of all: a board where nothing named applies, so every
    // rung runs to the end, the loop search included.
    let stalled = buildGrid(PUZZLES.ultimate[3].puzzle);
    for (let i = 0; i < 400; i++) {
      const step = findNextLogicStep(stalled, null, ONE);
      if (!step) break;
      stalled = applyLogicStep(stalled, step);
      if (step.placement) {
        stalled = eliminateCandidatesFromPeers(stalled, step.placement.cell, step.placement.digit);
      }
    }
    const started = performance.now();
    findNextLogicStep(stalled, null, ONE);
    const whenNothingApplies = performance.now() - started;
    print(
      `  hint path with the family on: worst ${worst.toFixed(0)} ms mid-game, ` +
        `${whenNothingApplies.toFixed(0)} ms on a board where nothing named applies`
    );
    expect(worst).toBeLessThan(1000);
    expect(whenNothingApplies).toBeLessThan(1000);
  });

  it('establishes the answer count in a blink, once', () => {
    let worst = 0;
    for (const { puzzle } of Object.values(PUZZLES).flat()) {
      const started = performance.now();
      establishUniqueness(puzzle);
      worst = Math.max(worst, performance.now() - started);
    }
    print(`  establishing the answer count: worst ${worst.toFixed(0)} ms over the library`);
    // It runs on load, not per hint, so this is a load-time cost - but a
    // player waits for a load too.
    expect(worst).toBeLessThan(500);
  });
});

// One real step per technique, from the hand-built grids above: the same
// fixtures, collected once so the teaching tests can walk all thirteen.
function uniquenessExamples() {
  const examples = {};
  const take = (name, grid) => {
    const [step] = findAllTechniqueInstances(grid, name, ONE);
    if (step) examples[name] = { step, grid };
  };

  take('Unique Rectangle Type 1', handBuilt({
    [at(1, 1)]: [1, 2], [at(1, 4)]: [1, 2], [at(2, 1)]: [1, 2], [at(2, 4)]: [1, 2, 3],
  }));
  take('Unique Rectangle Type 2', handBuilt({
    [at(1, 1)]: [1, 2], [at(1, 4)]: [1, 2], [at(2, 1)]: [1, 2, 3], [at(2, 4)]: [1, 2, 3],
    [at(2, 7)]: [3, 7],
  }));
  take('Unique Rectangle Type 3', handBuilt({
    [at(2, 1)]: [1, 2], [at(2, 4)]: [1, 2], [at(1, 1)]: [1, 2, 3], [at(1, 4)]: [1, 2, 4],
    [at(1, 7)]: [3, 4], [at(1, 2)]: [3, 5], [at(1, 5)]: [4, 6],
  }, [5, 6, 7, 8, 9]));
  take('Unique Rectangle Type 5', handBuilt({
    [at(2, 4)]: [1, 2], [at(1, 1)]: [1, 2, 3], [at(1, 4)]: [1, 2, 3], [at(2, 1)]: [1, 2, 3],
    [at(1, 2)]: [3, 9],
  }));
  take('Avoidable Rectangle Type 1', withValues(
    handBuilt({ [at(2, 4)]: [5, 9] }),
    { [at(1, 1)]: 5, [at(1, 4)]: 7, [at(2, 1)]: 7 }
  ));
  take('Avoidable Rectangle Type 2', withValues(
    handBuilt({ [at(2, 1)]: [7, 3], [at(2, 4)]: [5, 3], [at(2, 7)]: [3, 8] }),
    { [at(1, 1)]: 5, [at(1, 4)]: 7 }
  ));
  take('BUG+1', graveBoard({ [at(1, 1)]: 3 }));
  take('BUG+2', graveBoard({ [at(1, 1)]: 3, [at(4, 5)]: 3 }));
  take('BUG+3', graveBoard({ [at(1, 1)]: 3, [at(4, 5)]: 3, [at(5, 2)]: 3 }));

  // Type 4, Type 6 and the hidden form need a line emptied of one digit.
  const lineGrid = (prepare) => {
    const grid = emptyGrid();
    prepare(grid);
    for (const cell of grid) {
      if (cell.candidates.length === 0) cell.candidates = [4, 5, 6, 7, 8, 9];
    }
    return grid;
  };
  take('Unique Rectangle Type 4', lineGrid((grid) => {
    grid[at(2, 1)].candidates = [1, 2];
    grid[at(2, 4)].candidates = [1, 2];
    grid[at(1, 1)].candidates = [1, 2, 3];
    grid[at(1, 4)].candidates = [1, 2, 3];
    for (let c = 1; c <= 9; c++) {
      if (c !== 1 && c !== 4) grid[at(1, c)].candidates = [1, 4, 5, 6, 7, 8, 9];
    }
  }));
  take('Unique Rectangle Type 6', lineGrid((grid) => {
    grid[at(1, 1)].candidates = [1, 2];
    grid[at(2, 4)].candidates = [1, 2];
    grid[at(1, 4)].candidates = [1, 2, 3];
    grid[at(2, 1)].candidates = [1, 2, 3];
    confineToRows(grid);
  }));
  take('Hidden Unique Rectangle', lineGrid((grid) => {
    grid[at(1, 1)].candidates = [1, 2];
    grid[at(1, 4)].candidates = [1, 2, 3];
    grid[at(2, 1)].candidates = [1, 2, 3];
    grid[at(2, 4)].candidates = [1, 2, 3];
    for (let c = 1; c <= 9; c++) {
      if (c !== 1 && c !== 4) grid[at(2, c)].candidates = [1, 4, 5, 6, 7, 8, 9];
    }
    for (let r = 3; r <= 9; r++) grid[at(r, 4)].candidates = [1, 4, 5, 6, 7, 8, 9];
  }));

  const loopMarks = {};
  for (const cell of [at(1, 1), at(1, 4), at(2, 4), at(2, 7), at(3, 7), at(3, 1)]) {
    loopMarks[cell] = [1, 2];
  }
  loopMarks[at(2, 7)] = [1, 2, 3];
  take('Unique Loop', handBuilt(loopMarks, [9]));

  return examples;
}
