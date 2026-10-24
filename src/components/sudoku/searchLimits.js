// The one stated limit the what-if search has, kept on its own so that the
// panel, the hint card and the dialogs can name the number without
// importing the engine that enforces it.

/**
 * How many assumptions a dynamic net may hold at once, counting the
 * branch's own: five. A number chosen on purpose and measured, not one the
 * implementation happened to reach.
 *
 * One assumption is a plain forcing chain: place a digit and follow the
 * singles to a fixpoint. Above that the branch may, where the singles run
 * out, try both options of one further cell and keep only what both of
 * them force - and that nested trial may do the same, up to this many
 * assumptions in all.
 *
 * Five is the lowest depth at which the mentor can name every step of
 * every puzzle in the library: at two, four of the seven Ultimate puzzles
 * cannot be finished at all, and at three and four, one still cannot. The
 * cost of each step is still a fraction of a second (the slowest search on
 * the library is under half of one), and the limit is what keeps this a
 * mentor rather than a solver. Where a net stalls against it, the step
 * says so rather than reading as though there had been nothing to find.
 */
export const NET_DEPTH = 5;
