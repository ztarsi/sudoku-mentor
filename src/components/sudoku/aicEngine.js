// Alternating inference chains: the one idea behind a whole family of
// techniques (#67).
//
// A NODE is the claim "digit d is somewhere in these cells". One cell makes
// the plainest node there is, a single pencil mark. Two or three cells where
// a box overlaps a row or a column make a GROUP: the digit is true somewhere
// in the group or nowhere in it, so the group behaves as one node. The cells
// of an almost locked set that still offer d are a node too.
//
// A STRONG link joins two nodes where at least one is true: the only two
// places for a digit in a unit, the only two digits left in a cell, or the
// two digits an almost locked set swaps between. A WEAK link joins two nodes
// where at most one is true: the same digit in cells that all see each
// other, or two digits in one cell.
//
// A chain alternates strong, weak, strong, ... and begins and ends with a
// strong link. Its conclusion is that at least one of the two endpoint nodes
// is true.
//
// How it is found: every link is turned into the implications it carries
// (strong A=B gives "not A implies B"; weak A-B gives "A implies not B"),
// and the search is a breadth-first walk of that implication graph from
// "not A" for every node A. The alternation then comes out of the graph by
// itself, because the only edges leaving a false literal come from strong
// links and the only edges leaving a true literal come from weak links. A
// breadth-first walk also hands back the shortest chain first, which is what
// the player should be shown.
//
// Everything here is pure: a grid in, steps out. The classification into the
// names a player meets (Skyscraper, W-Wing, XY-Chain, ...) is in
// classifyChain(), and the wording lives in explainStep.js.
import {
  getRow,
  getCol,
  getBox,
  getRowIndices,
  getColIndices,
  getBoxIndices,
  getPeers,
  cellName,
  unitOf,
} from './gridUnits';
import { makeStep } from './stepShape';
import { findAlmostLockedSets, digitCells } from './restrictedCommon';

/** How many nodes a hint may show, counting a group as one node. */
export const HINT_CHAIN_NODES = 10;
/** How far the Techniques panel's Scan may go. */
export const SCAN_CHAIN_NODES = 16;

/** The chain techniques, in the teaching order of the catalog's ladder. */
export const CHAIN_TECHNIQUES = [
  'Skyscraper',
  'Two-String Kite',
  'W-Wing',
  'Remote Pairs',
  'X-Chain',
  'XY-Chain',
  'Alternating Chain',
  'Grouped X-Chain',
  'Grouped Alternating Chain',
  'Continuous Loop',
  'ALS Chain',
];

// Which graph each name is looked for in. A plain chain must win over a
// grouped, looped or set-based one, so each profile is a separate graph and
// a richer name is only ever given to a chain that really needs the richer
// node (see the `requires` field).
const PROFILE_OF = {
  'Skyscraper': 'plain',
  'Two-String Kite': 'plain',
  'W-Wing': 'plain',
  'Remote Pairs': 'plain',
  'X-Chain': 'plain',
  'XY-Chain': 'plain',
  'Alternating Chain': 'plain',
  'Grouped X-Chain': 'grouped',
  'Grouped Alternating Chain': 'grouped',
  'Continuous Loop': 'loops',
  'ALS Chain': 'als',
};

const PROFILES = {
  plain: { groups: false, als: false, loops: false },
  grouped: { groups: true, als: false, loops: false },
  loops: { groups: true, als: false, loops: true },
  als: { groups: false, als: true, loops: false },
};

// Almost locked sets of four cells and more make the graph large enough to
// cost more than the chain is worth; two and three cover the sets a player
// can actually see. A one-cell set is a bi-value cell, which is already the
// plainest strong link there is.
const ALS_MIN_CELLS = 2;
const ALS_MAX_CELLS = 3;

// ---------------------------------------------------------------------------
// Geometry, precomputed once. These run inside the hot loops of the search.
// ---------------------------------------------------------------------------
const PEERS = Array.from({ length: 81 }, (_, i) => getPeers(i));
const SEES = PEERS.map((peers) => {
  const flags = new Uint8Array(81);
  for (const p of peers) flags[p] = 1;
  return flags;
});
const sees = (a, b) => SEES[a][b] === 1;

const ALL_UNITS = [
  ...Array.from({ length: 9 }, (_, i) => ({ ...unitOf('row', i), indices: getRowIndices(i) })),
  ...Array.from({ length: 9 }, (_, i) => ({ ...unitOf('column', i), indices: getColIndices(i) })),
  ...Array.from({ length: 9 }, (_, i) => ({ ...unitOf('box', i), indices: getBoxIndices(i) })),
];

/** The 54 places where a box overlaps a row or a column. */
const INTERSECTIONS = (() => {
  const out = [];
  for (let box = 0; box < 9; box++) {
    const boxCells = getBoxIndices(box);
    for (const row of [...new Set(boxCells.map(getRow))]) {
      out.push({ cells: boxCells.filter((i) => getRow(i) === row) });
    }
    for (const col of [...new Set(boxCells.map(getCol))]) {
      out.push({ cells: boxCells.filter((i) => getCol(i) === col) });
    }
  }
  return out;
})();

/** The row, column or box every one of `cells` shares, or null. */
const sharedUnit = (cells) => {
  if (cells.length < 2) return null;
  if (cells.every((c) => getRow(c) === getRow(cells[0]))) return unitOf('row', getRow(cells[0]));
  if (cells.every((c) => getCol(c) === getCol(cells[0]))) return unitOf('column', getCol(cells[0]));
  if (cells.every((c) => getBox(c) === getBox(cells[0]))) return unitOf('box', getBox(cells[0]));
  return null;
};

// ---------------------------------------------------------------------------
// The graph
// ---------------------------------------------------------------------------

/**
 * Nodes, links, and the implication graph over them.
 *
 * @param {Array} grid
 * @param {{ groups: boolean, als: boolean }} profile
 */
const buildGraph = (grid, profile) => {
  /** @type {{ id: number, digit: number, cells: number[], kind: string }[]} */
  const nodes = [];
  const byKey = new Map();

  const keyOf = (digit, cells) => `${digit}:${cells.join(',')}`;
  const addNode = (digit, cells) => {
    const sorted = cells.length > 1 ? [...cells].sort((a, b) => a - b) : cells;
    const key = keyOf(digit, sorted);
    const found = byKey.get(key);
    if (found !== undefined) return found;
    const id = nodes.length;
    nodes.push({ id, digit, cells: sorted, kind: sorted.length === 1 ? 'cell' : 'group' });
    byKey.set(key, id);
    return id;
  };

  // One node per pencil mark.
  for (let cell = 0; cell < 81; cell++) {
    if (grid[cell].value !== null) continue;
    for (const digit of grid[cell].candidates) addNode(digit, [cell]);
  }

  // One node per box/line overlap that holds a digit in two cells or more.
  if (profile.groups) {
    for (const { cells } of INTERSECTIONS) {
      for (let digit = 1; digit <= 9; digit++) {
        const places = cells.filter(
          (i) => grid[i].value === null && grid[i].candidates.includes(digit)
        );
        if (places.length >= 2) addNode(digit, places);
      }
    }
  }

  /** @type {{ a: number, b: number, type: string, via: string, unit: any, als: any }[]} */
  const links = [];
  const seenLinks = new Set();
  const addLink = (a, b, type, via, unit = null, als = null) => {
    if (a === b) return;
    const key = `${type}:${Math.min(a, b)}:${Math.max(a, b)}`;
    if (seenLinks.has(key)) return;
    seenLinks.add(key);
    links.push({ a, b, type, via, unit, als });
  };

  // Strong: the two digits an almost locked set swaps between. Lose one and
  // the set is locked, so it must hold the other.
  /** @type {{ cells: number[], digits: number[] }[]} */
  const alsSets = [];
  if (profile.als) {
    for (const als of findAlmostLockedSets(grid, { minCells: ALS_MIN_CELLS, maxCells: ALS_MAX_CELLS })) {
      alsSets.push({ cells: als.cells, digits: als.digits });
      for (let i = 0; i < als.digits.length; i++) {
        for (let j = i + 1; j < als.digits.length; j++) {
          const x = als.digits[i];
          const z = als.digits[j];
          const xCells = digitCells(grid, als.cells, x);
          const zCells = digitCells(grid, als.cells, z);
          if (!xCells.length || !zCells.length) continue;
          addLink(addNode(x, xCells), addNode(z, zCells), 'strong', 'als', als.unit, {
            cells: als.cells,
            digits: als.digits,
          });
        }
      }
    }
  }

  // Strong: the only places for a digit in a unit. Two cells make the plain
  // conjugate pair; two groups, or a group and a cell, make the grouped one.
  for (const unit of ALL_UNITS) {
    for (let digit = 1; digit <= 9; digit++) {
      const places = unit.indices.filter(
        (i) => grid[i].value === null && grid[i].candidates.includes(digit)
      );
      if (places.length < 2) continue;
      if (places.length === 2) {
        addLink(addNode(digit, [places[0]]), addNode(digit, [places[1]]), 'strong', 'unit', unit);
      }
      if (!profile.groups) continue;
      // Grouped: split the places into exactly two sides, each of which is
      // one box/line overlap. A row or a column splits by box; a box splits
      // by row or by column.
      const splitters = unit.type === 'box' ? [getRow, getCol] : [getBox];
      for (const sideOf of splitters) {
        const bySide = new Map();
        for (const cell of places) {
          const side = sideOf(cell);
          if (!bySide.has(side)) bySide.set(side, []);
          bySide.get(side).push(cell);
        }
        if (bySide.size !== 2) continue;
        const [first, second] = [...bySide.values()];
        addLink(addNode(digit, first), addNode(digit, second), 'strong', 'unit', unit);
      }
    }
  }

  // Strong: the only two digits left in a cell.
  for (let cell = 0; cell < 81; cell++) {
    if (grid[cell].value !== null || grid[cell].candidates.length !== 2) continue;
    const [a, b] = grid[cell].candidates;
    addLink(addNode(a, [cell]), addNode(b, [cell]), 'strong', 'bivalue', null);
  }

  // Weak: the same digit in two sets of cells where every cell of one sees
  // every cell of the other. This is the restricted-common check, and it is
  // where a missed pair would make a hint wrong.
  const byDigit = new Map();
  for (const node of nodes) {
    if (!byDigit.has(node.digit)) byDigit.set(node.digit, []);
    byDigit.get(node.digit).push(node);
  }
  for (const sameDigit of byDigit.values()) {
    for (let i = 0; i < sameDigit.length; i++) {
      for (let j = i + 1; j < sameDigit.length; j++) {
        const a = sameDigit[i];
        const b = sameDigit[j];
        let all = true;
        for (const c1 of a.cells) {
          for (const c2 of b.cells) {
            if (c1 === c2 || !sees(c1, c2)) {
              all = false;
              break;
            }
          }
          if (!all) break;
        }
        if (all) {
          addLink(a.id, b.id, 'weak', 'unit', sharedUnit([...a.cells, ...b.cells]));
        }
      }
    }
  }

  // Weak: two digits in one cell. A cell holds one number.
  for (let cell = 0; cell < 81; cell++) {
    if (grid[cell].value !== null) continue;
    const cands = grid[cell].candidates;
    for (let i = 0; i < cands.length; i++) {
      for (let j = i + 1; j < cands.length; j++) {
        const a = byKey.get(keyOf(cands[i], [cell]));
        const b = byKey.get(keyOf(cands[j], [cell]));
        if (a !== undefined && b !== undefined) addLink(a, b, 'weak', 'cell', null);
      }
    }
  }

  // The implication graph. Literal 2n is "node n is true", 2n+1 is "false".
  /** @type {{ to: number, link: number }[][]} */
  const adjacency = Array.from({ length: nodes.length * 2 }, () => []);
  const TRUE_LIT = (n) => n * 2;
  const FALSE_LIT = (n) => n * 2 + 1;
  links.forEach((link, index) => {
    if (link.type === 'strong') {
      adjacency[FALSE_LIT(link.a)].push({ to: TRUE_LIT(link.b), link: index });
      adjacency[FALSE_LIT(link.b)].push({ to: TRUE_LIT(link.a), link: index });
    } else {
      adjacency[TRUE_LIT(link.a)].push({ to: FALSE_LIT(link.b), link: index });
      adjacency[TRUE_LIT(link.b)].push({ to: FALSE_LIT(link.a), link: index });
    }
  });

  return { nodes, links, adjacency, alsSets };
};

// ---------------------------------------------------------------------------
// The search
// ---------------------------------------------------------------------------

/**
 * Every chain the graph holds, shortest first for each pair of endpoints.
 *
 * @returns {{ nodeIds: number[], linkIds: number[], truths: boolean[], closed: boolean }[]}
 *   `nodeIds` in chain order; `linkIds[i]` joins node i to node i + 1 (and,
 *   for a closed loop, the last one joins back to node 0); `truths[i]` is
 *   the state node i takes in the walk.
 */
const searchChains = (graph, maxNodes, wantLoops) => {
  const { nodes, adjacency } = graph;
  const literalCount = nodes.length * 2;
  const stamp = new Int32Array(literalCount);
  const dist = new Int32Array(literalCount);
  const prev = new Int32Array(literalCount);
  const prevLink = new Int32Array(literalCount);
  const out = [];
  // The walk may not run past the cap; a chain of N nodes has N - 1 links.
  const maxLinks = maxNodes - 1;

  const walkBack = (literal) => {
    const literals = [];
    const linkIds = [];
    let cursor = literal;
    while (cursor !== -1) {
      literals.push(cursor);
      if (prev[cursor] === -1) break;
      linkIds.push(prevLink[cursor]);
      cursor = prev[cursor];
    }
    literals.reverse();
    linkIds.reverse();
    return { literals, linkIds };
  };

  const chainFrom = (literals, linkIds, closed) => {
    const nodeIds = literals.map((l) => l >> 1);
    const truths = literals.map((l) => l % 2 === 0);
    return { nodeIds, linkIds, truths, closed };
  };

  for (let start = 0; start < nodes.length; start++) {
    const from = start * 2 + 1; // "node start is false"
    const run = start + 1;
    stamp[from] = run;
    dist[from] = 0;
    prev[from] = -1;
    prevLink[from] = -1;
    let queue = [from];

    while (queue.length > 0) {
      const next = [];
      for (const literal of queue) {
        const steps = dist[literal];
        if (steps >= maxLinks) continue;
        for (const edge of adjacency[literal]) {
          if (wantLoops && edge.to === from) {
            // Back to the assumption we started from, with the alternation
            // intact: a continuous loop. An odd number of links cannot
            // alternate round a loop, and a two-link loop is a locked
            // candidate, not a chain.
            // Every way back is kept, not only the shortest: the shortest
            // way round is often a pair or a subset the player already
            // knows, and dropping the rest would lose the loop with it.
            const length = steps + 1;
            if (length >= 4 && length % 2 === 0) {
              const back = walkBack(literal);
              out.push(chainFrom(back.literals, [...back.linkIds, edge.link], true));
            }
            continue;
          }
          if (stamp[edge.to] === run) continue;
          stamp[edge.to] = run;
          dist[edge.to] = steps + 1;
          prev[edge.to] = literal;
          prevLink[edge.to] = edge.link;
          next.push(edge.to);
          // A chain ends on a true literal reached through a strong link,
          // which is every true literal in this graph. Only the endpoint
          // pairs that can conclude something are worth keeping: the same
          // digit in two places, two digits in one cell, or the node the
          // walk started by ruling out.
          if (edge.to % 2 === 0 && steps + 1 >= 3 && !wantLoops) {
            const end = nodes[edge.to >> 1];
            const begin = nodes[start];
            const concludes =
              end.id === begin.id ||
              end.digit === begin.digit ||
              (end.cells.length === 1 && begin.cells.length === 1 && end.cells[0] === begin.cells[0]);
            if (concludes) {
              const back = walkBack(edge.to);
              out.push(chainFrom(back.literals, back.linkIds, false));
            }
          }
        }
      }
      queue = next;
    }
  }

  return out;
};

// ---------------------------------------------------------------------------
// What a chain proves
// ---------------------------------------------------------------------------

/** The cells that see every one of `cells` and are not among them. */
const seenByAll = (cells) => {
  if (!cells.length) return [];
  let candidates = PEERS[cells[0]].filter((i) => !cells.includes(i));
  for (let k = 1; k < cells.length; k++) {
    candidates = candidates.filter((i) => sees(i, cells[k]));
  }
  return candidates;
};

/**
 * "At least one of A and B is true" turned into what the player may erase.
 * Same digit in two places: it goes from every cell that sees both places -
 * and for a group that means every cell of the group, which is the one thing
 * this family gets wrong most easily. Two digits in one cell: every other
 * pencil mark in that cell goes.
 */
const eliminationsFromEither = (grid, a, b) => {
  if (a.digit === b.digit) {
    const inside = new Set([...a.cells, ...b.cells]);
    const out = [];
    for (const cell of seenByAll([...inside])) {
      if (inside.has(cell)) continue;
      if (grid[cell].value !== null || !grid[cell].candidates.includes(a.digit)) continue;
      out.push({ cell, digit: a.digit });
    }
    return out;
  }
  if (a.cells.length === 1 && b.cells.length === 1 && a.cells[0] === b.cells[0]) {
    const cell = a.cells[0];
    return grid[cell].candidates
      .filter((d) => d !== a.digit && d !== b.digit)
      .map((d) => ({ cell, digit: d }));
  }
  return [];
};

/** "This node is true": a placement for one cell, eliminations for a group. */
const resultFromNodeTrue = (grid, node) => {
  if (node.cells.length === 1) {
    return { placement: { cell: node.cells[0], digit: node.digit }, eliminations: [] };
  }
  const eliminations = seenByAll(node.cells)
    .filter((cell) => grid[cell].value === null && grid[cell].candidates.includes(node.digit))
    .map((cell) => ({ cell, digit: node.digit }));
  return { placement: null, eliminations };
};

const elimKey = (e) => `${e.cell}:${e.digit}`;

const dedupeEliminations = (eliminations) => {
  const seen = new Set();
  const out = [];
  for (const e of eliminations) {
    if (seen.has(elimKey(e))) continue;
    seen.add(elimKey(e));
    out.push(e);
  }
  return out.sort((x, y) => x.cell - y.cell || x.digit - y.digit);
};

// ---------------------------------------------------------------------------
// Naming the chain
// ---------------------------------------------------------------------------

const biValue = (grid, cell, digits) =>
  grid[cell].value === null &&
  grid[cell].candidates.length === 2 &&
  (!digits || digits.every((d) => grid[cell].candidates.includes(d)));

const sameCandidates = (grid, c1, c2) =>
  grid[c1].candidates.length === grid[c2].candidates.length &&
  grid[c1].candidates.every((d) => grid[c2].candidates.includes(d));

/**
 * The patterns an easier technique already teaches. A chain that is only a
 * long way of saying "X-Wing", "Naked Pair" or "XY-Wing" is not reported at
 * all: the player meets those under their own names, earlier on the ladder.
 */
const isDegenerate = (chain, grid) => {
  const { nodes, links } = chain;
  const cells = [...new Set(nodes.flatMap((n) => n.cells))];

  // A chain over two cells is a Naked Pair or a Hidden Pair, whichever way
  // round its links fall, and both are taught far earlier.
  if (cells.length <= 2) return true;
  // XY-Wing: three bi-value cells, the middle one seeing both others.
  if (
    nodes.length === 6 &&
    cells.length === 3 &&
    nodes.every((n) => n.cells.length === 1 && biValue(grid, n.cells[0])) &&
    links.every((l) => l.type !== 'strong' || l.via === 'bivalue')
  ) {
    return true;
  }
  // X-Wing: two parallel conjugate pairs on four cells that form a
  // rectangle - two rows and two columns and nothing else.
  if (
    nodes.length === 4 &&
    cells.length === 4 &&
    new Set(nodes.map((n) => n.digit)).size === 1 &&
    links[0].via === 'unit' &&
    links[2].via === 'unit' &&
    links[0].unit?.type === links[2].unit?.type &&
    links[0].unit?.type !== 'box' &&
    new Set(cells.map(getRow)).size === 2 &&
    new Set(cells.map(getCol)).size === 2
  ) {
    return true;
  }
  return false;
};

/** Skyscraper or Two-String Kite, the two four-node single-digit patterns. */
const nameFourNodeFish = (chain) => {
  const { nodes, links } = chain;
  if (nodes.length !== 4) return null;
  if (!nodes.every((n) => n.cells.length === 1)) return null;
  if (links[0].via !== 'unit' || links[2].via !== 'unit') return null;
  const first = links[0].unit?.type;
  const last = links[2].unit?.type;
  const join = links[1].unit?.type;
  if (!first || !last || !join) return null;
  const [endA, endB] = [nodes[0].cells[0], nodes[3].cells[0]];
  // Both ends on one line would make it an X-Wing, which has its own name.
  if (getRow(endA) === getRow(endB) || getCol(endA) === getCol(endB)) return null;

  // Skyscraper: both strong links in lines of the same kind, joined along
  // the line that crosses them.
  if (first === last && first !== 'box' && join !== 'box') {
    const crossing = first === 'row' ? 'column' : 'row';
    if (join === crossing) return 'Skyscraper';
  }
  // Two-String Kite: one strong link in a row, one in a column, their near
  // ends in the same box.
  if (((first === 'row' && last === 'column') || (first === 'column' && last === 'row')) && join === 'box') {
    return 'Two-String Kite';
  }
  return null;
};

/** W-Wing: the same bare pair twice, joined by a conjugate pair on one digit. */
const isWWing = (chain, grid) => {
  const { nodes, links } = chain;
  if (nodes.length !== 6) return false;
  if (!nodes.every((n) => n.cells.length === 1)) return false;
  if (links[0].via !== 'bivalue' || links[4].via !== 'bivalue') return false;
  if (links[2].via !== 'unit') return false;
  const left = nodes[0].cells[0];
  const right = nodes[5].cells[0];
  if (left === right) return false;
  if (nodes[1].cells[0] !== left || nodes[4].cells[0] !== right) return false;
  if (!biValue(grid, left) || !biValue(grid, right) || !sameCandidates(grid, left, right)) return false;
  // The bridge is a conjugate pair on the other digit of the pair.
  const bridgeDigit = nodes[2].digit;
  return (
    nodes[3].digit === bridgeDigit &&
    nodes[0].digit === nodes[5].digit &&
    nodes[0].digit !== bridgeDigit &&
    nodes[2].cells[0] !== left &&
    nodes[2].cells[0] !== right &&
    nodes[3].cells[0] !== left &&
    nodes[3].cells[0] !== right
  );
};

/** A chain of cells that all hold the very same two digits. */
const isRemotePairs = (chain, grid) => {
  const { nodes, links } = chain;
  if (nodes.length < 8 || nodes.length % 2 !== 0) return false;
  if (!nodes.every((n) => n.cells.length === 1)) return false;
  if (!links.every((l, i) => (i % 2 === 0 ? l.via === 'bivalue' : l.via === 'unit'))) return false;
  const cells = nodes.map((n) => n.cells[0]);
  // Each cell appears exactly twice, as the two ends of its own strong link.
  for (let i = 0; i < cells.length; i += 2) {
    if (cells[i] !== cells[i + 1]) return false;
  }
  const distinct = [...new Set(cells)];
  if (distinct.length !== nodes.length / 2) return false;
  return distinct.every((c) => biValue(grid, c) && sameCandidates(grid, distinct[0], c));
};

/** A chain of bi-value cells whose two ends are about the same digit. */
const isXYChain = (chain, grid) => {
  const { nodes, links } = chain;
  if (nodes.length < 8) return false;
  if (!nodes.every((n) => n.cells.length === 1 && biValue(grid, n.cells[0]))) return false;
  if (!links.every((l, i) => (i % 2 === 0 ? l.via === 'bivalue' : l.via === 'unit'))) return false;
  return nodes[0].digit === nodes[nodes.length - 1].digit;
};

/**
 * The name the card shows: the most recognisable pattern that fits, first
 * match wins, so the player learns names in a useful order.
 */
export const classifyChain = (chain, grid) => {
  const { nodes, links, closed } = chain;
  if (closed) return 'Continuous Loop';
  if (links.some((l) => l.via === 'als')) return 'ALS Chain';
  const digits = new Set(nodes.map((n) => n.digit));
  if (nodes.some((n) => n.cells.length > 1)) {
    return digits.size === 1 ? 'Grouped X-Chain' : 'Grouped Alternating Chain';
  }
  if (digits.size === 1) return nameFourNodeFish(chain) || 'X-Chain';
  if (isWWing(chain, grid)) return 'W-Wing';
  if (isRemotePairs(chain, grid)) return 'Remote Pairs';
  if (isXYChain(chain, grid)) return 'XY-Chain';
  return 'Alternating Chain';
};

// ---------------------------------------------------------------------------
// Turning a chain into a step
// ---------------------------------------------------------------------------

// "R1C3", or "R1C1/R1C2" for a group: the same way the beginner wording
// writes a node, so a player toggling between the two reads one notation.
const nodeCellsName = (node) => node.cells.map(cellName).join('/');

/** The Expert notation: `(5)R1C3 = (5)R1C7 - (5)R4C7 = (5)R4C9`. */
const chainNotation = (nodes, links, closed) => {
  const parts = [`(${nodes[0].digit})${nodeCellsName(nodes[0])}`];
  for (let i = 0; i < links.length; i++) {
    const nextNode = nodes[(i + 1) % nodes.length];
    parts.push(links[i].type === 'strong' ? '=' : '-');
    parts.push(`(${nextNode.digit})${nodeCellsName(nextNode)}`);
  }
  return `${closed ? '[' : ''}${parts.join(' ')}${closed ? ']' : ''}`;
};

/** `R1C9 <> 5, R2C9 <> 5` or `R4C9 = 5`. */
const resultNotation = (placement, eliminations) => {
  if (placement) return `${cellName(placement.cell)} = ${placement.digit}`;
  const byDigit = new Map();
  for (const e of eliminations) {
    if (!byDigit.has(e.digit)) byDigit.set(e.digit, []);
    byDigit.get(e.digit).push(cellName(e.cell));
  }
  return [...byDigit.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([digit, cells]) => `${cells.join(',')} <> ${digit}`)
    .join('; ');
};

/**
 * The node list the step carries, and the hint card walks: each node with
 * its cells, its digit, the state it takes in the walk, and the kind of link
 * to the node after it.
 */
const chainNodesOf = (nodes, links, truths, closed) =>
  nodes.map((node, i) => {
    const link = closed ? links[i] : links[i] ?? null;
    return {
      cells: [...node.cells],
      cell: node.cells[0],
      digit: node.digit,
      kind: node.cells.length > 1 ? 'group' : 'cell',
      truth: truths[i],
      endpoint: !closed && (i === 0 || i === nodes.length - 1),
      linkToNext: link ? link.type : null,
      linkVia: link ? link.via : null,
      linkUnit: link?.unit ? { ...link.unit } : null,
      linkSet: link?.als ? { cells: [...link.als.cells], digits: [...link.als.digits] } : null,
    };
  });

/** The raw chain, expanded with its node and link objects. */
const expand = (graph, raw) => ({
  nodes: raw.nodeIds.map((id) => graph.nodes[id]),
  links: raw.linkIds.map((id) => graph.links[id]),
  truths: raw.truths,
  closed: raw.closed,
  nodeIds: raw.nodeIds,
});

/**
 * Build the step a chain proves, or null when it proves nothing new.
 */
const stepForChain = (grid, chain) => {
  const { nodes, links, truths, closed } = chain;
  let placement = null;
  let eliminations = [];
  let loopLinks = null;

  if (closed) {
    // Every weak link in a continuous loop becomes an exact either-or, so
    // the loop licenses an elimination at every one of them. All of them are
    // reported, not just the first: that is what makes the loop worth
    // teaching as its own thing.
    loopLinks = [];
    for (let i = 0; i < links.length; i++) {
      if (links[i].type !== 'weak') continue;
      const a = nodes[i];
      const b = nodes[(i + 1) % nodes.length];
      const found = eliminationsFromEither(grid, a, b);
      if (found.length > 0) loopLinks.push({ index: i, eliminations: found });
      eliminations.push(...found);
    }
  } else if (nodes[0].id === nodes[nodes.length - 1].id) {
    // The walk came back to the node it ruled out, so that node cannot be
    // false: it is true.
    const result = resultFromNodeTrue(grid, nodes[0]);
    placement = result.placement;
    eliminations = result.eliminations;
  } else {
    // The two ends must be two separate places, or "either this or that"
    // is not a choice at all: an end that sits inside the other end's group
    // only restates it, and what follows is a locked candidate rather than
    // a chain. Those belong to the pointing and claiming lessons.
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (first.cells.some((cell) => last.cells.includes(cell)) && !(first.cells.length === 1 && last.cells.length === 1)) {
      return null;
    }
    eliminations = eliminationsFromEither(grid, first, last);
  }

  eliminations = dedupeEliminations(eliminations);
  if (!placement && eliminations.length === 0) return null;

  const technique = classifyChain(chain, grid);
  const digits = [...new Set(nodes.map((n) => n.digit))].sort((a, b) => a - b);
  const baseCells = [...new Set(nodes.flatMap((n) => n.cells))].sort((a, b) => a - b);
  const sets = [];
  const seenSets = new Set();
  for (const link of links) {
    if (!link.als) continue;
    const key = link.als.cells.join(',');
    if (seenSets.has(key)) continue;
    seenSets.add(key);
    sets.push({ cells: [...link.als.cells], digits: [...link.als.digits] });
  }

  const notation = chainNotation(nodes, links, closed);
  const conclusion = resultNotation(placement, eliminations);

  return {
    technique,
    digit: digits.length === 1 ? digits[0] : null,
    baseCells,
    targetCells: placement ? [placement.cell] : [...new Set(eliminations.map((e) => e.cell))],
    placement,
    eliminations,
    subsetDigits: digits.length > 1 ? digits : undefined,
    chainNodes: chainNodesOf(nodes, links, truths, closed),
    chainClosed: closed,
    chainSets: sets.length > 0 ? sets : undefined,
    chainLoopEliminations: loopLinks ?? undefined,
    chainNotation: notation,
    explanation: closed
      ? `Continuous loop (nice loop) ${notation}. Strong and weak links alternate all the way round, so every weak link in the loop is an exact either-or and each one eliminates: ${conclusion}.`
      : placement
        ? `Alternating inference chain ${notation}. Assuming (${nodes[0].digit})${nodeCellsName(nodes[0])} false forces it true, so it must be true: ${conclusion}.`
        : `Alternating inference chain ${notation} => ${conclusion}. Strong and weak links alternate, so at least one endpoint is true, and anything both endpoints rule out is false.`,
  };
};

// ---------------------------------------------------------------------------
// Public finders
// ---------------------------------------------------------------------------

const resultKey = (step) =>
  step.placement
    ? `p:${step.placement.cell}:${step.placement.digit}`
    : `e:${step.eliminations.map(elimKey).join(',')}`;

/**
 * Shortest chain first, then the most eliminations, then the lowest cell
 * index, then the notation, so the answer is the same every time.
 */
const betterChain = (a, b) =>
  a.chainNodes.length - b.chainNodes.length ||
  b.eliminations.length - a.eliminations.length ||
  Math.min(...a.baseCells) - Math.min(...b.baseCells) ||
  a.chainNotation.localeCompare(b.chainNotation);

/**
 * Chains, grouped by the name the card would show, for one graph profile and
 * one node cap. One instance per distinct conclusion, proved by the shortest
 * chain that proves it: the same elimination reached a longer way round is
 * the same lesson twice.
 */
const chainsByName = (grid, profileName, maxNodes) => {
  const profile = PROFILES[profileName];
  const graph = buildGraph(grid, profile);
  const raw = searchChains(graph, maxNodes, profile.loops);
  /** @type {Map<string, Map<string, any>>} */
  const byName = new Map();

  for (const rawChain of raw) {
    const chain = expand(graph, rawChain);
    // A node may appear only once in a chain, so the player can follow it.
    // The one exception is a chain that comes back to the node it started
    // from, which is how a candidate is proved true.
    const ids = chain.nodeIds;
    const closing = !chain.closed && ids[0] === ids[ids.length - 1];
    const distinct = new Set(closing ? ids.slice(0, -1) : ids);
    if (distinct.size !== (closing ? ids.length - 1 : ids.length)) continue;
    if (isDegenerate(chain, grid)) continue;

    const step = stepForChain(grid, chain);
    if (!step) continue;
    // A grouped or set-based name must really need its richer node.
    if (profileName === 'grouped' && !chain.nodes.some((n) => n.cells.length > 1)) continue;
    if (profileName === 'als' && !chain.links.some((l) => l.via === 'als')) continue;

    if (!byName.has(step.technique)) byName.set(step.technique, new Map());
    const perResult = byName.get(step.technique);
    const key = resultKey(step);
    const held = perResult.get(key);
    if (!held || betterChain(step, held) < 0) perResult.set(key, step);
  }

  /** @type {Map<string, any[]>} */
  const sorted = new Map();
  for (const [technique, perResult] of byName) {
    sorted.set(technique, [...perResult.values()].sort(betterChain));
  }
  return sorted;
};

// The ladder asks several chain detectors about the same board, one after
// another, and the Techniques panel asks every one of them for a count. They
// all read the same graph, so it is built once per board and kept until the
// board changes. Keyed by the grid object, which the app replaces on every
// change, so a stale answer is impossible.
const cache = new WeakMap();

const cachedChains = (grid, profileName, maxNodes) => {
  let perGrid = cache.get(grid);
  if (!perGrid) {
    perGrid = new Map();
    cache.set(grid, perGrid);
  }
  const key = `${profileName}:${maxNodes}`;
  let found = perGrid.get(key);
  if (!found) {
    found = chainsByName(grid, profileName, maxNodes);
    perGrid.set(key, found);
  }
  return found;
};

/**
 * One chain technique on this board.
 *
 * @param {Array} grid
 * @param {number|null} focusedDigit only steps that touch this digit
 * @param {boolean} returnAll every instance (the panel's count and Scan)
 *   rather than the first (the hint). The hint shows at most
 *   HINT_CHAIN_NODES nodes; Scan may go to SCAN_CHAIN_NODES.
 * @param {string} technique one of CHAIN_TECHNIQUES
 */
export const findChain = (grid, focusedDigit, returnAll, technique) => {
  const profileName = PROFILE_OF[technique];
  if (!profileName) return returnAll ? [] : null;
  const maxNodes = returnAll ? SCAN_CHAIN_NODES : HINT_CHAIN_NODES;
  const found = cachedChains(grid, profileName, maxNodes).get(technique) || [];
  const matching = focusedDigit
    ? found.filter(
        (step) =>
          step.placement?.digit === focusedDigit ||
          step.eliminations.some((e) => e.digit === focusedDigit)
      )
    : found;
  if (returnAll) return matching.map(makeStep);
  return matching.length > 0 ? makeStep(matching[0]) : null;
};

/** One finder per chain technique, for the ladder and the panel. */
export const CHAIN_FINDERS = Object.fromEntries(
  CHAIN_TECHNIQUES.map((technique) => [
    technique,
    /** @type {(grid: any[], focusedDigit?: number|null, returnAll?: boolean) => any} */
    (grid, focusedDigit = null, returnAll = false) =>
      findChain(grid, focusedDigit, returnAll, technique),
  ])
);
