// Walkable colouring (#82): X-Cycle and 3D Medusa use the chain replay the
// chain batch built, so a player steps through a colouring link by link
// instead of reading a wall of text.
//
// A colouring is a network, not a line, so what it walks is the run of
// links that decides the step: from one of the two marks the rule is about
// to the other, in the order the colouring spread along it, then one last
// line for what the two ends prove. These tests pin that run, the wording,
// and - the thing that must not move - the eliminations.
import { describe, it, expect } from 'vitest';
import { findAllTechniqueInstances, generateCandidates } from '../logicEngine';
import { chainWalk, explainStep } from '../explainStep';
import { buildChainOverlay, buildFocusedCandidates } from '../stepHighlights';
import { cellName, arePeers } from '../gridUnits';
import { PUZZLES } from '../puzzles';

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

/** A board where `marks` sets the cells that matter and `without` takes a
 *  digit off a list of cells, which is how a two-homes link is made. */
const gridWith = (marks = {}, without = []) => {
  const grid = Array.from({ length: 81 }, (_, i) => emptyCell(i));
  for (const [digit, cells] of without) {
    for (const cell of cells) {
      grid[cell] = { ...grid[cell], candidates: grid[cell].candidates.filter((d) => d !== digit) };
    }
  }
  for (const [cell, candidates] of Object.entries(marks)) {
    grid[Number(cell)] = { ...grid[Number(cell)], candidates: [...candidates] };
  }
  return grid;
};

const rowExcept = (row, keep) =>
  ALL_DIGITS.map((_, c) => at(row, c + 1)).filter((i) => !keep.includes(i));
const colExcept = (col, keep) =>
  ALL_DIGITS.map((_, r) => at(r + 1, col)).filter((i) => !keep.includes(i));

const elims = (step) => step.eliminations.map((e) => `${cellName(e.cell)}:${e.digit}`).sort();

const buildGrid = (puzzle) =>
  generateCandidates(
    puzzle.map((value, index) => ({ ...emptyCell(index), value: value || null, isFixed: value !== 0, candidates: [] }))
  );

// The jargon the beginner wording may never use.
const JARGON = /\b(candidate|unit|conjugate|strong link|node|peer|bivalue|bi-value)\b/i;

/** Every link of a walk, as the card shows it. */
const texts = (step) => chainWalk(step).map((link) => link.text);

/**
 * A colouring's run has to be a real run: each line joins the cell the
 * previous line ended on, every link is one of the two kinds a colouring
 * is made of, and the colours alternate all the way along.
 */
const expectWalkableRun = (step) => {
  const nodes = step.chainNodes;
  expect(Array.isArray(nodes)).toBe(true);
  expect(nodes.length).toBeGreaterThan(1);
  expect(step.chainColouring).toBe(true);
  nodes.forEach((node, i) => {
    expect(node.cells).toEqual([node.cell]);
    expect(node.color === 1 || node.color === 2).toBe(true);
    if (i < nodes.length - 1) {
      expect(node.linkToNext).toBe('strong');
      expect(['unit', 'bivalue']).toContain(node.linkVia);
      // Opposite colours, link by link: that is the whole idea.
      expect(nodes[i + 1].color).toBe(3 - node.color);
      if (node.linkVia === 'unit') {
        expect(node.linkUnit?.name).toMatch(/^(row|column|box) \d$/);
        expect(nodes[i + 1].digit).toBe(node.digit);
        expect(arePeers(node.cell, nodes[i + 1].cell)).toBe(true);
      } else {
        // Two marks of one cell: one of the two is right.
        expect(nodes[i + 1].cell).toBe(node.cell);
        expect(nodes[i + 1].digit).not.toBe(node.digit);
      }
    } else {
      expect(node.linkToNext).toBe(null);
    }
  });
  // One line per link, then one more for what the two ends prove.
  const walk = chainWalk(step);
  expect(walk).toHaveLength(nodes.length);
  expect(walk[walk.length - 1].conclusion).toBe(true);
  walk.slice(0, -1).forEach((link) => expect(link.label).toBe('exactly one'));
};

describe('X-Cycle walks its colouring', () => {
  // Two two-home links on the 5s: row 1 (R1C1, R1C3) and column 3 (R1C3,
  // R3C3). R1C1 and R3C3 are two links apart, so they come out the same
  // colour - and they share box 1, so that colour is wrong. Every other
  // 5 is left in place, so no link forms anywhere else.
  const wrap = gridWith({}, [
    [5, rowExcept(1, [at(1, 1), at(1, 3)])],
    [5, colExcept(3, [at(1, 3), at(3, 3)])],
  ]);

  it('erases what it always erased, and now carries a run to walk', () => {
    const [step] = findAllTechniqueInstances(wrap, 'X-Cycle');
    expect(step.colorRule).toBe('wrap');
    expect(elims(step)).toEqual(['R1C1:5', 'R3C3:5']);
    expectWalkableRun(step);
  });

  it('walks from one clashing mark to the other and ends on the clash', () => {
    const [step] = findAllTechniqueInstances(wrap, 'X-Cycle');
    const run = step.chainNodes.map((n) => cellName(n.cell));
    expect(run).toEqual(['R1C1', 'R1C3', 'R3C3']);
    expect(step.chainNodes.every((n) => n.digit === 5)).toBe(true);
    const walk = chainWalk(step);
    expect(walk[0].text).toBe(
      'In row 1, the only two places for 5 are R1C1 and R1C3, so exactly one of them is the 5. They get opposite colours.'
    );
    expect(walk[1].text).toBe(
      'In column 3, the only two places for 5 are R1C3 and R3C3, so exactly one of them is the 5. They get opposite colours.'
    );
    const last = walk[walk.length - 1];
    expect(last.text).toContain('R1C1 and R3C3 have come out the same colour');
    expect(last.text).toContain('box 1');
    expect(last.text).toContain('that colour is wrong');
  });

  it('shows its two colours on the board, the surviving one first', () => {
    const [step] = findAllTechniqueInstances(wrap, 'X-Cycle');
    expect(step.colorGroups).toHaveLength(2);
    const [surviving, falseColour] = step.colorGroups;
    expect(surviving.some((c) => falseColour.includes(c))).toBe(false);
    expect(falseColour).toEqual([at(1, 1), at(3, 3)]);
    for (const cell of falseColour) {
      expect(step.eliminations.some((e) => e.cell === cell)).toBe(true);
    }
  });

  it('walks a trap to the two opposite colours the dead cell sees', () => {
    // Row 2 (R2C1, R2C9), column 9 (R2C9, R7C9), row 7 (R7C9, R7C4) and
    // column 4 (R7C4, R3C4) chain the 5s; R3C7 sees R3C4 and R2C9, which
    // are opposite colours, so it can never be the 5.
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
    expect(step.colorTarget).toBe(at(3, 7));
    expectWalkableRun(step);
    const ends = [step.chainNodes[0], step.chainNodes[step.chainNodes.length - 1]];
    // The run joins two marks of opposite colours, and the erased cell
    // sees both: that is why it is dead either way.
    expect(ends[0].color).not.toBe(ends[1].color);
    for (const end of ends) expect(arePeers(at(3, 7), end.cell)).toBe(true);
    const last = chainWalk(step)[chainWalk(step).length - 1];
    expect(last.text).toContain('opposite colours');
    expect(last.text).toContain('R3C7');
    expect(last.text).toContain('can never be 5');
    // A trap can erase in more than one cell; the run proves one of them,
    // and the player is told the others go the same way.
    const targets = new Set(step.eliminations.map((e) => e.cell));
    expect(last.text.includes('goes the same way')).toBe(targets.size > 1);
  });

  it('draws the run on the board, with a ring on each end', () => {
    const [step] = findAllTechniqueInstances(wrap, 'X-Cycle');
    const overlay = buildChainOverlay(step, 60);
    expect(overlay.links).toHaveLength(step.chainNodes.length - 1);
    expect(overlay.links.every((l) => l.strong)).toBe(true);
    expect(overlay.groups).toEqual([]);
    expect(overlay.closed).toBe(false);
    expect(overlay.endpoints).toHaveLength(2);
    // One digit, so the board keeps its single focus colour.
    const focus = buildFocusedCandidates(step, wrap, {});
    expect(Object.keys(focus)).toEqual(['5']);
  });
});

describe('3D Medusa walks its colouring', () => {
  // A network across three digits: R1C1's 1 and 2, R5C1's 2 and 3, R5C9's
  // 3 and 1, and R1C9's 1. One colour puts a 1 in R1C1 and in R1C9.
  const unitClash = gridWith(
    {
      [at(1, 1)]: [1, 2],
      [at(5, 1)]: [2, 3],
      [at(5, 9)]: [3, 1],
      [at(1, 9)]: [1, 4, 7],
    },
    [
      [2, colExcept(1, [at(1, 1), at(5, 1)])],
      [3, rowExcept(5, [at(5, 1), at(5, 9)])],
      [1, colExcept(9, [at(5, 9), at(1, 9)])],
    ]
  );

  // A network that comes back to the cell it started from: R5C5's 1 and
  // its 2 end up the same colour.
  const cellClash = gridWith(
    {
      [at(5, 5)]: [1, 2, 7],
      [at(5, 9)]: [1, 3],
      [at(1, 9)]: [3, 2],
      [at(1, 5)]: [2, 8],
    },
    [
      [1, rowExcept(5, [at(5, 5), at(5, 9)])],
      [3, colExcept(9, [at(5, 9), at(1, 9)])],
      [2, rowExcept(1, [at(1, 9), at(1, 5)])],
      [2, colExcept(5, [at(1, 5), at(5, 5)])],
    ]
  );

  it('erases what it always erased, and now carries a run to walk', () => {
    const [step] = findAllTechniqueInstances(unitClash, '3D Medusa');
    expect(elims(step)).toEqual(['R1C1:1', 'R1C9:1', 'R5C1:2', 'R5C9:3']);
    expectWalkableRun(step);
  });

  it('still names which of its two conclusions fired', () => {
    const [unit] = findAllTechniqueInstances(unitClash, '3D Medusa');
    expect(unit.medusaRule).toBe('unit');
    const unitWhy = explainStep(unit, unitClash, 'simple').why;
    expect(unitWhy).toContain('One colour lands twice in row 1');
    expect(chainWalk(unit)[chainWalk(unit).length - 1].text).toContain('both in row 1');

    const [cell] = findAllTechniqueInstances(cellClash, '3D Medusa');
    expect(cell.medusaRule).toBe('cell');
    const cellWhy = explainStep(cell, cellClash, 'simple').why;
    expect(cellWhy).toContain('One colour lands twice in the same cell');
    const cellWalk = chainWalk(cell);
    expect(cellWalk[cellWalk.length - 1].text).toContain('one cell two numbers at once');
  });

  it('walks between the two marks that clash, both kinds of link included', () => {
    const [step] = findAllTechniqueInstances(unitClash, '3D Medusa');
    const nodes = step.chainNodes;
    const ends = [nodes[0], nodes[nodes.length - 1]];
    expect(ends.map((n) => cellName(n.cell)).sort()).toEqual(['R1C1', 'R1C9']);
    expect(ends.every((n) => n.digit === 1)).toBe(true);
    expect(ends[0].color).toBe(ends[1].color);
    // The network is held together by both kinds of link, so the walk uses
    // both: cells with two marks left, and digits with two homes left.
    const kinds = new Set(nodes.slice(0, -1).map((n) => n.linkVia));
    expect(kinds).toEqual(new Set(['unit', 'bivalue']));
    const bivalue = texts(step).find((t) => t.includes('only two pencil marks left'));
    expect(bivalue).toContain('so exactly one of the two is right. They get opposite colours.');
  });

  it('leaves the board as it was: two tints, and no second colour vocabulary', () => {
    const [step] = findAllTechniqueInstances(unitClash, '3D Medusa');
    expect(step.colorGroups).toHaveLength(2);
    expect(buildFocusedCandidates(step, unitClash, {})).toBe(null);
    const overlay = buildChainOverlay(step, 60);
    expect(overlay.links).toHaveLength(step.chainNodes.length - 1);
    expect(overlay.links.every((l) => l.strong)).toBe(true);
  });
});

describe('the colouring wording a beginner reads', () => {
  const steps = () => {
    const found = [];
    for (const { puzzle } of Object.values(PUZZLES).flat()) {
      const grid = buildGrid(puzzle);
      for (const technique of ['X-Cycle', '3D Medusa']) {
        for (const step of findAllTechniqueInstances(grid, technique)) {
          found.push({ step, grid });
        }
      }
    }
    return found;
  };

  it('finds colourings in the library to check', () => {
    expect(steps().length).toBeGreaterThan(0);
  });

  it('is jargon-free, one idea at a time, all the way through the walk', () => {
    for (const { step, grid } of steps()) {
      const out = explainStep(step, grid, 'simple');
      const all = [out.look, out.why, out.extra, ...texts(step)].join(' ');
      expect(all, `${step.technique}: ${all}`).not.toMatch(JARGON);
      expect(all).not.toMatch(/undefined|NaN|\[object/);
      for (const text of texts(step)) {
        // One idea per sentence: a line of the walk is a few short
        // sentences about named cells, never a paragraph.
        expect(text).toMatch(/R\dC\d/);
        expect(text.length).toBeLessThan(320);
        for (const sentence of text.split(/(?<=\.)\s+/)) {
          expect(sentence.length, sentence).toBeLessThan(160);
        }
      }
    }
  });

  it('tells the player the walk is there', () => {
    for (const { step, grid } of steps()) {
      expect(explainStep(step, grid, 'simple').extra).toContain('Step through the colouring');
    }
  });

  it('walks every colouring the library offers, end to end', () => {
    for (const { step } of steps()) expectWalkableRun(step);
  });
});
