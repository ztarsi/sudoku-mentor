// @vitest-environment jsdom
// Issue #109: asking for a hint used to render the lesson, leave
// document.activeElement on <body> and say nothing in any live region. The
// core teaching loop was unusable without a mouse and sight, so these are
// the two things a change here must never break again: a hint moves focus
// into the card, and a live region receives what it found.
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import CurrentStepCard from '../panel/CurrentStepCard';
import HeaderMenu from '../HeaderMenu';
import { announceStep } from '../explainStep';
import { overlayOwnsKeyboard } from '../keyboardShortcuts';
import { restoreFocusAfterLesson } from '../lessonFocus';

const noop = () => {};
const base = {
  currentStep: null, grid: null, noAssistMode: false, onNextStep: noop, onApplyStep: noop,
  onSelectTechnique: noop,
};

/** A single on R1C5: the simplest lesson the mentor gives. */
const single = {
  technique: 'Naked Single',
  digit: 7,
  placement: { cell: 4, digit: 7 },
  baseCells: [4],
  eliminations: [],
  explanation: 'R1C5 has one candidate left',
};

/** The card, with whatever this test wants to change about it. */
const cardElement = (props) => <CurrentStepCard {...base} {...props} />;
const show = (props) => render(cardElement(props));

const card = (container) => container.querySelector('[data-lesson-card]');
const status = (container) => container.querySelector('[role="status"]');

afterEach(() => cleanup());

describe('a hint arriving', () => {
  it('moves focus into the hint card, not to the top of the document', () => {
    const { container } = show({ currentStep: single });
    expect(document.activeElement).not.toBe(document.body);
    expect(card(container).contains(document.activeElement)).toBe(true);
  });

  it('writes the lesson into a live region that was already on the page', () => {
    const { container, rerender } = render(cardElement());
    // Idle: the region is mounted and empty, so filling it is a change a
    // screen reader can notice.
    expect(status(container)).not.toBeNull();
    expect(status(container).textContent).toBe('');

    rerender(cardElement({ currentStep: single }));
    const said = status(container).textContent;
    expect(said).toContain('Hint: Naked Single');
    expect(said).toContain('Write 7 in row 1, column 5');
    // Cells are spoken, not spelled.
    expect(said).not.toContain('R1C5');
  });

  it('only singles left is a lesson too: it takes focus and says so', () => {
    const { container } = show({ nothingLeft: true });
    expect(card(container).contains(document.activeElement)).toBe(true);
    expect(status(container).textContent).toContain('Only singles left');
  });

  it('leaves focus alone while the same lesson is on screen', () => {
    const { container, rerender, getByRole } = render(cardElement({ currentStep: single }));
    const apply = getByRole('button', { name: 'Apply' });
    apply.focus();
    // Re-reading the same hint, or switching explanation level, is not a new
    // lesson: it must not pull focus back out of the player's hands.
    fireEvent.click(getByRole('radio', { name: 'Expert' }));
    rerender(cardElement({ currentStep: single }));
    expect(document.activeElement).toBe(apply);
    expect(card(container)).not.toBeNull();
  });
});

describe('announceStep', () => {
  it('names the technique, says what to look at and what to do, and nothing else', () => {
    const said = announceStep(single, null, 'simple');
    expect(said.startsWith('Hint: Naked Single.')).toBe(true);
    expect(said).toContain('Look at row 1, column 5');
    expect(said).toContain('Write 7 in row 1, column 5.');
    // "Why it works" stays in the card: focus has just moved there.
    expect(said).not.toContain('already been ruled out');
  });

  it('gives the Expert reader the engine sentence instead of the Look line', () => {
    const said = announceStep(single, null, 'detailed');
    expect(said).toContain('has one candidate left');
    expect(said).toContain('Write 7 in row 1, column 5.');
  });

  it('is empty without a step', () => {
    expect(announceStep(null, null, 'simple')).toBe('');
  });
});

describe('the header menu holds the keyboard while it is open', () => {
  const items = [
    { id: 'how', label: 'How to play', onSelect: noop },
    { id: 'print', label: 'Print puzzle', onSelect: noop },
  ];
  const flushFrame = () => new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));

  it('keeps Tab inside the list and gives focus back to the hamburger', async () => {
    const { getByRole } = render(
      <div>
        <button type="button">Board cell</button>
        <HeaderMenu items={items} />
      </div>
    );
    const hamburger = getByRole('button', { name: 'Menu' });
    fireEvent.click(hamburger);
    await flushFrame();
    expect(document.activeElement).toBe(getByRole('menuitem', { name: 'How to play' }));

    // Tab off the last item comes back to the first, and a Tab taken while
    // focus has strayed behind the menu is pulled back inside: before this,
    // thirteen of twenty-two Tab stops walked the board and the digit pad.
    getByRole('menuitem', { name: 'Print puzzle' }).focus();
    fireEvent.keyDown(document.activeElement, { key: 'Tab' });
    expect(document.activeElement).toBe(getByRole('menuitem', { name: 'How to play' }));

    getByRole('button', { name: 'Board cell' }).focus();
    fireEvent.keyDown(document.activeElement, { key: 'Tab' });
    expect(getByRole('menu').contains(document.activeElement)).toBe(true);

    fireEvent.keyDown(document.activeElement, { key: 'Escape' });
    expect(document.activeElement).toBe(hamburger);
  });

  it('is an overlay that owns the arrow keys, so the board does not move under it', () => {
    const { getByRole } = render(<HeaderMenu items={items} />);
    expect(overlayOwnsKeyboard()).toBe(false);
    fireEvent.click(getByRole('button', { name: 'Menu' }));
    expect(overlayOwnsKeyboard()).toBe(true);
  });
});

describe('the lesson going away', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  /** The page in miniature: a hint control, a lesson holding focus, a board. */
  const page = () => {
    document.body.innerHTML = `
      <button data-hint-control type="button">Hint</button>
      <button id="cell" type="button">Row 1, column 1</button>
      <div data-lesson-sheet>
        <button id="close" type="button">Close the lesson</button>
        <div data-lesson-card tabindex="-1">
          <button id="apply" type="button">Apply</button>
        </div>
      </div>
    `;
    return {
      hint: document.querySelector('[data-hint-control]'),
      apply: document.getElementById('apply'),
      close: document.getElementById('close'),
      cell: document.getElementById('cell'),
      lesson: document.querySelector('[data-lesson-sheet]'),
    };
  };

  it('hands focus back to the hint control instead of dropping it on the body', () => {
    const { hint, apply, lesson } = page();
    apply.focus();
    // Apply, in the order it really happens: the page asks, React removes
    // the card the button was in, and the frame after that looks.
    let onNextFrame = () => {};
    restoreFocusAfterLesson((fn) => { onNextFrame = fn; });
    lesson.remove();
    expect(document.activeElement).toBe(document.body);
    onNextFrame();
    expect(document.activeElement).toBe(hint);
  });

  it('does not wait for a sheet to finish animating out to take its focus', () => {
    const { hint, close } = page();
    close.focus();
    let onNextFrame = () => {};
    restoreFocusAfterLesson((fn) => { onNextFrame = fn; });
    onNextFrame();
    expect(document.activeElement).toBe(hint);
  });

  it('leaves focus where the player put it', () => {
    const { cell } = page();
    // Applying with A from a board cell: focus stays on the cell.
    cell.focus();
    restoreFocusAfterLesson((fn) => fn());
    expect(document.activeElement).toBe(cell);
  });
});
