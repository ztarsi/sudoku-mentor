// Forcing chains, forcing nets, and the what-if fallback.
//
// One argument runs through almost all of this module: take a set of
// options that must contain the answer, follow every one of them, and keep
// what they all force. Nothing is assumed that is not then checked, so the
// conclusion holds whichever option is the true one. That is a proof by
// cases, and it is what the Forcing tier shows the player.
//
// Three shapes of exhaustive origin, which is where the names come from:
//
//   a cell            its candidates: one of them is the answer
//   a strong link     the two places for a digit in a unit  (Digit Forcing Chain)
//   a unit            the three or more places for a digit  (Unit Forcing Chain)
//
// and two shapes of conclusion:
//
//   convergence       every option forces the same thing, so it is proved
//   refutation        an option, followed, contradicts itself, so it is out
//                     (Double Forcing Chain; with one option left standing,
//                      that one is proved)
//
// Only the last function here is trial and error. Hypothesis Mode assumes
// ONE candidate, finds that it breaks the board, and erases it. Nothing
// else was examined, so nothing else may be claimed - which is why it keeps
// the what-if heading and colour while the proofs above it do not (#75).

import { ALL_UNITS, getPeers, cellName } from './gridUnits';
import { makeStep } from './stepShape';
import { NET_DEPTH } from './searchLimits';

// The net's depth limit lives in its own module so the panel and the
// dialogs can name the number without pulling the engine in with it.
export { NET_DEPTH };

/** Thrown when a search passes its deadline (Date.now() ms). */
export class SearchTimeout extends Error {
  constructor() {
    super('What-if search ran out of time');
    this.name = 'SearchTimeout';
    this.timedOut = true;
  }
}
const checkDeadline = (deadline) => {
  if (deadline !== Infinity && Date.now() >= deadline) throw new SearchTimeout();
};

// Work caps. The search is bounded by counted work and not by a clock, so
// the same board always gives the same answer however fast the machine is
// (the analyser's per-shelf report depends on that). A deadline, where one
// is given, cuts a search short on top of these.
const PLAIN_ORIGINS = 600; // exhaustive origins one plain pass may try
const PLAIN_OPTIONS = 4; // the most options an origin may offer to be worth teaching
const NET_ORIGINS = 24; // origins the net pass may try: each one costs a lot more
const TOP_WIDTH = 12; // two-option cells one pass at the top of a branch may try
const NESTED_WIDTH = 1; // and inside a nested trial, where every extra is multiplied
const NET_ROUNDS = 40; // passes of net work one branch may make
const TRIAL_NET_CELLS = 16; // cells the last-resort net hypothesis may try
const PROOF_MOVES = 5; // forced moves a branch shows before "N more"

const cloneGrid = (grid) => grid.map((cell) => ({ ...cell, candidates: [...cell.candidates] }));

// Apply a value and propagate constraints: naked singles AND hidden
// singles, to a fixpoint.
//
// A worklist processes every peer of every placement (an older recursive
// version stopped at the first naked single and left stale candidates).
// After the naked-single cascade drains, every unit is scanned for a digit
// with exactly one place left and all of them are queued with their
// reasons; a digit with NO place left is a contradiction. Without hidden
// singles the branches of a forcing chain almost never converged on
// library grids, so the mentor fell straight to hypothesis search.
//
// Returns { grid, contradiction, cell?, text?, unit?, placements } where
// `placements` lists every placement that followed from the first one, in
// order, each with a plain-language reason. Exported for tests.
export const applyValueAndPropagate = (grid, cellIndex, value) => {
  const newGrid = cloneGrid(grid);
  const queue = [[cellIndex, value, null]];
  const placements = [];

  const contradiction = (cell, text, unit = null) => ({ grid: newGrid, contradiction: true, cell, text, unit, placements });

  for (;;) {
    while (queue.length > 0) {
      const [idx, val, reason] = queue.shift();

      if (newGrid[idx].value === val) continue; // already placed (re-entry)
      if (newGrid[idx].value !== null) {
        return contradiction(idx, `${cellName(idx)} would have to be both ${newGrid[idx].value} and ${val}`);
      }
      if (idx !== cellIndex && !newGrid[idx].candidates.includes(val)) {
        return contradiction(idx, `${cellName(idx)} would have to be ${val}, which it can no longer hold`);
      }

      newGrid[idx].value = val;
      newGrid[idx].candidates = [];
      if (reason) placements.push({ cell: idx, value: val, reason });

      for (const peerIdx of getPeers(idx)) {
        const peer = newGrid[peerIdx];
        if (peer.value === null) {
          if (peer.candidates.includes(val)) {
            peer.candidates = peer.candidates.filter((c) => c !== val);

            if (peer.candidates.length === 0) {
              return contradiction(peerIdx, `${cellName(peerIdx)} has no valid candidates left`);
            }
            if (peer.candidates.length === 1) {
              queue.push([peerIdx, peer.candidates[0], `Only candidate left in ${cellName(peerIdx)}`]);
            }
          }
        } else if (peer.value === val) {
          // Same value in peer = contradiction
          return contradiction(peerIdx, `${cellName(peerIdx)} already holds ${val}`);
        }
      }
    }

    // Hidden singles: a digit with one place left in a unit goes there.
    // Every unit is scanned before the queue is drained again - two digits
    // forced into one cell is a real contradiction, which the queue
    // reports, so there is no need to rescan after each one.
    for (const unit of ALL_UNITS) {
      for (let d = 1; d <= 9; d++) {
        let placed = false;
        const spots = [];
        for (const idx of unit.indices) {
          const cell = newGrid[idx];
          if (cell.value === d) { placed = true; break; }
          if (cell.value === null && cell.candidates.includes(d)) spots.push(idx);
        }
        if (placed) continue;
        if (spots.length === 0) {
          const empty = unit.indices.find((idx) => newGrid[idx].value === null);
          return contradiction(empty ?? unit.indices[0], `no cell in ${unit.name} can hold ${d}`, { ...unit, digit: d });
        }
        if (spots.length === 1) {
          queue.push([spots[0], d, `Only place for ${d} in ${unit.name}`]);
        }
      }
    }
    if (queue.length === 0) break;
  }

  return { grid: newGrid, contradiction: false, placements };
};

// ---------------------------------------------------------------------------
// One branch: one option, followed
// ---------------------------------------------------------------------------

const asMoves = (placements) => placements.map((p) => ({ cell: p.cell, digit: p.value, reason: p.reason, net: null }));

/** Is there a two-option cell left to split on? */
const hasSplit = (grid) => grid.some((cell) => cell.value === null && cell.candidates.length === 2);

/** Take the one option a cell has left, once the other has been refuted. */
const take = (grid, cell, digit, refuted, split) => {
  const applied = applyValueAndPropagate(grid, cell, digit);
  if (applied.contradiction) {
    return { contradiction: true, cell: applied.cell, text: applied.text, unit: applied.unit || null };
  }
  return {
    contradiction: false,
    grid: applied.grid,
    moves: [
      { cell, digit, reason: `${cellName(cell)} cannot be ${refuted}: that breaks the board. So it is ${digit}`, net: split },
      ...asMoves(applied.placements),
    ],
  };
};

/**
 * Try one option of a cell: place it, follow the singles, and - where the
 * budget still allows - let the net work inside it.
 *
 * `budget` is how many assumptions this call may hold at once, counting
 * the one it is placing. At 1 the option is followed by singles alone.
 */
const tryOption = (grid, cell, digit, budget, deadline) => {
  checkDeadline(deadline);
  const applied = applyValueAndPropagate(grid, cell, digit);
  const moves = asMoves(applied.placements);
  if (applied.contradiction) {
    return { contradiction: true, moves, text: applied.text, cell: applied.cell, unit: applied.unit || null };
  }
  if (budget <= 1) return { contradiction: false, grid: applied.grid, moves, limited: hasSplit(applied.grid) };

  const deeper = netWork(applied.grid, budget - 1, deadline, NESTED_WIDTH);
  if (deeper.contradiction) {
    return {
      contradiction: true,
      moves: [...moves, ...deeper.moves],
      text: deeper.text,
      cell: deeper.cell,
      unit: deeper.unit || null,
    };
  }
  return { contradiction: false, grid: deeper.grid, moves: [...moves, ...deeper.moves], limited: deeper.limited };
};

/**
 * The net at work on one grid: case analysis over a two-option cell, which
 * can say three things, every one of them a proof by cases over that cell
 * rather than a guess.
 *
 *   both options break the board    this grid is impossible
 *   one option breaks it            the cell takes the other: a forced move
 *   both force the same placement   that placement holds either way
 *
 * What an option merely allows is never adopted; only what the case
 * analysis forces. `width` is how many cells one pass may consider: one
 * inside a nested trial, where a second would be multiplied by every level
 * above it, and more at the top of a branch, where it is the difference
 * between a net that advances and one that stalls.
 *
 * @returns {{ contradiction: boolean, moves: object[], grid?: any[],
 *             text?: string, cell?: number, unit?: object|null,
 *             limited?: boolean }}
 */
const netWork = (grid, budget, deadline, width) => {
  let g = grid;
  const moves = [];
  let limited = false;

  for (let round = 0; round < NET_ROUNDS; round++) {
    checkDeadline(deadline);
    let tried = 0;
    let progressed = false;

    for (let i = 0; i < 81 && tried < width; i++) {
      if (g[i].value !== null || g[i].candidates.length !== 2) continue;
      tried++;
      const [a, b] = g[i].candidates;
      const split = { cell: i, digits: [a, b] };

      const first = tryOption(g, i, a, budget, deadline);
      if (first.contradiction) {
        const second = tryOption(g, i, b, budget, deadline);
        if (second.contradiction) {
          // Short on purpose: the inner texts are themselves refutations
          // from further down the net, and quoting them nests a sentence
          // inside a sentence inside a sentence. What the player needs is
          // the cell and that neither of its digits survives.
          return {
            contradiction: true,
            moves,
            cell: i,
            unit: null,
            text: `${cellName(i)} has no option left: both ${a} and ${b} break the board`,
          };
        }
        const taken = take(g, i, b, a, split);
        if (taken.contradiction) return { ...taken, moves };
        g = taken.grid;
        moves.push(...taken.moves);
        progressed = true;
        break;
      }

      // The first option survives, so on its own it proves nothing. Only a
      // pass allowed to look wider spends a second trial on the other one.
      if (width <= NESTED_WIDTH) continue;

      const second = tryOption(g, i, b, budget, deadline);
      if (second.contradiction) {
        const taken = take(g, i, a, b, split);
        if (taken.contradiction) return { ...taken, moves };
        g = taken.grid;
        moves.push(...taken.moves);
        progressed = true;
        break;
      }

      const shared = sharedPlacement([first, second]);
      if (shared) {
        const applied = applyValueAndPropagate(g, shared.cell, shared.digit);
        if (applied.contradiction) {
          return { contradiction: true, moves, cell: applied.cell, text: applied.text, unit: applied.unit || null };
        }
        g = applied.grid;
        moves.push({
          cell: shared.cell,
          digit: shared.digit,
          reason: `${cellName(i)} is ${a} or ${b}, and either way ${cellName(shared.cell)} is ${shared.digit}`,
          net: split,
        });
        moves.push(...asMoves(applied.placements));
        progressed = true;
        break;
      }
    }

    // Nothing came of any split this pass. If there were splits to try, a
    // net allowed to hold more assumptions might have got further: that is
    // the depth limit talking, and the step it belongs to says so.
    if (!progressed) {
      limited = tried > 0;
      break;
    }
  }

  return { contradiction: false, grid: g, moves, limited };
};

/**
 * Follow one option as far as the depth allows.
 *
 * At depth 1 the only inferences are naked and hidden singles, to a
 * fixpoint: a plain forcing chain, one assumption held. Above that, where
 * the singles run out, the branch may hold further assumptions one at a
 * time - a dynamic net, `depth` assumptions deep in all.
 *
 * @returns {{ assume: {cell:number, digit:number}, moves: object[],
 *             ruledOut?: Set<number>, contradiction: boolean, text?: string,
 *             cell?: number, unit?: object|null, net: boolean,
 *             limited: boolean }}
 */
const runBranch = (grid, cell, digit, depth, deadline) => {
  const assume = { cell, digit };
  const result = depth > 1
    ? tryOptionWide(grid, cell, digit, depth, deadline)
    : tryOption(grid, cell, digit, 1, deadline);
  const net = result.moves.some((move) => move.net);
  if (result.contradiction) {
    return { assume, moves: result.moves, contradiction: true, text: result.text, cell: result.cell, unit: result.unit || null, net, limited: false };
  }
  // What the branch rules out is worked out here and the board it worked
  // it out on is dropped: a pass keeps every branch it has run (they are
  // shared between origins), and keeping a few hundred grids with them
  // would cost more memory than the whole search saves in time.
  return {
    assume,
    moves: result.moves,
    ruledOut: ruledOutBy(grid, result.grid),
    contradiction: false,
    net,
    // Only a net can run into the depth limit; a plain chain has no depth
    // to run out of, so it never reports one.
    limited: depth > 1 && !!result.limited,
  };
};

/** The top of a net branch, where the net may look at several cells. */
/**
 * @returns {{ contradiction: boolean, moves: object[], grid?: any[],
 *             text?: string, cell?: number, unit?: object|null,
 *             limited?: boolean }}
 */
const tryOptionWide = (grid, cell, digit, budget, deadline) => {
  checkDeadline(deadline);
  const applied = applyValueAndPropagate(grid, cell, digit);
  const moves = asMoves(applied.placements);
  if (applied.contradiction) {
    return { contradiction: true, moves, text: applied.text, cell: applied.cell, unit: applied.unit || null };
  }
  const deeper = netWork(applied.grid, budget - 1, deadline, TOP_WIDTH);
  if (deeper.contradiction) {
    return { contradiction: true, moves: [...moves, ...deeper.moves], text: deeper.text, cell: deeper.cell, unit: deeper.unit || null };
  }
  return { contradiction: false, grid: deeper.grid, moves: [...moves, ...deeper.moves], limited: deeper.limited };
};

// ---------------------------------------------------------------------------
// What the branches agree on
// ---------------------------------------------------------------------------

/** A placement every one of these branches makes, or null. */
const sharedPlacement = (branches) => {
  const [first, ...rest] = branches;
  for (const move of first.moves) {
    if (rest.every((b) => b.moves.some((m) => m.cell === move.cell && m.digit === move.digit))) {
      return { cell: move.cell, digit: move.digit };
    }
  }
  return null;
};

/** Every candidate this branch rules out, as a "cell*10+digit" key set. */
const ruledOutBy = (grid, after) => {
  const out = new Set();
  for (let i = 0; i < 81; i++) {
    if (grid[i].value !== null) continue;
    for (const digit of grid[i].candidates) {
      if (after[i].value === digit) continue; // placed here, not ruled out
      if (after[i].value !== null || !after[i].candidates.includes(digit)) out.add(i * 10 + digit);
    }
  }
  return out;
};

/** Candidates every one of these branches rules out. */
const sharedEliminations = (branches) => {
  let shared = branches[0].ruledOut;
  for (const branch of branches.slice(1)) {
    shared = new Set([...shared].filter((key) => branch.ruledOut.has(key)));
    if (shared.size === 0) return [];
  }
  return [...shared]
    .sort((a, b) => a - b)
    .map((key) => ({ cell: Math.floor(key / 10), digit: key % 10 }));
};

// ---------------------------------------------------------------------------
// The step the card shows
// ---------------------------------------------------------------------------

/**
 * The few moves of a branch the card walks: the first handful in the order
 * the branch made them, plus the move that decided it when that came
 * later. `skipped` is how many it does not show, so the walk can say so
 * instead of quietly dropping them.
 */
const proofOf = (branch, decisive) => {
  const shown = branch.moves.slice(0, PROOF_MOVES);
  const pick = (move) => {
    if (move && !shown.includes(move)) shown.push(move);
  };
  if (decisive) {
    pick(branch.moves.find((m) => m.cell === decisive.cell && m.digit === decisive.digit));
  } else if (branch.contradiction) {
    pick(branch.moves[branch.moves.length - 1]);
  }
  return { proof: shown, skipped: Math.max(0, branch.moves.length - shown.length) };
};

/** "2, 3 or 5", for a list of options. */
const listOr = (items) =>
  items.length < 2 ? `${items[0] ?? ''}` : `${items.slice(0, -1).join(', ')} or ${items[items.length - 1]}`;

const originSentence = (origin) => {
  const where = listOr(origin.cells.map(cellName));
  if (origin.kind === 'cell') {
    return `${cellName(origin.cells[0])} can only be ${listOr(origin.options.map((o) => o.digit))}`;
  }
  if (origin.kind === 'digit') {
    return `in ${origin.unit.name} the only two places for ${origin.digit} are ${where}`;
  }
  return `in ${origin.unit.name} the ${origin.digit} can only go in ${where}`;
};

/** The caveat every one of these proofs carries, for the Expert wording. */
const CAVEAT =
  'Valid, and not a pattern anybody spots by eye: finding it is the mentor\'s job, and the branches above are the whole of the proof.';

const outcomeFor = (branch, decisive, kind) => {
  if (branch.contradiction) {
    return { kind: 'contradiction', text: branch.text, cell: branch.cell ?? null };
  }
  // In a refutation the live case is the conclusion, so saying it "ends
  // with" what it assumed would be the argument chasing its own tail.
  if (kind === 'refutation') {
    return { kind: 'survives', text: 'Nothing breaks here.', cell: null };
  }
  if (decisive) {
    return { kind: 'forces', text: `${cellName(decisive.cell)} is ${decisive.digit}`, cell: decisive.cell };
  }
  return { kind: 'agrees', text: 'the same pencil marks disappear', cell: null };
};

/**
 * Put a forcing proof into the one step shape. `conclusion` is what the
 * branches agreed on (a placement or a list of eliminations); `kind` says
 * which of the two arguments proved it.
 */
const forcingStep = ({ origin, branches, conclusion, kind }) => {
  const net = branches.some((b) => b.net);
  const technique = net
    ? 'Forcing Net'
    : kind === 'refutation'
      ? 'Double Forcing Chain'
      : origin.technique;
  const decisive = conclusion.placement || null;
  const placed = conclusion.placement;
  const targets = placed
    ? [placed.cell]
    : [...new Set(conclusion.eliminations.map((e) => e.cell))];

  const verdict = placed
    ? `${cellName(placed.cell)} = ${placed.digit}`
    : `${conclusion.eliminations.length} candidate${conclusion.eliminations.length === 1 ? '' : 's'} removed`;
  const argument = kind === 'refutation'
    ? `Every option but one ends in a contradiction, so the one left standing is proved: ${verdict}.`
    : `Every option forces the same thing, so it holds whichever is true: ${verdict}.`;
  const netLine = net
    ? ` The net held ${NET_DEPTH} assumptions at once where the singles ran out${branches.some((b) => b.limited) ? ', and stopped at that limit rather than exhausting the board' : ''}.`
    : '';

  return makeStep({
    technique,
    explanation: `${technique}: ${originSentence(origin)}. Each option is followed to its consequences. ${argument}${netLine} ${CAVEAT}`,
    baseCells: origin.cells,
    targetCells: targets,
    placement: placed || null,
    eliminations: placed ? [] : conclusion.eliminations,
    digit: origin.digit ?? null,
    unit: origin.unit ? { type: origin.unit.type, index: origin.unit.index, name: origin.unit.name } : null,
    forcingOrigin: {
      kind: origin.kind,
      cells: origin.cells,
      digit: origin.digit ?? null,
      unitName: origin.unit?.name ?? null,
      options: origin.options,
    },
    forcingBranches: branches.map((branch) => {
      const { proof, skipped } = proofOf(branch, branch.contradiction ? null : decisive);
      return {
        assume: branch.assume,
        moves: branch.moves,
        proof,
        skipped,
        outcome: outcomeFor(branch, branch.contradiction ? null : decisive, kind),
        net: branch.net,
        limited: branch.limited,
      };
    }),
    forcingConclusion: { kind, placement: placed || null, eliminations: placed ? [] : conclusion.eliminations },
    forcingNet: net ? { depth: NET_DEPTH, limited: branches.some((b) => b.limited) } : null,
  });
};

// ---------------------------------------------------------------------------
// The exhaustive origins, cheapest first
// ---------------------------------------------------------------------------

/**
 * Every set of options on this board that must contain the answer, in the
 * order the search tries them: a cell's candidates first (the shape the
 * player already knows from Cell Forcing Chain), then the two ends of a
 * strong link, then a unit with three or more places for a digit. Fewer
 * options first throughout, because a shorter proof is a better lesson and
 * a cheaper search.
 */
const exhaustiveOrigins = (grid, { maxOptions = PLAIN_OPTIONS } = {}) => {
  const origins = [];
  for (let size = 2; size <= maxOptions; size++) {
    for (let i = 0; i < 81; i++) {
      if (grid[i].value !== null || grid[i].candidates.length !== size) continue;
      origins.push({
        kind: 'cell',
        technique: 'Cell Forcing Chain',
        cells: [i],
        digit: null,
        unit: null,
        options: grid[i].candidates.map((digit) => ({ cell: i, digit })),
      });
    }
    for (const unit of ALL_UNITS) {
      for (let digit = 1; digit <= 9; digit++) {
        let placed = false;
        const spots = [];
        for (const idx of unit.indices) {
          if (grid[idx].value === digit) { placed = true; break; }
          if (grid[idx].value === null && grid[idx].candidates.includes(digit)) spots.push(idx);
        }
        if (placed || spots.length !== size) continue;
        origins.push({
          kind: size === 2 ? 'digit' : 'unit',
          technique: size === 2 ? 'Digit Forcing Chain' : 'Unit Forcing Chain',
          cells: spots,
          digit,
          unit,
          options: spots.map((cell) => ({ cell, digit })),
        });
      }
    }
  }
  return origins;
};

/**
 * Walk the exhaustive origins and return the first proof one of them
 * yields. `depth` is how many assumptions a branch may hold at once: 1 for
 * a plain forcing chain, NET_DEPTH for a dynamic net.
 */
const searchOrigins = (grid, { depth, deadline, origins: originLimit, maxOptions }) => {
  // A cell's candidate is also one of the places for that digit in each of
  // its three units, so the same option belongs to up to four origins. It
  // is followed once per pass and the answer kept, which is most of what
  // makes the search quick enough to run while somebody is waiting - and
  // it is what makes the second sweep below nearly free.
  const followed = new Map();
  const follow = (cell, digit) => {
    const key = cell * 10 + digit;
    if (!followed.has(key)) followed.set(key, runBranch(grid, cell, digit, depth, deadline));
    return followed.get(key);
  };

  const origins = exhaustiveOrigins(grid, { maxOptions }).slice(0, originLimit);

  /**
   * What an origin proves. `placementsOnly` is the first sweep: a digit
   * written in is a better lesson than a handful of pencil marks rubbed
   * out, and it moves the board on further, so every origin is asked for
   * one before any of them is asked for eliminations.
   */
  const proofFrom = (origin, placementsOnly) => {
    const branches = origin.options.map((option) => follow(option.cell, option.digit));
    const live = branches.filter((b) => !b.contradiction);
    // Every option breaks the board: the position itself is broken, which
    // is not this engine's business to report.
    if (live.length === 0) return null;

    if (live.length > 1) {
      const placement = sharedPlacement(live);
      if (placement) return forcingStep({ origin, branches, conclusion: { placement }, kind: 'convergence' });
      if (!placementsOnly) {
        const eliminations = sharedEliminations(live);
        if (eliminations.length > 0) {
          return forcingStep({ origin, branches, conclusion: { eliminations }, kind: 'convergence' });
        }
      }
    }

    if (live.length === branches.length) return null; // nothing was refuted either

    if (live.length === 1) {
      // One option left standing, and every other one tried and broken.
      const { cell, digit } = live[0].assume;
      return forcingStep({ origin, branches, conclusion: { placement: { cell, digit } }, kind: 'refutation' });
    }

    if (placementsOnly) return null;

    // Some options are impossible and the survivors agree on nothing: the
    // impossible ones can still go.
    const eliminations = branches
      .filter((b) => b.contradiction)
      .map((b) => ({ cell: b.assume.cell, digit: b.assume.digit }));
    return forcingStep({ origin, branches, conclusion: { eliminations }, kind: 'refutation' });
  };

  for (const placementsOnly of [true, false]) {
    for (const origin of origins) {
      checkDeadline(deadline);
      const step = proofFrom(origin, placementsOnly);
      if (step) return step;
    }
  }
  return null;
};

/**
 * A forcing chain: an exhaustive origin whose options are followed with
 * naked and hidden singles only. Cell, Unit or Digit Forcing Chain where
 * the options converge, Double Forcing Chain where they are refuted.
 *
 * `deadline` is a Date.now() millisecond stamp past which the search gives
 * up with a SearchTimeout. It is an option rather than a positional
 * argument so that a stale caller cannot pass a small number and have the
 * search quietly report that there is nothing on the board.
 *
 * @param {any[]} grid
 * @param {{ deadline?: number }} [options]
 */
export const findForcingChain = (grid, { deadline = Infinity } = {}) =>
  searchOrigins(grid, { depth: 1, deadline, origins: PLAIN_ORIGINS, maxOptions: PLAIN_OPTIONS });

/**
 * A dynamic forcing net: the same exhaustive origins, but a branch may
 * hold NET_DEPTH assumptions at once where the singles run out. Tried only
 * after the plain chains, because it costs far more; limited to two-option
 * origins, because a net over four branches is neither quick nor teachable.
 */
export const findForcingNet = (grid, { deadline = Infinity } = {}) =>
  searchOrigins(grid, { depth: NET_DEPTH, deadline, origins: NET_ORIGINS, maxOptions: 3 });

// ---------------------------------------------------------------------------
// The fallback: one candidate, assumed and refuted
// ---------------------------------------------------------------------------

/** Cells with candidates, fewest first: a short test before a long one. */
const cellsByCandidateCount = (grid) => {
  const cells = [];
  for (let size = 2; size <= 9; size++) {
    for (let i = 0; i < 81; i++) {
      if (grid[i].value === null && grid[i].candidates.length === size) cells.push(i);
    }
  }
  return cells;
};

const hypothesisStep = (grid, cellIndex, badValue, branch) => {
  const others = grid[cellIndex].candidates.filter((c) => c !== badValue);
  // Two candidates and one of them broke the board: the other is the answer.
  const placement = others.length === 1 ? { cell: cellIndex, digit: others[0] } : null;
  const outcome = placement
    ? `so ${cellName(cellIndex)} must be ${placement.digit}`
    : `so ${badValue} can be removed from ${cellName(cellIndex)}`;
  const { proof, skipped } = proofOf(branch, null);

  return makeStep({
    technique: 'Hypothesis Mode',
    explanation:
      `Hypothesis Mode: assume ${cellName(cellIndex)} = ${badValue}. Following it reaches a contradiction ` +
      `(${branch.text}), ${outcome}. Only this one candidate was tested, so this is a trial that ruled ` +
      'something out, not a proof by cases.',
    baseCells: [cellIndex],
    targetCells: branch.unit ? branch.unit.indices : [branch.cell],
    placement,
    eliminations: placement ? [] : [{ cell: cellIndex, digit: badValue }],
    forcingOrigin: { kind: 'candidate', cells: [cellIndex], digit: badValue, unitName: null, options: [{ cell: cellIndex, digit: badValue }] },
    forcingBranches: [
      {
        assume: branch.assume,
        moves: branch.moves,
        proof,
        skipped,
        outcome: { kind: 'contradiction', text: branch.text, cell: branch.cell ?? null },
        net: branch.net,
        limited: branch.limited,
      },
    ],
    forcingNet: branch.net ? { depth: NET_DEPTH, limited: branch.limited } : null,
    contradiction: true,
    contradictionCell: branch.cell,
    contradictionText: branch.text || null,
    contradictionUnit: branch.unit || null,
    contradictoryDigit: badValue,
  });
};

/**
 * The honest last resort: assume one candidate, and erase it if the board
 * breaks. Sound on its own - a candidate that breaks the puzzle is false -
 * but nothing else was examined, so the card says it is reasoning by trial.
 *
 * Singles first; only if nothing breaks under them does the net get a turn,
 * on the bi-value cells alone.
 */
export const findHypothesis = (grid, { deadline = Infinity } = {}) => {
  for (const cellIndex of cellsByCandidateCount(grid)) {
    for (const value of grid[cellIndex].candidates) {
      checkDeadline(deadline);
      const branch = runBranch(grid, cellIndex, value, 1, deadline);
      if (branch.contradiction) return hypothesisStep(grid, cellIndex, value, branch);
    }
  }

  let tried = 0;
  for (const cellIndex of cellsByCandidateCount(grid)) {
    if (tried >= TRIAL_NET_CELLS) break;
    tried++;
    for (const value of grid[cellIndex].candidates) {
      checkDeadline(deadline);
      const branch = runBranch(grid, cellIndex, value, NET_DEPTH, deadline);
      if (branch.contradiction) return hypothesisStep(grid, cellIndex, value, branch);
    }
  }
  return null;
};

/**
 * Does this option break the board, at the depth a net may hold?
 *
 * The one question every refutation in here rests on, exported so the
 * tests can take a step's own claims apart and ask it again: a branch that
 * says an option was impossible, or a net move that says a cell cannot be
 * one of its two digits, is checked against this rather than trusted.
 *
 * @param {any[]} grid
 * @param {number} cell
 * @param {number} digit
 * @param {{ depth?: number, deadline?: number }} [options]
 */
export const refutes = (grid, cell, digit, { depth = NET_DEPTH, deadline = Infinity } = {}) =>
  runBranch(grid, cell, digit, depth, deadline).contradiction;

/**
 * The whole search, in the order the mentor asks it: the proofs first, the
 * trial last. The hint path, the panel's Search button and the difficulty
 * analyser all come through here, so what a player is shown and what the
 * coverage report counts are the same thing.
 */
export const findWhatIfStep = (grid, { deadline = Infinity } = {}) =>
  findForcingChain(grid, { deadline })
  || findForcingNet(grid, { deadline })
  || findHypothesis(grid, { deadline })
  || null;
