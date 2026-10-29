import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Info, ChevronDown, ChevronUp, ChevronRight, Search, X } from 'lucide-react';
import {
  LEVEL_COLORS,
  TECHNIQUES,
  TIERS,
  COUNT_SCAN,
  COUNT_SEARCH,
  matchTechniques,
  needsUniqueness,
  tierColor,
} from '../techniqueCatalog';
import { UNIQUENESS_UNKNOWN, uniquenessAllowed, uniquenessNote, uniquenessShortNote } from '../uniqueness';

/**
 * The Techniques list, built to stay useful at fifty-odd names.
 *
 * What applies to the board in front of the player comes first and is
 * short. Below it the whole ladder, by tier, collapsed, with each tier's
 * open-or-closed choice remembered. A filter box finds a technique by its
 * plain name, its formal name or the name a guide would use for it, so the
 * player never scrolls past tiers they do not care about.
 *
 * Counts are handed in, already computed off the input path (see
 * useTechniqueCounts). A count this panel has not been given is shown as
 * not known yet, with a button that computes it, rather than as a number
 * from the previous board.
 *
 * A Scan of the expensive tiers reports here too, rather than in a dialog
 * over the board the counts are about (issue #105). Its rows say they are
 * counting, each count arrives in the row and, when there is something to
 * find, at the top under "On this board"; the tier carries one line of
 * progress with a way to stop it, and one line saying what was found. The
 * result is announced once, when it is known, rather than row by row.
 *
 * The techniques that only hold when the puzzle has exactly one answer are
 * a case of their own. On a grid that has more than one, or whose count
 * never finished, they are not countable at all - so they are shown as
 * unavailable, with the reason, instead of as "none here", which would read
 * as "there is no pattern here" rather than "this cannot be used here".
 */

// The Search button wears its tier's colour, so the trial tier's button is
// not dressed as the proofs' (#75). Keyed off the catalog's colour, not off
// a tier's name.
const SEARCH_BUTTON = {
  fuchsia: 'bg-fuchsia-600 hover:bg-fuchsia-500',
  amber: 'bg-amber-600 hover:bg-amber-500',
};

const TIERS_OPEN_KEY = 'sudoku-mentor:technique-tiers-open';

export const readOpenTiers = () => {
  try {
    const raw = window.localStorage.getItem(TIERS_OPEN_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? parsed.filter((level) => typeof level === 'string') : [];
  } catch {
    return [];
  }
};

const writeOpenTiers = (levels) => {
  try {
    window.localStorage.setItem(TIERS_OPEN_KEY, JSON.stringify(levels));
  } catch {
    // remembering is a courtesy
  }
};

/** One technique: its name, what to call it elsewhere, and its count. */
function TechniqueRow({
  tech,
  count,
  showTier = false,
  countsOff,
  unavailable = null,
  pending = false,
  onSelectTechnique,
  onHighlight,
  onCount,
}) {
  const known = typeof count === 'number';
  const isSearch = tech.count === COUNT_SEARCH;
  return (
    <div className="flex items-baseline justify-between gap-2 py-0.5">
      <div className="min-w-0">
        <button
          onClick={() => onSelectTechnique(tech.name)}
          className="text-sm text-blue-400 hover:text-blue-300 hover:underline text-left"
          title={`How ${tech.name} works`}
        >
          {tech.short || tech.name}
        </button>
        {showTier && <span className="ml-2 text-xs text-slate-500">{tech.tier}</span>}
        {tech.formal && (
          <span className="block text-xs text-slate-500 truncate">also called {tech.formal}</span>
        )}
      </div>

      {countsOff || isSearch ? null : unavailable ? (
        <span className="shrink-0 text-xs text-slate-500 italic" title={unavailable}>
          not available here
        </span>
      ) : known && count > 0 ? (
        <button
          onClick={() => onHighlight(tech.name)}
          className="shrink-0 text-xs px-1.5 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded transition-colors"
          title={`Show ${count} instance${count === 1 ? '' : 's'} on the board`}
        >
          ({count})
        </button>
      ) : known ? (
        <span className="shrink-0 text-xs text-slate-500">none here</span>
      ) : pending ? (
        // A Scan is on its way to this row. Offering Count here would ask
        // the player to pay twice for the same number.
        <span className="shrink-0 text-xs text-slate-500">counting…</span>
      ) : (
        <button
          onClick={() => onCount(tech.name)}
          className="shrink-0 text-xs px-1.5 py-0.5 border border-slate-600 text-slate-300 hover:bg-slate-700 rounded transition-colors"
          title="Not counted yet. Count it on the board as it stands now."
        >
          Count
        </button>
      )}
    </div>
  );
}

export default function TechniquePanel({
  expanded,
  onToggleExpanded,
  noAssistMode,
  uniqueness = UNIQUENESS_UNKNOWN,
  counts = {},
  counting = false,
  scan = null,
  searchingForcingChain,
  onSelectTechnique,
  onHighlight,
  onCount,
  onUltimateScan,
  onWhatIfSearch,
  onShowInfo,
}) {
  const [query, setQuery] = useState('');
  const [openTiers, setOpenTiers] = useState(readOpenTiers);

  const toggleTier = (level) => {
    setOpenTiers((prev) => {
      const next = prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level];
      writeOpenTiers(next);
      return next;
    });
  };

  // No Assist earns a clean record, so nothing on this board may be counted.
  // Reading about a technique is not assistance and stays available.
  const countsOff = !!noAssistMode;

  // Why the uniqueness family is unavailable on this grid, or null when it
  // is fine. Reading how one works stays available either way.
  const uniquenessOff = !uniquenessAllowed(uniqueness);
  const whyUnavailable = (tech) =>
    uniquenessOff && needsUniqueness(tech.name) ? uniquenessShortNote(uniqueness) : null;

  // What a Scan is doing, in one line, and what it found, in one more.
  // Thirty-three rows of progress were the defect this replaced (#105), so
  // neither line grows with the catalog.
  const scanning = !!scan?.running;
  const scanned = !!scan && !scan.running && Array.isArray(scan.found);
  const foundCount = scanned ? scan.found.length : 0;
  // Only the result is announced, and only once it is known: a polite
  // region refreshed per detector would read the catalog out loud.
  const scanAnnouncement = (level) => {
    if (!scanned) return '';
    const where = scan.cancelled ? `Scan stopped at ${scan.done} of ${scan.total}.` : 'Scan finished.';
    if (foundCount === 0) {
      return scan.cancelled
        ? `${where} Nothing found before it stopped.`
        : `${where} Nothing in the ${level} tier applies to this board.`;
    }
    return (
      `${where} ${foundCount} of ${scan.total} ${level} technique${foundCount === 1 ? '' : 's'} ` +
      `appl${foundCount === 1 ? 'ies' : 'y'} to this board: ${scan.found.join(', ')}. ` +
      'They are listed under On this board, at the top of the Techniques panel.'
    );
  };

  // The techniques a Scan finds join "On this board" at the top of the
  // panel, which is the point of it - and which pushes the tier the player
  // pressed Scan in, with its progress line and its Cancel, down the page
  // under their eyes: 700 px of it at 1440x900, measured, which takes both
  // off the screen. So the scan's own line is kept in view for as long as
  // it has something to say. "nearest" moves nothing while the line is
  // still visible, and finds whatever is doing the scrolling by itself:
  // the page in a column, the sheet on a narrower width.
  const scanLine = useRef(/** @type {any} */ (null));
  const scanStep = scan?.running ? `counting ${scan.done}` : scanned ? 'done' : null;
  useEffect(() => {
    if (scanStep === null) return;
    scanLine.current?.scrollIntoView?.({ block: 'nearest' });
  }, [scanStep]);

  const applies = useMemo(
    () => (countsOff ? [] : TECHNIQUES.filter((tech) => counts[tech.name] > 0)),
    [counts, countsOff]
  );
  const matches = useMemo(() => matchTechniques(query), [query]);
  const filtering = query.trim().length > 0;

  const rowProps = {
    countsOff,
    onSelectTechnique,
    onHighlight,
    onCount,
  };

  return (
    <div className="bg-slate-900 rounded-2xl text-white border border-slate-700 overflow-hidden">
      <div className="flex items-center transition-colors hover:bg-slate-800/50">
        <button
          onClick={onToggleExpanded}
          aria-expanded={expanded}
          className="flex-1 min-w-0 p-5 pr-2 flex items-center justify-between gap-2 text-left"
        >
          <h4 className="text-lg font-semibold">Techniques</h4>
          {expanded ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </button>
        <button
          onClick={onShowInfo}
          className="p-2 mr-3 hover:bg-slate-700 rounded-lg transition-colors"
          title="Learn more"
          aria-label="About techniques"
        >
          <Info className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 border-t border-slate-800 pt-3 space-y-4">
              {/* Find one by name, without scrolling the ladder */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
                <input
                  // Not type="search": its own clear button would sit beside ours
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  aria-label="Find a technique by name"
                  placeholder="Find a technique"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2 pl-9 pr-9 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-slate-500"
                />
                {filtering && (
                  <button
                    onClick={() => setQuery('')}
                    aria-label="Clear the search"
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-700 rounded"
                  >
                    <X className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                )}
              </div>

              {countsOff && (
                <p className="text-xs text-slate-400">
                  No Assist is on, so nothing here is counted on your board. You can still read how
                  any technique works.
                </p>
              )}

              {filtering ? (
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">
                    {matches.length === 0
                      ? 'No technique by that name'
                      : `${matches.length} technique${matches.length === 1 ? '' : 's'} match`}
                  </p>
                  {matches.map((tech) => (
                    <TechniqueRow
                      key={tech.name}
                      tech={tech}
                      count={counts[tech.name]}
                      unavailable={whyUnavailable(tech)}
                      pending={scanning && tech.count === COUNT_SCAN}
                      showTier
                      {...rowProps}
                    />
                  ))}
                </div>
              ) : (
                <>
                  {/* What applies to this board, in teaching order */}
                  {!countsOff && (
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">On this board</p>
                      {/* Not a live region: a count that changes is not a
                          status message, and the whole list was being read
                          out again on every tier expand (issue #109). */}
                      <div>
                        {applies.length > 0 ? (
                          applies.map((tech) => (
                            <TechniqueRow
                              key={tech.name}
                              tech={tech}
                              count={counts[tech.name]}
                              showTier
                              {...rowProps}
                            />
                          ))
                        ) : counting || scanning ? (
                          <p className="text-sm text-slate-400">Checking the board…</p>
                        ) : scanned ? (
                          <p className="text-sm text-slate-400">
                            Nothing counted applies here, the tier you scanned included. Ask for a
                            hint, or try Search.
                          </p>
                        ) : (
                          <p className="text-sm text-slate-400">
                            Nothing counted so far applies here. Scan the Ultimate tier, or ask for a
                            hint.
                          </p>
                        )}
                      </div>
                      {applies.length > 0 && (counting || scanning) && (
                        <p className="text-xs text-slate-500 mt-1">Still checking the rest…</p>
                      )}
                    </div>
                  )}

                  {/* The whole ladder, collapsed, the player's place kept */}
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">
                      Everything the mentor knows
                    </p>
                    <div className="space-y-1">
                      {TIERS.map((tier) => {
                        const techniques = TECHNIQUES.filter((tech) => tech.tier === tier.level);
                        const open = openTiers.includes(tier.level);
                        const applying = countsOff
                          ? 0
                          : techniques.filter((tech) => counts[tech.name] > 0).length;
                        return (
                          <div key={tier.level}>
                            <button
                              onClick={() => toggleTier(tier.level)}
                              aria-expanded={open}
                              className="w-full flex items-center gap-2 py-1 text-left hover:bg-slate-800/50 rounded px-1 -mx-1"
                            >
                              {open ? (
                                <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
                              )}
                              <span
                                className={`w-2 h-2 rounded-full bg-gradient-to-br shrink-0 ${LEVEL_COLORS[tierColor(tier.level)]}`}
                              />
                              <span className="text-base font-medium text-slate-200">{tier.level}</span>
                              <span className="text-xs text-slate-500">
                                {techniques.length} technique{techniques.length === 1 ? '' : 's'}
                                {applying > 0 ? ` · ${applying} here` : ''}
                              </span>
                            </button>

                            {open && (
                              <div className="pl-7 pr-1 pb-2">
                                {uniquenessOff &&
                                  !countsOff &&
                                  techniques.some((tech) => needsUniqueness(tech.name)) && (
                                    <p className="text-xs text-slate-400 mb-2">
                                      {uniquenessNote(uniqueness)}
                                    </p>
                                  )}
                                {tier.scanNote && !countsOff && (
                                  <div className="mb-2">
                                    <p className="text-xs text-slate-400 mb-1">{tier.scanNote}</p>
                                    {/* One button, so the press that starts a
                                        Scan is the press that stops it and
                                        focus never leaves the control the
                                        player used (#105, #109). */}
                                    <button
                                      onClick={onUltimateScan}
                                      aria-busy={scanning}
                                      className={`px-2 py-1 ${
                                        scanning ? 'bg-slate-600 hover:bg-slate-500' : 'bg-violet-600 hover:bg-violet-500'
                                      } text-white text-xs rounded inline-flex items-center gap-1 transition-colors`}
                                      title={scanning ? 'Stop the scan' : 'Count every technique in this tier on the board as it stands now'}
                                    >
                                      {scanning ? (
                                        <span className="animate-spin rounded-full h-3 w-3 border-b border-white" aria-hidden="true" />
                                      ) : (
                                        <Search className="w-3 h-3" aria-hidden="true" />
                                      )}
                                      {scanning ? 'Cancel' : 'Scan this board'}
                                    </button>
                                    <p className="sr-only" role="status" aria-live="polite">
                                      {scanAnnouncement(tier.level)}
                                    </p>
                                    <div ref={scanLine}>
                                      {scanning && (
                                        <p className="text-xs text-slate-400 mt-1" data-testid="scan-progress">
                                          Counting… {scan.done} of {scan.total}.
                                        </p>
                                      )}
                                      {scanned && (
                                        <p className="text-xs text-slate-400 mt-1" data-testid="scan-result">
                                          {scan.cancelled && `Stopped at ${scan.done} of ${scan.total}. `}
                                          {foundCount === 0
                                            ? scan.cancelled
                                              ? 'Nothing found before it stopped.'
                                              : 'Nothing in this tier applies to this board.'
                                            : `${foundCount} of ${scan.total} appl${foundCount === 1 ? 'ies' : 'y'} to this board${
                                                scan.cancelled ? ' so far' : ''
                                              }, listed at the top under “On this board”.`}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                )}
                                {tier.searchNote && !countsOff && (
                                  <div className="mb-2">
                                    <p className="text-xs text-slate-400 mb-1">{tier.searchNote}</p>
                                    <button
                                      onClick={onWhatIfSearch}
                                      aria-busy={searchingForcingChain}
                                      className={`px-2 py-1 ${
                                        searchingForcingChain
                                          ? 'bg-slate-600 hover:bg-slate-500'
                                          : SEARCH_BUTTON[tierColor(tier.level)] ?? SEARCH_BUTTON.fuchsia
                                      } text-white text-xs rounded inline-flex items-center gap-1 transition-colors`}
                                      title={searchingForcingChain ? 'Stop the search' : 'Search this board (runs in the background)'}
                                    >
                                      {searchingForcingChain ? (
                                        <span className="animate-spin rounded-full h-3 w-3 border-b border-white" aria-hidden="true" />
                                      ) : (
                                        <Search className="w-3 h-3" aria-hidden="true" />
                                      )}
                                      {searchingForcingChain ? 'Cancel' : 'Search'}
                                    </button>
                                  </div>
                                )}
                                {techniques.map((tech) => (
                                  <TechniqueRow
                                    key={tech.name}
                                    tech={tech}
                                    count={counts[tech.name]}
                                    unavailable={whyUnavailable(tech)}
                                    pending={scanning && tech.count === COUNT_SCAN}
                                    {...rowProps}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
