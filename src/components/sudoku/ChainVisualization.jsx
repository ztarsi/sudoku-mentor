import React from 'react';
import { motion } from 'framer-motion';

export default function ChainVisualization({ chains, strongLinks, weakLinks, alsLinks, forcingChains, cellSize = 50, gridSize = 450, currentStep }) {
  if (!chains && (!strongLinks || strongLinks.length === 0) && (!alsLinks || alsLinks.length === 0) && (!forcingChains || forcingChains.length === 0)) return null;

  const getCellCenter = (cellIndex) => {
    const row = Math.floor(cellIndex / 9);
    const col = cellIndex % 9;
    const x = (col + 0.5) * cellSize;
    const y = (row + 0.5) * cellSize;
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

          // Group steps by action type
          const placements = cells.filter(c => c.action === 'place');
          const eliminations = cells.filter(c => c.action === 'eliminate');

          return (
            <g key={`forcing-chain-${chainIdx}`}>
              {/* Placement markers (green) */}
              {placements.map((step, idx) => {
                const cellPos = getCellCenter(step.cell);
                return (
                  <motion.circle
                    key={`place-${idx}`}
                    initial={{ r: 0, opacity: 0 }}
                    animate={{ r: cellSize * 0.15, opacity: 0.9 }}
                    transition={{ duration: 0.3, delay: idx * 0.08 }}
                    cx={cellPos.x}
                    cy={cellPos.y}
                    fill="#10b981"
                    stroke="#059669"
                    strokeWidth="2"
                  />
                );
              })}

              {/* Elimination markers (orange) */}
              {eliminations.map((step, idx) => {
                const cellPos = getCellCenter(step.cell);
                return (
                  <motion.rect
                    key={`elim-${idx}`}
                    initial={{ width: 0, height: 0, opacity: 0 }}
                    animate={{ width: cellSize * 0.2, height: cellSize * 0.2, opacity: 0.7 }}
                    transition={{ duration: 0.2, delay: idx * 0.05 }}
                    x={cellPos.x - cellSize * 0.1}
                    y={cellPos.y - cellSize * 0.1}
                    fill="#f97316"
                    stroke="#ea580c"
                    strokeWidth="1"
                    rx={2}
                  />
                );
              })}

              {/* Arrows between placements */}
              {placements.map((step, idx) => {
                if (idx === placements.length - 1) return null;

                const from = getCellCenter(step.cell);
                const to = getCellCenter(placements[idx + 1].cell);

                const dx = to.x - from.x;
                const dy = to.y - from.y;
                const angle = Math.atan2(dy, dx);

                const margin = cellSize * 0.25;
                const startX = from.x + Math.cos(angle) * margin;
                const startY = from.y + Math.sin(angle) * margin;
                const endX = to.x - Math.cos(angle) * margin;
                const endY = to.y - Math.sin(angle) * margin;

                const midX = (startX + endX) / 2;
                const midY = (startY + endY) / 2;
                const perpAngle = angle + Math.PI / 2;
                const curveAmount = cellSize * 0.2;
                const controlX = midX + Math.cos(perpAngle) * curveAmount;
                const controlY = midY + Math.sin(perpAngle) * curveAmount;

                const pathD = `M ${startX} ${startY} Q ${controlX} ${controlY}, ${endX} ${endY}`;

                return (
                  <motion.path
                    key={`arrow-${idx}`}
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 0.8 }}
                    transition={{ duration: 0.4, delay: idx * 0.08 }}
                    d={pathD}
                    stroke="#10b981"
                    strokeWidth="3"
                    fill="none"
                    markerEnd="url(#arrow-forcing-green)"
                  />
                );
              })}

              {label && placements.length > 0 && (
                <text
                  x={getCellCenter(placements[0].cell).x}
                  y={getCellCenter(placements[0].cell).y - cellSize * 0.4}
                  textAnchor="middle"
                  fill="#ef4444"
                  fontSize={cellSize * 0.22}
                  fontWeight="bold"
                >
                  {label}
                </text>
              )}
            </g>
          );
        })}

        {currentStep?.contradictionCell !== undefined && currentStep.contradictionCell !== null && (
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
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.3 }}
          />
        )}
      </svg>
  );
}