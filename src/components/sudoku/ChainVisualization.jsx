import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function ChainVisualization({ 
  chains, 
  strongLinks, 
  weakLinks, 
  alsLinks, 
  forcingChains, 
  gridContainerRef, 
  currentStep, 
  playbackIndex = 0 
}) {
  const [dimensions, setDimensions] = useState({ width: 600, height: 600 });
  const [debugMode, setDebugMode] = useState(false);

  // Update dimensions when grid resizes
  useEffect(() => {
    if (!gridContainerRef?.current) return;

    const updateDimensions = () => {
      const rect = gridContainerRef.current.getBoundingClientRect();
      setDimensions({ width: rect.width, height: rect.height });
    };

    updateDimensions();

    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(gridContainerRef.current);

    return () => resizeObserver.disconnect();
  }, [gridContainerRef]);

  if (!chains && (!strongLinks || strongLinks.length === 0) && (!alsLinks || alsLinks.length === 0) && (!forcingChains || forcingChains.length === 0)) return null;

  const getRelativeCenter = (cellIndex) => {
    const cellElement = document.getElementById(`sudoku-cell-${cellIndex}`);
    const gridElement = gridContainerRef?.current;

    if (!cellElement || !gridElement) return { x: 0, y: 0 };

    const cellRect = cellElement.getBoundingClientRect();
    const gridRect = gridElement.getBoundingClientRect();

    return {
      x: (cellRect.left - gridRect.left) + (cellRect.width / 2),
      y: (cellRect.top - gridRect.top) + (cellRect.height / 2)
    };
  };

  const getCandidatePosition = (cellIndex, candidateValue) => {
    const cellElement = document.getElementById(`sudoku-cell-${cellIndex}`);
    const gridElement = gridContainerRef?.current;

    if (!cellElement || !gridElement) return { x: 0, y: 0 };

    const cellRect = cellElement.getBoundingClientRect();
    const gridRect = gridElement.getBoundingClientRect();

    // Candidate grid within cell (3x3)
    const candRow = Math.floor((candidateValue - 1) / 3);
    const candCol = (candidateValue - 1) % 3;
    
    const candWidth = cellRect.width / 3;
    const candHeight = cellRect.height / 3;

    const cellRelativeX = cellRect.left - gridRect.left;
    const cellRelativeY = cellRect.top - gridRect.top;

    return {
      x: cellRelativeX + (candCol + 0.5) * candWidth,
      y: cellRelativeY + (candRow + 0.5) * candHeight
    };
  };

  const renderArrow = (from, to, type = 'strong', key, isALS = false) => {
    const start = isALS ? from : getRelativeCenter(from);
    const end = isALS ? to : getRelativeCenter(to);
    
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const angle = Math.atan2(dy, dx);
    
    // Shorten the line to not overlap with cells
    const cellSize = dimensions.width / 9;
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

  const cellSize = dimensions.width / 9;

  return (
    <svg 
      width={dimensions.width} 
      height={dimensions.height} 
      viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
      className="w-full h-full"
      style={{ position: 'absolute', top: 0, left: 0 }}
    >
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

      {/* Debug mode: Show dots at calculated centers */}
      {debugMode && (
        <g>
          {Array.from({ length: 81 }, (_, i) => {
            const center = getRelativeCenter(i);
            return (
              <circle
                key={`debug-${i}`}
                cx={center.x}
                cy={center.y}
                r={3}
                fill="#ff00ff"
                opacity={0.8}
              />
            );
          })}
        </g>
      )}
      
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

        const placementSteps = cells.filter(s => s.action === 'place');
        const visibleSteps = placementSteps.slice(0, playbackIndex + 1);

        return (
          <g key={`forcing-chain-${chainIdx}`}>
            {/* Current step label */}
            {playbackIndex < placementSteps.length && (
              <motion.text
                key={`step-label-${playbackIndex}`}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                x={dimensions.width / 2}
                y={20}
                textAnchor="middle"
                fill="#fff"
                fontSize={cellSize * 0.22}
                fontWeight="bold"
                style={{ textShadow: '0 0 4px rgba(0,0,0,0.8)' }}
              >
                Step {playbackIndex + 1}: Place {placementSteps[playbackIndex].value}
              </motion.text>
            )}

            {visibleSteps.map((step, idx) => {
              const candPos = getCandidatePosition(step.cell, step.value);
              const nextStep = idx < visibleSteps.length - 1 ? visibleSteps[idx + 1] : null;
              const chainColor = color || '#a855f7';

              return (
                <g key={`step-${idx}`}>
                  {/* Marker */}
                  <motion.circle
                    initial={{ r: 0, opacity: 0 }}
                    animate={{ 
                      r: cellSize * 0.08, 
                      opacity: idx === playbackIndex ? [0.95, 1, 0.95] : 0.95,
                      scale: idx === playbackIndex ? [1, 1.3, 1] : 1
                    }}
                    transition={{ 
                      duration: 0.3, 
                      scale: { duration: 0.6, repeat: idx === playbackIndex ? Infinity : 0 }
                    }}
                    cx={candPos.x}
                    cy={candPos.y}
                    fill={chainColor}
                    stroke={chainColor}
                    strokeWidth="1.5"
                  />

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

      {/* Convergence cell highlight */}
      {currentStep?.convergenceCell !== undefined && currentStep.convergenceCell !== null && (
        <motion.rect
          x={getRelativeCenter(currentStep.convergenceCell).x - cellSize * 0.4}
          y={getRelativeCenter(currentStep.convergenceCell).y - cellSize * 0.4}
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

      {/* Contradiction cell highlight */}
      {currentStep?.contradictionCell !== undefined && currentStep.contradictionCell !== null && (
        <motion.g>
          <motion.rect
            x={getRelativeCenter(currentStep.contradictionCell).x - cellSize * 0.4}
            y={getRelativeCenter(currentStep.contradictionCell).y - cellSize * 0.4}
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

          {currentStep.baseCells && currentStep.baseCells[0] !== undefined && (
            <motion.rect
              x={getRelativeCenter(currentStep.baseCells[0]).x - cellSize * 0.4}
              y={getRelativeCenter(currentStep.baseCells[0]).y - cellSize * 0.4}
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
            x={getRelativeCenter(currentStep.contradictionCell).x}
            y={getRelativeCenter(currentStep.contradictionCell).y + cellSize * 0.6}
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