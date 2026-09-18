import { useEffect, useRef } from 'react';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), ' +
  'textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function focusableIn(root) {
  return Array.from(root.querySelectorAll(FOCUSABLE)).filter(
    (el) => el.getAttribute('aria-hidden') !== 'true' && !el.closest('[hidden]')
  );
}

// Open dialogs, oldest first. Only the top-most one reacts to the keyboard,
// so a confirmation opened on top of the puzzle loader closes alone.
const openStack = [];

/**
 * Shared modal behaviour for every dialog in the app: Escape closes it,
 * Tab cycles inside it, focus moves into it when it opens, and focus goes
 * back to whatever had it when it closes.
 *
 * Usage:
 *   const dialog = useDialog({ open, onClose });
 *   <div ref={dialog.ref} {...dialog.props} aria-label="Load puzzle">…</div>
 *
 * `props` supplies role="dialog", aria-modal and tabIndex=-1 so the panel
 * itself can take focus when it has no focusable child.
 *
 * @param {{ open: boolean, onClose?: () => void, initialFocus?: string }} options
 *   `initialFocus` is a selector inside the dialog to focus first; otherwise
 *   the first [autofocus] element, then the first focusable one, then the
 *   dialog panel.
 */
export function useDialog({ open, onClose, initialFocus }) {
  // Typed loosely so the same ref attaches to a div, a motion.div or an aside.
  const ref = useRef(/** @type {any} */ (null));
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;

    const previouslyFocused = document.activeElement;
    const restoreTarget =
      previouslyFocused instanceof HTMLElement ? previouslyFocused : null;
    openStack.push(ref);

    const focusInitial = () => {
      const node = ref.current;
      if (!node) return;
      if (node.contains(document.activeElement)) return;
      const preferred =
        (initialFocus && node.querySelector(initialFocus)) ||
        node.querySelector('[autofocus]') ||
        focusableIn(node)[0] ||
        node;
      if (preferred instanceof HTMLElement) preferred.focus({ preventScroll: true });
    };
    // Dialogs animate in; give the panel one frame to mount before focusing.
    const raf = requestAnimationFrame(focusInitial);

    const onKeyDown = (e) => {
      const node = ref.current;
      if (!node) return;
      if (openStack[openStack.length - 1] !== ref) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onCloseRef.current?.();
        return;
      }

      if (e.key !== 'Tab') return;
      const items = focusableIn(node);
      if (items.length === 0) {
        e.preventDefault();
        node.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      const inside = node.contains(active);
      if (e.shiftKey) {
        if (!inside || active === first) {
          e.preventDefault();
          last.focus();
        }
      } else if (!inside || active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKeyDown, true);
      const at = openStack.lastIndexOf(ref);
      if (at !== -1) openStack.splice(at, 1);
      if (restoreTarget && restoreTarget.isConnected) {
        restoreTarget.focus({ preventScroll: true });
      }
    };
  }, [open, initialFocus]);

  return {
    ref,
    props: { role: 'dialog', 'aria-modal': true, tabIndex: -1 },
  };
}
