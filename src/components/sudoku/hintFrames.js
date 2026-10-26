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
import { chainWalk, explainStep } from './explainStep';
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
  ghosts: [],
  place: null,
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

/** A colouring rings its two colours in the two tints the board gives it. */
const colourRings = (nodes) =>
  nodes.map((node) => ({ cell: anchorOf(node), color: node.color === 2 ? SECOND : PATTERN }));

// ---------------------------------------------------------------------------
// The words
// ---------------------------------------------------------------------------

/**
 * The caption for one line of the walk, at the level the player chose.
 * Beginner gets the plain sentence, Expert the same link in notation.
 */
const lineCaption = (line, level) =>
  (level === 'detailed' ? line.notation || line.text : line.text) || '';

/**
 * The lesson text, as the two or three captions a staged animation needs:
 * what to look at, why it works, and what to do. Beginner has all three
 * hand-written; Expert has the engine's own sentence, which is one block of
 * standard vocabulary, so it is read out a sentence at a time.
 */
const stagedCaptions = (step, grid, level) => {
  const parts = explainStep(step, grid, level) || { look: null, why: '', action: '' };
  if (level === 'detailed') {
    const sentences = (parts.why || '')
      .split(/(?<=[.:])\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
    return { body: sentences.length > 0 ? sentences : [parts.why || ''], action: parts.action || '' };
  }
  return { body: [parts.look, parts.why].filter(Boolean), action: parts.action || '' };
};

/** The last frame: what the step actually does to the board. */
const resultFrame = (step, caption, picture) =>
  frame(caption, {
    ...picture,
    crosses: uniq((step.eliminations ?? []).map((e) => e.cell)),
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
  const regions = groups.map((n) => ({ cells: n.cells, color: PATTERN, label: String(n.digit ?? '') }));
  const rings = colouring
    ? colourRings(nodes)
    : ringsOn([...(step.baseCells ?? []), ...nodes.map(anchorOf)], PATTERN);

  const captions = stagedCaptions(step, grid, level);
  const frames = [frame(captions.body[0], { rings, regions })];

  const lines = [];
  walk.forEach((line) => {
    const from = anchorOf(line.from);
    const to = anchorOf(line.to);
    if (typeof from === 'number' && typeof to === 'number') {
      lines.push({ from, to, color: PATTERN, dashed: !line.strong });
    }
    const current = lines.length - 1;
    frames.push(
      frame(lineCaption(line, level), {
        lines: lines.map((l, i) => (i === current ? { ...l, color: ACTIVE, emphasis: true } : l)),
        rings,
        regions,
      })
    );
  });

  frames.push(resultFrame(step, captions.action, { lines, rings, regions }));
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
    frame(stagedCaptions(step, grid, level).body[0], { rings: ringsOn(origin, PATTERN) }),
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
    for (const line of uniq((step.eliminations ?? []).map((e) => cover(e.cell))).sort((a, b) => a - b)) {
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
 * A pattern, in stages: the shape it stands on, then the extra piece that
 * makes it work, then what it erases. Three or four frames, each with the
 * sentence the lesson text already gives that stage.
 */
const patternFrames = (step, grid, level) => {
  const { body, action } = stagedCaptions(step, grid, level);
  if (body.length === 0) return null;
  const regions = regionsOf(step);
  const base = ringsOn(step.baseCells ?? [], PATTERN);
  const extra = extraCells(step);
  // The first region alone, then all of them: a fish's base lines before
  // its cover lines, a set-based step's first set before the one it joins.
  const stages = regions.length > 1 ? [regions.slice(0, 1), regions] : [regions];

  const frames = [];
  body.forEach((caption, i) => {
    frames.push(
      frame(caption, {
        regions: stages[Math.min(i, stages.length - 1)],
        rings: i === 0 ? base : [...base, ...ringsOn(extra, EXTRA)],
      })
    );
  });
  // More regions than sentences: the rest still get shown, under the last
  // sentence, rather than never being drawn at all.
  for (let i = body.length; i < stages.length; i++) {
    frames.push(
      frame(body[body.length - 1], {
        regions: stages[i],
        rings: [...base, ...ringsOn(extra, EXTRA)],
      })
    );
  }
  frames.push(
    resultFrame(step, action, { regions, rings: [...base, ...ringsOn(extra, EXTRA)] })
  );
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
      frames = forcingFrames(step, grid, level);
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
