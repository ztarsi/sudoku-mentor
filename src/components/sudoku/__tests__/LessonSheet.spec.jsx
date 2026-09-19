// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import LessonSheet from '../LessonSheet';

afterEach(() => cleanup());

describe('LessonSheet', () => {
  it('renders nothing while closed and the lesson while open, without dimming the board', () => {
    const closed = render(
      <LessonSheet side="bottom" open={false}>
        <p>the lesson</p>
      </LessonSheet>
    );
    expect(closed.queryByText('the lesson')).toBeNull();
    cleanup();

    const opened = render(
      <LessonSheet side="bottom" open>
        <p>the lesson</p>
      </LessonSheet>
    );
    expect(opened.getByText('the lesson')).toBeTruthy();
    // Not a dialog: shortcuts and the board keep working underneath.
    expect(opened.queryByRole('dialog')).toBeNull();
    expect(opened.getByLabelText('Lesson').getAttribute('data-side')).toBe('bottom');
  });

  it('closes from its button and on Escape when not pinned', () => {
    const onClose = vi.fn();
    const { getByLabelText } = render(
      <LessonSheet side="right" open onClose={onClose}>
        <p>x</p>
      </LessonSheet>
    );
    fireEvent.click(getByLabelText('Close the lesson'));
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('ignores Escape while pinned and reports the pin toggle', () => {
    const onClose = vi.fn();
    const onPinnedChange = vi.fn();
    const { getByLabelText } = render(
      <LessonSheet side="right" open pinned onClose={onClose} onPinnedChange={onPinnedChange}>
        <p>x</p>
      </LessonSheet>
    );
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
    const pin = getByLabelText('Unpin the lesson');
    expect(pin.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(pin);
    expect(onPinnedChange).toHaveBeenCalledWith(false);
  });

  it('sits above the strip bar and reports its height for the page to pad', () => {
    const onHeightChange = vi.fn();
    const { getByLabelText, rerender } = render(
      <LessonSheet side="bottom" open bottomOffset={140} onHeightChange={onHeightChange}>
        <p>x</p>
      </LessonSheet>
    );
    expect(getByLabelText('Lesson').style.bottom).toBe('140px');
    expect(onHeightChange).toHaveBeenCalled();
    rerender(
      <LessonSheet side="bottom" open={false} bottomOffset={140} onHeightChange={onHeightChange}>
        <p>x</p>
      </LessonSheet>
    );
    expect(onHeightChange).toHaveBeenLastCalledWith(0);
  });
});
