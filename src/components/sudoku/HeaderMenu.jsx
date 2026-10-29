import React, { useEffect, useRef, useState } from 'react';
import { Menu, Check } from 'lucide-react';
import { useDialog } from '@/hooks/useDialog';

const ITEM_SELECTOR = '[role="menuitem"], [role="menuitemradio"]';

/**
 * The one overflow menu in the header (header-and-menu spec). Everything
 * secondary lives here, each item labelled with words. The hamburger is
 * the only icon-only control in the header.
 *
 * `items` is a list of `{ id, label, icon, onSelect, danger?, checked? }`;
 * an item with `checked` set is a radio item (a theme choice), a `null`
 * entry draws a divider and `{ heading }` labels the group that follows.
 * The menu closes on Escape, on a click outside and after any selection,
 * and returns focus to its button. Arrow keys move between items.
 *
 * While it is open it holds the keyboard, the way the Library and Scan
 * dialogs do: `useDialog` moves focus to the first item, keeps Tab inside
 * the list and hands focus back to the hamburger when it closes, so Tab no
 * longer walks the board and the digit pad behind an open menu (issue
 * #109). It keeps `role="menu"` and its arrow keys rather than becoming a
 * dialog, because that is what it is.
 */
export default function HeaderMenu({ items, label = 'Menu' }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const buttonRef = useRef(/** @type {HTMLButtonElement | null} */ (null));
  const menu = useDialog({ open, onClose: () => setOpen(false), initialFocus: ITEM_SELECTOR });
  const listRef = menu.ref;

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      const list = listRef.current;
      if (!list) return;
      const entries = Array.from(list.querySelectorAll(ITEM_SELECTOR));
      if (entries.length === 0) return;
      e.preventDefault();
      const at = entries.indexOf(/** @type {any} */ (document.activeElement));
      const next = e.key === 'ArrowDown' ? (at + 1) % entries.length : (at - 1 + entries.length) % entries.length;
      /** @type {HTMLElement} */ (entries[next]).focus();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [open, listRef]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          // Focus the hamburger before opening: it is where focus goes back
          // to when the menu closes, and a click does not focus a button on
          // every browser.
          buttonRef.current?.focus();
          setOpen((v) => !v);
        }}
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
            if (item.heading) {
              return (
                <div key={`heading-${i}`} role="presentation" className="px-4 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  {item.heading}
                </div>
              );
            }
            const Icon = item.icon;
            const radio = typeof item.checked === 'boolean';
            return (
              <button
                key={item.id}
                type="button"
                role={radio ? 'menuitemradio' : 'menuitem'}
                aria-checked={radio ? item.checked : undefined}
                onClick={() => {
                  setOpen(false);
                  item.onSelect();
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors focus:outline-none focus:bg-slate-700 hover:bg-slate-700 ${
                  item.danger ? 'text-red-300' : 'text-slate-200'
                }`}
              >
                {Icon && <Icon className="w-4 h-4 shrink-0 text-slate-400" aria-hidden="true" />}
                <span>{item.label}</span>
                {item.hint && <span className="ml-auto text-xs text-slate-500 font-mono">{item.hint}</span>}
                {radio && item.checked && <Check className="ml-auto w-4 h-4 text-blue-400" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
