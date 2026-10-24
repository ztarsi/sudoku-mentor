import React, { useState, useRef, useMemo, useEffect } from 'react';
import Cell from './Cell';
import CellContextMenu from './CellContextMenu';
import { buildHighlightSets, buildChainOverlay } from './stepHighlights';
import { commonUnit } from './gridUnits';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { isTypingTarget } from './keyboardShortcuts';
import { dialogJustClosed } from '@/hooks/useDialog';

export default function SudokuGrid({
  grid,
  selectedCell,
  focusedDigit,
  focusedCandidates,
  removalCandidates,
  highlightedDigit,
  validationErrors,
  candidateMode,
  candidatesVisible,
  colors,
  currentStep,
  highlightedSteps = [],
  playbackIndex,
  rejectedInput = null,
  maxSize = null,
  onCellClick,
  onCellInput,
  onToggleCandidate
}) {
  const [contextMenu, setContextMenu] = useState({ isOpen: false, cellIndex: null, position: { x: 0, y: 0 } });
  const [measuredWidth, setMeasuredWidth] = useState(0);
  const [overlaySize, setOverlaySize] = useState(0);
  const longPressTimerRef = useRef(null);
  // A finger lifting after a long-press still fires a click on the cell;
  // that click must not place the focused digit under the menu.
  const longPressFiredRef = useRef(false);
  const touchStartPosRef = useRef({ x: 0, y: 0 });
  const gridWrapperRef = useRef(null);
  const gridContainerRef = useRef(null);

  // Narrow layout sizes the grid from the container; touch input decides
  // whether pencil-mark slots are click targets. A mouse in a narrow
  // window keeps click-to-place; a finger never hits a 13px slot.
  const isMobile = useMediaQuery('(max-width: 1023px)');
  const touchInput = useMediaQuery('(pointer: coarse)');

  // ResizeObserver: measure real available container width on mobile
  useEffect(() => {
    if (!isMobile) return;
    const el = gridWrapperRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setMeasuredWidth(entry.contentRect.width);
      }
    });
    observer.observe(el);
    setMeasuredWidth(el.getBoundingClientRect().width);
    return () => observer.disconnect();
  }, [isMobile]);

  // Measure the rendered grid itself (all layouts) so the SVG overlays can
  // position lines correctly. Previously they only rendered on mobile - and
  // desktop, which is where chain/ALS steps are actually shown, got nothing.
  useEffect(() => {
    const el = gridContainerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setOverlaySize(entry.contentRect.width);
      }
    });
    observer.observe(el);
    setOverlaySize(el.getBoundingClientRect().width);
    return () => observer.disconnect();
  }, []);

  // Grid sizing. The page passes `maxSize`, the height left for the board
  // once the header, the status strip and the digit strip have their room
  // (issue #55): board and strip fit the viewport together on every width.
  // Narrow layouts size from the measured container width as well.
  const heightCap = maxSize ?? (typeof window !== 'undefined' ? window.innerHeight - 120 : Infinity);
  const gridSize = isMobile && measuredWidth > 0
    ? Math.floor(Math.min(measuredWidth, heightCap) / 9) * 9
    : null;
  const desktopSize = maxSize ? `min(90vw, 600px, ${Math.floor(maxSize / 9) * 9}px)` : 'min(90vw, 600px)';

  // Cells size their digits and pencil marks from the real cell size on
  // every layout; the fluid desktop grid is measured (overlaySize), so a
  // board capped by the viewport (issue #55) never clips its marks.
  const cellSize = gridSize ? gridSize / 9 : overlaySize > 0 ? overlaySize / 9 : null;

  // Overlay geometry follows the measured on-screen grid, not the mobile
  // sizing model, so it works on the fluid desktop grid too.
  const overlayCellSize = overlaySize > 0 ? overlaySize / 9 : null;

  const getCellCenter = (index) => {
    const row = Math.floor(index / 9);
    const col = index % 9;
    const size = overlayCellSize || 60;
    return { x: col * size + size / 2, y: row * size + size / 2 };
  };

  // DOM focus follows the selection so keyboard users can Tab to the grid
  // and screen readers hear the newly selected cell. Never steal focus
  // from a dialog or a text field.
  useEffect(() => {
    if (selectedCell === null || selectedCell === undefined) return;
    const el = document.getElementById(`sudoku-cell-${selectedCell}`);
    if (!el) return;
    const active = document.activeElement;
    if (active && (active.closest('[role="dialog"]') || isTypingTarget(active))) return;
    if (active === el) return;
    el.focus({ preventScroll: true });
  }, [selectedCell]);

  // Highlight flags are derived from the presented steps at render time;
  // the grid data itself stays purely game state.
  const highlightSets = useMemo(
    () => buildHighlightSets(highlightedSteps ?? []),
    [highlightedSteps]
  );

  const handleTouchStart = (e, cellIndex) => {
    const touch = e.touches[0];
    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
    longPressFiredRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      longPressFiredRef.current = true;
      setContextMenu({ isOpen: true, cellIndex, position: { x: touch.clientX, y: touch.clientY - 10 } });
    }, 500);
  };

  const handleCellClick = (index) => {
    if (longPressFiredRef.current) {
      longPressFiredRef.current = false;
      return;
    }
    // A click that arrives right after a dialog closed is the same press,
    // or a second one, landing where the button was: select, never place.
    onCellClick(index, { selectOnly: dialogJustClosed() });
  };

  // Per-cell callbacks are created once and read the latest page handlers
  // through a ref, so React.memo(Cell) actually skips unchanged cells.
  const latestRef = useRef({ handleCellClick, onCellInput, onToggleCandidate, handleTouchStart: null, handleTouchEnd: null, handleTouchMove: null });
  const cellHandlers = useMemo(
    () =>
      Array.from({ length: 81 }, (_, index) => ({
        onClick: () => latestRef.current.handleCellClick(index),
        onInput: (value) => latestRef.current.onCellInput(index, value),
        onToggleCandidate: (candidate) => latestRef.current.onToggleCandidate(index, candidate),
        onTouchStart: (e) => latestRef.current.handleTouchStart(e, index),
        onTouchEnd: () => latestRef.current.handleTouchEnd(),
        onTouchMove: () => latestRef.current.handleTouchMove(),
      })),
    []
  );

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) { clearTimeout(longPressTimerRef.current); longPressTimerRef.current = null; }
  };

  const handleTouchMove = () => {
    if (longPressTimerRef.current) { clearTimeout(longPressTimerRef.current); longPressTimerRef.current = null; }
  };

  latestRef.current = { handleCellClick, onCellInput, onToggleCandidate, handleTouchStart, handleTouchEnd, handleTouchMove };

  const handleContextMenuClear = () => {
    if (contextMenu.cellIndex !== null) onCellInput(contextMenu.cellIndex, null);
  };

  const handleContextMenuToggleCandidates = () => {
    if (contextMenu.cellIndex !== null && focusedDigit) onToggleCandidate(contextMenu.cellIndex, focusedDigit);
  };

  const alsLinks = useMemo(() => {
    if (currentStep?.technique !== 'ALS-XZ' || !currentStep.als1 || !currentStep.als2) return [];
    const links = [];
    const { als1, als2, zDigit, xDigit } = currentStep;
    const als1ZCells = als1.cells.filter(c => grid[c].candidates.includes(zDigit));
    const als2ZCells = als2.cells.filter(c => grid[c].candidates.includes(zDigit));
    for (let i = 0; i < als1ZCells.length; i++)
      for (let j = i + 1; j < als1ZCells.length; j++)
        links.push({ from: getCellCenter(als1ZCells[i]), to: getCellCenter(als1ZCells[j]), color: '#8b5cf6', type: 'internal', strokeWidth: 2 });
    for (let i = 0; i < als2ZCells.length; i++)
      for (let j = i + 1; j < als2ZCells.length; j++)
        links.push({ from: getCellCenter(als2ZCells[i]), to: getCellCenter(als2ZCells[j]), color: '#8b5cf6', type: 'internal', strokeWidth: 2 });
    const als1XCells = als1.cells.filter(c => grid[c].candidates.includes(xDigit));
    const als2XCells = als2.cells.filter(c => grid[c].candidates.includes(xDigit));
    for (const xCell1 of als1XCells)
      for (const xCell2 of als2XCells)
        links.push({ from: getCellCenter(xCell1), to: getCellCenter(xCell2), color: '#f59e0b', type: 'bridge', strokeWidth: 4, dashArray: '8,4' });
    return links;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, grid, overlayCellSize]);

  // The chain overlay (#67): the nodes in order, strong links solid and
  // weak links dashed, a group drawn as one outlined region so the player
  // sees one node, and a continuous loop drawn closed. The base and target
  // colours already in use, and nothing new. The geometry is a pure helper
  // so the drawing can be checked without a browser.
  const chainOverlay = useMemo(
    () => buildChainOverlay(currentStep, overlayCellSize),
    [currentStep, overlayCellSize]
  );

  const forcingChains = useMemo(() => {
    const forcingTechniques = ['Deep Forcing Chain', 'Hypothesis Mode', 'Cell Forcing Chain'];
    if (!forcingTechniques.includes(currentStep?.technique)) return null;

    const rawChains = currentStep.chains
      ? currentStep.chains
      : currentStep.chain && currentStep.contradiction
      ? [{ cells: currentStep.chain, color: '#ef4444', label: `If ${currentStep.contradictoryDigit}` }]
      : null;
    if (!rawChains) return null;

    // Chain entries are {cell, value, action, reason} records; the overlay
    // needs the sequence of placed cell INDICES. (Passing the raw entries
    // into getCellCenter produced NaN coordinates before.)
    return rawChains.map((chain) => ({
      ...chain,
      cellIndices: (chain.cells ?? [])
        .filter((entry) => (typeof entry === 'object' ? entry.action === 'place' : true))
        .map((entry) => (typeof entry === 'object' ? entry.cell : entry)),
    }));
  }, [currentStep]);

  // A colouring step (3D Medusa) carries its two colours as cell lists,
  // the surviving colour first. Mapped once, not per cell.
  const colorGroupOf = useMemo(() => {
    const groups = currentStep?.colorGroups;
    if (!Array.isArray(groups) || groups.length !== 2) return null;
    const map = new Map();
    groups[0]?.forEach((cell) => map.set(cell, 1));
    groups[1]?.forEach((cell) => map.set(cell, 2));
    return map;
  }, [currentStep]);

  // Hoisted out of the 81-cell render loop (it was recomputed per cell).
  const alsUnits = useMemo(() => {
    if (currentStep?.technique !== 'ALS-XZ' || !currentStep.als1 || !currentStep.als2) {
      return null;
    }
    return {
      als1Cells: new Set(currentStep.als1.cells),
      als2Cells: new Set(currentStep.als2.cells),
      als1Unit: commonUnit(currentStep.als1.cells),
      als2Unit: commonUnit(currentStep.als2.cells),
    };
  }, [currentStep]);

  return (
    <>
      <div ref={gridWrapperRef} className={`relative ${isMobile ? 'w-full flex justify-center' : ''}`}>
        {!isMobile && <div className="absolute inset-0 bg-gradient-to-br from-blue-500/30 to-indigo-500/30 rounded-2xl blur-xl" />}
        <div className={`relative ${isMobile ? '' : 'bg-slate-900 rounded-2xl shadow-2xl shadow-black/50 p-3 border border-slate-700'}`}>
          <div
            ref={gridContainerRef}
            role="group"
            aria-label="Sudoku grid"
            className={`grid grid-cols-9 gap-0 overflow-visible relative ${isMobile ? '' : 'rounded-lg'}`}
            style={{
              border: isMobile ? `2px solid ${colors?.gridLines || '#475569'}` : `3px solid ${colors?.gridLines || '#475569'}`,
              ...(isMobile && gridSize
                ? {
                    width: `${gridSize}px`,
                    height: `${gridSize}px`,
                    gridTemplateColumns: `repeat(9, ${gridSize / 9}px)`,
                    gridTemplateRows: `repeat(9, ${gridSize / 9}px)`,
                  }
                : !isMobile
                ? {
                    width: desktopSize,
                    height: desktopSize,
                    gridTemplateColumns: 'repeat(9, 1fr)',
                    gridTemplateRows: 'repeat(9, 1fr)',
                  }
                : {
                    gridTemplateColumns: 'repeat(9, 1fr)',
                    gridTemplateRows: 'repeat(9, 1fr)',
                  }),
            }}
          >
            {grid.map((cell, index) => {
              const row = Math.floor(index / 9);
              const col = index % 9;
              const box = Math.floor(row / 3) * 3 + Math.floor(col / 3);
              const borderRight = (col + 1) % 3 === 0 && col !== 8 ? (isMobile ? 'border-r-2' : 'border-r-4') : 'border-r';
              const borderBottom = (row + 1) % 3 === 0 && row !== 8 ? (isMobile ? 'border-b-2' : 'border-b-4') : 'border-b';

              let alsSet = null;
              let alsUnitHighlight = null;
              if (alsUnits) {
                if (alsUnits.als1Cells.has(index)) alsSet = 1;
                else if (alsUnits.als2Cells.has(index)) alsSet = 2;
                const inUnit = (unit) => unit && (
                  (unit.type === 'row' && row === unit.value) ||
                  (unit.type === 'col' && col === unit.value) ||
                  (unit.type === 'box' && box === unit.value)
                );
                if (inUnit(alsUnits.als1Unit)) alsUnitHighlight = 1;
                else if (inUnit(alsUnits.als2Unit)) alsUnitHighlight = 2;
              }

              // Highlight flags are derived per render from highlightedSteps,
              // overriding whatever (possibly stale) flags a snapshot carries.
              const isBase = highlightSets.baseCells.has(index);
              const isTarget = highlightSets.targetCells.has(index);
              const isUnit = highlightSets.unitCells.has(index);
              const flagged = isBase || isTarget || isUnit;
              const stale = !!(cell.isBaseCell || cell.isTargetCell || cell.isUnitCell || cell.isHighlighted);
              // Reuse the game's own cell object when nothing changes, so a
              // memoised Cell sees the same props and skips the render.
              const displayCell = flagged || stale
                ? {
                    ...cell,
                    isBaseCell: isBase,
                    isTargetCell: isTarget,
                    isUnitCell: isUnit,
                    isHighlighted: isBase || isTarget,
                    highlightColor: isBase ? 'blue' : isTarget ? 'red' : null,
                  }
                : cell;

              return (
                <Cell
                  key={index}
                  cellId={`sudoku-cell-${index}`}
                  cell={displayCell}
                  isSelected={selectedCell === index}
                  tabbable={selectedCell === index || (selectedCell === null && index === 0)}
                  touchInput={touchInput}
                  isFocusedDigit={false}
                  isDimmed={false}
                  isHighlightedNumber={highlightedDigit !== null && cell.value === highlightedDigit}
                  hasError={validationErrors.includes(index)}
                  borderClasses={`${borderRight} ${borderBottom}`}
                  focusedDigit={focusedDigit}
                  focusedCandidates={focusedCandidates}
                  removalCandidates={removalCandidates?.[index]}
                  candidateMode={candidateMode}
                  candidatesVisible={candidatesVisible}
                  colors={colors}
                  alsSet={alsSet}
                  alsUnitHighlight={alsUnitHighlight}
                  colorGroup={colorGroupOf?.get(index) ?? null}
                  currentStep={currentStep}
                  xDigit={currentStep?.technique === 'ALS-XZ' ? currentStep.xDigit : null}
                  zDigit={currentStep?.technique === 'ALS-XZ' ? currentStep.zDigit : null}
                  cellSize={cellSize}
                  rejected={rejectedInput?.cellIndex === index ? rejectedInput : null}
                  onClick={cellHandlers[index].onClick}
                  onInput={cellHandlers[index].onInput}
                  onToggleCandidate={cellHandlers[index].onToggleCandidate}
                  onTouchStart={cellHandlers[index].onTouchStart}
                  onTouchEnd={cellHandlers[index].onTouchEnd}
                  onTouchMove={cellHandlers[index].onTouchMove}
                />
              );
            })}

            {/* ALS-XZ link overlay */}
            {alsLinks.length > 0 && overlaySize > 0 && (
              <svg className="absolute inset-0 pointer-events-none" width={overlaySize} height={overlaySize} style={{ overflow: 'visible' }}>
                {alsLinks.map((link, i) => (
                  <line key={i} x1={link.from.x} y1={link.from.y} x2={link.to.x} y2={link.to.y}
                    stroke={link.color} strokeWidth={link.strokeWidth} strokeDasharray={link.dashArray}
                    strokeLinecap="round" opacity={0.8} />
                ))}
              </svg>
            )}

            {/* Chain overlay: the nodes in order, strong links solid and
                weak links dashed, groups outlined as one node, a continuous
                loop closed. Playback reveals one link at a time. */}
            {chainOverlay && overlaySize > 0 && (
              <svg
                className="absolute inset-0 pointer-events-none"
                width={overlaySize}
                height={overlaySize}
                style={{ overflow: 'visible' }}
                data-testid="chain-overlay"
                data-chain-links={chainOverlay.links.length}
                data-chain-groups={chainOverlay.groups.length}
                data-chain-closed={chainOverlay.closed ? 'true' : 'false'}
                data-chain-sets={chainOverlay.sets.length}
              >
                {chainOverlay.sets.map((s, i) => (
                  <g key={`s${i}`}>
                    {s.joins.map((j, n) => (
                      <line key={`sj${n}`} x1={j.from.x} y1={j.from.y} x2={j.to.x} y2={j.to.y}
                        stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="4,3" opacity={0.5} />
                    ))}
                    {s.parts.map((p, n) => (
                      <rect
                        key={`sp${n}`}
                        x={p.x}
                        y={p.y}
                        width={p.width}
                        height={p.height}
                        rx={overlayCellSize ? overlayCellSize * 0.18 : 6}
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        strokeDasharray="4,3"
                        opacity={0.6}
                      />
                    ))}
                    {/* The set's digits, inside its own region and outlined
                        so they read over a pencil mark. Where a step says
                        what part a region plays - the overlap, the line and
                        the box of a Sue de Coq - it is named underneath, so
                        three regions can be told apart without inventing a
                        colour for each. */}
                    <text
                      x={s.x + 3}
                      y={s.y + (overlayCellSize ? overlayCellSize * 0.24 : 9)}
                      fill="#60a5fa"
                      stroke={colors?.cellBg || '#020617'}
                      strokeWidth={3}
                      paintOrder="stroke"
                      fontSize={overlayCellSize ? overlayCellSize * 0.24 : 9}
                      fontWeight="600"
                    >
                      {s.digits.join('')}
                    </text>
                    {s.label && (
                      <text
                        x={s.x + 3}
                        y={s.y + (overlayCellSize ? overlayCellSize * 0.48 : 18)}
                        fill="#60a5fa"
                        stroke={colors?.cellBg || '#020617'}
                        strokeWidth={3}
                        paintOrder="stroke"
                        fontSize={overlayCellSize ? overlayCellSize * 0.2 : 8}
                        fontWeight="500"
                      >
                        {s.label}
                      </text>
                    )}
                  </g>
                ))}
                {/* A group is one node: its cells are outlined and joined,
                    cell by cell, so the gap between two of them is never
                    drawn as part of the group. */}
                {chainOverlay.groups.map((g, i) => (
                  <g key={`g${i}`}>
                    {g.joins.map((j, n) => (
                      <line key={`gj${n}`} x1={j.from.x} y1={j.from.y} x2={j.to.x} y2={j.to.y}
                        stroke="#3b82f6" strokeWidth={2} opacity={0.9} />
                    ))}
                    {g.parts.map((p, n) => (
                      <rect
                        key={`gp${n}`}
                        x={p.x}
                        y={p.y}
                        width={p.width}
                        height={p.height}
                        rx={overlayCellSize ? overlayCellSize * 0.18 : 6}
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        opacity={0.9}
                      />
                    ))}
                  </g>
                ))}
                {/* The whole chain stays on the board, so the step is
                    readable at rest; the link the player is standing on is
                    drawn heavier as they walk it. */}
                {chainOverlay.links.map((link, i) => {
                  const here = playbackIndex != null && i === playbackIndex;
                  return (
                    <line
                      key={`l${i}`}
                      x1={link.from.x}
                      y1={link.from.y}
                      x2={link.to.x}
                      y2={link.to.y}
                      stroke="#3b82f6"
                      strokeWidth={(link.strong ? 3 : 2) * (here ? 1.8 : 1)}
                      strokeDasharray={link.strong ? undefined : '5,5'}
                      strokeLinecap="round"
                      opacity={here ? 1 : 0.6}
                      data-chain-link={i}
                      data-chain-strong={link.strong ? 'true' : 'false'}
                    />
                  );
                })}
                {/* The two ends, ringed: one of them is true. They are part
                    of the pattern, so they keep the base colour; the target
                    colour stays reserved for what is erased. */}
                {chainOverlay.endpoints.map((end, i) => (
                  <circle
                    key={`e${i}`}
                    cx={end.x}
                    cy={end.y}
                    r={overlayCellSize ? overlayCellSize * 0.38 : 14}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth={3.5}
                    opacity={0.95}
                  />
                ))}
              </svg>
            )}

            {/* Forcing chain overlay: connect consecutive placements up to
                the current playback position */}
            {forcingChains && overlaySize > 0 && (
              <svg className="absolute inset-0 pointer-events-none" width={overlaySize} height={overlaySize} style={{ overflow: 'visible' }}>
                {forcingChains.map((chain, chainIndex) => {
                  const visible = playbackIndex != null
                    ? chain.cellIndices.slice(0, playbackIndex + 2)
                    : chain.cellIndices;
                  return visible.slice(0, -1).map((cellIdx, i) => {
                    const from = getCellCenter(cellIdx);
                    const to = getCellCenter(visible[i + 1]);
                    return (
                      <line key={`${chainIndex}-${i}`} x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                        stroke={chain.color || '#ef4444'} strokeWidth={2} strokeLinecap="round" opacity={0.7} />
                    );
                  });
                })}
              </svg>
            )}
          </div>
        </div>
      </div>

      <CellContextMenu
        isOpen={contextMenu.isOpen}
        position={contextMenu.position}
        onClose={() => setContextMenu(prev => ({ ...prev, isOpen: false }))}
        onClear={handleContextMenuClear}
        onToggleCandidateMode={handleContextMenuToggleCandidates}
        cell={contextMenu.cellIndex !== null ? grid[contextMenu.cellIndex] : null}
        focusedDigit={focusedDigit}
      />
    </>
  );
}


