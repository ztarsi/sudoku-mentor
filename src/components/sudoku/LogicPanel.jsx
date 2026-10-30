import React, { useState, useEffect, useMemo, useRef } from 'react';
import TechniqueModal from './TechniqueModal';
import DeepSearchModal from './DeepSearchModal';
import TechniquePanel from './panel/TechniquePanel';
import TechniqueBrowser from './panel/TechniqueBrowser';
import CurrentStepCard from './panel/CurrentStepCard';
import PanelInfoModal from './panel/PanelInfoModal';
import { findAllTechniqueInstances } from './logicEngine';
import { useTechniqueCounts } from './useTechniqueCounts';
import { runInSlices } from './sliceRunner';
import { COUNT_LIVE, SCAN_TECHNIQUES, TECHNIQUES, TIERS, needsUniqueness } from './techniqueCatalog';
import { UNIQUENESS_UNKNOWN, uniquenessAllowed } from './uniqueness';
import { searchWhatIf, isCancelled, isTimedOut, DEEP_TIME_BUDGET_MS } from './whatIfSearch';
import { NET_DEPTH } from './searchLimits';
import { toast } from '@/components/ui/use-toast';

const TECHNIQUES_OPEN_KEY = 'sudoku-mentor:techniques-open';
const readTechniquesOpen = () => {
  try {
    return window.localStorage.getItem(TECHNIQUES_OPEN_KEY) === '1';
  } catch {
    return false;
  }
};
const writeTechniquesOpen = (open) => {
  try {
    window.localStorage.setItem(TECHNIQUES_OPEN_KEY, open ? '1' : '0');
  } catch {
    // remembering is a courtesy
  }
};

/**
 * Right-hand panel orchestrator: composes the current hint card and the
 * Techniques list, and owns the cross-cutting state (technique counts,
 * scans, deep search, chain playback).
 */
export default function LogicPanel({
  currentStep,
  grid,
  uniqueness = UNIQUENESS_UNKNOWN,
  noAssistMode,
  onHighlightTechnique,
  onNextStep,
  searchingHint = false,
  onCancelHintSearch,
  onAssistUsed,
  onApplyStep,
  solved = null,
  lessonLog = [],
  onNextPuzzle,
  canGoUp = true,
  nothingLeft = false,
  onShowSingle,
  getElapsedSeconds,
  hintPrompt = null,
  cardPrompt = null,
}) {
  const [selectedTechnique, setSelectedTechnique] = useState(null);
  // Browsing the catalog happens in the reference dialog rather than in the
  // column beside the board (#122). Null when it is closed; otherwise where
  // the panel asked for it to open: a tier, a query, or neither.
  const [browse, setBrowse] = useState(/** @type {any} */ (null));
  // The lesson comes first; the technique browser is an expert tool,
  // collapsed by default and remembered per player.
  const [techniqueExpanded, setTechniqueExpanded] = useState(readTechniquesOpen);
  const toggleTechniques = () => {
    setTechniqueExpanded((v) => {
      writeTechniquesOpen(!v);
      return !v;
    });
  };
  const [techniqueIndices, setTechniqueIndices] = useState({});
  const [showInfoModal, setShowInfoModal] = useState(null);
  // What a Scan is doing, or what the last one found, for the panel to
  // report. Null when no Scan has been asked for on this board.
  const [scan, setScan] = useState(null);
  const [searchingForcingChain, setSearchingForcingChain] = useState(false);
  const [showDeepSearchModal, setShowDeepSearchModal] = useState(false);

  // A scan describes one board. When the board changes, its results are
  // dropped, and a scan still running for the old grid has to know it is
  // stale: its counts would describe a board the player has left behind.
  const gridRef = useRef(grid);
  const scanRun = useRef(/** @type {any} */ (null));
  useEffect(() => {
    gridRef.current = grid;
    scanRun.current?.cancel?.();
    scanRun.current = null;
    setScan(null);
  }, [grid]);
  useEffect(() => () => scanRun.current?.cancel?.(), []);

  // Live technique counts, scans and searches are assistance: a No Assist
  // record must not be earned with them on screen.
  const onAssistUsedRef = useRef(onAssistUsed);
  onAssistUsedRef.current = onAssistUsed;
  useEffect(() => {
    if (techniqueExpanded && !noAssistMode) onAssistUsedRef.current?.();
  }, [techniqueExpanded, noAssistMode, grid]);

  // Counts for the cheap tiers, computed after the board has been still for
  // a moment and in slices a further change cancels, so entering a digit
  // never waits for a detector. The expensive tiers are counted only when
  // the player asks: by tapping one row's Count, or by scanning the tier.
  // Nothing in the uniqueness family may be counted, scanned or shown on a
  // grid that is not known to have exactly one answer. The panel says why
  // instead of printing a row of zeroes.
  const uniquenessOn = uniquenessAllowed(uniqueness);
  const countable = (name) => uniquenessOn || !needsUniqueness(name);

  // The live tiers, easiest first, as groups rather than as one list: the
  // pass stops at the first tier that has something, because a count of a
  // harder technique taken while an easier move is on the board is four
  // times out of five a count of patterns that will not survive the move
  // (#128). The tiers after it are not counted and say why.
  const liveTiers = useMemo(
    () =>
      TIERS.map((tier) => ({
        tier: tier.level,
        names: TECHNIQUES.filter(
          (tech) =>
            tech.tier === tier.level &&
            tech.count === COUNT_LIVE &&
            (uniquenessOn || !needsUniqueness(tech.name))
        ).map((tech) => tech.name),
      })).filter((group) => group.names.length > 0),
    [uniquenessOn]
  );

  const { counts: techniqueCounts, counting, countNow, countTier, recordCounts } = useTechniqueCounts(
    grid,
    {
      enabled: techniqueExpanded && !noAssistMode,
      groups: liveTiers,
      uniqueness,
    }
  );

  /** Count a tier the gate is holding back, because the player asked. */
  const handleCountTier = (level) => {
    onAssistUsedRef.current?.();
    countTier(liveTiers.find((group) => group.tier === level)?.names ?? []);
  };

  // A Scan answers "what is on this board?" for the tiers that cost too
  // much to count live. It reports into the panel, beside the counts the
  // cheap tiers already put there, so the board the counts are about stays
  // on screen: the rows show that they are counting, each count joins the
  // panel as it arrives, and the ones with instances appear at the top
  // under "On this board" with the highlighting that already works there.
  // The player sees one line of progress and can stop it.
  //
  // The work runs in slices, so nothing is paced for the look of it and the
  // page is handed back between detectors. A board change invalidates the
  // run, as it always has: those counts would describe a board the player
  // has left behind.
  const finishScan = (run, cancelled) => {
    if (scanRun.current === run) scanRun.current = null;
    setScan((prev) =>
      prev && prev.grid === run.grid
        ? { ...prev, running: false, cancelled, found: run.names.filter((name) => run.results[name] > 0) }
        : prev
    );
  };

  const cancelScan = () => {
    const run = scanRun.current;
    if (!run) return;
    run.cancel?.();
    finishScan(run, true);
  };

  const handleUltimateScan = () => {
    if (scanRun.current) {
      cancelScan();
      return;
    }
    onAssistUsedRef.current?.();

    const scanned = grid;
    const names = SCAN_TECHNIQUES.filter(countable);
    const run = { grid: scanned, names, results: {}, cancel: null };
    scanRun.current = run;
    setScan({ grid: scanned, total: names.length, done: 0, running: true, cancelled: false, found: null });

    run.cancel = runInSlices(
      names.map((name) => ({
        key: name,
        run: () => findAllTechniqueInstances(scanned, name, { uniqueness }).length,
      })),
      (name, count) => {
        if (gridRef.current !== scanned) return; // the board changed: this count would lie
        run.results[name] = count;
        recordCounts({ [name]: count });
        setScan((prev) => (prev && prev.grid === scanned ? { ...prev, done: prev.done + 1 } : prev));
      },
      { delayMs: 0, onDone: () => finishScan(run, false) }
    );
  };

  // What-if search (forcing chains, then hypothesis) runs in a worker so
  // the page never freezes; Cancel terminates it.
  const searchRef = useRef(null);
  const cancelSearch = () => {
    searchRef.current?.cancel();
    searchRef.current = null;
    setSearchingForcingChain(false);
  };
  useEffect(() => () => searchRef.current?.cancel(), []);

  const performDeepSearch = async () => {
    onAssistUsedRef.current?.();
    searchRef.current?.cancel();
    const search = searchWhatIf(grid, { timeBudgetMs: DEEP_TIME_BUDGET_MS });
    searchRef.current = search;
    setSearchingForcingChain(true);
    try {
      return await search.promise;
    } catch (error) {
      if (isTimedOut(error)) {
        toast({ title: 'Search ran out of time', description: `Nothing found within ${DEEP_TIME_BUDGET_MS / 1000} s. The board is unusually hard to search from here.` });
      } else if (!isCancelled(error)) {
        console.error('What-if search failed', error);
      }
      return undefined; // cancelled, timed out or failed: caller does nothing
    } finally {
      if (searchRef.current === search) {
        searchRef.current = null;
        setSearchingForcingChain(false);
      }
    }
  };

  const handleWhatIfSearch = async () => {
    if (searchRef.current) {
      cancelSearch();
      return;
    }
    const result = await performDeepSearch();
    if (result === undefined) return;

    if (result) {
      onHighlightTechnique([result], 1, 1);
    } else {
      // Nothing to be found inside the net's stated depth. There is no
      // "deeper" to offer: a search without a limit is a solver, not a
      // mentor (#75), so the dialog says where the search stopped.
      setShowDeepSearchModal(true);
    }
  };

  const handleTechniqueClick = (techniqueName) => {
    const instances = findAllTechniqueInstances(grid, techniqueName, { uniqueness });
    if (instances.length > 0 && onHighlightTechnique) {
      // Get current index for this technique (or start at 0), ensure it's valid
      let currentIndex = techniqueIndices[techniqueName] || 0;
      if (currentIndex >= instances.length) {
        currentIndex = 0;
      }
      const nextIndex = (currentIndex + 1) % instances.length;

      setTechniqueIndices((prev) => ({
        ...prev,
        [techniqueName]: nextIndex,
      }));

      // Show only the current instance
      onHighlightTechnique([instances[currentIndex]], instances.length, currentIndex + 1);
    }
  };

  return (
    <div className="space-y-4">
      <CurrentStepCard
        currentStep={currentStep}
        grid={grid}
        noAssistMode={noAssistMode}
        onNextStep={onNextStep}
        onApplyStep={onApplyStep}
        searching={searchingHint}
        onCancelSearch={onCancelHintSearch}
        solved={solved}
        lessonLog={lessonLog}
        onNextPuzzle={onNextPuzzle}
        canGoUp={canGoUp}
        nothingLeft={nothingLeft}
        onShowSingle={onShowSingle}
        getElapsedSeconds={getElapsedSeconds}
        hintPrompt={hintPrompt}
        cardPrompt={cardPrompt}
        onSelectTechnique={setSelectedTechnique}
      />

      <TechniquePanel
        expanded={techniqueExpanded}
        onToggleExpanded={toggleTechniques}
        noAssistMode={noAssistMode}
        uniqueness={uniqueness}
        counts={techniqueCounts}
        counting={counting}
        scan={scan}
        searchingForcingChain={searchingForcingChain}
        onSelectTechnique={setSelectedTechnique}
        onHighlight={handleTechniqueClick}
        onBrowse={setBrowse}
        onCountTier={handleCountTier}
        onUltimateScan={handleUltimateScan}
        onWhatIfSearch={handleWhatIfSearch}
        onShowInfo={() => setShowInfoModal('techniques')}
      />


      <TechniqueBrowser
        browse={browse}
        counts={techniqueCounts}
        noAssistMode={noAssistMode}
        uniqueness={uniqueness}
        onSelectTechnique={setSelectedTechnique}
        onClose={() => setBrowse(null)}
      />

      {selectedTechnique && (
        <TechniqueModal
          technique={selectedTechnique}
          count={techniqueCounts[selectedTechnique]}
          noAssistMode={noAssistMode}
          uniqueness={uniqueness}
          onCount={countNow}
          onClose={() => setSelectedTechnique(null)}
        />
      )}

      <DeepSearchModal
        isOpen={showDeepSearchModal}
        onClose={() => {
          cancelSearch();
          setShowDeepSearchModal(false);
        }}
        onCancel={cancelSearch}
        netDepth={NET_DEPTH}
        isSearching={searchingForcingChain}
      />

      <PanelInfoModal topic={showInfoModal} onClose={() => setShowInfoModal(null)} />
    </div>
  );
}
