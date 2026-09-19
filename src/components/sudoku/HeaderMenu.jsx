import React, { useEffect, useRef, useState } from 'react';
import { Menu } from 'lucide-react';

/**
 * The one overflow menu in the header (header-and-menu spec). Everything
 * secondary lives here, each item labelled with words. The hamburger is
 * the only icon-only control in the header.
 *
 * `items` is a list of `{ id, label, icon, onSelect, danger? }`; a `null`
 * entry draws a divider. The menu closes on Escape, on a click outside and
 * after any selection, and returns focus to its button. Arrow keys move
 * between items.
 */
export default function HeaderMenu({ items, label = 'Menu' }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const buttonRef = useRef(/** @type {HTMLButtonElement | null} */ (null));
  const listRef = useRef(/** @type {HTMLDivElement | null} */ (null));

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setOpen(false);
        buttonRef.current?.focus();
        return;
      }
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      const list = listRef.current;
      if (!list) return;
      const entries = Array.from(list.querySelectorAll('[role="menuitem"]'));
      if (entries.length === 0) return;
      e.preventDefault();
      const at = entries.indexOf(/** @type {any} */ (document.activeElement));
      const next = e.key === 'ArrowDown' ? (at + 1) % entries.length : (at - 1 + entries.length) % entries.length;
      /** @type {HTMLElement} */ (entries[next]).focus();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey, true);
    // Focus the first item so the keyboard lands inside the menu.
    const raf = requestAnimationFrame(() => {
      const first = listRef.current?.querySelector('[role="menuitem"]');
      if (first instanceof HTMLElement) first.focus();
    });
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [open]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="p-2 bg-slate-800 text-slate-300 rounded-lg lg:rounded-xl hover:bg-slate-700 transition-all duration-200 flex items-center justify-center"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Menu className="w-5 h-5 pointer-events-none" aria-hidden="true" />
      </button>

      {open && (
        <div
          ref={listRef}
          role="menu"
          aria-label={label}
          className="absolute right-0 mt-2 w-60 bg-slate-800 rounded-xl shadow-xl border border-slate-700 overflow-hidden z-50 py-1"
        >
          {items.map((item, i) => {
            if (!item) return <div key={`divider-${i}`} role="separator" className="my-1 border-t border-slate-700" />;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  buttonRef.current?.focus();
                  item.onSelect();
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors focus:outline-none focus:bg-slate-700 hover:bg-slate-700 ${
                  item.danger ? 'text-red-300' : 'text-slate-200'
                }`}
              >
                {Icon && <Icon className="w-4 h-4 shrink-0 text-slate-400" aria-hidden="true" />}
                <span>{item.label}</span>
                {item.hint && <span className="ml-auto text-xs text-slate-500 font-mono">{item.hint}</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
