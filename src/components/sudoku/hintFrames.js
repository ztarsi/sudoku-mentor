// The hint animation's frames (#97).
//
// One builder per family, and a frame is the whole picture at one moment:
// which regions are outlined, which marks are ringed, which links are
// drawn, what is crossed out, and the one sentence under the board. The
// board draws a frame and nothing else, so what it shows is decided here
// and can be checked without a browser.
//
// Nothing here writes new English. The sentences are the walk's (#67, #75,
// #82) and the lesson text's, which are hand-written per technique and
// tested; a frame picks the one that belongs to it at the player's chosen
// explanation level. That is the whole reason the captions follow the
// level: both wordings already exist, line by line.
import { chainWalk, chainConclusion, explainStep } from './explainStep';
import { getBox, getRow, getCol, getRowIndices, getColIndices, getBoxIndices } from './gridUnits';
import { techniqueTier } from './techniqueCatalog';

// The board's own colours, so an animation never invents one. Blue is the
// pattern, orange its second colour, amber the extra piece a pattern hangs
// on, yellow the link being talked about, red what goes.
const PATTERN = '#3b82f6';
const SECOND = '#f97316';
const EXTRA = '#f59e0b';
const ACTIVE = '#facc15';
const RESULT = '#ef4444';
// One per case of a forcing proof, the palette the board already uses.
const CASE_COLORS = ['#10b981', '#a855f7', '#3b82f6', '#f59e0b'];

const uniq = (list) => [...new Set(list)];

/** The digits a set holds. The set engines spell the field two ways. */
const digitsOf = (set) => [...(set?.digits ?? set?.candidates ?? [])].sort((a, b) => a - b);

/** Every frame carries the whole picture, so every field has a default. */
const frame = (caption, parts = {}) => ({
  caption,
  regions: [],
  lines: [],
  rings: [],
  crosses: [],
  // The pencil marks that go, one by one, so the board strikes out the
  // mark rather than the whole cell.
  erase: [],
  ghosts: [],
  place: null,
  // Frames that explain this one in full, opened with Show why (#141).
  detail: null,
  ...parts,
});

/** Every row, column or box that holds all of `cells`, box first. */
const unitsContaining = (cells) => {
  if (!cells || cells.length === 0) return [];
  const units = [];
  const boxes = new Set(cells.map(getBox));
  const rows = new Set(cells.map(getRow));
  const cols = new Set(cells.map(getCol));
  if (boxes.size === 1) units.push({ type: 'box', index: [...boxes][0] });
  if (rows.size === 1) units.push({ type: 'row', index: [...rows][0] });
  if (cols.size === 1) units.push({ type: 'column', index: [...cols][0] });
  return units;
};

const unitCells = (unit) => {
  if (!unit || typeof unit.index !== 'number') return [];
  if (unit.type === 'row') return getRowIndices(unit.index);
  if (unit.type === 'column' || unit.type === 'col') return getColIndices(unit.index);
  if (unit.type === 'box') return getBoxIndices(unit.index);
  return [];
};

/** A node of a chain is one or more cells; its line is drawn from the first. */
const anchorOf = (node) => (Array.isArray(node?.cells) ? node.cells[0] : node?.cell);

const ringsOn = (cells, color) => uniq(cells).map((cell) => ({ cell, color }));

/** The cells of a chain node: one, or a group's several. */
const nodeCells = (node) =>
  (Array.isArray(node?.cells) && node.cells.length > 0 ? node.cells : [node?.cell]).filter((c) => typeof c === 'number');

/**
 * Rings on the pencil marks a proof is about. A ring that knows its digit
 * circles that one mark, so the player sees which 4 is meant rather than a
 * disc over the whole cell hiding every mark in it; without a digit, or
 * where the cell does not hold it, the cell itself is outlined.
 */
const marksOn = (cells, digits, grid, color) =>
  uniq(cells).flatMap((cell) => {
    const held = grid?.[cell]?.candidates;
    const shown = digits && Array.isArray(held) ? digits.filter((d) => held.includes(d)) : [];
    return shown.length > 0 ? shown.map((digit) => ({ cell, digit, color })) : [{ cell, color }];
  });

/** A chain's nodes as marks, each in its own digit, each mark once. */
const nodeRings = (nodes, colorOf) => {
  const seen = new Set();
  const rings = [];
  for (const node of nodes) {
    for (const cell of nodeCells(node)) {
      const key = `${cell}:${node.digit ?? ''}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rings.push(node.digit ? { cell, digit: node.digit, color: colorOf(node) } : { cell, color: colorOf(node) });
    }
  }
  return rings;
};

/** A colouring rings its two colours in the two tints the board gives it. */
const colourRings = (nodes) => nodeRings(nodes, (node) => (node.color === 2 ? SECOND : PATTERN));

// ---------------------------------------------------------------------------
// The words
// ---------------------------------------------------------------------------

/**
 * The caption for one line of the walk, at the level the player chose.
 * Beginner gets the plain sentence, Expert the same link in notation.
 */
const lineCaption = (line, level) =>
  (level === 'detailed' ? line.notation || line.text : line.text) || '';

const wordCount = (text) => text.split(/\s+/).filter(Boolean).length;

/** A paragraph's sentences. A sentence ends at a stop followed by a capital or a digit. */
const sentencesOf = (text) =>
  (text || '')
    .split(/(?<=[.!?])\s+(?=[A-Z0-9"(])/)
    .map((s) => s.trim())
    .filter(Boolean);

// About as much as a beginner reads comfortably under the board before the
// frame moves on: a sentence or two, never a paragraph (spec: a frame is
// one idea).
const CHUNK_WORDS = 30;

/** A paragraph cut into frame-sized pieces, whole sentences only. */
const chunksOf = (text) => {
  const chunks = [];
  for (const sentence of sentencesOf(text)) {
    const last = chunks[chunks.length - 1];
    // A short sentence ("Look at box 7.") never stands alone as a frame.
    if (last && (wordCount(last) < 8 || wordCount(last) + wordCount(sentence) <= CHUNK_WORDS)) chunks[chunks.length - 1] = `${last} ${sentence}`;
    else chunks.push(sentence);
  }
  return chunks;
};

/**
 * The lesson text, as the captions a staged animation needs: what to look
 * at, why it works, and what to do. Beginner has all three hand-written,
 * cut into pieces a player can read before the frame moves on; Expert has
 * the engine's own sentence, which is one block of standard vocabulary, so
 * it is read out a sentence at a time, the first as the opening.
 */
const stagedCaptions = (step, grid, level) => {
  const parts = explainStep(step, grid, level) || { look: null, why: '', action: '' };
  if (level === 'detailed') {
    const sentences = (parts.why || '')
      .split(/(?<=[.:])\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const all = sentences.length > 0 ? sentences : [parts.why || ''];
    return { look: all.slice(0, 1), why: all.slice(1), action: parts.action || '' };
  }
  const look = chunksOf(parts.look);
  const why = chunksOf(parts.why);
  // No opening of its own: the first piece of the reason opens instead.
  if (look.length === 0) return { look: why.slice(0, 1), why: why.slice(1), action: parts.action || '' };
  return { look, why, action: parts.action || '' };
};

/** The last frame: what the step actually does to the board. */
const resultFrame = (step, caption, picture) =>
  frame(caption, {
    ...picture,
    crosses: uniq((step.eliminations ?? []).map((e) => e.cell)),
    erase: (step.eliminations ?? []).map(({ cell, digit }) => ({ cell, digit })),
    // The digit that goes in is written in, faintly, so the last frame
    // shows the answer rather than only a ring round where it goes.
    ghosts: step.placement ? [...(picture.ghosts ?? []), step.placement] : picture.ghosts ?? [],
    place: step.placement ?? null,
  });

// ---------------------------------------------------------------------------
// The families whose proof is a walk: chains, colouring, forcing
// ---------------------------------------------------------------------------

/**
 * A chain or a colouring, link by link. The picture grows by one link a
 * frame, the link being talked about is drawn heavier, and the nodes seen
 * so far stay ringed, so the player watches the argument assemble rather
 * than meeting it finished.
 */
const chainFrames = (step, grid, level) => {
  const walk = chainWalk(step);
  if (walk.length === 0) return null;
  const colouring = !!step.chainColouring;
  const nodes = step.chainNodes ?? [];
  const groups = nodes.filter((n) => (n.cells?.length ?? 1) > 1);

  // The marks the proof is about stay on the board throughout: the step has
  // to be readable at rest, and it is the links between them that build up.
  // A colouring shows its two tints, because the alternation is the proof.
  // Each ring circles the one mark a node is about, so a cell in the chain
  // twice, for two different digits, shows both marks rather than one disc.
  const regions = groups.map((n) => ({ cells: n.cells, color: PATTERN, label: String(n.digit ?? '') }));
  const covered = new Set(nodes.flatMap(nodeCells));
  const rings = colouring
    ? colourRings(nodes)
    : [...nodeRings(nodes, () => PATTERN), ...ringsOn((step.baseCells ?? []).filter((c) => !covered.has(c)), PATTERN)];

  const captions = stagedCaptions(step, grid, level);
  const frames = captions.look.map((caption) => frame(caption, { rings, regions }));

  const lines = [];
  walk.forEach((line) => {
    const from = anchorOf(line.from);
    const to = anchorOf(line.to);
    if (typeof from === 'number' && typeof to === 'number') {
      // From mark to mark: a link inside one cell, between its two
      // digits, is a short line across the cell rather than nothing.
      lines.push({ from, to, fromDigit: line.from.digit, toDigit: line.to.digit, color: PATTERN, dashed: !line.strong });
    }
    const current = lines.length - 1;
    const said = lineCaption(line, level);
    // A link worth two sentences (a set that locks, a stem's case) holds
    // its picture for both, one frame each.
    for (const caption of level === 'detailed' ? [said] : chunksOf(said)) {
      frames.push(
        frame(caption, {
          lines: lines.map((l, i) => (i === current ? { ...l, color: ACTIVE, emphasis: true } : l)),
          rings,
          regions,
        })
      );
    }
  });

  // What the chain proves, before what to do about it: the two ends, and
  // the marks that see both. A colouring's walk already ends on its
  // verdict; a chain's does not, and without this the player is left to
  // work out why the last link means anything (Expert reads it in the
  // opening line's notation).
  // A plain chain says it in the chain's own words, about its two ends; a
  // set-based one (a Death Blossom, a Sue de Coq) in its lesson's, whose
  // opening goes over the links again, so only its closing pieces.
  const conclusion = Array.isArray(step.alsSets) ? captions.why.slice(-3) : chunksOf(chainConclusion(step));
  if (!colouring && level !== 'detailed' && conclusion.length > 0) {
    const ends = step.chainClosed ? [] : [nodes[0], nodes[nodes.length - 1]].filter(Boolean);
    const targets = (step.eliminations ?? []).map(({ cell, digit }) => ({ cell, digit, color: RESULT }));
    const endRings = nodeRings(ends, () => ACTIVE);
    for (const caption of conclusion) {
      frames.push(frame(caption, { lines, regions, rings: [...rings, ...endRings, ...targets] }));
    }
  }

  frames.push(resultFrame(step, captions.action, { lines, rings, regions }));
  return frames;
};

// ---------------------------------------------------------------------------
// Forcing proofs, explained move by move (#141)
//
// The founder's two complaints about the first version, both right: it
// played the case that survives first, which proves nothing, and its moves
// said what happened ("Only place for 3 in row 5") without saying why, so
// the player had to work out in their head which earlier move had taken
// the other places away. So: the options that break the board come first,
// the one left standing is the conclusion, and every move says which
// earlier move ruled out each alternative, with those cells ringed and a
// line from each cause to what it rules out. A claim that rests on a whole
// trial of its own ("R5C3 cannot be 3: that breaks the board") carries
// that trial as `detail`, which the player opens with Show why: the story
// stays short at the top, and nothing in it has to be taken on trust.
// ---------------------------------------------------------------------------

const cn = (i) => `R${getRow(i) + 1}C${getCol(i) + 1}`;
const joinAnd = (xs) => (xs.length < 2 ? xs[0] ?? '' : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
const joinOr = (xs) => (xs.length < 2 ? `${xs[0] ?? ''}` : `${xs.slice(0, -1).join(', ')} or ${xs[xs.length - 1]}`);
const capFirst = (t) => (t ? t[0].toUpperCase() + t.slice(1) : t);

/** "4 is taken by R2C3 in the same column", for one ruled-out digit. */
const ruledOut = (b, level) =>
  level === 'detailed'
    ? `${b.digit}: ${b.by ? cn(b.by.cell) : 'earlier'}`
    : b.by
      ? `${b.digit} is taken by ${cn(b.by.cell)} in the same ${b.by.line}`
      : `${b.digit} was already ruled out`;

/** Why one cell of a row, column or box cannot take `digit` any more. */
const blocked = (b, digit, level) =>
  level === 'detailed'
    ? b.filled != null
      ? `${cn(b.cell)}=${b.filled}`
      : `${cn(b.cell)}: ${b.by ? cn(b.by.cell) : 'earlier'}`
    : b.filled != null
      ? `${cn(b.cell)} is now ${b.filled}`
      : b.by
        ? `${cn(b.cell)} cannot, because ${cn(b.by.cell)} is ${digit} in the same ${b.by.line}`
        : `${cn(b.cell)} was already out`;

const itemCaption = (item, level) => {
  const at = cn(item.cell);
  const d = item.digit;
  const because = item.because ?? [];
  if (item.kind === 'naked') {
    if (level === 'detailed') return `${at}=${d} (naked single; ${because.map((b) => ruledOut(b, level)).join(', ')})`;
    return because.length > 0
      ? `${at} must be ${d}: ${joinAnd(because.map((b) => ruledOut(b, level)))}.`
      : `${at} must be ${d}: it is the only number it has left.`;
  }
  if (item.kind === 'hidden') {
    if (level === 'detailed') return `${at}=${d} (hidden single in ${item.unit}; ${because.map((b) => blocked(b, d, level)).join(', ')})`;
    return because.length > 0
      ? `The ${d} in ${item.unit} must go in ${at}, the only place left for it: ${joinAnd(because.map((b) => blocked(b, d, level)))}.`
      : `The ${d} in ${item.unit} must go in ${at}: it is the only place left for it.`;
  }
  if (item.kind === 'net-refuted' || item.kind === 'net-either') {
    const split = item.split ?? { cell: item.cell, digits: [] };
    const narrowed = split.narrowed ?? [];
    if (item.kind === 'net-either') {
      if (level === 'detailed') return `${cn(split.cell)}∈{${split.digits.join(',')}}: each ⇒ ${at}=${d}`;
      return `${cn(split.cell)} could be ${joinOr(split.digits)}, and either way ${at} is ${d}. Show why to watch both.`;
    }
    const refuted = item.trials?.[0]?.digit;
    if (level === 'detailed') return `${cn(split.cell)}=${refuted} ⇒ contradiction, so ${at}=${d}`;
    const why = narrowed.length > 0 ? ` (${joinAnd(narrowed.map((b) => ruledOut(b, level)))})` : '';
    return `${cn(split.cell)} could only be ${joinOr(split.digits)}${why}. Trying ${refuted} breaks the board, so ${at} must be ${d}. Show why to watch it break.`;
  }
  return level === 'detailed' ? `${at}=${d} (${item.reason})` : `${at} must be ${d}. ${capFirst(item.reason || '')}.`;
};

/** How a case or a trial ends, and what that means for it. */
const endingCaption = (ending, level, conclusion) => {
  if (!ending) return '';
  const because = ending.because ?? [];
  if (ending.kind === 'reaches') {
    return level === 'detailed' ? `⇒ ${cn(ending.cell)}=${ending.digit}` : `This way, ${cn(ending.cell)} is ${ending.digit}.`;
  }
  if (ending.kind === 'removes') {
    const removes = ending.removes ?? [];
    if (level === 'detailed') {
      return `⇒ ${removes.map((r) => `${cn(r.cell)}≠${r.digit} (${r.filled != null ? `=${r.filled}` : r.by ? cn(r.by.cell) : 'earlier'})`).join(', ')}`;
    }
    const one = (r) =>
      r.filled != null
        ? `the ${r.digit} in ${cn(r.cell)} goes, because ${cn(r.cell)} is ${r.filled}`
        : r.by
          ? `the ${r.digit} in ${cn(r.cell)} goes, because ${cn(r.by.cell)} is ${r.digit} in the same ${r.by.line}`
          : `the ${r.digit} in ${cn(r.cell)} goes`;
    const parts = removes.map(one);
    return `This way, ${parts.length < 2 ? parts[0] ?? '' : `${parts.slice(0, -1).join('; ')}; and ${parts[parts.length - 1]}`}.`;
  }
  const end = level === 'detailed' ? ' ⇒ contradiction' : ` The board breaks. ${conclusion}`;
  if (ending.kind === 'empty-cell') {
    return level === 'detailed'
      ? `${cn(ending.cell)}: nothing left (${because.map((b) => ruledOut(b, level)).join(', ')})${end}`
      : `Now ${cn(ending.cell)} has no number left: ${joinAnd(because.map((b) => ruledOut(b, level)))}.${end}`;
  }
  if (ending.kind === 'no-place') {
    return level === 'detailed'
      ? `No ${ending.digit} in ${ending.unit} (${because.map((b) => blocked(b, ending.digit, level)).join(', ')})${end}`
      : `Now no cell in ${ending.unit} can hold a ${ending.digit}: ${joinAnd(because.map((b) => blocked(b, ending.digit, level)))}.${end}`;
  }
  if (ending.kind === 'no-option') {
    const digits = (ending.trials ?? []).map((t) => t.digit);
    const narrowed = ending.narrowed ?? [];
    if (level === 'detailed') return `${cn(ending.cell)}∈{${digits.join(',')}}: each ⇒ contradiction`;
    const why = narrowed.length > 0 ? ` (${joinAnd(narrowed.map((b) => ruledOut(b, level)))})` : '';
    return `Now ${cn(ending.cell)} could only be ${joinOr(digits)}${why}, and each of those breaks the board. ${conclusion} Show why to watch both break.`;
  }
  return level === 'detailed' ? `${ending.text}${end}` : `${capFirst(ending.text || 'The board breaks')}.${end}`;
};

/** The cells a move rests on, ringed, with a line from each cause. */
const causePicture = (cell, because, kind) => {
  const rings = [];
  const lines = [];
  for (const b of because ?? []) {
    if (kind === 'hidden' || kind === 'no-place') {
      rings.push({ cell: b.cell, color: RESULT });
      if (b.by) {
        rings.push({ cell: b.by.cell, color: PATTERN });
        lines.push({ from: b.by.cell, to: b.cell, color: PATTERN, dashed: true });
      }
    } else if (b.by) {
      rings.push({ cell: b.by.cell, color: PATTERN });
      lines.push({ from: b.by.cell, to: cell, color: PATTERN, dashed: true });
    }
  }
  return { rings, lines };
};

/**
 * The frames of one case or trial, from the board `ghosts` already shows.
 * `conclusion` is what breaking the board means for it.
 */
const sequenceFrames = (items, ending, level, ghosts, conclusion) => {
  const frames = [];
  let shown = [...ghosts];
  for (const item of items) {
    const detail =
      item.trials && item.trials.length > 0
        ? item.trials.flatMap((t) => trialFrames(t, level, shown))
        : null;
    // A net's split names why its cell was down to two options; draw those.
    const cause = item.split
      ? causePicture(item.split.cell, item.split.narrowed, 'naked')
      : causePicture(item.cell, item.because, item.kind);
    const splitRing = item.split ? [{ cell: item.split.cell, color: PATTERN }] : [];
    shown = [...shown, { cell: item.cell, digit: item.digit }];
    frames.push(
      frame(itemCaption(item, level), {
        ghosts: shown,
        rings: [...cause.rings, ...splitRing, { cell: item.cell, color: ACTIVE }],
        lines: cause.lines,
        detail,
      })
    );
  }
  if (ending) {
    const detail =
      ending.kind === 'no-option' ? (ending.trials ?? []).flatMap((t) => trialFrames(t, level, shown)) : null;
    const removes = ending.kind === 'removes' ? ending.removes ?? [] : [];
    const cause = ending.kind === 'removes'
      ? {
          rings: removes.flatMap((r) => (r.by ? [{ cell: r.by.cell, color: PATTERN }] : [])),
          lines: removes.flatMap((r) => (r.by ? [{ from: r.by.cell, to: r.cell, color: PATTERN, dashed: true }] : [])),
        }
      : ending.kind === 'no-option'
        ? causePicture(ending.cell, ending.narrowed, 'naked')
        : causePicture(ending.cell, ending.because, ending.kind);
    const broken = typeof ending.cell === 'number' && ending.kind !== 'reaches' ? [{ cell: ending.cell, color: RESULT }] : [];
    frames.push(
      frame(endingCaption(ending, level, conclusion), {
        ghosts: shown,
        rings: [...cause.rings, ...broken],
        lines: cause.lines,
        crosses: removes.map((r) => r.cell),
        detail,
      })
    );
  }
  return frames;
};

/** One option a net tried: suppose it, follow it, watch how it ends. */
const trialFrames = (trial, level, ghosts) => {
  const start = [...ghosts, { cell: trial.cell, digit: trial.digit }];
  const conclusion = `So ${cn(trial.cell)} cannot be ${trial.digit}.`;
  return [
    frame(level === 'detailed' ? `Suppose ${cn(trial.cell)}=${trial.digit}` : `Try ${cn(trial.cell)} as ${trial.digit}.`, {
      ghosts: start,
      rings: [{ cell: trial.cell, color: ACTIVE }],
    }),
    ...sequenceFrames(trial.items ?? [], trial.ending, level, start, conclusion),
  ];
};

/** A forcing proof whose branches carry their causes (#141). */
const explainedForcingFrames = (step, grid, level) => {
  const branches = step.forcingBranches ?? [];
  const kind = step.forcingConclusion?.kind;
  const origin = step.forcingOrigin?.cells ?? step.baseCells ?? [];
  const broken = branches.filter((b) => b.outcome?.kind === 'contradiction');
  const live = branches.filter((b) => b.outcome?.kind !== 'contradiction');
  // The options that break the board first: they are the argument. In a
  // refutation the one left standing is the conclusion, not a case.
  const shown = kind === 'refutation' ? broken : [...broken, ...live];

  const options = step.forcingOrigin?.options ?? branches.map((b) => b.assume);
  // A trial tries one option only: its opening is its supposition, and it
  // has no cases to letter.
  const trial = options.length === 1 && shown.length === 1;
  const frames = trial
    ? [
        frame(
          level === 'detailed'
            ? `${step.technique}: suppose ${cn(options[0].cell)}=${options[0].digit}`
            : `${stagedCaptions(step, grid, level).look.join(' ')} If that breaks the board, it was never possible.`,
          { ghosts: [options[0]], rings: [...ringsOn(origin, PATTERN), { cell: options[0].cell, color: CASE_COLORS[0] }] }
        ),
      ]
    : [
        frame(
          level === 'detailed'
            ? `${step.technique}: ${options.map((o) => `${cn(o.cell)}=${o.digit}`).join(' ∨ ')}`
            : `${stagedCaptions(step, grid, level).look.join(' ')} Each option is tried in turn. An option that breaks the board was never possible${
                kind === 'refutation' ? '' : ', and whatever every other option leads to must be true'
              }.`,
          { rings: ringsOn(origin, PATTERN) }
        ),
      ];

  shown.forEach((branch, i) => {
    const assumed = { cell: branch.assume.cell, digit: branch.assume.digit };
    if (trial) {
      const explained = branch.explained ?? { items: [], ending: null };
      frames.push(...sequenceFrames(explained.items ?? [], explained.ending, level, [assumed], `So ${cn(assumed.cell)} cannot be ${assumed.digit}.`));
      return;
    }
    const letter = 'ABCDEFGHI'[i] ?? String(i + 1);
    const assume = branch.assume;
    const color = CASE_COLORS[i % CASE_COLORS.length];
    const start = [{ cell: assume.cell, digit: assume.digit }];
    frames.push(
      frame(
        level === 'detailed' ? `Case ${letter}: ${cn(assume.cell)}=${assume.digit}` : `Case ${letter}: suppose ${cn(assume.cell)} is ${assume.digit}.`,
        { ghosts: start, rings: [...ringsOn(origin, PATTERN), { cell: assume.cell, color }] }
      )
    );
    const explained = branch.explained ?? { items: [], ending: null };
    frames.push(...sequenceFrames(explained.items ?? [], explained.ending, level, start, 'So this case was never possible.'));
  });

  const placement = step.placement;
  const eliminations = step.eliminations ?? [];
  let closing;
  if (kind === 'refutation') {
    closing = placement
      ? level === 'detailed'
        ? `All other options ⇒ contradiction, so ${cn(placement.cell)}=${placement.digit}`
        : `That leaves ${cn(placement.cell)} as ${placement.digit}: every other option broke the board, so it is the answer.`
      : level === 'detailed'
        ? `Refuted: ${eliminations.map((e) => `${cn(e.cell)}≠${e.digit}`).join(', ')}`
        : `${eliminations.length === 1 ? 'That option' : 'Those options'} broke the board, so ${eliminations.length === 1 ? 'it' : 'they'} can go: ${joinAnd(eliminations.map((e) => `the ${e.digit} in ${cn(e.cell)}`))}.`;
  } else {
    closing = placement
      ? level === 'detailed'
        ? `Every case ⇒ ${cn(placement.cell)}=${placement.digit}`
        : `Every case that holds puts ${placement.digit} in ${cn(placement.cell)}, so ${cn(placement.cell)} is ${placement.digit}.`
      : level === 'detailed'
        ? `Every case ⇒ ${eliminations.map((e) => `${cn(e.cell)}≠${e.digit}`).join(', ')}`
        : `Every case that holds rubs out ${joinAnd(eliminations.map((e) => `the ${e.digit} in ${cn(e.cell)}`))}, so ${eliminations.length === 1 ? 'it can' : 'they can'} go.`;
  }
  frames.push(resultFrame(step, closing, { rings: ringsOn(origin, PATTERN) }));
  return frames;
};

/**
 * A forcing proof, case by case. Each case is its own colour: its path is
 * drawn as it is followed and the placements it forces appear as ghost
 * digits, so what a case claims is visible on the board. A case ends and
 * the next begins from the same origin, because the cases disagree with
 * each other - that is what the proof is made of.
 */
const forcingFrames = (step, grid, level) => {
  const walk = chainWalk(step);
  if (walk.length === 0) return null;
  const origin = step.forcingOrigin?.cells ?? step.baseCells ?? [];

  const frames = [
    frame(stagedCaptions(step, grid, level).look.join(' '), { rings: ringsOn(origin, PATTERN) }),
  ];

  let branch = null;
  let path = [];
  let ghosts = [];
  for (const line of walk) {
    if (line.branch !== branch) {
      branch = line.branch;
      path = [];
      ghosts = [];
    }
    const color = typeof branch === 'number' ? CASE_COLORS[branch % CASE_COLORS.length] : RESULT;
    const placed = line.assume || line.move;
    if (placed) {
      ghosts = [...ghosts, { cell: placed.cell, digit: placed.digit }];
      const previous = path[path.length - 1];
      path = [...path, placed.cell];
      if (typeof previous === 'number') {
        frames.push(
          frame(lineCaption(line, level), {
            rings: [...ringsOn(origin, PATTERN), { cell: placed.cell, color: ACTIVE }],
            lines: path.slice(0, -1).map((cell, i) => ({
              from: cell,
              to: path[i + 1],
              color,
              emphasis: i === path.length - 2,
            })),
            ghosts,
          })
        );
        continue;
      }
    }
    frames.push(
      frame(lineCaption(line, level), {
        rings: ringsOn(origin, PATTERN),
        lines: path.slice(0, -1).map((cell, i) => ({ from: cell, to: path[i + 1], color })),
        ghosts,
      })
    );
  }

  // The walk's own last line is what the cases prove together, so the
  // result rides on it rather than adding a frame that says it twice.
  const last = frames[frames.length - 1];
  frames[frames.length - 1] = resultFrame(step, last.caption, {
    rings: last.rings,
    lines: last.lines,
  });
  return frames;
};

// ---------------------------------------------------------------------------
// The families whose proof is a pattern: fish, subsets, wings, sets,
// uniqueness, and the box-line families
// ---------------------------------------------------------------------------

/**
 * The regions a pattern is made of, in the order the lesson text names
 * them: the lines a fish stands on, the unit a subset locks, the sets an
 * almost-locked-set step joins, the corners of a deadly rectangle. Taken
 * from whatever the step carries, so a technique joins in by carrying its
 * own shape rather than by being named here.
 */
const regionsOf = (step) => {
  const regions = [];
  // A BUG is about the whole board: no one row, column or box stands for it.
  if (Array.isArray(step.bugExtras)) return regions;
  const add = (cells, color, label) => {
    const members = uniq((cells ?? []).filter((c) => typeof c === 'number'));
    if (members.length === 0) return;
    const key = members.join(',');
    if (regions.some((r) => r.cells.join(',') === key)) return;
    regions.push({ cells: members, color, label });
  };

  if (Array.isArray(step.baseUnits)) {
    for (const unit of step.baseUnits) add(unitCells(unit), PATTERN, unit.name);
    for (const unit of step.coverUnits ?? []) add(unitCells(unit), EXTRA, unit.name);
    return regions;
  }
  if (Array.isArray(step.alsSets)) {
    for (const set of step.alsSets) add(set.cells, PATTERN, digitsOf(set).join(''));
    return regions;
  }
  if (step.als1 && step.als2) {
    add(step.als1.cells, PATTERN, digitsOf(step.als1).join(''));
    add(step.als2.cells, SECOND, digitsOf(step.als2).join(''));
    return regions;
  }
  if (step.rectangle?.corners) {
    add(step.rectangle.floor, PATTERN, null);
    add(step.rectangle.roof, EXTRA, null);
    if (regions.length === 0) add(step.rectangle.corners, PATTERN, null);
    return regions;
  }
  if (Array.isArray(step.loopCells)) {
    add(step.loopCells, PATTERN, null);
    return regions;
  }
  // A fish stands on lines: the base lines the pattern lives in, then the
  // cover lines the eliminations come out of.
  if (step.orientation === 'row' || step.orientation === 'column') {
    const alongRows = step.orientation === 'row';
    const base = alongRows ? getRow : getCol;
    const cover = alongRows ? getCol : getRow;
    const cellsOf = alongRows ? getRowIndices : getColIndices;
    const coverCellsOf = alongRows ? getColIndices : getRowIndices;
    for (const line of uniq((step.baseCells ?? []).map(base)).sort((a, b) => a - b)) {
      add(cellsOf(line), PATTERN, `${alongRows ? 'row' : 'column'} ${line + 1}`);
    }
    // Every cover line the caption names: the ones the pattern's own cells
    // (not its fins) stand in, not only those that happen to lose a mark.
    const fins = new Set(step.finCells ?? []);
    const covers = (step.baseCells ?? []).filter((c) => !fins.has(c)).map(cover);
    for (const line of uniq(covers.length > 0 ? covers : (step.eliminations ?? []).map((e) => cover(e.cell))).sort((a, b) => a - b)) {
      add(coverCellsOf(line), EXTRA, `${alongRows ? 'column' : 'row'} ${line + 1}`);
    }
    return regions;
  }
  if (step.unit) {
    add(unitCells(step.unit), PATTERN, step.unit.name);
    return regions;
  }
  // The box-line families carry no unit of their own, and the lesson text
  // names two: the one to look in, then the one the digit has to come out
  // of. The second is the unit the erased marks share with the pattern;
  // the first is the other unit the pattern's own cells share - a pointing
  // pair looks in its box and erases down its line, a claiming pair the
  // other way round, and this tells them apart without naming either.
  const base = step.baseCells ?? [];
  const [across] = unitsContaining([...base, ...(step.eliminations ?? []).map((e) => e.cell)]);
  const inside = unitsContaining(base).find(
    (unit) => !across || unit.type !== across.type || unit.index !== across.index
  );
  for (const unit of [inside, across]) {
    if (!unit) continue;
    add(unitCells(unit), regions.length === 0 ? PATTERN : EXTRA, `${unit.type} ${unit.index + 1}`);
  }
  return regions;
};

/** The extra piece a pattern hangs on, when it has one. */
const extraCells = (step) =>
  uniq([
    ...(step.finCells ?? []),
    ...(step.zCells ?? []),
    ...(typeof step.stemCell === 'number' ? [step.stemCell] : []),
    ...(typeof step.crossing === 'number' ? [step.crossing] : []),
  ]);

/**
 * The digits whose marks a pattern is about: a subset's digits, a
 * rectangle's pair, or the one digit a fish or a wing turns on. A naked
 * subset is about every mark its cells hold, so it outlines the cells.
 */
const markDigitsOf = (step) => {
  if (step.pairDigits?.length) return step.pairDigits;
  if (step.subsetDigits?.length) return step.subsetDigits;
  if (/^Naked /.test(step.technique ?? '')) return null;
  return step.digit ? [step.digit] : null;
};

/**
 * A pattern, in stages: the shape it stands on, then the extra piece that
 * makes it work, then what it erases. Each stage carries the sentences the
 * lesson text already gives it, a piece at a time.
 */
const patternFrames = (step, grid, level) => {
  const { look, why, action } = stagedCaptions(step, grid, level);
  if (look.length === 0) return null;
  const regions = regionsOf(step);
  // What the opening names, then everything: a fish's base lines before
  // its cover lines, a box before the line it points along.
  const named = regions.filter((r) => r.color !== EXTRA);
  const opening = named.length > 0 ? named : regions;
  const digits = markDigitsOf(step);
  const extras = Array.isArray(step.bugExtras) ? step.bugExtras : [];
  const base = extras.length > 0
    ? extras.map(({ cell, digit }) => ({ cell, digit, color: PATTERN }))
    : marksOn(step.baseCells ?? [], digits, grid, PATTERN);
  const extra = marksOn(extraCells(step), step.digit ? [step.digit] : null, grid, EXTRA);
  // A set-based step turns on two digits: the one the sets share and must
  // not both hold (yellow, the link), then the one that is erased.
  const shared = step.xDigit ? marksOn(step.baseCells ?? [], [step.xDigit], grid, ACTIVE).filter((r) => r.digit) : [];
  const full = [...base, ...extra, ...shared];

  const frames = look.map((caption) => frame(caption, { regions: opening, rings: base }));
  why.forEach((caption) => frames.push(frame(caption, { regions, rings: full })));
  // More regions than the opening showed but no sentence left for them:
  // they still get shown, under the last sentence, rather than never at all.
  if (why.length === 0 && opening.length < regions.length) {
    frames.push(frame(look[look.length - 1], { regions, rings: full }));
  }
  frames.push(resultFrame(step, action, { regions, rings: [...base, ...extra] }));
  return frames;
};

// ---------------------------------------------------------------------------
// Which builder a step gets
// ---------------------------------------------------------------------------

/**
 * The frames for a step, or null when it has no animation.
 *
 * Which builder runs is decided by what the step carries, not by its name,
 * so a technique added to the catalog is animated by carrying the same
 * shape as its family rather than by being listed here.
 *
 * @param {object} step
 * @param {object[]} grid
 * @param {'simple'|'detailed'} [level]
 * @returns {ReturnType<typeof frame>[] | null}
 */
export const buildHintFrames = (step, grid, level = 'simple') => {
  if (!step) return null;
  // The Basic tier is the two singles, and a single is one step: look at
  // the cell, write the digit. One frame is not an animation.
  if (techniqueTier(step.technique) === 'Basic') return null;
  let frames = null;
  try {
    if (Array.isArray(step.forcingBranches) && step.forcingBranches.length > 0) {
      // A step from before #141 carries no causes: the old walk still works.
      frames = step.forcingBranches.some((b) => b.explained)
        ? explainedForcingFrames(step, grid, level)
        : forcingFrames(step, grid, level);
    } else if (Array.isArray(step.chainNodes) && step.chainNodes.length > 1) {
      frames = chainFrames(step, grid, level);
    } else {
      frames = patternFrames(step, grid, level);
    }
  } catch {
    // A step shape we did not anticipate: no animation rather than a
    // broken board, the same way the lesson text falls back.
    return null;
  }
  if (!frames) return null;
  const usable = frames.filter((f) => f.caption.trim().length > 0);
  return usable.length > 1 ? usable : null;
};

/**
 * Whether this step has an animation to offer. A proof of one step has
 * none, and nor has a technique whose shape no builder recognises - with
 * sixty-one techniques in the catalog that has to be checked rather than
 * assumed, so it is the frames themselves that answer it.
 */
/**
 * @param {object} step
 * @param {object[]} grid
 * @param {'simple'|'detailed'} [level]
 */
export const canAnimate = (step, grid, level = 'simple') =>
  buildHintFrames(step, grid, level) !== null;
