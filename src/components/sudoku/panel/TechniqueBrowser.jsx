import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X } from 'lucide-react';
import {
  LEVEL_COLORS,
  TECHNIQUES,
  TIERS,
  matchTechniques,
  needsUniqueness,
  tierColor,
} from '../techniqueCatalog';
import { UNIQUENESS_UNKNOWN, uniquenessAllowed } from '../uniqueness';
import { useDialog } from '@/hooks/useDialog';

/**
 * The reference, opened to browse: every technique the mentor knows, by
 * tier, in columns.
 *
 * This surface exists because the panel beside the board is the wrong
 * container for an index (#122). The panel is as wide as a column of text
 * and is read while a puzzle is waiting, so a list in it competes with the
 * board; shortening that list does not make it the right place, it only
 * makes it a shorter wrong place. A dialog has the width for three columns,
 * it is opened by someone whose intent is to browse, and nothing is behind
 * it that they are in the middle of.
 *
 * So the panel keeps what is on the board and this keeps the catalog. The
 * ladder's shape is the thing worth seeing here, which is why the tiers are
 * headings with their own colour and a filter of their own rather than a
 * flat alphabet.
 *
 * What is on the player's board is marked, because a reader who came from
 * the panel is still playing a puzzle - but only the techniques that are
 * there are marked, and how many of them there are is said once at the top.
 * Absence is not printed per row here either; that was the defect that sent
 * browsing to this dialog in the first place.
 */
export default function TechniqueBrowser({
  browse = null,
  counts = {},
  noAssistMode = false,
  uniqueness = UNIQUENESS_UNKNOWN,
  onSelectTechnique,
  onClose,
}) {
  const open = !!browse;
  const dialog = useDialog({ open, onClose, initialFocus: 'input' });
  const [query, setQuery] = useState('');
  const [tier, setTier] = useState(/** @type {string | null} */ (null));

  // Opened at a tier, or at a query the panel's filter had: the dialog
  // starts where the player left off rather than at the top of the ladder.
  useEffect(() => {
    if (!browse) return;
    setQuery(browse.query ?? '');
    setTier(browse.tier ?? null);
  }, [browse]);

  const countsOff = !!noAssistMode;
  const uniquenessOff = !uniquenessAllowed(uniqueness);
  const countOf = (tech) =>
    countsOff || (uniquenessOff && needsUniqueness(tech.name)) ? undefined : counts[tech.name];

  const matches = useMemo(() => matchTechniques(query), [query]);
  const filtering = query.trim().length > 0;
  const shown = useMemo(
    () => (tier ? matches.filter((tech) => tech.tier === tier) : matches),
    [matches, tier]
  );
  // One line for what the reader has on their board, so a count is never
  // the reason to scan the whole list.
  const hereCount = shown.filter((tech) => countOf(tech) > 0).length;

  // Tiers in ladder order, each with however many of it the filter left.
  const groups = useMemo(
    () =>
      TIERS.map((level) => ({
        ...level,
        techniques: shown.filter((tech) => tech.tier === level.level),
      })).filter((group) => group.techniques.length > 0),
    [shown]
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            onClick={(e) => e.stopPropagation()}
            ref={dialog.ref}
            {...dialog.props}
            aria-label="Technique reference"
            className="bg-slate-900 rounded-2xl shadow-2xl border border-slate-700 w-full max-w-4xl max-h-[90dvh] flex flex-col text-white"
          >
            <div className="border-b border-slate-700 p-5 pb-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-xl font-semibold">Technique reference</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {TECHNIQUES.length} techniques, easiest first. Tap one to read how it works.
                  </p>
                </div>
                <button
                  onClick={onClose}
                  aria-label="Close"
                  className="shrink-0 p-2 -m-1 hover:bg-slate-800 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <div className="relative">
                <Search
                  className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2"
                  aria-hidden="true"
                />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  aria-label="Search the reference"
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

              {/* One chip per tier: eight controls whatever the catalog
                  does, because the ladder has tiers and not techniques. */}
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setTier(null)}
                  aria-pressed={tier === null}
                  className={`px-2 py-1 rounded-full text-xs transition-colors ${
                    tier === null
                      ? 'bg-slate-700 text-white'
                      : 'bg-slate-800/60 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  All tiers
                </button>
                {TIERS.map((level) => (
                  <button
                    key={level.level}
                    onClick={() => setTier(level.level)}
                    aria-pressed={tier === level.level}
                    className={`px-2 py-1 rounded-full text-xs inline-flex items-center gap-1.5 transition-colors ${
                      tier === level.level
                        ? 'bg-slate-700 text-white'
                        : 'bg-slate-800/60 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full bg-gradient-to-br shrink-0 ${LEVEL_COLORS[tierColor(level.level)]}`}
                    />
                    {level.level}
                  </button>
                ))}
              </div>

              <p className="text-xs text-slate-400" data-testid="reference-summary">
                {shown.length === 0
                  ? 'No technique by that name.'
                  : `Showing ${shown.length} technique${shown.length === 1 ? '' : 's'}.`}
                {countsOff
                  ? ' No Assist is on, so nothing here is counted on your board.'
                  : hereCount > 0
                    ? ` ${hereCount} ${hereCount === 1 ? 'is' : 'are'} on your board right now.`
                    : ''}
              </p>
            </div>

            <div className="overflow-y-auto p-5 pt-4 space-y-5">
              {groups.map((group) => (
                <div key={group.level}>
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`w-2 h-2 rounded-full bg-gradient-to-br shrink-0 ${LEVEL_COLORS[tierColor(group.level)]}`}
                    />
                    <h3 className="text-base font-medium text-slate-200">{group.level}</h3>
                    <span className="text-xs text-slate-500">
                      {group.techniques.length} technique{group.techniques.length === 1 ? '' : 's'}
                    </span>
                  </div>
                  {/* Columns are why browsing lives here and not in the
                      panel: the same names cost a third of the height. */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-0.5">
                    {group.techniques.map((tech) => {
                      const count = countOf(tech);
                      return (
                        <button
                          key={tech.name}
                          onClick={() => onSelectTechnique(tech.name)}
                          title={`How ${tech.name} works`}
                          className="group flex items-start justify-between gap-2 min-w-0 w-full text-left rounded px-2 -mx-2 py-1 hover:bg-slate-800/60 transition-colors"
                        >
                          <span className="min-w-0">
                            <span className="text-sm text-blue-400 group-hover:text-blue-300">
                              {tech.short || tech.name}
                            </span>
                            {tech.formal && (
                              <span
                                className="block text-xs text-slate-500 truncate"
                                title={tech.formal}
                              >
                                also called {tech.formal}
                              </span>
                            )}
                          </span>
                          {count > 0 && (
                            <span className="shrink-0 text-xs text-emerald-400 tabular-nums">
                              {count} here
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-700 p-4">
              <button
                onClick={onClose}
                className="w-full px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl transition-colors"
              >
                Back to the board
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
