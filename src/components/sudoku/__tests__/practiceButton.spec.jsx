// @vitest-environment jsdom
//
// Where practice is offered (#139): from a technique's reference, only for a
// technique with positions, and never in No Assist, where it would be
// assistance.
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import TechniqueModal from '../TechniqueModal';
import { UNIQUENESS_ONE } from '../uniqueness';
import { practiceCount } from '../practice';

afterEach(cleanup);
const open = (props) =>
  render(<TechniqueModal technique="X-Wing" count={undefined} onCount={undefined} uniqueness={UNIQUENESS_ONE} onClose={() => {}} {...props} />);

describe('the Practise button', () => {
  it('is offered for a technique with positions, saying how many, and starts practice', () => {
    const onPractise = vi.fn();
    open({ onPractise });
    const button = screen.getByRole('button', { name: /^Practise this on/ });
    expect(button.textContent).toBe(`Practise this on ${practiceCount('X-Wing')} real boards`);
    fireEvent.click(button);
    expect(onPractise).toHaveBeenCalledWith('X-Wing');
  });

  it('is not offered in No Assist', () => {
    open({ onPractise: vi.fn(), noAssistMode: true });
    expect(screen.queryByRole('button', { name: /^Practise this/ })).toBeNull();
  });

  it('is not offered for a technique with no position, rather than failing when pressed', () => {
    render(<TechniqueModal technique="Forcing Net" count={undefined} onCount={undefined} uniqueness={UNIQUENESS_ONE} onClose={() => {}} onPractise={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /^Practise this/ })).toBeNull();
  });
});
