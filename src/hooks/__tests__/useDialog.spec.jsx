// @vitest-environment jsdom
import React, { useState } from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, cleanup, act } from '@testing-library/react';
import { useDialog } from '../useDialog';

function Dialog({ open, onClose, children, initialFocus = undefined }) {
  const dialog = useDialog({ open, onClose, initialFocus });
  if (!open) return null;
  return (
    <div ref={dialog.ref} {...dialog.props} aria-label="Test dialog" data-testid="dialog">
      {children}
    </div>
  );
}

function Harness({ onClose = () => {}, initialFocus = undefined }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button data-testid="opener" onClick={() => setOpen(true)}>Open</button>
      <button data-testid="outside">Outside</button>
      <Dialog
        open={open}
        initialFocus={initialFocus}
        onClose={() => {
          onClose();
          setOpen(false);
        }}
      >
        <button data-testid="first">First</button>
        <input data-testid="middle" />
        <button data-testid="last">Last</button>
      </Dialog>
    </div>
  );
}

const flushFrame = async () => {
  await act(async () => {
    await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
  });
};

afterEach(() => cleanup());

describe('useDialog', () => {
  it('moves focus into the dialog on open and restores it on close', async () => {
    const { getByTestId, queryByTestId } = render(<Harness />);
    const opener = getByTestId('opener');
    opener.focus();
    fireEvent.click(opener);
    await flushFrame();

    expect(document.activeElement).toBe(getByTestId('first'));
    expect(getByTestId('dialog').getAttribute('role')).toBe('dialog');
    expect(getByTestId('dialog').getAttribute('aria-modal')).toBe('true');

    fireEvent.keyDown(document.activeElement, { key: 'Escape' });
    expect(queryByTestId('dialog')).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it('honours initialFocus', async () => {
    const { getByTestId } = render(<Harness initialFocus="[data-testid=middle]" />);
    fireEvent.click(getByTestId('opener'));
    await flushFrame();
    expect(document.activeElement).toBe(getByTestId('middle'));
  });

  it('cycles Tab and Shift+Tab inside the dialog', async () => {
    const { getByTestId } = render(<Harness />);
    fireEvent.click(getByTestId('opener'));
    await flushFrame();

    getByTestId('last').focus();
    fireEvent.keyDown(getByTestId('last'), { key: 'Tab' });
    expect(document.activeElement).toBe(getByTestId('first'));

    fireEvent.keyDown(getByTestId('first'), { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(getByTestId('last'));

    // Focus that escaped (e.g. a click on the backdrop) is pulled back in.
    getByTestId('outside').focus();
    fireEvent.keyDown(getByTestId('outside'), { key: 'Tab' });
    expect(document.activeElement).toBe(getByTestId('first'));
  });

  it('calls onClose on Escape and stops the key reaching page handlers', async () => {
    const onClose = vi.fn();
    const pageHandler = vi.fn();
    window.addEventListener('keydown', pageHandler);
    const { getByTestId } = render(<Harness onClose={onClose} />);
    fireEvent.click(getByTestId('opener'));
    await flushFrame();

    fireEvent.keyDown(getByTestId('first'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(pageHandler).not.toHaveBeenCalled();
    window.removeEventListener('keydown', pageHandler);
  });

  it('only the top-most of two open dialogs handles Escape', async () => {
    const outerClose = vi.fn();
    const innerClose = vi.fn();
    function Nested() {
      const [inner, setInner] = useState(false);
      return (
        <Dialog open onClose={outerClose}>
          <button data-testid="open-inner" onClick={() => setInner(true)}>Inner</button>
          <Dialog open={inner} onClose={() => { innerClose(); setInner(false); }}>
            <button data-testid="inner-btn">Inner button</button>
          </Dialog>
        </Dialog>
      );
    }
    const { getByTestId } = render(<Nested />);
    await flushFrame();
    fireEvent.click(getByTestId('open-inner'));
    await flushFrame();
    expect(document.activeElement).toBe(getByTestId('inner-btn'));

    fireEvent.keyDown(document.activeElement, { key: 'Escape' });
    expect(innerClose).toHaveBeenCalledTimes(1);
    expect(outerClose).not.toHaveBeenCalled();

    // Inner closed: focus returns to its opener, and Escape now closes the outer one.
    expect(document.activeElement).toBe(getByTestId('open-inner'));
    fireEvent.keyDown(document.activeElement, { key: 'Escape' });
    expect(outerClose).toHaveBeenCalledTimes(1);
  });
});
