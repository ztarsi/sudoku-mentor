// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { arrangementFor, useArrangement } from '../useArrangement';

const flagsFor = (width) => ({
  wide: width >= 1200,
  twoColumns: width >= 960,
  medium: width >= 800,
  stacked: width >= 600,
});

describe('arrangementFor', () => {
  it('gives every width one arrangement and one home for the lesson', () => {
    expect(arrangementFor(flagsFor(1366))).toMatchObject({ arrangement: 'wide', lesson: 'column', stripFixed: false });
    expect(arrangementFor(flagsFor(1024))).toMatchObject({ arrangement: 'medium', lesson: 'column', stripFixed: false });
    expect(arrangementFor(flagsFor(900))).toMatchObject({ arrangement: 'medium', lesson: 'side', stripFixed: false });
    expect(arrangementFor(flagsFor(768))).toMatchObject({ arrangement: 'stacked', lesson: 'bottom', stripFixed: true });
    expect(arrangementFor(flagsFor(390))).toMatchObject({ arrangement: 'phone', lesson: 'none', stripFixed: true });
  });

  it('keeps the boundaries where the spec puts them', () => {
    expect(arrangementFor(flagsFor(1199)).arrangement).toBe('medium');
    expect(arrangementFor(flagsFor(1200)).arrangement).toBe('wide');
    expect(arrangementFor(flagsFor(799)).arrangement).toBe('stacked');
    expect(arrangementFor(flagsFor(800)).arrangement).toBe('medium');
    expect(arrangementFor(flagsFor(599)).arrangement).toBe('phone');
    expect(arrangementFor(flagsFor(600)).arrangement).toBe('stacked');
  });

  it('passes the pointer through', () => {
    expect(arrangementFor({ ...flagsFor(1024), touch: true }).touch).toBe(true);
    expect(arrangementFor(flagsFor(1024)).touch).toBe(false);
  });
});

describe('useArrangement', () => {
  const original = window.matchMedia;
  afterEach(() => {
    window.matchMedia = original;
  });

  const stubWidth = (width, coarse = false) => {
    window.matchMedia = /** @type {any} */ ((query) => {
      const min = /min-width:\s*(\d+)px/.exec(query);
      const matches = min ? width >= Number(min[1]) : query.includes('coarse') ? coarse : false;
      return { matches, media: query, addEventListener() {}, removeEventListener() {} };
    });
  };

  it('reads the four width queries and the pointer', () => {
    stubWidth(810, true);
    const { result } = renderHook(() => useArrangement());
    expect(result.current).toMatchObject({ arrangement: 'medium', lesson: 'side', touch: true });
  });

  it('is a phone under 600px whatever the pointer', () => {
    stubWidth(500, false);
    const { result } = renderHook(() => useArrangement());
    expect(result.current).toMatchObject({ arrangement: 'phone', lesson: 'none', stripFixed: true });
  });
});
