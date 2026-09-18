// The desktop keyboard map, checked with the raw event shapes browsers
// actually produce: Shift+1 arrives as key "!" with code "Digit1", numpad
// digits as key "1" with code "Numpad1", and so on.
import { describe, it, expect } from 'vitest';
import { resolveShortcut, digitFromEvent, isTypingTarget, SHORTCUT_REFERENCE } from '../keyboardShortcuts';

const ev = (key, extra = {}) => ({ key, ctrlKey: false, metaKey: false, shiftKey: false, altKey: false, ...extra });
const sel = { hasSelection: true };
const noSel = { hasSelection: false };

describe('digitFromEvent', () => {
  it('reads the digit from the physical key even when Shift changes e.key', () => {
    expect(digitFromEvent(ev('!', { code: 'Digit1', shiftKey: true }))).toBe(1);
    expect(digitFromEvent(ev('(', { code: 'Digit9', shiftKey: true }))).toBe(9);
    expect(digitFromEvent(ev('1', { code: 'Numpad1' }))).toBe(1);
    expect(digitFromEvent(ev('End', { code: 'Numpad1' }))).toBe(1); // numlock off
  });
  it('falls back to e.key when there is no usable code', () => {
    expect(digitFromEvent(ev('7'))).toBe(7);
    expect(digitFromEvent(ev('0', { code: 'Digit0' }))).toBeNull();
    expect(digitFromEvent(ev('a'))).toBeNull();
  });
});

describe('resolveShortcut', () => {
  it('Shift + digit toggles a candidate (the reported bug)', () => {
    expect(resolveShortcut(ev('!', { code: 'Digit1', shiftKey: true }), sel)).toEqual({ type: 'toggle-candidate', digit: 1 });
    expect(resolveShortcut(ev('%', { code: 'Digit5', shiftKey: true }), sel)).toEqual({ type: 'toggle-candidate', digit: 5 });
  });

  it('plain digit enters a number when a cell is selected, focuses the digit otherwise', () => {
    expect(resolveShortcut(ev('4', { code: 'Digit4' }), sel)).toEqual({ type: 'input', digit: 4 });
    expect(resolveShortcut(ev('4', { code: 'Digit4' }), noSel)).toEqual({ type: 'focus-digit', digit: 4 });
  });

  it('Alt, Ctrl or Cmd + digit focuses the digit', () => {
    expect(resolveShortcut(ev('3', { code: 'Digit3', altKey: true }), sel)).toEqual({ type: 'focus-digit', digit: 3 });
    expect(resolveShortcut(ev('3', { code: 'Digit3', ctrlKey: true }), sel)).toEqual({ type: 'focus-digit', digit: 3 });
    expect(resolveShortcut(ev('3', { code: 'Digit3', metaKey: true }), sel)).toEqual({ type: 'focus-digit', digit: 3 });
  });

  it('letters map to hint, apply, clear grid, undo and redo', () => {
    expect(resolveShortcut(ev('h'), sel)).toEqual({ type: 'hint' });
    expect(resolveShortcut(ev('H', { shiftKey: true }), sel)).toEqual({ type: 'hint' });
    expect(resolveShortcut(ev('a'), sel)).toEqual({ type: 'apply' });
    expect(resolveShortcut(ev('c'), sel)).toEqual({ type: 'clear-grid' });
    expect(resolveShortcut(ev('z'), sel)).toEqual({ type: 'undo' });
    expect(resolveShortcut(ev('z', { ctrlKey: true }), sel)).toEqual({ type: 'undo' });
    expect(resolveShortcut(ev('Z', { shiftKey: true }), sel)).toEqual({ type: 'redo' });
    expect(resolveShortcut(ev('Z', { shiftKey: true, ctrlKey: true }), sel)).toEqual({ type: 'redo' });
    expect(resolveShortcut(ev('y', { ctrlKey: true }), sel)).toEqual({ type: 'redo' });
  });

  it('browser combos are left alone (Ctrl+C, Ctrl+A, Ctrl+H, plain y)', () => {
    expect(resolveShortcut(ev('c', { ctrlKey: true }), sel)).toBeNull();
    expect(resolveShortcut(ev('a', { metaKey: true }), sel)).toBeNull();
    expect(resolveShortcut(ev('h', { ctrlKey: true }), sel)).toBeNull();
    expect(resolveShortcut(ev('y'), sel)).toBeNull();
    expect(resolveShortcut(ev('Shift', { shiftKey: true }), sel)).toBeNull();
  });

  it('navigation, escape and clearing a cell', () => {
    expect(resolveShortcut(ev('ArrowLeft'), sel)).toEqual({ type: 'move', direction: 'left' });
    expect(resolveShortcut(ev('Escape'), sel)).toEqual({ type: 'escape' });
    expect(resolveShortcut(ev('Backspace'), sel)).toEqual({ type: 'clear-cell' });
    expect(resolveShortcut(ev('Delete'), sel)).toEqual({ type: 'clear-cell' });
  });
});

describe('isTypingTarget', () => {
  it('recognises text fields and contenteditable', () => {
    expect(isTypingTarget({ tagName: 'INPUT' })).toBe(true);
    expect(isTypingTarget({ tagName: 'TEXTAREA' })).toBe(true);
    expect(isTypingTarget({ tagName: 'DIV', isContentEditable: true })).toBe(true);
    expect(isTypingTarget({ tagName: 'DIV' })).toBe(false);
    expect(isTypingTarget(null)).toBe(false);
  });
});

describe('SHORTCUT_REFERENCE', () => {
  it('documents every action the resolver can produce', () => {
    const labels = SHORTCUT_REFERENCE.map((s) => s.label.toLowerCase()).join(' ');
    ['navigate', 'enter number', 'toggle candidate', 'focus digit', 'hint', 'apply', 'undo', 'redo', 'clear cell', 'clear grid', 'esc'].forEach((word) => {
      expect(labels + ' ' + SHORTCUT_REFERENCE.map((s) => s.keys.toLowerCase()).join(' ')).toContain(word);
    });
  });
});
