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
// Optional, technique-specific: unit, orientation, pairDigits, finCells,
// strongLinks, chains, chain, contradiction, contradictionCell,
// contradictoryDigit, als1, als2, xDigit, zDigit.
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
