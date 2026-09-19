import React, { useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * Sign-in button, or the signed-in avatar with a small menu. Shared by the
 * desktop and mobile pages; it owns its own open/closed state, closes on
 * Escape and on any click outside, and returns focus to its button.
 */
export default function AccountMenu({ user }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const buttonRef = useRef(null);

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
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [open]);

  if (!user) {
    return (
      <button
        onClick={() => base44.auth.redirectToLogin(window.location.href)}
        className="px-3 lg:px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg lg:rounded-xl transition-all duration-200 font-medium text-sm whitespace-nowrap"
      >
        Sign in
      </button>
    );
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        ref={buttonRef}
        onClick={() => setOpen((v) => !v)}
        className="px-2.5 py-2 bg-slate-800 text-slate-300 rounded-lg lg:rounded-xl hover:bg-slate-700 transition-all duration-200 flex items-center justify-center"
        title={user.email}
        aria-label="Account menu"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <svg className="w-4 h-4 lg:w-5 lg:h-5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        <span className="ml-1.5 text-sm font-medium whitespace-nowrap">Account</span>
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Account"
          className="absolute right-0 mt-2 w-56 bg-slate-800 rounded-lg shadow-xl border border-slate-700 overflow-hidden z-50"
        >
          <div className="px-4 py-3 border-b border-slate-700">
            <p className="text-sm text-slate-400">Signed in as</p>
            <p className="text-sm font-medium text-white truncate">{user.email}</p>
          </div>
          <button
            role="menuitem"
            onClick={() => {
              setOpen(false);
              base44.auth.logout();
            }}
            className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 transition-colors"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
