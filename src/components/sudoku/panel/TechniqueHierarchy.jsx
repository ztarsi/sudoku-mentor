import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Info, ChevronDown, ChevronUp, Search } from 'lucide-react';
import { LEVEL_COLORS, TECHNIQUE_TIERS } from '../techniqueCatalog';

/**
 * The collapsible technique-hierarchy browser: tiers, live counts,
 * ultimate scan and what-if search triggers.
 */
export default function TechniqueHierarchy({
  expanded,
  onToggleExpanded,
  noAssistMode,
  techniqueCounts,
  searchingForcingChain,
  onSelectTechnique,
  onTechniqueClick,
  onUltimateScan,
  onWhatIfSearch,
  onShowInfo,
}) {
  return (
    <div className="bg-slate-900 rounded-2xl text-white border border-slate-700 overflow-hidden">
      <button
        onClick={() => !noAssistMode && onToggleExpanded()}
        disabled={noAssistMode}
        aria-expanded={expanded && !noAssistMode}
        className="w-full p-5 flex items-center justify-between hover:bg-slate-800/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <div className="flex items-center gap-2">
          <h4 className="text-lg font-semibold">Technique Hierarchy</h4>
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              onShowInfo();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.stopPropagation();
                onShowInfo();
              }
            }}
            className="p-1 hover:bg-slate-700 rounded-lg transition-colors"
            title="Learn more"
            aria-label="About the technique hierarchy"
          >
            <Info className="w-4 h-4 text-slate-400" />
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="w-5 h-5 text-slate-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-slate-400" />
        )}
      </button>

      <AnimatePresence>
        {expanded && !noAssistMode && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-3 border-t border-slate-800 pt-3">
              {TECHNIQUE_TIERS.map((tier) => (
                <div key={tier.level} className="flex items-start gap-3">
                  <div className={`w-2 h-2 mt-2 rounded-full bg-gradient-to-br ${LEVEL_COLORS[tier.color]}`}></div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-base font-medium text-slate-200">{tier.level}</p>
                      {tier.scanButton && (
                        <button
                          onClick={onUltimateScan}
                          className="px-2 py-1 bg-violet-600 hover:bg-violet-500 text-white text-xs rounded flex items-center gap-1 transition-colors"
                          title="Scan for ultimate techniques (~10s)"
                        >
                          <Search className="w-3 h-3" />
                          Scan
                        </button>
                      )}
                      {tier.isWhatIf && (
                        <button
                          onClick={onWhatIfSearch}
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
                              onClick={() => onSelectTechnique(tech.full)}
                              className="text-sm text-blue-400 hover:text-blue-300 hover:underline cursor-pointer"
                            >
                              {tech.name}
                            </button>
                            {count > 0 && (
                              <button
                                onClick={() => onTechniqueClick(tech.full)}
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
