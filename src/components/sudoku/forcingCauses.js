// Why each move of a forcing proof follows from the ones before it (#141).
//
// A forcing branch is a list of placements, each with a one-line reason
// ("Only place for 3 in row 5"). That says what happened, not why: which
// earlier move took the other places for that 3 away. A player watching
// the proof had to work that out in their head. This replays a branch on
// the board it started from and records, for every forced move, the
// earlier placement that ruled out each alternative, the same for how the
// branch breaks the board, and the same again inside every option a net
// tried. It then keeps only the moves the ending actually depends on, so a
// proof is shown whole without being padded by moves that lead nowhere.
//
// Pure: board in, plain data out (it crosses a worker boundary).

import { ALL_UNITS, getPeers, getRow, getCol } from './gridUnits';

const UNIT_BY_NAME = new Map(ALL_UNITS.map((unit) => [unit.name, unit]));

let nextId = 1;

/** Which line two cells share, in the words the card uses. */
export const sharedLine = (a, b) =>
  getRow(a) === getRow(b) ? 'row' : getCol(a) === getCol(b) ? 'column' : 'box';

const snapshot = (grid) => ({
  cells: grid.map((c) => ({ value: c.value, candidates: c.value === null ? [...c.candidates] : [] })),
  at: new Map(),
});
const clone = (state) => ({
  cells: state.cells.map((c) => ({ value: c.value, candidates: [...c.candidates] })),
  at: new Map(state.at),
});

/** Write a digit in and clear it from its peers, remembering who placed it. */
const place = (state, cell, digit) => {
  const node = { id: nextId++, cell, digit };
  state.cells[cell] = { value: digit, candidates: [] };
  for (const peer of getPeers(cell)) {
    const c = state.cells[peer];
    if (c.value === null) c.candidates = c.candidates.filter((d) => d !== digit);
  }
  state.at.set(cell, node);
  return node;
};

/** The placement in this proof that took `digit` away from `cell`, if any. */
const killerOf = (state, cell, digit) => {
  for (const peer of getPeers(cell)) {
    const node = state.at.get(peer);
    if (node && node.digit === digit) return node;
  }
  return null;
};

/** Why `cell` cannot be any of `digits` now: one entry per digit. */
const whyNot = (state, cell, digits, deps) =>
  digits.map((digit) => {
    const by = killerOf(state, cell, digit);
    if (by) deps.add(by.id);
    return { digit, by: by ? { cell: by.cell, digit: by.digit, line: sharedLine(cell, by.cell) } : null };
  });

/** Why none of `cells` can hold `digit` in their unit now: filled, or seen. */
const whyNotHere = (state, cells, digit, deps) =>
  cells.map((cell) => {
    const filled = state.at.get(cell);
    if (state.cells[cell].value !== null) {
      if (filled) deps.add(filled.id);
      return { cell, filled: state.cells[cell].value };
    }
    const by = killerOf(state, cell, digit);
    if (by) deps.add(by.id);
    return { cell, by: by ? { cell: by.cell, digit: by.digit, line: sharedLine(cell, by.cell) } : null };
  });

const unitFromReason = (reason) => {
  const m = /^Only place for (\d) in (.+)$/.exec(reason || '');
  return m ? { digit: Number(m[1]), unit: UNIT_BY_NAME.get(m[2]) ?? null, name: m[2] } : null;
};

/**
 * How a branch broke the board, explained on the board as it stood then.
 * `broke` is the engine's { text, cell, unit, trials }.
 */
const explainEnding = (start, state, broke) => {
  const deps = new Set();
  if (broke.trials && broke.trials.length > 0) {
    const trials = broke.trials.map((t) => explainTrial(state, broke.cell, t));
    for (const t of trials) for (const id of t.deps) deps.add(id);
    // Why the cell was down to just these options: what this proof had
    // already taken from it. That is where the case's own moves come in.
    const tried = trials.map((t) => t.digit);
    const narrowed = whyNot(state, broke.cell, start.cells[broke.cell].candidates.filter((d) => !tried.includes(d)), deps);
    return { ending: { kind: 'no-option', cell: broke.cell, text: broke.text, narrowed, trials: trials.map(stripDeps) }, deps };
  }
  if (/has no valid candidates left/.test(broke.text || '') && typeof broke.cell === 'number') {
    const had = start.cells[broke.cell].candidates;
    return { ending: { kind: 'empty-cell', cell: broke.cell, text: broke.text, because: whyNot(state, broke.cell, had, deps) }, deps };
  }
  if (broke.unit && typeof broke.unit.digit === 'number') {
    const unit = UNIT_BY_NAME.get(broke.unit.name);
    const digit = broke.unit.digit;
    const had = (unit?.indices ?? []).filter((i) => start.cells[i].value === null && start.cells[i].candidates.includes(digit));
    return {
      ending: { kind: 'no-place', digit, unit: broke.unit.name, text: broke.text, because: whyNotHere(state, had, digit, deps) },
      deps,
    };
  }
  // A cell asked to hold two digits, or one it has already lost: name what
  // is there and the placements that met on it.
  if (typeof broke.cell === 'number') {
    const node = state.at.get(broke.cell);
    if (node) deps.add(node.id);
  }
  return { ending: { kind: 'other', cell: broke.cell ?? null, text: broke.text }, deps };
};

const stripDeps = ({ deps: _deps, ...rest }) => rest;

/**
 * Replay a list of moves from `start`, explaining each, then the ending.
 * Returns the moves that matter, the ending, and which placements from
 * outside this list they rely on (`deps`, ids of outer placements).
 */
const explainSequence = (start, assume, moves, ending) => {
  const state = clone(start);
  const items = [];
  const local = new Set();

  if (assume) {
    const node = place(state, assume.cell, assume.digit);
    local.add(node.id);
    items.push({ id: node.id, cell: assume.cell, digit: assume.digit, kind: 'assume', deps: [] });
  }

  for (const move of moves) {
    const deps = new Set();
    let item;
    const trials = move.net?.trials;
    if (trials && trials.length > 0) {
      const explained = trials.map((t) => explainTrial(state, move.net.cell, t));
      for (const t of explained) for (const id of t.deps) deps.add(id);
      // Why the split cell had only these two options left.
      const digits = move.net.digits ?? [];
      const narrowed = whyNot(state, move.net.cell, start.cells[move.net.cell].candidates.filter((d) => !digits.includes(d)), deps);
      item = {
        cell: move.cell,
        digit: move.digit,
        kind: explained.every((t) => t.ending?.kind === 'reaches') ? 'net-either' : 'net-refuted',
        split: { cell: move.net.cell, digits, narrowed },
        trials: explained.map(stripDeps),
      };
    } else if (/^Only candidate left/.test(move.reason || '')) {
      const others = start.cells[move.cell].candidates.filter((d) => d !== move.digit);
      item = { cell: move.cell, digit: move.digit, kind: 'naked', because: whyNot(state, move.cell, others, deps) };
    } else if (unitFromReason(move.reason)?.unit) {
      const { unit, name, digit } = unitFromReason(move.reason);
      const others = unit.indices.filter(
        (i) => i !== move.cell && start.cells[i].value === null && start.cells[i].candidates.includes(digit)
      );
      item = { cell: move.cell, digit: move.digit, kind: 'hidden', unit: name, because: whyNotHere(state, others, digit, deps) };
    } else {
      item = { cell: move.cell, digit: move.digit, kind: 'other', reason: move.reason || '' };
    }
    const node = place(state, move.cell, move.digit);
    local.add(node.id);
    items.push({ ...item, id: node.id, deps: [...deps] });
  }

  // What the list ends on, and what that rests on.
  let end = null;
  let needed = null;
  if (ending?.broke) {
    const { ending: e, deps } = explainEnding(start, state, ending.broke);
    end = e;
    needed = deps;
  } else if (ending?.removes) {
    // A convergence that rubs out marks: for each, the placement in this
    // case that sees it, or that filled the cell with something else.
    const deps = new Set();
    const removes = ending.removes.map(({ cell, digit }) => {
      if (state.cells[cell].value !== null) {
        const node = state.at.get(cell);
        if (node) deps.add(node.id);
        return { cell, digit, filled: state.cells[cell].value };
      }
      const by = killerOf(state, cell, digit);
      if (by) deps.add(by.id);
      return { cell, digit, by: by ? { cell: by.cell, digit: by.digit, line: sharedLine(cell, by.cell) } : null };
    });
    end = { kind: 'removes', removes };
    needed = deps;
  } else if (ending?.reaches) {
    const { cell, digit } = ending.reaches;
    const hit = items.find((it) => it.cell === cell && it.digit === digit);
    end = { kind: 'reaches', cell, digit };
    needed = new Set(hit ? [hit.id] : items.map((it) => it.id));
  }

  // Keep what the ending depends on, and what that depends on in turn. The
  // assumption always stays: it is where the case begins.
  let kept = items;
  if (needed) {
    const want = new Set(needed);
    for (let i = items.length - 1; i >= 0; i--) {
      if (want.has(items[i].id)) for (const id of items[i].deps) want.add(id);
    }
    kept = items.filter((it) => it.kind === 'assume' || want.has(it.id));
    needed = want;
  }
  const outer = new Set();
  for (const id of needed ?? items.flatMap((it) => it.deps)) if (!local.has(id)) outer.add(id);

  return { items: kept.map(({ id: _id, deps: _deps, ...rest }) => rest), ending: end, deps: [...outer] };
};

/** One option a net tried from `state`: assume it, follow it, see how it ends. */
const explainTrial = (state, cell, trial) => {
  const result = explainSequence(
    state,
    { cell, digit: trial.digit },
    trial.moves ?? [],
    trial.broke ? { broke: trial.broke } : trial.reaches ? { reaches: trial.reaches } : null
  );
  return { cell, digit: trial.digit, items: result.items.filter((it) => it.kind !== 'assume'), ending: result.ending, deps: result.deps };
};

/**
 * A whole branch of a forcing proof, explained from the board it started
 * on. `decisive` is the placement the branches agree on, or `eliminations`
 * the marks they all rub out, for a branch that does not break; such a
 * branch is cut down to what reaches it.
 */
export const explainBranch = (grid, branch, decisive = null, eliminations = null) => {
  const start = snapshot(grid);
  const ending = branch.contradiction
    ? { broke: { text: branch.text, cell: branch.cell ?? null, unit: branch.unit ?? null, trials: branch.trials ?? null } }
    : decisive
      ? { reaches: decisive }
      : eliminations?.length
        ? { removes: eliminations }
        : null;
  const result = explainSequence(start, branch.assume, branch.moves ?? [], ending);
  return { items: result.items.filter((it) => it.kind !== 'assume'), ending: result.ending };
};
