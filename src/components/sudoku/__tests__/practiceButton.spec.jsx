// @vitest-environment jsdom
//
// Where practice is offered (#139): from a technique's reference, only for a
// technique with positions, and never in No Assist, where it would be
// assistance.
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, act, waitFor } from '@testing-library/react';
import TechniqueModal from '../TechniqueModal';
import LogicPanel from '../LogicPanel';
import { PUZZLES } from '../puzzles';
import { generateCandidates } from '../logicEngine';
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

// The drill replaces the board, so nothing the player chose it from may be
// left open over it: not the technique's page, and not the reference that
// page was opened from.
describe('starting practice from the reference', () => {
  it('closes the reference and the technique page', async () => {
    const grid = generateCandidates(
      PUZZLES.easy[0].puzzle.map((value, index) => ({ cellIndex: index, value: value || null, isFixed: value !== 0, candidates: [] }))
    );
    const onPractise = vi.fn();
    const noop = () => {};
    render(
      <LogicPanel currentStep={null} grid={grid} noAssistMode={false} onHighlightTechnique={noop} onNextStep={noop}
        onApplyStep={noop} onCancelHintSearch={noop} onAssistUsed={noop} onNextPuzzle={noop} onShowSingle={noop}
        getElapsedSeconds={() => 0} onPractise={onPractise} />
    );
    if (!screen.queryByRole('button', { name: /^Browse all/ })) fireEvent.click(screen.getByRole('button', { name: 'Techniques' }));
    await act(async () => { fireEvent.click(await screen.findByRole('button', { name: /^Browse all/ })); });
    expect(screen.getByText('Technique reference')).toBeTruthy();
    fireEvent.click(screen.getAllByText('X-Wing', { exact: true })[0]);
    fireEvent.click(await screen.findByRole('button', { name: /^Practise this on/ }));
    expect(onPractise).toHaveBeenCalledWith('X-Wing');
    // Both dialogs animate out; once they have, neither is left.
    await waitFor(() => expect(screen.queryByText('Technique reference')).toBeNull());
    await waitFor(() => expect(screen.queryByRole('button', { name: /^Practise this on/ })).toBeNull());
  });
});
