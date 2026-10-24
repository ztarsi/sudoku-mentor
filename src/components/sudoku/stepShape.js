// One shape for every step the engines emit.
//
//   technique    string, the display name in techniqueCatalog
//   digit        number | null: the digit the step is about. For a placement
//                it is the placed digit; for eliminations of one digit it is
//                that digit; null when several digits are involved.
//   baseCells    cells that form the pattern (highlighted blue)
//   targetCells  cells that lose candidates or get the placement (red)
//   placement    { cell, digit } | null
//   eliminations [{ cell, digit }]
//   explanation  the engine's own text, standard vocabulary
//
// Optional, technique-specific: unit, orientation, pairDigits,
// subsetDigits (the digits a subset of any size is about), zCells, finCells,
// strongLinks, chains, chain, contradiction, contradictionCell,
// contradictoryDigit, als1, als2, xDigit, zDigit, fishSize, sashimi,
// baseUnits and coverUnits (a fish whose lines are not all rows or all
// columns), crossing and linkUnit (Empty Rectangle), medusaRule,
// medusaWitness and colorGroups (a colouring step's two colours, the
// surviving one first), and from the uniqueness family: rectangle
// ({ corners, floor, roof } - the four corners in reading order, which of
// them match and which are the odd ones, so the card can draw the shape),
// extraDigits, placedDigits (an Avoidable Rectangle's already-worked-out
// corners), loopCells (a unique loop, in the order the ring closes) and
// bugExtras (the candidates whose removal would leave a grave).
//
// A chain step (the alternating-inference family) also carries:
//   chainNodes   the nodes in order, each { cells, cell, digit, kind,
//                truth, endpoint, linkToNext: 'strong'|'weak'|null,
//                linkVia: 'unit'|'bivalue'|'cell'|'als'|null, linkUnit,
//                linkSet }. `linkToNext` describes the link from this node
//                to the next; for a closed loop the last node links back
//                to the first.
//   chainClosed  true for a continuous loop
//   chainSets    the almost locked sets the chain passes through
//   chainLoopEliminations  per weak link of a loop, what it licenses
//   chainNotation  the Expert notation, "(5)R1C3 = (5)R1C7 - ..."
//
// A colouring step (X-Cycle, 3D Medusa) carries the same `chainNodes`, so
// the card walks it and the board draws it the same way, plus:
//   chainColouring  true: every link is an exactly-one-of-two, and the
//                   nodes are the run of links that decides the step
//                   rather than a whole chain
//   colorRule       'wrap' or 'unit' (one colour twice in a row, column or
//                   box), 'cell' (one colour twice in one cell), or
//                   'trap' (a cell that sees both colours)
//   colorWitness    the two marks the run joins, which is what the rule is
//                   about
//   colorTarget     for a trap, the cell that is dead either way
//
// makeStep() fills the defaults so the UI and tests can rely on every
// field being present with the right type.
export const makeStep = (step) => {
  if (!step) return null;
  const placement = step.placement && typeof step.placement.cell === 'number'
    ? { cell: step.placement.cell, digit: step.placement.digit }
    : null;
  const eliminations = Array.isArray(step.eliminations) ? step.eliminations : [];
  let digit = typeof step.digit === 'number' ? step.digit : null;
  // A placement step is about the digit it places, whatever the search
  // that found it was testing (Hypothesis Mode used to report the digit it
  // ruled OUT here, so the UI highlighted the wrong one).
  if (placement) digit = placement.digit;
  else if (digit === null && eliminations.length > 0) {
    const digits = new Set(eliminations.map((e) => e.digit));
    if (digits.size === 1) digit = eliminations[0].digit;
  }
  return {
    ...step,
    digit,
    baseCells: Array.isArray(step.baseCells) ? step.baseCells : [],
    targetCells: Array.isArray(step.targetCells)
      ? step.targetCells
      : [...new Set(eliminations.map((e) => e.cell))],
    placement,
    eliminations,
    explanation: typeof step.explanation === 'string' ? step.explanation : '',
  };
};
