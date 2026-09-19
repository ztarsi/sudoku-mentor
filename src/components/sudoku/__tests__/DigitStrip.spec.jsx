// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import DigitStrip from '../DigitStrip';

const gridWith = (placed) =>
  Array.from({ length: 81 }, (_, i) => ({ value: placed[i] ?? null, isFixed: false, candidates: [] }));

const renderStrip = (props = {}) => {
  const handlers = {
    onDigitSelect: vi.fn(),
    onPencilModeChange: vi.fn(),
    onUndo: vi.fn(),
    onRedo: vi.fn(),
    onErase: vi.fn(),
  };
  const utils = render(
    <DigitStrip
      grid={props.grid ?? gridWith({})}
      focusedDigit={props.focusedDigit ?? null}
      pencilMode={props.pencilMode ?? false}
      canUndo={props.canUndo ?? false}
      canRedo={props.canRedo ?? false}
      canErase={props.canErase ?? false}
      rejected={props.rejected ?? null}
      touch={props.touch ?? false}
      {...handlers}
    />
  );
  return { ...utils, ...handlers };
};

afterEach(() => cleanup());

describe('DigitStrip', () => {
  it('shows a count per digit and greys a digit out once all nine are placed', () => {
    const placed = {};
    for (let i = 0; i < 9; i++) placed[i * 9 + i] = 7; // nine 7s on the diagonal
    placed[1] = 3;
    const { getByRole } = renderStrip({ grid: gridWith(placed) });
    expect((getByRole('button', { name: 'Digit 7, 9 placed, complete' })).hasAttribute("disabled")).toBe(true);
    expect((getByRole('button', { name: 'Digit 3, 1 placed' })).hasAttribute("disabled")).toBe(false);
    expect((getByRole('button', { name: 'Digit 5, 0 placed' })).hasAttribute("disabled")).toBe(false);
  });

  it('keeps a completed digit tappable in pencil mode and while it is the selected digit', () => {
    const placed = {};
    for (let i = 0; i < 9; i++) placed[i * 9 + i] = 7;
    const a = renderStrip({ grid: gridWith(placed), pencilMode: true });
    expect((a.getByRole('button', { name: /^Digit 7/ })).hasAttribute("disabled")).toBe(false);
    cleanup();
    const b = renderStrip({ grid: gridWith(placed), focusedDigit: 7 });
    expect((b.getByRole('button', { name: /^Digit 7/ })).hasAttribute("disabled")).toBe(false);
    expect(b.getByRole('button', { name: /^Digit 7/ }).getAttribute('aria-pressed')).toBe('true');
  });

  it('reports digit taps and the pencil toggle', () => {
    const { getByRole, onDigitSelect, onPencilModeChange } = renderStrip();
    fireEvent.click(getByRole('button', { name: /^Digit 4/ }));
    expect(onDigitSelect).toHaveBeenCalledWith(4);
    fireEvent.click(getByRole('button', { name: 'Pencil' }));
    expect(onPencilModeChange).toHaveBeenCalledWith(true);
    expect(getByRole('button', { name: 'Pencil' }).getAttribute('aria-pressed')).toBe('false');
  });

  it('disables Undo, Redo and Erase when there is nothing to do', () => {
    const { getByRole, onUndo } = renderStrip();
    expect((getByRole('button', { name: 'Undo' })).hasAttribute("disabled")).toBe(true);
    expect((getByRole('button', { name: 'Redo' })).hasAttribute("disabled")).toBe(true);
    expect((getByRole('button', { name: 'Erase' })).hasAttribute("disabled")).toBe(true);
    fireEvent.click(getByRole('button', { name: 'Undo' }));
    expect(onUndo).not.toHaveBeenCalled();
  });

  it('names a refused digit and where it was refused', () => {
    const { getByRole } = renderStrip({ rejected: { cellIndex: 9, digit: 4, id: 1 } });
    expect(getByRole('status').textContent).toBe("4 can't go in R2C1");
  });

  it('uses 44px-tall targets on touch devices', () => {
    const { getByRole } = renderStrip({ touch: true });
    expect(getByRole('button', { name: /^Digit 1/ }).className).toContain('min-h-[44px]');
    expect(getByRole('button', { name: 'Undo' }).className).toContain('min-h-[44px]');
  });
});
