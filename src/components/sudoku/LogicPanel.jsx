import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Lightbulb, 
  Target, 
  Zap, 
  BookOpen,
  ChevronRight,
  Info,
  ChevronDown,
  ChevronUp,
  Search,
  Play,
  Pause,
  SkipForward
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import TechniqueModal from './TechniqueModal';
import UltimateTechniqueScanModal from './UltimateTechniqueScanModal';
import DeepSearchModal from './DeepSearchModal';
import { findAllTechniqueInstances, findNextLogicStep } from './logicEngine';
import { findForcingChain, findHypothesis } from './forcingChainEngine';

const TECHNIQUE_INFO = {
  'Naked Single': {
    level: 'Basic',
    color: 'emerald',
    description: 'A cell has only one possible candidate remaining.',
    icon: Target
  },
  'Hidden Single': {
    level: 'Basic',
    color: 'emerald',
    description: 'A candidate appears only once in a row, column, or box.',
    icon: Target
  },
  'Pointing Pair': {
    level: 'Intermediate',
    color: 'blue',
    description: 'Candidates in a box align in a row/column, eliminating candidates outside the box.',
    icon: Zap
  },
  'Pointing Triple': {
    level: 'Intermediate',
    color: 'blue',
    description: 'Three candidates in a box align in a row/column.',
    icon: Zap
  },
  'Claiming': {
    level: 'Intermediate',
    color: 'blue',
    description: 'Candidates in a row/column are confined to one box.',
    icon: Zap
  },
  'Naked Pair': {
    level: 'Advanced',
    color: 'purple',
    description: 'Two cells in a unit have the same two candidates.',
    icon: BookOpen
  },
  'Hidden Pair': {
    level: 'Advanced',
    color: 'purple',
    description: 'Two candidates appear only in two cells of a unit.',
    icon: BookOpen
  },
  'Naked Triple': {
    level: 'Advanced',
    color: 'purple',
    description: 'Three cells share three candidates between them.',
    icon: BookOpen
  },
  'X-Wing': {
    level: 'Expert',
    color: 'orange',
    description: 'A candidate forms a rectangle pattern, allowing eliminations.',
    icon: Lightbulb
  },
  'Swordfish': {
    level: 'Expert',
    color: 'orange',
    description: 'An X-Wing extended to three rows and columns.',
    icon: Lightbulb
  },
  'XY-Wing': {
    level: 'Expert',
    color: 'orange',
    description: 'Three bi-value cells form a chain for eliminations.',
    icon: Lightbulb
  },
  'X-Cycle': {
    level: 'Ultimate',
    color: 'violet',
    description: 'Chain-based coloring technique using strong links.',
    icon: Lightbulb
  },
  'Finned X-Wing': {
    level: 'Ultimate',
    color: 'violet',
    description: 'X-Wing pattern with additional fin cells.',
    icon: Lightbulb
  },
  'ALS-XZ': {
    level: 'Ultimate',
    color: 'violet',
    description: 'Almost Locked Sets with restricted common digits.',
    icon: Lightbulb
  },
  'Unique Rectangle Type 1': {
    level: 'Ultimate',
    color: 'violet',
    description: 'Avoids deadly patterns with multiple solutions.',
    icon: Lightbulb
  },
  'BUG+1': {
    level: 'Ultimate',
    color: 'violet',
    description: 'Bivalue Universal Grave plus one tri-value cell.',
    icon: Lightbulb
  }
};

export default function LogicPanel({ currentStep, focusedDigit, grid, onHighlightTechnique, onApplyStep, onNextStep }) {
  const [selectedTechnique, setSelectedTechnique] = useState(null);
  const [shortcutsExpanded, setShortcutsExpanded] = useState(true);
  const [techniqueIndices, setTechniqueIndices] = useState({});
  const [showUltimateScan, setShowUltimateScan] = useState(false);
  const [scanningTechnique, setScanningTechnique] = useState(null);
  const [scanResults, setScanResults] = useState({});
  const [searchingForcingChain, setSearchingForcingChain] = useState(false);
  const [showDeepSearchModal, setShowDeepSearchModal] = useState(false);
  const [currentSearchDepth, setCurrentSearchDepth] = useState(10);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(1000); // milliseconds per step
  const playIntervalRef = useRef(null);
  const [chainPlaybackIndex, setChainPlaybackIndex] = useState(0);
  const [isPlayingChain, setIsPlayingChain] = useState(false);
  
  const techniqueInfo = currentStep ? TECHNIQUE_INFO[currentStep.technique] : null;
  const LevelIcon = techniqueInfo?.icon || Info;
  
  // Count occurrences of each technique (excluding ultimate for performance)
  const techniqueCounts = useMemo(() => {
    const counts = {};
    const techniques = [
      'Naked Single', 'Hidden Single',
      'Pointing Pair', 'Pointing Triple', 'Claiming',
      'Naked Pair', 'Hidden Pair', 'Naked Triple',
      'X-Wing', 'Swordfish', 'XY-Wing'
    ];

    techniques.forEach(tech => {
      const instances = findAllTechniqueInstances(grid, tech);
      counts[tech] = instances.length;
    });

    // Add ultimate technique counts from scan results
    if (Object.keys(scanResults).length > 0) {
      counts['X-Cycle'] = scanResults['X-Cycle'] || 0;
      counts['Finned X-Wing'] = scanResults['Finned X-Wing'] || 0;
      counts['ALS-XZ'] = scanResults['ALS-XZ'] || 0;
      counts['Unique Rectangle Type 1'] = scanResults['Unique Rectangle Type 1'] || 0;
      counts['BUG+1'] = scanResults['BUG+1'] || 0;
    }

    return counts;
  }, [grid, scanResults]);
  
  const handleUltimateScan = async () => {
    setShowUltimateScan(true);
    setScanResults({});

    const ultimateTechniques = [
      'X-Cycle',
      'Finned X-Wing',
      'ALS-XZ',
      'Unique Rectangle Type 1',
      'BUG+1'
    ];

    const results = {};

    for (const tech of ultimateTechniques) {
      setScanningTechnique(tech);
      await new Promise(resolve => setTimeout(resolve, 100)); // Small delay for UI update

      const instances = findAllTechniqueInstances(grid, tech);
      results[tech] = instances.length;
      setScanResults({...results});
    }

    setScanningTechnique(null);
  };

  const performDeepSearch = async (depth) => {
    // Try logical forcing chains first (convergence-based)
    let result = findForcingChain(grid, depth);

    // Fallback to hypothesis mode (contradiction-based)
    if (!result) {
      result = findHypothesis(grid, depth);
    }

    return result;
  };

  const handleWhatIfSearch = async () => {
    setSearchingForcingChain(true);
    setCurrentSearchDepth(100);

    // Small delay for UI responsiveness
    await new Promise(resolve => setTimeout(resolve, 100));

    const result = await performDeepSearch(100);

    setSearchingForcingChain(false);

    if (result) {
      onHighlightTechnique([result], 1, 1);
    } else {
      // Show modal to ask user if they want to go deeper
      setShowDeepSearchModal(true);
    }
  };

  const handleGoDeeper = async () => {
    const newDepth = currentSearchDepth + 10;
    setCurrentSearchDepth(newDepth);
    setSearchingForcingChain(true);

    // Small delay for UI responsiveness
    await new Promise(resolve => setTimeout(resolve, 100));

    const result = await performDeepSearch(newDepth);

    setSearchingForcingChain(false);

    if (result) {
      setShowDeepSearchModal(false);
      onHighlightTechnique([result], 1, 1);
    } else {
      // Keep modal open, user can try going even deeper
    }
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
      const maxSteps = currentStep.chain.filter(s => s.action === 'place').length;
      if (chainPlaybackIndex < maxSteps - 1) {
        const timer = setTimeout(() => {
          setChainPlaybackIndex(prev => prev + 1);
        }, 800);
        return () => clearTimeout(timer);
      } else {
        setIsPlayingChain(false);
      }
    }
  }, [isPlayingChain, chainPlaybackIndex, currentStep]);

  // Reset playback when currentStep changes
  useEffect(() => {
    setChainPlaybackIndex(0);
    setIsPlayingChain(false);
  }, [currentStep]);

  useEffect(() => {
    if (isPlaying && currentStep) {
      playIntervalRef.current = setTimeout(() => {
        onApplyStep?.();
        setTimeout(() => {
          onNextStep?.();
          // Check after state updates if no more steps found
          setTimeout(() => {
            if (!currentStep) {
              setIsPlaying(false);
            }
          }, 200);
        }, 100);
      }, playSpeed);
    }
    
    return () => {
      if (playIntervalRef.current) {
        clearTimeout(playIntervalRef.current);
      }
    };
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
      
      // Update the index for next click
      setTechniqueIndices(prev => ({
        ...prev,
        [techniqueName]: nextIndex
      }));
      
      // Show only the current instance
      onHighlightTechnique([instances[currentIndex]], instances.length, currentIndex + 1);
    }
  };

  const levelColors = {
    emerald: 'from-emerald-400 to-green-500',
    blue: 'from-blue-400 to-indigo-500',
    purple: 'from-purple-400 to-violet-500',
    orange: 'from-orange-400 to-red-500',
    violet: 'from-indigo-600 to-violet-800',
    fuchsia: 'from-fuchsia-600 to-pink-600'
  };

  return (
    <div className="space-y-4">
      {/* Current Hint Card */}
      <motion.div 
        layout
        className="bg-slate-900 rounded-2xl shadow-lg shadow-black/50 overflow-hidden border border-slate-700"
      >
        <div className="p-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className={`
              w-10 h-10 rounded-xl flex items-center justify-center
              ${currentStep 
                ? `bg-gradient-to-br ${levelColors[techniqueInfo?.color || 'emerald']} shadow-lg` 
                : 'bg-slate-800'
              }
            `}>
              <Lightbulb className={`w-6 h-6 ${currentStep ? 'text-white' : 'text-slate-500'}`} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">
                {currentStep ? 'Technique Found!' : 'Ready for a Hint?'}
              </h3>
              <p className="text-base text-slate-400">
                {currentStep ? techniqueInfo?.level : 'Click "Hint" to analyze the board'}
              </p>
            </div>
          </div>
        </div>
        
        <AnimatePresence mode="wait">
          {currentStep ? (
            <motion.div
              key="step"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="p-5 space-y-4"
            >
              {/* Technique Name */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedTechnique(currentStep.technique)}
                  className={`
                    px-3 py-1 rounded-full text-base font-medium
                    bg-gradient-to-r ${levelColors[techniqueInfo?.color || 'emerald']} text-white
                    hover:shadow-lg transition-all cursor-pointer
                  `}
                >
                  {currentStep.technique}
                </button>
                {currentStep.digit && (
                  <span className="px-2 py-1 bg-slate-800 rounded-lg text-base font-medium text-slate-300">
                    Digit: {currentStep.digit}
                  </span>
                )}
              </div>
              
              {/* Explanation */}
              <div className="bg-slate-800 rounded-xl p-4">
                <p className="text-slate-200 leading-relaxed text-base whitespace-pre-line">
                  {currentStep.explanation}
                </p>
              </div>

              {/* Step-by-step breakdown for Deep Forcing Chains and Hypothesis Mode */}
              {(currentStep.technique === 'Deep Forcing Chain' || currentStep.technique === 'Hypothesis Mode') && currentStep.chain && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-base font-medium text-slate-300">Logical Chain Trace:</p>
                    {currentStep.chain.length > 1 && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => setChainPlaybackIndex(Math.max(0, chainPlaybackIndex - 1))}
                          disabled={chainPlaybackIndex === 0}
                          className="p-1.5 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-600 rounded transition-colors"
                          title="Previous Step"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>
                        <button
                          onClick={() => {
                            if (!isPlayingChain) {
                              setIsPlayingChain(true);
                              setChainPlaybackIndex(0);
                            } else {
                              setIsPlayingChain(false);
                            }
                          }}
                          className={`p-1.5 ${isPlayingChain ? 'bg-red-600 hover:bg-red-500' : 'bg-blue-600 hover:bg-blue-500'} rounded transition-colors`}
                          title={isPlayingChain ? "Pause" : "Play Chain"}
                        >
                          {isPlayingChain ? (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            </svg>
                          )}
                        </button>
                        <button
                          onClick={() => setChainPlaybackIndex(Math.min(currentStep.chain.length - 1, chainPlaybackIndex + 1))}
                          disabled={chainPlaybackIndex >= currentStep.chain.length - 1}
                          className="p-1.5 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-600 rounded transition-colors"
                          title="Next Step"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="bg-slate-800 rounded-xl p-4 max-h-72 overflow-y-auto space-y-2">
                    {currentStep.chain.filter(s => s.action === 'place').slice(0, chainPlaybackIndex + 1).map((step, idx) => {
                      const getRow = (i) => Math.floor(i / 9);
                      const getCol = (i) => i % 9;
                      const cellRef = `R${getRow(step.cell) + 1}C${getCol(step.cell) + 1}`;
                      const isCurrentStep = idx === chainPlaybackIndex;

                      return (
                        <motion.div 
                          key={idx} 
                          className={`flex items-start gap-2 text-sm p-2 rounded ${isCurrentStep ? 'bg-blue-900/30 border border-blue-600' : ''}`}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <span className={`font-bold ${idx === 0 ? 'text-purple-400' : isCurrentStep ? 'text-blue-300' : 'text-slate-400'}`}>
                            {idx + 1}.
                          </span>
                          <div className="flex-1">
                            <span className={isCurrentStep ? 'text-white font-medium' : 'text-slate-300'}>
                              {cellRef} = {step.value}
                            </span>
                            {step.reason && (
                              <p className="text-slate-400 text-xs mt-1">{step.reason}</p>
                            )}
                          </div>
                          {isCurrentStep && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="w-2 h-2 bg-blue-500 rounded-full"
                            />
                          )}
                        </motion.div>
                      );
                    })}
                    {currentStep.contradiction && chainPlaybackIndex >= currentStep.chain.filter(s => s.action === 'place').length - 1 && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="mt-3 p-3 bg-red-950/50 border border-red-600 rounded-lg"
                      >
                        <div className="flex items-center gap-2 text-red-400 font-medium mb-2">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          CONTRADICTION REACHED
                        </div>
                        <p className="text-sm text-red-300">
                          R{Math.floor(currentStep.contradictionCell / 9) + 1}C{(currentStep.contradictionCell % 9) + 1} has no valid candidates left!
                        </p>
                        {currentStep.placement && (
                          <p className="text-sm text-emerald-400 mt-2">
                            ✓ Therefore: R{Math.floor(currentStep.placement.cell / 9) + 1}C{(currentStep.placement.cell % 9) + 1} must be {currentStep.placement.digit}
                          </p>
                        )}
                      </motion.div>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 text-center">
                    Step {Math.min(chainPlaybackIndex + 1, currentStep.chain.filter(s => s.action === 'place').length)} of {currentStep.chain.filter(s => s.action === 'place').length}
                  </div>
                </div>
              )}

              {/* Action Summary */}
              {currentStep.eliminations && currentStep.eliminations.length > 0 && (
                <div className="space-y-2">
                  <p className="text-base font-medium text-slate-300">Eliminations:</p>
                  <div className="flex flex-wrap gap-2">
                    {currentStep.eliminations.slice(0, 6).map((elim, idx) => (
                      <span 
                        key={idx}
                        className="px-2 py-1 bg-red-950/50 text-red-400 text-base rounded-lg"
                      >
                        R{Math.floor(elim.cell / 9) + 1}C{(elim.cell % 9) + 1}: -{elim.digit}
                      </span>
                    ))}
                    {currentStep.eliminations.length > 6 && (
                      <span className="px-2 py-1 bg-slate-800 text-slate-400 text-base rounded-lg">
                        +{currentStep.eliminations.length - 6} more
                      </span>
                    )}
                  </div>
                </div>
              )}
              
              {currentStep.placement && (
                <div className="flex items-center gap-2 text-emerald-400">
                  <ChevronRight className="w-5 h-5" />
                  <span className="text-base font-medium">
                    Place {currentStep.placement.digit} at R{Math.floor(currentStep.placement.cell / 9) + 1}C{(currentStep.placement.cell % 9) + 1}
                  </span>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-5 text-center"
            >
              <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-slate-800 flex items-center justify-center">
                <Info className="w-8 h-8 text-slate-500" />
              </div>
              <p className="text-slate-400 text-base">
                {focusedDigit 
                  ? `Filtering for digit ${focusedDigit}. Click Hint to find patterns.`
                  : 'Load a puzzle and click Hint to get started.'
                }
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      
      {/* Auto-Play Controls */}
      <div className="bg-slate-900 rounded-2xl shadow-lg shadow-black/50 p-5 border border-slate-700">
        <h4 className="text-lg font-semibold text-white mb-3">Auto-Solve</h4>
        <div className="flex gap-2">
          <Button
            onClick={handlePlayPause}
            className={`${isPlaying ? 'bg-red-600 hover:bg-red-500' : 'bg-green-600 hover:bg-green-500'}`}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </Button>
          <Button
            onClick={handleSkipStep}
            variant="outline"
            className="border-slate-600"
          >
            <SkipForward className="w-4 h-4" />
          </Button>
          {[
            { label: '0.5×', value: 2000 },
            { label: '1×', value: 1000 },
            { label: '2×', value: 500 },
            { label: '16×', value: 63 }
          ].map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setPlaySpeed(value)}
              className={`px-3 py-2 rounded text-sm transition-colors ${
                playSpeed === value
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Technique Reference */}
      <div className="bg-slate-900 rounded-2xl shadow-lg shadow-black/50 p-5 border border-slate-700">
        <h4 className="text-lg font-semibold text-white mb-4">Technique Hierarchy</h4>
        <div className="space-y-3">
          {[
            { level: 'Basic', techniques: [
              { name: 'Naked Single', full: 'Naked Single' },
              { name: 'Hidden Single', full: 'Hidden Single' }
            ], color: 'emerald' },
            { level: 'Intermediate', techniques: [
              { name: 'Pointing Pair', full: 'Pointing Pair' },
              { name: 'Claiming', full: 'Claiming' }
            ], color: 'blue' },
            { level: 'Advanced', techniques: [
              { name: 'Naked Pair', full: 'Naked Pair' },
              { name: 'Hidden Pair', full: 'Hidden Pair' },
              { name: 'Naked Triple', full: 'Naked Triple' }
            ], color: 'purple' },
            { level: 'Expert', techniques: [
              { name: 'X-Wing', full: 'X-Wing' },
              { name: 'Swordfish', full: 'Swordfish' },
              { name: 'XY-Wing', full: 'XY-Wing' }
            ], color: 'orange' },
            { 
              level: 'Ultimate', 
              techniques: [
                { name: 'X-Cycle', full: 'X-Cycle' },
                { name: 'Finned X-Wing', full: 'Finned X-Wing' },
                { name: 'ALS-XZ', full: 'ALS-XZ' },
                { name: 'Unique Rect.', full: 'Unique Rectangle Type 1' },
                { name: 'BUG+1', full: 'BUG+1' }
              ], 
              color: 'violet',
              scanButton: true
            },
            { 
              level: 'Forcing Chains', 
              techniques: [
                { name: 'Cell Forcing Chain', full: 'Cell Forcing Chain' },
                { name: 'Hypothesis Mode', full: 'Hypothesis Mode' }
              ], 
              color: 'fuchsia',
              isWhatIf: true
            },
            ].map((tier) => (
            <div key={tier.level} className="flex items-start gap-3">
              <div className={`w-2 h-2 mt-2 rounded-full bg-gradient-to-br ${levelColors[tier.color]}`}></div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-base font-medium text-slate-200">{tier.level}</p>
                  {tier.scanButton && (
                    <button
                      onClick={handleUltimateScan}
                      className="px-2 py-1 bg-violet-600 hover:bg-violet-500 text-white text-xs rounded flex items-center gap-1 transition-colors"
                      title="Scan for ultimate techniques (~10s)"
                    >
                      <Search className="w-3 h-3" />
                      Scan
                    </button>
                  )}
                  {tier.isWhatIf && (
                    <button
                      onClick={handleWhatIfSearch}
                      disabled={searchingForcingChain}
                      className="px-2 py-1 bg-fuchsia-600 hover:bg-fuchsia-500 disabled:bg-slate-600 text-white text-xs rounded flex items-center gap-1 transition-colors"
                      title="Explore What-If scenarios (~5s)"
                    >
                      {searchingForcingChain ? (
                        <div className="animate-spin rounded-full h-3 w-3 border-b border-white"></div>
                      ) : (
                        <Search className="w-3 h-3" />
                      )}
                      Search
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 mt-1">
                  {tier.techniques.map((tech) => {
                    const count = techniqueCounts[tech.full] || 0;
                    return (
                      <div key={tech.name} className="flex items-center gap-1">
                        <button
                          onClick={() => setSelectedTechnique(tech.full)}
                          className="text-sm text-blue-400 hover:text-blue-300 hover:underline cursor-pointer"
                        >
                          {tech.name}
                        </button>
                        {count > 0 && (
                          <button
                            onClick={() => handleTechniqueClick(tech.full)}
                            className="text-xs px-1.5 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded cursor-pointer transition-colors"
                            title={`Show ${count} instance${count > 1 ? 's' : ''}`}
                          >
                            ({count})
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Keyboard Shortcuts */}
      <div className="bg-slate-900 rounded-2xl text-white border border-slate-700 overflow-hidden">
        <button
          onClick={() => setShortcutsExpanded(!shortcutsExpanded)}
          className="w-full p-5 flex items-center justify-between hover:bg-slate-800/50 transition-colors"
        >
          <h4 className="text-lg font-semibold flex items-center gap-2">
            <span className="text-sm px-2 py-0.5 bg-slate-700 rounded">Tips</span>
            Keyboard Shortcuts
          </h4>
          {shortcutsExpanded ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </button>
        
        <AnimatePresence>
          {shortcutsExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-5 pb-5 space-y-2 text-base border-t border-slate-800">
                <div className="flex justify-between pt-3">
                  <span className="text-slate-300">Navigate cells</span>
                  <span className="font-mono bg-slate-700 px-2 py-1 rounded text-sm">Arrow Keys</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Enter number</span>
                  <span className="font-mono bg-slate-700 px-2 py-1 rounded text-sm">1-9</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Toggle candidate</span>
                  <span className="font-mono bg-slate-700 px-2 py-1 rounded text-sm">Shift + 1-9</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Focus digit</span>
                  <span className="font-mono bg-slate-700 px-2 py-1 rounded text-sm">Ctrl/Cmd + 1-9</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Hint</span>
                  <span className="font-mono bg-slate-700 px-2 py-1 rounded text-sm">H</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Apply step</span>
                  <span className="font-mono bg-slate-700 px-2 py-1 rounded text-sm">A</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Undo</span>
                  <span className="font-mono bg-slate-700 px-2 py-1 rounded text-sm">Z</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Clear cell</span>
                  <span className="font-mono bg-slate-700 px-2 py-1 rounded text-sm">Delete / Backspace</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Clear grid</span>
                  <span className="font-mono bg-slate-700 px-2 py-1 rounded text-sm">C</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Clear focus</span>
                  <span className="font-mono bg-slate-700 px-2 py-1 rounded text-sm">Esc</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Technique Modal */}
      {selectedTechnique && (
        <TechniqueModal
          technique={selectedTechnique}
          onClose={() => setSelectedTechnique(null)}
        />
      )}

      {/* Ultimate Technique Scan Modal */}
      <UltimateTechniqueScanModal
        isOpen={showUltimateScan}
        currentTechnique={scanningTechnique}
        results={scanResults}
        onClose={() => setShowUltimateScan(false)}
      />

      {/* Deep Search Modal */}
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
    </div>
  );
}