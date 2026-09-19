// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import HeaderMenu from '../HeaderMenu';

afterEach(() => cleanup());

const items = (onPrint, onClear) => [
  { id: 'print', label: 'Print puzzle', onSelect: onPrint },
  null,
  { id: 'clear', label: 'Clear the board', danger: true, onSelect: onClear },
];

describe('HeaderMenu', () => {
  it('is closed until the button is pressed, then lists every item with words', () => {
    const { getByRole, queryByRole } = render(<HeaderMenu items={items(vi.fn(), vi.fn())} />);
    expect(queryByRole('menu')).toBeNull();
    const button = getByRole('button', { name: 'Menu' });
    expect(button.getAttribute('aria-haspopup')).toBe('menu');
    fireEvent.click(button);
    expect(getByRole('menu')).toBeTruthy();
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(getByRole('menuitem', { name: 'Print puzzle' })).toBeTruthy();
    expect(getByRole('menuitem', { name: 'Clear the board' })).toBeTruthy();
    expect(getByRole('separator')).toBeTruthy();
  });

  it('runs the item and closes on selection', () => {
    const onPrint = vi.fn();
    const { getByRole, queryByRole } = render(<HeaderMenu items={items(onPrint, vi.fn())} />);
    fireEvent.click(getByRole('button', { name: 'Menu' }));
    fireEvent.click(getByRole('menuitem', { name: 'Print puzzle' }));
    expect(onPrint).toHaveBeenCalledTimes(1);
    expect(queryByRole('menu')).toBeNull();
  });

  it('closes on Escape and on a click outside', () => {
    const { getByRole, queryByRole } = render(
      <div>
        <p>outside</p>
        <HeaderMenu items={items(vi.fn(), vi.fn())} />
      </div>
    );
    fireEvent.click(getByRole('button', { name: 'Menu' }));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(queryByRole('menu')).toBeNull();
    fireEvent.click(getByRole('button', { name: 'Menu' }));
    fireEvent.pointerDown(document.body);
    expect(queryByRole('menu')).toBeNull();
  });
});
