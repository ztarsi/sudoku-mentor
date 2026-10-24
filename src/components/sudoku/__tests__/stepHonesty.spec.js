// Every claim an explanation makes about the board must be true of the
// board. These tests check the structured fields the engines now emit
// (unit, orientation, pairDigits) against the grid itself, on every
// instance the library produces, and check that a what-if narrative's
// every reason is true of the board it was given for.
import { describe, it, expect } from 'vitest';
import { generateCandidates, findAllTechniqueInstances } from '../logicEngine';
import { findHypothesis, refutes } from '../forcingChainEngine';
import { applyLogicStep, findNextLogicStep } from '../logicEngine';
import { explainStep } from '../explainStep';
import { buildHighlightSets } from '../stepHighlights';
import { ALL_UNITS, getPeers, getRow, getCol, cellName } from '../gridUnits';
import { PUZZLES } from '../puzzles';

const gridFrom = (puzzle) =>
  generateCandidates(
    puzzle.map((v, i) => ({
      cellIndex: i, value: v || null, isFixed: !!v, candidates: [],
      isHighlighted: false, highlightColor: null, isBaseCell: false, isTargetCell: false,
    }))
  );

const unitCells = (unit) =>
  ALL_UNITS.find((u) => u.type === unit.type && u.index === unit.index).indices;

const library = Object.values(PUZZLES).flat().map((p) => gridFrom(p.puzzle));

const instancesOf = (technique) =>
  library.flatMap((grid) => findAllTechniqueInstances(grid, technique).map((step) => ({ step, grid })));

describe('engine steps carry a truthful unit', () => {
  it('Hidden Single: the digit fits nowhere else in the named unit', () => {
    const found = instancesOf('Hidden Single');
    expect(found.length).toBeGreaterThan(0);
    for (const { step, grid } of found) {
      expect(step.unit).toBeTruthy();
      const cells = unitCells(step.unit);
      expect(cells).toContain(step.placement.cell);
      const others = cells.filter((i) => i !== step.placement.cell && grid[i].value === null);
      expect(others.some((i) => grid[i].candidates.includes(step.digit))).toBe(false);
      // The highlighted unit is the one the engine named
      const { unitCells: lit } = buildHighlightSets([step]);
      expect([...lit].sort()).toEqual([...cells].sort());
      expect(explainStep(step, grid, 'simple').look).toContain(`Look at ${step.unit.name}`);
    }
  });

  it('Hidden Pair: both digits fit only in the two cells within the named unit', () => {
    const found = instancesOf('Hidden Pair');
    expect(found.length).toBeGreaterThan(0);
    for (const { step, grid } of found) {
      expect(step.unit).toBeTruthy();
      expect(step.pairDigits).toHaveLength(2);
      const cells = unitCells(step.unit);
      for (const c of step.baseCells) expect(cells).toContain(c);
      for (const d of step.pairDigits) {
        const spots = cells.filter((i) => grid[i].value === null && grid[i].candidates.includes(d));
        expect(spots.sort()).toEqual([...step.baseCells].sort());
      }
      const out = explainStep(step, grid, 'simple');
      expect(out.look).toContain(`Look at ${step.unit.name}`);
      expect(out.look).toContain(`${step.pairDigits[0]} and ${step.pairDigits[1]}`);
    }
  });

  it('Naked Pair / Triple: the eliminations lie in the named unit', () => {
    for (const technique of ['Naked Pair', 'Naked Triple']) {
      for (const { step, grid } of instancesOf(technique)) {
        expect(step.unit).toBeTruthy();
        const cells = unitCells(step.unit);
        for (const e of step.eliminations) expect(cells).toContain(e.cell);
        expect(explainStep(step, grid, 'simple').look).toContain(step.unit.name);
      }
    }
  });
});

describe('fish explanations state the true orientation', () => {
  it('X-Wing and Swordfish: base lines really confine the digit to the cover lines', () => {
    let checked = 0;
    for (const technique of ['X-Wing', 'Swordfish']) {
      for (const { step, grid } of instancesOf(technique)) {
        expect(['row', 'column']).toContain(step.orientation);
        const base = step.orientation === 'row' ? getRow : getCol;
        const cover = step.orientation === 'row' ? getCol : getRow;
        const baseLines = [...new Set(step.baseCells.map(base))];
        const coverLines = new Set(step.baseCells.map(cover));
        // In every base line, every candidate for the digit sits on a cover line
        for (const line of baseLines) {
          for (let i = 0; i < 81; i++) {
            if (base(i) !== line || grid[i].value !== null) continue;
            if (grid[i].candidates.includes(step.digit)) expect(coverLines.has(cover(i))).toBe(true);
          }
        }
        const out = explainStep(step, grid, 'simple');
        expect(out.look.startsWith(step.orientation === 'row' ? 'Look at rows' : 'Look at columns')).toBe(true);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(0);
  });

  it('Finned X-Wing: the beginner text follows the orientation the engine found', () => {
    const seen = { row: 0, column: 0 };
    for (const { step, grid } of instancesOf('Finned X-Wing')) {
      expect(['row', 'column']).toContain(step.orientation);
      const out = explainStep(step, grid, 'simple');
      const baseWord = step.orientation === 'row' ? 'rows' : 'columns';
      const coverWord = step.orientation === 'row' ? 'columns' : 'rows';
      expect(out.look.startsWith(`Look at ${baseWord}`)).toBe(true);
      expect(out.why).toContain(`erased from the rest of ${coverWord}`);
      // The eliminations really lie on the cover lines named in the text.
      const cover = step.orientation === 'row' ? getCol : getRow;
      const fins = new Set(step.finCells ?? []);
      const coverLines = new Set(step.baseCells.filter((c) => !fins.has(c)).map(cover));
      for (const e of step.eliminations) expect(coverLines.has(cover(e.cell))).toBe(true);
      seen[step.orientation]++;
    }
    expect(seen.row).toBeGreaterThan(0);
    expect(seen.column).toBeGreaterThan(0);
  });
});

describe('single explanations only claim what the grid shows', () => {
  // Walk every library puzzle with the hint engine; after elimination
  // techniques the strong "already appears in its row, column or box"
  // wording is often false, and the builder must notice.
  it('Naked Single / Hidden Single: the strong claim is used only when it is true', () => {
    let strong = 0; let weak = 0;
    for (const puzzle of Object.values(PUZZLES).flat()) {
      let grid = gridFrom(puzzle.puzzle);
      for (let n = 0; n < 200; n++) {
        const step = findNextLogicStep(grid, null);
        if (!step) break;
        if (step.technique === 'Naked Single') {
          const cell = step.placement.cell;
          const seen = new Set(getPeers(cell).map((i) => grid[i].value).filter((v) => v !== null));
          const allSeen = [1, 2, 3, 4, 5, 6, 7, 8, 9].every((d) => d === step.digit || seen.has(d));
          const out = explainStep(step, grid, 'simple');
          if (allSeen) { expect(out.why).toContain('already appears somewhere in its row'); strong++; }
          else { expect(out.why).not.toContain('already appears somewhere in its row'); weak++; }
        }
        if (step.technique === 'Hidden Single') {
          const cell = step.placement.cell;
          const others = unitCells(step.unit).filter((i) => i !== cell && grid[i].value === null);
          const allBlocked = others.length > 0 && others.every((i) => getPeers(i).some((p) => grid[p].value === step.digit));
          const out = explainStep(step, grid, 'simple');
          if (allBlocked) expect(out.why).toContain('already has a');
          else expect(out.why).not.toContain('already has a');
        }
        grid = applyLogicStep(grid, step);
      }
    }
    expect(strong).toBeGreaterThan(0);
    expect(weak).toBeGreaterThan(0);
  });

  it('Hypothesis Mode: the dead end named in the text is the one the engine hit', () => {
    let checked = 0;
    for (const puzzle of PUZZLES.ultimate) {
      const grid = gridFrom(puzzle.puzzle);
      const step = findHypothesis(grid);
      if (!step) continue;
      expect(typeof step.contradictionText).toBe('string');
      const out = explainStep(step, grid, 'simple');
      expect(out.why).toContain(step.contradictionText);
      expect(out.why).not.toContain('no possible number at all');
      // The walk ends its one case on the same dead end, and says the step
      // is a trial rather than a proof.
      expect(step.forcingBranches).toHaveLength(1);
      expect(step.forcingBranches[0].outcome.text).toBe(step.contradictionText);
      expect(out.look).toContain('not a proof');
      checked++;
    }
    expect(checked).toBeGreaterThan(0);
  });
});

describe('what-if narratives are honest', () => {
  // Every reason a branch gives for a placement is checked against the
  // board as it stood when that placement was made. The branch's moves are
  // replayed one at a time, each placed by hand rather than propagated, so
  // the board the claim is asked of is the board the engine had in front of
  // it and not one further on.
  const place = (grid, cell, digit) => {
    const next = grid.map((c) => ({ ...c, candidates: [...c.candidates] }));
    next[cell].value = digit;
    next[cell].candidates = [];
    for (const peer of getPeers(cell)) {
      if (next[peer].value === null) next[peer].candidates = next[peer].candidates.filter((d) => d !== digit);
    }
    return next;
  };

  it('every "Only place for" reason is a real hidden single at that point', () => {
    let branchesChecked = 0;
    let hiddenChecked = 0;
    let netMoves = 0;
    for (const puzzle of PUZZLES.ultimate) {
      const start = gridFrom(puzzle.puzzle);
      const step = findHypothesis(start);
      if (!step?.forcingBranches) continue;
      branchesChecked++;
      const branch = step.forcingBranches[0];
      let g = place(start, branch.assume.cell, branch.assume.digit);

      for (const move of branch.moves) {
        const hidden = /^Only place for (\d) in (row|column|box) (\d)$/.exec(move.reason);
        if (hidden) {
          const unit = ALL_UNITS.find((u) => u.type === hidden[2] && u.index === Number(hidden[3]) - 1);
          const others = unit.indices.filter((i) => i !== move.cell && g[i].value === null);
          expect(
            others.some((i) => g[i].candidates.includes(move.digit)),
            `${cellName(move.cell)}=${move.digit}: "${move.reason}" should be true of the board at that point`
          ).toBe(false);
          hiddenChecked++;
        }
        if (move.net) {
          // A net move says the cell cannot be its other digit. Ask the
          // engine the same question about the board as it stands here.
          netMoves++;
          const [a, b] = move.net.digits;
          const refuted = a === move.digit ? b : a;
          if (move.reason.includes('cannot be')) {
            expect(
              refutes(g, move.cell, refuted),
              `${move.reason}: the digit it rules out should really break the board`
            ).toBe(true);
          }
        }
        g = place(g, move.cell, move.digit);
      }
    }
    expect(branchesChecked).toBeGreaterThan(0);
    expect(hiddenChecked).toBeGreaterThan(0);
    // The trial fallback reaches for a net on the hardest of these boards,
    // and when it does, its claims have been checked above.
    expect(netMoves).toBeGreaterThan(0);
  });
});
