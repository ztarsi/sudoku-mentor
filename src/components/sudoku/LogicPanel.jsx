import React, { useState, useMemo, useEffect, useRef } from 'react';
import TechniqueModal from './TechniqueModal';
import UltimateTechniqueScanModal from './UltimateTechniqueScanModal';
import DeepSearchModal from './DeepSearchModal';
import TechniqueHierarchy from './panel/TechniqueHierarchy';
import CurrentStepCard from './panel/CurrentStepCard';
import PanelInfoModal from './panel/PanelInfoModal';
import { findAllTechniqueInstances } from './logicEngine';
import { searchWhatIf, isCancelled, isTimedOut, DEEP_TIME_BUDGET_MS } from './whatIfSearch';
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

const SCANNABLE_TECHNIQUES = [
  'Naked Single', 'Hidden Single',
  'Pointing Pair', 'Pointing Triple', 'Claiming',
  'Naked Pair', 'Hidden Pair', 'Naked Triple',
  'X-Wing', 'Swordfish', 'XY-Wing',
];

const ULTIMATE_TECHNIQUES = [
  'X-Cycle',
  'Finned X-Wing',
  'ALS-XZ',
  'Unique Rectangle Type 1',
  'BUG+1',
];

/**
 * Right-hand panel orchestrator: composes the technique hierarchy, current
 * hint card, auto-solve controls, and shortcut reference, and owns the
 * cross-cutting state (scans, deep search, auto-play timers).
 */
export default function LogicPanel({
  currentStep,
  grid,
  noAssistMode,
  onHighlightTechnique,
  onNextStep,
  onChainPlaybackChange,
  chainPlaybackIndex,
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
}) {
  const [selectedTechnique, setSelectedTechnique] = useState(null);
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
  const [showUltimateScan, setShowUltimateScan] = useState(false);
  const [scanningTechnique, setScanningTechnique] = useState(null);
  const [scanResults, setScanResults] = useState({});
  const [searchingForcingChain, setSearchingForcingChain] = useState(false);
  const [showDeepSearchModal, setShowDeepSearchModal] = useState(false);
  const [currentSearchDepth, setCurrentSearchDepth] = useState(10);
  const [isPlayingChain, setIsPlayingChain] = useState(false);

  // Ultimate scan counts describe one grid; drop them when it changes, and
  // let a scan still running for the old grid know it is stale.
  const gridRef = useRef(grid);
  useEffect(() => {
    gridRef.current = grid;
    setScanResults({});
  }, [grid]);

  // Live technique counts, scans and searches are assistance: a No Assist
  // record must not be earned with them on screen.
  const onAssistUsedRef = useRef(onAssistUsed);
  onAssistUsedRef.current = onAssistUsed;
  useEffect(() => {
    if (techniqueExpanded && !noAssistMode) onAssistUsedRef.current?.();
  }, [techniqueExpanded, noAssistMode, grid]);

  // Count occurrences of each technique (excluding ultimate for performance).
  // Only scan while the hierarchy section is actually visible - these 11
  // full-grid scans used to run on every candidate toggle even collapsed,
  // which was the main source of input lag.
  const techniqueCounts = useMemo(() => {
    if (!techniqueExpanded || noAssistMode) return {};
    const counts = {};
    SCANNABLE_TECHNIQUES.forEach((tech) => {
      counts[tech] = findAllTechniqueInstances(grid, tech).length;
    });

    if (Object.keys(scanResults).length > 0) {
      ULTIMATE_TECHNIQUES.forEach((tech) => {
        counts[tech] = scanResults[tech] || 0;
      });
    }

    return counts;
  }, [grid, scanResults, techniqueExpanded, noAssistMode]);

  const handleUltimateScan = async () => {
    onAssistUsedRef.current?.();
    setShowUltimateScan(true);
    setScanResults({});

    const scanned = grid;
    const results = {};
    for (const tech of ULTIMATE_TECHNIQUES) {
      setScanningTechnique(tech);
      await new Promise((resolve) => setTimeout(resolve, 100)); // Small delay for UI update
      if (gridRef.current !== scanned) break; // the board changed: these counts would lie

      results[tech] = findAllTechniqueInstances(scanned, tech).length;
      setScanResults({ ...results });
    }

    setScanningTechnique(null);
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

  const performDeepSearch = async (depth) => {
    onAssistUsedRef.current?.();
    searchRef.current?.cancel();
    const search = searchWhatIf(grid, depth, { timeBudgetMs: DEEP_TIME_BUDGET_MS });
    searchRef.current = search;
    setSearchingForcingChain(true);
    try {
      return await search.promise;
    } catch (error) {
      if (isTimedOut(error)) {
        toast({ title: 'Search ran out of time', description: `No chain found within ${DEEP_TIME_BUDGET_MS / 1000} s at depth ${depth}. The board is unusually hard for what-if search from here.` });
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
    setCurrentSearchDepth(100);
    const result = await performDeepSearch(100);
    if (result === undefined) return;

    if (result) {
      onHighlightTechnique([result], 1, 1);
    } else {
      setShowDeepSearchModal(true);
    }
  };

  const handleGoDeeper = async () => {
    const newDepth = currentSearchDepth + 10;
    setCurrentSearchDepth(newDepth);
    const result = await performDeepSearch(newDepth);
    if (result === undefined) return;

    if (result) {
      setShowDeepSearchModal(false);
      onHighlightTechnique([result], 1, 1);
    }
    // else: keep the modal open so the user can go even deeper
  };

  // Chain playback animation
  useEffect(() => {
    if (isPlayingChain && currentStep?.chain) {
      const maxSteps = currentStep.chain.filter((s) => s.action === 'place').length;
      if (chainPlaybackIndex < maxSteps - 1) {
        const timer = setTimeout(() => {
          onChainPlaybackChange?.(chainPlaybackIndex + 1);
        }, 800);
        return () => clearTimeout(timer);
      } else {
        setIsPlayingChain(false);
      }
    }
  }, [isPlayingChain, chainPlaybackIndex, currentStep, onChainPlaybackChange]);

  // Reset playback when currentStep changes
  useEffect(() => {
    onChainPlaybackChange?.(0);
    setIsPlayingChain(false);
  }, [currentStep, onChainPlaybackChange]);

  const handleTechniqueClick = (techniqueName) => {
    const instances = findAllTechniqueInstances(grid, techniqueName);
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
        onSelectTechnique={setSelectedTechnique}
        chainPlaybackIndex={chainPlaybackIndex}
        onChainPlaybackChange={onChainPlaybackChange}
        isPlayingChain={isPlayingChain}
        onToggleChainPlayback={() => {
          if (!isPlayingChain) {
            setIsPlayingChain(true);
            onChainPlaybackChange?.(0);
          } else {
            setIsPlayingChain(false);
          }
        }}
      />

      <TechniqueHierarchy
        expanded={techniqueExpanded}
        onToggleExpanded={toggleTechniques}
        noAssistMode={noAssistMode}
        techniqueCounts={techniqueCounts}
        searchingForcingChain={searchingForcingChain}
        onSelectTechnique={setSelectedTechnique}
        onTechniqueClick={handleTechniqueClick}
        onUltimateScan={handleUltimateScan}
        onWhatIfSearch={handleWhatIfSearch}
        onShowInfo={() => setShowInfoModal('techniques')}
      />


      {selectedTechnique && (
        <TechniqueModal
          technique={selectedTechnique}
          onClose={() => setSelectedTechnique(null)}
        />
      )}

      <UltimateTechniqueScanModal
        isOpen={showUltimateScan}
        currentTechnique={scanningTechnique}
        results={scanResults}
        onClose={() => setShowUltimateScan(false)}
      />

      <DeepSearchModal
        isOpen={showDeepSearchModal}
        onClose={() => {
          cancelSearch();
          setShowDeepSearchModal(false);
          setCurrentSearchDepth(100);
        }}
        onCancel={cancelSearch}
        onGoDeeper={handleGoDeeper}
        currentDepth={currentSearchDepth}
        isSearching={searchingForcingChain}
      />

      <PanelInfoModal topic={showInfoModal} onClose={() => setShowInfoModal(null)} />
    </div>
  );
}
