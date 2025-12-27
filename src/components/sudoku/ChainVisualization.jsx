import React from 'react';
import { motion } from 'framer-motion';

export default function ChainVisualization({ chains, strongLinks, weakLinks, cellSize = 50, gridSize = 450 }) {
  if (!chains && (!strongLinks || strongLinks.length === 0)) return null;

  const getCellCenter = (cellIndex) => {
    const row = Math.floor(cellIndex / 9);
    const col = cellIndex % 9;
    const x = (col + 0.5) * cellSize;
    const y = (row + 0.5) * cellSize;
    return { x, y };
  };

  const renderArrow = (from, to, type = 'strong', key) => {
    const start = getCellCenter(from);
    const end = getCellCenter(to);
    
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
    <div className="absolute inset-0 pointer-events-none">
      <svg width={gridSize} height={gridSize} className="absolute top-0 left-0">
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
      </svg>
    </div>
  );
}