// Keyboard shortcut resolution for the desktop page, kept free of React so
// it can be unit-tested with synthetic events.
//
// Two browser facts shape this:
// - With Shift held, `e.key` for the digit row is "!" "@" "#"... not "1"
//   "2" "3", so Shift+digit has to be read from `e.code` (Digit1, Numpad1).
// - Ctrl+1-9 / Cmd+1-9 switch browser tabs and cannot be intercepted, so
//   the digit filter also answers to Alt+1-9 and to a bare digit when no
//   cell is selected.

/** The digit 1-9 a key event refers to, regardless of Shift/Alt, or null. */
export const digitFromEvent = (e) => {
  const m = /^(?:Digit|Numpad)([1-9])$/.exec(e.code || '');
  if (m) return Number(m[1]);
  if (typeof e.key === 'string' && e.key.length === 1 && e.key >= '1' && e.key <= '9') return Number(e.key);
  return null;
};

/** True when the event comes from a text field, where shortcuts must not fire. */
export const isTypingTarget = (target) => {
  if (!target || typeof target !== 'object') return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable === true;
};

/**
 * Map a keydown event to a shortcut action.
 *
 * @param {KeyboardEvent|object} e
 * @param {{ hasSelection: boolean }} ctx
 * @returns {{ type: string, digit?: number, direction?: string } | null}
 */
export const resolveShortcut = (e, { hasSelection }) => {
  const key = typeof e.key === 'string' ? e.key : '';
  const lower = key.toLowerCase();
  const mod = e.ctrlKey || e.metaKey;

  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
    return { type: 'move', direction: key.replace('Arrow', '').toLowerCase() };
  }
  if (key === 'Escape') return { type: 'escape' };
  if (key === 'Backspace' || key === 'Delete') return { type: 'clear-cell' };

  const digit = digitFromEvent(e);
  if (digit) {
    if (e.altKey || mod) return { type: 'focus-digit', digit };
    if (e.shiftKey) return { type: 'toggle-candidate', digit };
    if (!hasSelection) return { type: 'focus-digit', digit };
    return { type: 'input', digit };
  }

  if (lower === 'h' && !mod && !e.altKey) return { type: 'hint' };
  if (lower === 'a' && !mod && !e.altKey) return { type: 'apply' };
  if (lower === 'c' && !mod && !e.altKey) return { type: 'clear-grid' };
  if (lower === 'z' && !e.shiftKey) return { type: 'undo' };
  if (lower === 'z' && e.shiftKey) return { type: 'redo' };
  if (lower === 'y' && mod) return { type: 'redo' };
  return null;
};

/** The reference list shown in the shortcuts card. Keep in step with resolveShortcut. */
export const SHORTCUT_REFERENCE = [
  { label: 'Navigate cells', keys: 'Arrow keys' },
  { label: 'Enter number', keys: '1-9' },
  { label: 'Toggle candidate', keys: 'Shift + 1-9' },
  { label: 'Candidate mode (while held)', keys: 'Shift' },
  { label: 'Focus digit', keys: '1-9 with no cell selected, or Alt + 1-9' },
  { label: 'Hint', keys: 'H' },
  { label: 'Apply step', keys: 'A' },
  { label: 'Undo', keys: 'Z or Ctrl/Cmd + Z' },
  { label: 'Redo', keys: 'Shift + Z or Ctrl/Cmd + Y' },
  { label: 'Clear cell', keys: 'Delete / Backspace' },
  { label: 'Clear grid', keys: 'C' },
  { label: 'Clear selection and focus', keys: 'Esc' },
];
