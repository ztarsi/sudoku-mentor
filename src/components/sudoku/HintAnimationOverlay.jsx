import React from 'react';
import { motion } from 'framer-motion';
import { useHintAnimation } from './hintAnimation';

const BLUE = '#3b82f6';
const ORANGE = '#f97316';
const RED = '#ef4444';

/** Draws the current hint-animation frame over the board. */
export default function HintAnimationOverlay({ size }) {
  const anim = useHintAnimation();
  if (!anim || !size) return null;
  const f = anim.frames[anim.index];
  const cs = size / 9;
  const c = (i) => ({ x: (i % 9) * cs + cs / 2, y: Math.floor(i / 9) * cs + cs / 2 });
  const colorOf = (i) => (!f.colored ? '#a78bfa' : f.colorA.includes(i) ? BLUE : ORANGE);
  return (
    <>
    <svg className="absolute inset-0 pointer-events-none z-20" width={size} height={size} style={{ overflow: 'visible' }}>
      {f.allLinks.slice(0, f.links).map((l, i) => {
        const a = c(l.from.cell); const b = c(l.to.cell);
        const isActive = f.active && f.active.includes(l.from.cell) && f.active.includes(l.to.cell);
        return (
          <motion.line key={`l${i}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6 }}
            stroke={isActive ? '#facc15' : '#a78bfa'} strokeWidth={isActive ? 4 : 3} strokeLinecap="round" opacity={0.85} />
        );
      })}
      {f.chain.map((i) => {
        const p = c(i);
        return (
          <motion.circle key={`c${i}`} cx={p.x} cy={p.y} r={cs * 0.36}
            initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            fill={f.colored ? colorOf(i) : 'transparent'} fillOpacity={f.colored ? 0.35 : 0}
            stroke={colorOf(i)} strokeWidth={3} />
        );
      })}
      {f.conflict && (() => {
        const a = c(f.conflict[0]); const b = c(f.conflict[1]);
        return <motion.line x1={a.x} y1={a.y} x2={b.x} y2={b.y} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
          stroke={RED} strokeWidth={5} strokeDasharray="8,5" strokeLinecap="round" />;
      })()}
      {f.proofs && f.proofs.map(({ cell, a, b }) => {
        const p = c(cell);
        return (
          <g key={`p${cell}`}>
            {[[a, BLUE], [b, ORANGE]].filter(([x]) => x != null).map(([x, col]) => {
              const q = c(x);
              return <motion.line key={x} x1={p.x} y1={p.y} x2={q.x} y2={q.y} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                transition={{ duration: 0.7 }} stroke={col} strokeWidth={2.5} strokeDasharray="6,4" />;
            })}
            <Cross p={p} cs={cs} />
          </g>
        );
      })}
      {(f.wrongCells ?? []).map((i) => <Cross key={`x${i}`} p={c(i)} cs={cs} />)}
    </svg>
    </>
  );
}

const Cross = ({ p, cs }) => {
  const r = cs * 0.28;
  return (
    <motion.g initial={{ opacity: 0, scale: 0.4 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 }} style={{ transformOrigin: `${p.x}px ${p.y}px` }}>
      <rect x={p.x - cs / 2 + 2} y={p.y - cs / 2 + 2} width={cs - 4} height={cs - 4} fill={RED} fillOpacity={0.18} stroke={RED} strokeWidth={2} rx={4} />
      <line x1={p.x - r} y1={p.y - r} x2={p.x + r} y2={p.y + r} stroke={RED} strokeWidth={4} strokeLinecap="round" />
      <line x1={p.x + r} y1={p.y - r} x2={p.x - r} y2={p.y + r} stroke={RED} strokeWidth={4} strokeLinecap="round" />
    </motion.g>
  );
};