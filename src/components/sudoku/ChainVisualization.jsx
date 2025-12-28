import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ChainVisualization({ chains, strongLinks, weakLinks, alsLinks, forcingChains, cellSize = 50, gridSize = 450, currentStep, playbackIndex = 0 }) {
  const [currentAnimStep, setCurrentAnimStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Use external playback control if provided
  const effectivePlaybackIndex = playbackIndex !== undefined ? playbackIndex : currentAnimStep;

  // Reset animation when forcingChains changes
  useEffect(() => {
    if (forcingChains && forcingChains.length > 0) {
      setCurrentAnimStep(0);
      setIsAnimating(true);
    }
  }, [forcingChains]);

  // Animate through the chain steps
  useEffect(() => {
    if (!isAnimating || !forcingChains || forcingChains.length === 0) return;

    const allSteps = forcingChains[0].cells || [];
    if (currentAnimStep < allSteps.length) {
      const timer = setTimeout(() => {
        setCurrentAnimStep(prev => prev + 1);
      }, 600); // Delay between steps
      return () => clearTimeout(timer);
    } else {
      setIsAnimating(false);
    }
  }, [currentAnimStep, isAnimating, forcingChains]);
  if (!chains && (!strongLinks || strongLinks.length === 0) && (!alsLinks || alsLinks.length === 0) && (!forcingChains || forcingChains.length === 0)) return null;

  const getCellCenter = (cellIndex) => {
    const row = Math.floor(cellIndex / 9);
    const col = cellIndex % 9;
    const x = (col + 0.5) * cellSize;
    const y = (row + 0.5) * cellSize;
    return { x, y };
  };

  const getCandidatePosition = (cellIndex, candidateValue) => {
    const row = Math.floor(cellIndex / 9);
    const col = cellIndex % 9;
    
    // Base cell position
    const cellX = col * cellSize;
    const cellY = row * cellSize;
    
    // Candidate is displayed in a 3x3 grid within the cell
    // candidateValue 1-9 maps to positions:
    // 1 2 3
    // 4 5 6
    // 7 8 9
    const candRow = Math.floor((candidateValue - 1) / 3);
    const candCol = (candidateValue - 1) % 3;
    
    // Each candidate occupies 1/3 of the cell
    const candSize = cellSize / 3;
    const x = cellX + (candCol + 0.5) * candSize;
    const y = cellY + (candRow + 0.5) * candSize;
    
    return { x, y };
  };

  const renderArrow = (from, to, type = 'strong', key, isALS = false) => {
    const start = isALS ? from : getCellCenter(from);
    const end = isALS ? to : getCellCenter(to);
    
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const angle = Math.atan2(dy, dx);
    
    // Shorten the line to not overlap with cells
    const margin = cellSize * 0.3;
    const length = Math.sqrt(dx * dx + dy * dy);
    const shortenedLength = length - 2 * margin;
    
    const startX = start.x + Math.cos(angle) * margin;
    const startY = start.y + Math.sin(angle) * margin;
    const endX = startX + Math.cos(angle) * shortenedLength;
    const endY = startY + Math.sin(angle) * shortenedLength;
    
    const color = type === 'strong' ? '#3b82f6' : '#ef4444';
    const strokeDasharray = type === 'strong' ? 'none' : '5,5';
    
    return (
      <g key={key}>
        <motion.line
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.8 }}
          transition={{ duration: 0.5, delay: key * 0.1 }}
          x1={startX}
          y1={startY}
          x2={endX}
          y2={endY}
          stroke={color}
          strokeWidth="3"
          strokeDasharray={strokeDasharray}
          markerEnd={`url(#arrow-${type})`}
        />
      </g>
    );
  };

  return (
    <svg width={gridSize} height={gridSize} className="w-full h-full">
        <defs>
          <marker
            id="arrow-strong"
            markerWidth="10"
            markerHeight="10"
            refX="9"
            refY="3"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M0,0 L0,6 L9,3 z" fill="#3b82f6" />
          </marker>
          <marker
            id="arrow-weak"
            markerWidth="10"
            markerHeight="10"
            refX="9"
            refY="3"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M0,0 L0,6 L9,3 z" fill="#ef4444" />
          </marker>
          <marker
            id="arrow-forcing-blue"
            markerWidth="10"
            markerHeight="10"
            refX="9"
            refY="3"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M0,0 L0,6 L9,3 z" fill="#3b82f6" />
          </marker>
          <marker
            id="arrow-forcing-red"
            markerWidth="10"
            markerHeight="10"
            refX="9"
            refY="3"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M0,0 L0,6 L9,3 z" fill="#ef4444" />
          </marker>
          <marker
            id="arrow-forcing-green"
            markerWidth="10"
            markerHeight="10"
            refX="9"
            refY="3"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M0,0 L0,6 L9,3 z" fill="#10b981" />
          </marker>
          <marker
            id="arrow-forcing-0"
            markerWidth="10"
            markerHeight="10"
            refX="9"
            refY="3"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M0,0 L0,6 L9,3 z" fill="#10b981" />
          </marker>
          <marker
            id="arrow-forcing-1"
            markerWidth="10"
            markerHeight="10"
            refX="9"
            refY="3"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M0,0 L0,6 L9,3 z" fill="#a855f7" />
          </marker>
          <marker
            id="arrow-forcing-2"
            markerWidth="10"
            markerHeight="10"
            refX="9"
            refY="3"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M0,0 L0,6 L9,3 z" fill="#3b82f6" />
          </marker>
        </defs>
        
        {strongLinks && strongLinks.map((link, idx) => 
          renderArrow(link.from.cell, link.to.cell, 'strong', `strong-${idx}`)
        )}
        
        {weakLinks && weakLinks.map((link, idx) => 
          renderArrow(link.from.cell, link.to.cell, 'weak', `weak-${idx}`)
        )}
        
        {chains && chains.length > 1 && chains.map((cell, idx) => {
          if (idx === chains.length - 1) return null;
          const type = idx % 2 === 0 ? 'strong' : 'weak';
          return renderArrow(cell, chains[idx + 1], type, `chain-${idx}`);
        })}
        
        {alsLinks && alsLinks.map((link, idx) => 
          renderArrow(link.from, link.to, link.type, `als-${idx}`, true)
        )}
        
        {forcingChains && forcingChains.map((chainData, chainIdx) => {
          const { cells, color, label } = chainData;
          if (!cells || cells.length < 1) return null;

          // All steps in sequence
          const allSteps = cells;
          const visibleSteps = allSteps.slice(0, effectivePlaybackIndex + 1);

          return (
            <g key={`forcing-chain-${chainIdx}`}>
              {/* Current step explanation */}
              {effectivePlaybackIndex < allSteps.length && (
                <motion.text
                  key={`step-label-${effectivePlaybackIndex}`}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  x={gridSize / 2}
                  y={20}
                  textAnchor="middle"
                  fill="#fff"
                  fontSize={cellSize * 0.22}
                  fontWeight="bold"
                  style={{ textShadow: '0 0 4px rgba(0,0,0,0.8)' }}
                >
                  {allSteps[effectivePlaybackIndex].action === 'place' 
                    ? `Step ${effectivePlaybackIndex + 1}: Place ${allSteps[effectivePlaybackIndex].value}` 
                    : `Eliminate ${allSteps[effectivePlaybackIndex].value}`}
                </motion.text>
              )}

              {/* Sequential markers and arrows */}
              {visibleSteps.map((step, idx) => {
                const candPos = getCandidatePosition(step.cell, step.value);
                const baseDelay = 0; // No delay, controlled by state

                // Find next step for arrow (any action) - only if it's visible
                const nextStep = idx < visibleSteps.length - 1 ? visibleSteps[idx + 1] : null;

                // Use chain color for markers
                const chainColor = color || '#a855f7';

                return (
                  <g key={`step-${idx}`}>
                    {/* Marker with pulsing animation for current step */}
                    {step.action === 'place' ? (
                      <motion.circle
                        key={`marker-${idx}`}
                        initial={{ r: 0, opacity: 0 }}
                        animate={{ 
                          r: cellSize * 0.08, 
                          opacity: idx === effectivePlaybackIndex ? [0.95, 1, 0.95] : 0.95,
                          scale: idx === effectivePlaybackIndex ? [1, 1.3, 1] : 1
                        }}
                        transition={{ 
                          duration: 0.3, 
                          scale: { duration: 0.6, repeat: idx === effectivePlaybackIndex ? Infinity : 0 }
                        }}
                        cx={candPos.x}
                        cy={candPos.y}
                        fill={chainColor}
                        stroke={chainColor}
                        strokeWidth="1.5"
                      />
                    ) : (
                      <motion.g
                        key={`marker-${idx}`}
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ 
                          opacity: 0.7, 
                          scale: idx === effectivePlaybackIndex ? [1, 1.3, 1] : 1
                        }}
                        transition={{ 
                          duration: 0.2,
                          scale: { duration: 0.6, repeat: idx === effectivePlaybackIndex ? Infinity : 0 }
                        }}
                      >
                        <line
                          x1={candPos.x - cellSize * 0.06}
                          y1={candPos.y - cellSize * 0.06}
                          x2={candPos.x + cellSize * 0.06}
                          y2={candPos.y + cellSize * 0.06}
                          stroke="#f97316"
                          strokeWidth="2"
                        />
                        <line
                          x1={candPos.x - cellSize * 0.06}
                          y1={candPos.y + cellSize * 0.06}
                          x2={candPos.x + cellSize * 0.06}
                          y2={candPos.y - cellSize * 0.06}
                          stroke="#f97316"
                          strokeWidth="2"
                        />
                      </motion.g>
                    )}

                    {/* Arrow to next step */}
                    {nextStep && (
                      (() => {
                        const from = candPos;
                        const to = getCandidatePosition(nextStep.cell, nextStep.value);

                        const dx = to.x - from.x;
                        const dy = to.y - from.y;
                        const angle = Math.atan2(dy, dx);

                        const margin = cellSize * 0.12;
                        const startX = from.x + Math.cos(angle) * margin;
                        const startY = from.y + Math.sin(angle) * margin;
                        const endX = to.x - Math.cos(angle) * margin;
                        const endY = to.y - Math.sin(angle) * margin;

                        const midX = (startX + endX) / 2;
                        const midY = (startY + endY) / 2;
                        const perpAngle = angle + Math.PI / 2;
                        const curveAmount = cellSize * 0.4;
                        const controlX = midX + Math.cos(perpAngle) * curveAmount;
                        const controlY = midY + Math.sin(perpAngle) * curveAmount;

                        const pathD = `M ${startX} ${startY} Q ${controlX} ${controlY}, ${endX} ${endY}`;

                        return (
                          <motion.path
                            key={`arrow-${idx}`}
                            initial={{ pathLength: 0, opacity: 0 }}
                            animate={{ pathLength: 1, opacity: 0.8 }}
                            transition={{ duration: 0.4 }}
                            d={pathD}
                            stroke={chainColor}
                            strokeWidth="2.5"
                            fill="none"
                            markerEnd={`url(#arrow-forcing-${chainIdx})`}
                          />
                        );
                      })()
                    )}
                  </g>
                );
              })}

              {label && visibleSteps.length > 0 && (
                <motion.text
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  x={getCandidatePosition(visibleSteps[0].cell, visibleSteps[0].value).x}
                  y={getCandidatePosition(visibleSteps[0].cell, visibleSteps[0].value).y - cellSize * 0.25}
                  textAnchor="middle"
                  fill={color}
                  fontSize={cellSize * 0.18}
                  fontWeight="bold"
                  style={{ textShadow: '0 0 4px rgba(0,0,0,0.8)' }}
                >
                  {label}
                </motion.text>
              )}
            </g>
          );
        })}

        {/* Golden border for convergence cell */}
        {currentStep?.convergenceCell !== undefined && currentStep.convergenceCell !== null && !isAnimating && (
          <motion.rect
            x={getCellCenter(currentStep.convergenceCell).x - cellSize * 0.4}
            y={getCellCenter(currentStep.convergenceCell).y - cellSize * 0.4}
            width={cellSize * 0.8}
            height={cellSize * 0.8}
            rx={cellSize * 0.1}
            fill="none"
            stroke="#fbbf24"
            strokeWidth="4"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ 
              opacity: [1, 0.5, 1], 
              scale: 1 
            }}
            transition={{ 
              opacity: { duration: 1.2, repeat: Infinity },
              scale: { duration: 0.3 }
            }}
          />
        )}

        {currentStep?.contradictionCell !== undefined && currentStep.contradictionCell !== null && !isAnimating && (
          <motion.g>
            {/* Blinking contradiction cell */}
            <motion.rect
              x={getCellCenter(currentStep.contradictionCell).x - cellSize * 0.4}
              y={getCellCenter(currentStep.contradictionCell).y - cellSize * 0.4}
              width={cellSize * 0.8}
              height={cellSize * 0.8}
              rx={cellSize * 0.1}
              fill="none"
              stroke="#ef4444"
              strokeWidth="4"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ 
                opacity: [1, 0.3, 1], 
                scale: 1 
              }}
              transition={{ 
                opacity: { duration: 0.8, repeat: Infinity },
                scale: { duration: 0.3 }
              }}
            />

            {/* Blinking initial assumption cell */}
            {currentStep.baseCells && currentStep.baseCells[0] !== undefined && (
              <motion.rect
                x={getCellCenter(currentStep.baseCells[0]).x - cellSize * 0.4}
                y={getCellCenter(currentStep.baseCells[0]).y - cellSize * 0.4}
                width={cellSize * 0.8}
                height={cellSize * 0.8}
                rx={cellSize * 0.1}
                fill="none"
                stroke="#a855f7"
                strokeWidth="4"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ 
                  opacity: [1, 0.3, 1], 
                  scale: 1 
                }}
                transition={{ 
                  opacity: { duration: 0.8, repeat: Infinity },
                  scale: { duration: 0.3 }
                }}
              />
            )}

            <motion.text
              x={getCellCenter(currentStep.contradictionCell).x}
              y={getCellCenter(currentStep.contradictionCell).y + cellSize * 0.6}
              textAnchor="middle"
              fill="#ef4444"
              fontSize={cellSize * 0.2}
              fontWeight="bold"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              style={{ textShadow: '0 0 4px rgba(0,0,0,0.8)' }}
            >
              Contradiction!
            </motion.text>
          </motion.g>
        )}
      </svg>
  );
}