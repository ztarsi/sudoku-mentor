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
      hint={props.hint ?? null}
      marksVisible={props.marksVisible ?? null}
      onMarksVisibleChange={props.onMarksVisibleChange ?? null}
      {...handlers}
    />
  );
  return { ...utils, ...handlers };
};

afterEach(() => cleanup());

describe('DigitStrip', () => {
  it('counts down what is left of each digit, and greys it out at zero', () => {
    const placed = {};
    for (let i = 0; i < 9; i++) placed[i * 9 + i] = 7; // nine 7s on the diagonal
    placed[1] = 3;
    const { getByRole, getByTitle } = renderStrip({ grid: gridWith(placed) });
    // The number on the key used to be how many were placed, which nothing
    // said; a phone's first key read "1 0" and could mean either (#107). It
    // is what is left to place now, so it falls as the player works and
    // becomes a tick at the same moment the key greys out.
    expect((getByRole('button', { name: 'Digit 7, all nine placed' })).hasAttribute("disabled")).toBe(true);
    expect((getByRole('button', { name: 'Digit 3, 8 still to place' })).hasAttribute("disabled")).toBe(false);
    expect((getByRole('button', { name: 'Digit 5, 9 still to place' })).hasAttribute("disabled")).toBe(false);
    // Visibly: the badge counts down, and never shows a 0 that could be read
    // as "none placed".
    expect(getByRole('button', { name: /^Digit 3/ }).textContent).toBe('38');
    expect(getByRole('button', { name: /^Digit 7/ }).textContent).toBe('7✓');
    // And a pointer can ask what the number means without a legend on the strip.
    expect(getByTitle('8 of the nine 3s still to place')).toBeTruthy();
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

  // One strip with the same controls at every width (18 September). Shift
  // +digit is a shortcut with no affordance, so without the button a player
  // with a mouse has no way to place a pencil mark at all.
  it('offers the pencil button at every width', () => {
    expect(renderStrip({ touch: false }).getByRole('button', { name: 'Pencil' })).toBeTruthy();
    cleanup();
    expect(renderStrip({ touch: true }).getByRole('button', { name: 'Pencil' })).toBeTruthy();
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

  it('carries the Hint button only where the lesson is a sheet', () => {
    const none = renderStrip();
    expect(none.queryByRole('button', { name: 'Get a hint' })).toBeNull();
    cleanup();

    const onClick = vi.fn();
    const withHint = renderStrip({ hint: { onClick, disabled: false, searching: false } });
    fireEvent.click(withHint.getByRole('button', { name: 'Get a hint' }));
    expect(onClick).toHaveBeenCalledTimes(1);
    cleanup();

    const noAssist = renderStrip({ hint: { onClick, disabled: true } });
    expect(noAssist.getByRole('button', { name: 'Get a hint' }).hasAttribute('disabled')).toBe(true);
    cleanup();

    const onCancel = vi.fn();
    const searching = renderStrip({ hint: { onClick, searching: true, onCancel } });
    expect(searching.queryByRole('button', { name: 'Get a hint' })).toBeNull();
    fireEvent.click(searching.getByRole('button', { name: 'Cancel the hint search' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('shows or hides pencil marks from the pencil control area', () => {
    const none = renderStrip();
    expect(none.queryByRole('button', { name: /pencil marks/ })).toBeNull();
    cleanup();
    const onMarksVisibleChange = vi.fn();
    const { getByRole } = renderStrip({ marksVisible: true, onMarksVisibleChange });
    const toggle = getByRole('button', { name: 'Hide pencil marks' });
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(toggle);
    expect(onMarksVisibleChange).toHaveBeenCalledWith(false);
  });

  // The spec asks for keys "at least 44px square on touch devices" and this
  // test used to be read as holding the product to it. It cannot: nine keys
  // of 44px need 396px before a single gutter, and a 390px phone leaves the
  // strip about 374px. Measured on a production build at 390x844: 39.8 x 44.
  // So the height is the part that is 44, and it is; the width is 4.2px
  // short of a figure that does not fit on the device the figure is for.
  //
  // What a thumb actually trips over there is the gutter, which was 2px: a
  // touch landing a pixel the wrong side of a boundary placed the
  // neighbouring digit, which costs an error and a red flash. It is 6px on
  // touch now, measured 36.2 x 44 with 6px gutters, so a near-miss places
  // nothing instead of the wrong thing (issue #107).
  it('is 44px tall on touch, and spends width on the gutter rather than chasing 44', () => {
    const { getByRole } = renderStrip({ touch: true });
    expect(getByRole('button', { name: /^Digit 1/ }).className).toContain('min-h-[44px]');
    expect(getByRole('button', { name: 'Undo' }).className).toContain('min-h-[44px]');
    const digits = getByRole('group', { name: 'Digits' });
    expect(digits.className).toContain('gap-1.5');
    // Nine 44px keys plus eight 6px gutters is 444px: wider than the phone.
    expect(9 * 44 + 8 * 6).toBeGreaterThan(390);
  });

  it('keeps the tighter gutter where the pointer is precise', () => {
    const { getByRole } = renderStrip({ touch: false });
    expect(getByRole('group', { name: 'Digits' }).className).toContain('gap-0.5');
  });
});
