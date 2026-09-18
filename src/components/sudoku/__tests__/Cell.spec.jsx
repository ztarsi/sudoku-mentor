// @vitest-environment jsdom
//
// Regression: the candidate sub-grid used to swallow every click on an
// empty cell (stopPropagation on all nine slots), so empty cells could not
// be selected with the mouse and the mobile page could not place digits.
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import Cell from '../Cell';

const baseCell = (overrides = {}) => ({
  value: null,
  isFixed: false,
  candidates: [],
  isBaseCell: false,
  isTargetCell: false,
  isUnitCell: false,
  ...overrides,
});

const renderCell = (props = {}) => {
  const onClick = vi.fn();
  const onInput = vi.fn();
  const onToggleCandidate = vi.fn();
  const cellProps = /** @type {any} */ ({
    alsSet: null,
    alsUnitHighlight: null,
    currentStep: null,
    xDigit: null,
    zDigit: null,
    onTouchStart: undefined,
    onTouchEnd: undefined,
    onTouchMove: undefined,
  });
  const utils = render(
    <Cell
      {...cellProps}
      cellId="sudoku-cell-4"
      cell={baseCell(props.cell)}
      isSelected={false}
      isFocusedDigit={false}
      isDimmed={false}
      isHighlightedNumber={false}
      hasError={false}
      borderClasses=""
      focusedDigit={null}
      focusedCandidates={null}
      removalCandidates={null}
      candidateMode={props.candidateMode ?? false}
      candidatesVisible={true}
      colors={{}}
      onClick={onClick}
      onInput={onInput}
      onToggleCandidate={onToggleCandidate}
      cellSize={props.cellSize}
      touchInput={props.touchInput ?? false}
      rejected={props.rejected ?? null}
    />
  );
  return { ...utils, onClick, onInput, onToggleCandidate };
};

describe('Cell click handling', () => {
  it('selects an empty cell when a slot without a candidate is clicked (desktop)', () => {
    const { container, onClick, onInput } = renderCell();
    // Click the middle slot (digit 5) - the cell has no candidates
    const slots = container.querySelectorAll('[aria-hidden="true"] > div');
    expect(slots.length).toBe(9);
    fireEvent.click(slots[4]);
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onInput).not.toHaveBeenCalled();
  });

  it('places a candidate digit when its slot is clicked in solve mode (desktop)', () => {
    const { container, onClick, onInput } = renderCell({ cell: { candidates: [5] } });
    const slots = container.querySelectorAll('[aria-hidden="true"] > div');
    fireEvent.click(slots[4]);
    expect(onInput).toHaveBeenCalledWith(5);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('toggles a candidate when its slot is clicked in candidate mode (desktop)', () => {
    const { container, onToggleCandidate } = renderCell({ cell: { candidates: [5] }, candidateMode: true });
    const slots = container.querySelectorAll('[aria-hidden="true"] > div');
    fireEvent.click(slots[4]);
    expect(onToggleCandidate).toHaveBeenCalledWith(5);
  });

  it('routes every tap to the cell on a touch screen, even over a candidate slot', () => {
    const { container, onClick, onInput } = renderCell({ cell: { candidates: [5] }, cellSize: 40, touchInput: true });
    const overlay = container.querySelector('[aria-hidden="true"]');
    expect(overlay.className).toContain('pointer-events-none');
    // With pointer-events disabled the browser never dispatches to a slot;
    // clicking the cell itself must reach onClick.
    fireEvent.click(container.querySelector('#sudoku-cell-4'));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onInput).not.toHaveBeenCalled();
  });

  it('flashes the refused digit in red when an entry is rejected', () => {
    const { queryByTestId, rerender } = renderCell();
    expect(queryByTestId('rejected-input')).toBeNull();

    const cellProps = /** @type {any} */ ({});
    rerender(
      <Cell
        {...cellProps}
        cellId="sudoku-cell-4"
        cell={baseCell()}
        isSelected={true}
        isFocusedDigit={false}
          isDimmed={false}
        isHighlightedNumber={false}
        hasError={false}
        borderClasses=""
        focusedDigit={null}
        focusedCandidates={null}
        removalCandidates={null}
        candidateMode={false}
        candidatesVisible={true}
        colors={{}}
        onClick={() => {}}
        onInput={() => {}}
        onToggleCandidate={() => {}}
        rejected={{ cellIndex: 4, digit: 7, id: 1 }}
      />
    );
    const flash = queryByTestId('rejected-input');
    expect(flash).not.toBeNull();
    expect(flash.textContent).toBe('7');
    expect(flash.className).toContain('pointer-events-none');
    // The refused digit is never written into the cell itself
    expect(document.getElementById('sudoku-cell-4').getAttribute('aria-label'))
      .toBe('Row 1, column 5: empty');
  });

  it('exposes a descriptive accessible name', () => {
    const { container } = renderCell({ cell: { candidates: [1, 5] } });
    expect(container.querySelector('#sudoku-cell-4').getAttribute('aria-label'))
      .toBe('Row 1, column 5: empty, candidates 1 5');
  });

  it('names the hint role and removed candidates, not just a colour', () => {
    const { container, rerender } = renderCell({ cell: { candidates: [1, 5], isBaseCell: true } });
    expect(container.querySelector('#sudoku-cell-4').getAttribute('aria-label'))
      .toBe('Row 1, column 5: empty, candidates 1 5, part of the hint pattern');

    const cellProps = /** @type {any} */ ({});
    rerender(
      <Cell
        {...cellProps}
        cellId="sudoku-cell-4"
        cell={baseCell({ candidates: [1, 5], isTargetCell: true })}
        isSelected={true}
        isFocusedDigit={false}
          isDimmed={false}
        isHighlightedNumber={false}
        hasError={false}
        borderClasses=""
        focusedDigit={null}
        focusedCandidates={null}
        removalCandidates={new Set([5])}
        candidateMode={false}
        candidatesVisible={true}
        colors={{}}
        onClick={() => {}}
        onInput={() => {}}
        onToggleCandidate={() => {}}
      />
    );
    expect(container.querySelector('#sudoku-cell-4').getAttribute('aria-label'))
      .toBe('Row 1, column 5: empty, candidates 1 5, hint target, hint removes 5, selected');
  });
});
