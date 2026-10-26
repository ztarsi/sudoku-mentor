import React from 'react';
import { motion } from 'framer-motion';
import { useHintAnimation } from './hintAnimation';
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery';

const RED = '#ef4444';

/**
 * Draws the current hint-animation frame over the board.
 *
 * Five things, which between them are every family's picture: regions a
 * pattern stands on, links between marks, rings on the marks themselves,
 * crosses on what goes, and a ring on what is placed. A frame says which of
 * them it wants and the board draws exactly that - so the same overlay
 * serves a colouring, a fish and a forcing proof, and no family needs a
 * second one.
 *
 * Where the player has asked their system for less motion, every frame
 * still draws in full; it simply arrives rather than growing into place.
 */
export default function HintAnimationOverlay({ size }) {
  const anim = useHintAnimation();
  const reduced = usePrefersReducedMotion();
  if (!anim || !size) return null;
  const f = anim.frames[anim.index];
  const cs = size / 9;
  const c = (i) => ({ x: (i % 9) * cs + cs / 2, y: Math.floor(i / 9) * cs + cs / 2 });
  // With reduced motion the frame is drawn at rest: no growing, no fading.
  const grow = reduced
    ? { initial: false, animate: { pathLength: 1 }, transition: { duration: 0 } }
    : { initial: { pathLength: 0 }, animate: { pathLength: 1 }, transition: { duration: 0.6 } };
  const appear = reduced
    ? { initial: false, animate: { scale: 1, opacity: 1 }, transition: { duration: 0 } }
    : { initial: { scale: 0.6, opacity: 0 }, animate: { scale: 1, opacity: 1 } };

  return (
    <svg
      className="absolute inset-0 pointer-events-none z-20"
      width={size}
      height={size}
      style={{ overflow: 'visible' }}
      data-testid="hint-animation-overlay"
      data-frame={anim.index}
    >
      {/* The shape the pattern stands on: one outlined cell per member, so
          a line, a set and a rectangle all read as the region they are. */}
      {f.regions.map((region, r) =>
        region.cells.map((cell) => {
          const p = c(cell);
          return (
            <motion.rect
              key={`r${r}-${cell}`}
              x={p.x - cs / 2 + 1}
              y={p.y - cs / 2 + 1}
              width={cs - 2}
              height={cs - 2}
              rx={cs * 0.18}
              fill={region.color}
              fillOpacity={0.12}
              stroke={region.color}
              strokeWidth={2}
              strokeDasharray="4,3"
              {...appear}
            />
          );
        })
      )}
      {f.regions.map((region, r) =>
        region.label ? (
          <text
            key={`rl${r}`}
            x={c(region.cells[0]).x - cs / 2 + 3}
            y={c(region.cells[0]).y - cs / 2 + cs * 0.26}
            fill={region.color}
            fontSize={cs * 0.22}
            fontWeight="600"
          >
            {region.label}
          </text>
        ) : null
      )}
      {f.lines.map((link, i) => {
        const a = c(link.from);
        const b = c(link.to);
        return (
          <motion.line
            key={`l${i}`}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke={link.color}
            strokeWidth={link.emphasis ? 4 : 3}
            strokeDasharray={link.dashed ? '6,4' : undefined}
            strokeLinecap="round"
            opacity={link.emphasis ? 1 : 0.7}
            {...grow}
          />
        );
      })}
      {/* A colouring can give two marks in one cell opposite colours, so a
          second ring on the same cell is drawn inside the first rather than
          over it: two rings, two colours, both still readable. */}
      {f.rings.map((ring, i) => {
        const p = c(ring.cell);
        const depth = f.rings.slice(0, i).filter((r) => r.cell === ring.cell).length;
        return (
          <motion.circle
            key={`c${ring.cell}-${ring.color}-${depth}`}
            cx={p.x}
            cy={p.y}
            r={cs * (0.36 - depth * 0.11)}
            fill={depth === 0 ? ring.color : 'none'}
            fillOpacity={0.25}
            stroke={ring.color}
            strokeWidth={3}
            {...appear}
          />
        );
      })}
      {f.crosses.map((cell) => (
        <Cross key={`x${cell}`} p={c(cell)} cs={cs} reduced={reduced} />
      ))}
      {f.place && (
        <motion.circle
          cx={c(f.place.cell).x}
          cy={c(f.place.cell).y}
          r={cs * 0.42}
          fill="none"
          stroke="#10b981"
          strokeWidth={4}
          {...appear}
        />
      )}
    </svg>
  );
}

const Cross = ({ p, cs, reduced }) => {
  const r = cs * 0.28;
  const appear = reduced
    ? { initial: false, animate: { opacity: 1, scale: 1 }, transition: { duration: 0 } }
    : { initial: { opacity: 0, scale: 0.4 }, animate: { opacity: 1, scale: 1 }, transition: { delay: 0.5 } };
  return (
    <motion.g {...appear} style={{ transformOrigin: `${p.x}px ${p.y}px` }}>
      <rect x={p.x - cs / 2 + 2} y={p.y - cs / 2 + 2} width={cs - 4} height={cs - 4} fill={RED} fillOpacity={0.18} stroke={RED} strokeWidth={2} rx={4} />
      <line x1={p.x - r} y1={p.y - r} x2={p.x + r} y2={p.y + r} stroke={RED} strokeWidth={4} strokeLinecap="round" />
      <line x1={p.x + r} y1={p.y - r} x2={p.x - r} y2={p.y + r} stroke={RED} strokeWidth={4} strokeLinecap="round" />
    </motion.g>
  );
};
