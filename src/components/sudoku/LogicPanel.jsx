import React, { useState, useMemo, useEffect, useRef } from 'react';
import TechniqueModal from './TechniqueModal';
import UltimateTechniqueScanModal from './UltimateTechniqueScanModal';
import DeepSearchModal from './DeepSearchModal';
import TechniqueHierarchy from './panel/TechniqueHierarchy';
import CurrentStepCard from './panel/CurrentStepCard';
import AutoSolveControls from './panel/AutoSolveControls';
import KeyboardShortcutsCard from './panel/KeyboardShortcutsCard';
import PanelInfoModal from './panel/PanelInfoModal';
import { findAllTechniqueInstances } from './logicEngine';
import { findForcingChain, findHypothesis } from './forcingChainEngine';

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
  focusedDigit,
  grid,
  noAssistMode,
  onHighlightTechnique,
  onApplyStep,
  onNextStep,
  onChainPlaybackChange,
  chainPlaybackIndex,
}) {
  const [selectedTechnique, setSelectedTechnique] = useState(null);
  const [techniqueExpanded, setTechniqueExpanded] = useState(true);
  const [techniqueIndices, setTechniqueIndices] = useState({});
  const [showInfoModal, setShowInfoModal] = useState(null);
  const [showUltimateScan, setShowUltimateScan] = useState(false);
  const [scanningTechnique, setScanningTechnique] = useState(null);
  const [scanResults, setScanResults] = useState({});
  const [searchingForcingChain, setSearchingForcingChain] = useState(false);
  const [showDeepSearchModal, setShowDeepSearchModal] = useState(false);
  const [currentSearchDepth, setCurrentSearchDepth] = useState(10);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(1000); // milliseconds per step
  const [isPlayingChain, setIsPlayingChain] = useState(false);
  const playIntervalRef = useRef(null);

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
    setShowUltimateScan(true);
    setScanResults({});

    const results = {};
    for (const tech of ULTIMATE_TECHNIQUES) {
      setScanningTechnique(tech);
      await new Promise((resolve) => setTimeout(resolve, 100)); // Small delay for UI update

      results[tech] = findAllTechniqueInstances(grid, tech).length;
      setScanResults({ ...results });
    }

    setScanningTechnique(null);
  };

  const performDeepSearch = async (depth) => {
    // Try logical forcing chains first (convergence-based), then fall back
    // to hypothesis mode (contradiction-based)
    /** @type {any} */
    let result = findForcingChain(grid, depth);
    if (!result) {
      result = findHypothesis(grid, depth);
    }
    return result;
  };

  const handleWhatIfSearch = async () => {
    setSearchingForcingChain(true);
    setCurrentSearchDepth(100);
    await new Promise((resolve) => setTimeout(resolve, 100));

    const result = await performDeepSearch(100);
    setSearchingForcingChain(false);

    if (result) {
      onHighlightTechnique([result], 1, 1);
    } else {
      setShowDeepSearchModal(true);
    }
  };

  const handleGoDeeper = async () => {
    const newDepth = currentSearchDepth + 10;
    setCurrentSearchDepth(newDepth);
    setSearchingForcingChain(true);
    await new Promise((resolve) => setTimeout(resolve, 100));

    const result = await performDeepSearch(newDepth);
    setSearchingForcingChain(false);

    if (result) {
      setShowDeepSearchModal(false);
      onHighlightTechnique([result], 1, 1);
    }
    // else: keep the modal open so the user can go even deeper
  };

  const handlePlayPause = () => {
    if (isPlaying) {
      setIsPlaying(false);
      if (playIntervalRef.current) {
        clearTimeout(playIntervalRef.current);
        playIntervalRef.current = null;
      }
    } else {
      setIsPlaying(true);
      if (!currentStep) {
        onNextStep?.();
      }
    }
  };

  const handleSkipStep = () => {
    if (currentStep) {
      onApplyStep?.();
    }
    setTimeout(() => onNextStep?.(), 50);
  };

  useEffect(() => {
    return () => {
      if (playIntervalRef.current) {
        clearTimeout(playIntervalRef.current);
      }
    };
  }, []);

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

  // Track the live currentStep so timeouts can check the CURRENT value.
  // (Checking the closure's `currentStep` inside a timeout always saw the
  // step captured when the effect ran, so auto-play could never detect
  // "no more steps" and kept spinning forever.)
  const currentStepRef = useRef(currentStep);
  currentStepRef.current = currentStep;

  useEffect(() => {
    if (!isPlaying) return undefined;

    if (currentStep) {
      playIntervalRef.current = setTimeout(() => {
        onApplyStep?.();
        setTimeout(() => onNextStep?.(), 100);
      }, playSpeed);
    } else {
      // Playing but no step: give onNextStep a moment to produce one,
      // then stop if the engine is out of moves.
      playIntervalRef.current = setTimeout(() => {
        if (!currentStepRef.current) {
          setIsPlaying(false);
        }
      }, Math.max(playSpeed, 800));
    }

    return () => {
      if (playIntervalRef.current) {
        clearTimeout(playIntervalRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, currentStep, playSpeed]);

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
      <TechniqueHierarchy
        expanded={techniqueExpanded}
        onToggleExpanded={() => setTechniqueExpanded((v) => !v)}
        noAssistMode={noAssistMode}
        techniqueCounts={techniqueCounts}
        searchingForcingChain={searchingForcingChain}
        onSelectTechnique={setSelectedTechnique}
        onTechniqueClick={handleTechniqueClick}
        onUltimateScan={handleUltimateScan}
        onWhatIfSearch={handleWhatIfSearch}
        onShowInfo={() => setShowInfoModal('techniques')}
      />

      <CurrentStepCard
        currentStep={currentStep}
        focusedDigit={focusedDigit}
        noAssistMode={noAssistMode}
        onNextStep={onNextStep}
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

      <AutoSolveControls
        isPlaying={isPlaying}
        onPlayPause={handlePlayPause}
        onSkipStep={handleSkipStep}
        playSpeed={playSpeed}
        onSpeedChange={setPlaySpeed}
        noAssistMode={noAssistMode}
      />

      <KeyboardShortcutsCard onShowInfo={() => setShowInfoModal('shortcuts')} />

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
          setShowDeepSearchModal(false);
          setCurrentSearchDepth(100);
        }}
        onGoDeeper={handleGoDeeper}
        currentDepth={currentSearchDepth}
        isSearching={searchingForcingChain}
      />

      <PanelInfoModal topic={showInfoModal} onClose={() => setShowInfoModal(null)} />
    </div>
  );
}
