/**
 * Tests for the shared undo note (design books item 14, "Undo").
 *
 * What it proves: an offer shows its message with an Undo button; Undo runs the offer and the
 * note goes; a failed Undo says so; the note goes by itself after 8 seconds; a newer offer
 * replaces the older one.
 */
import { act, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';

import { UNDO_SECONDS } from './UndoProvider';
import { useUndo } from './useUndo';

/** A button that offers Undo with the given message and undo. */
function Offerer({ message, undo }: { message: string; undo: () => Promise<void> }) {
  const { offerUndo } = useUndo();
  return <button onClick={() => offerUndo({ message, undo })}>{`offer ${message}`}</button>;
}

afterEach(() => vi.useRealTimers());

describe('the undo note', () => {
  it('shows the message, and Undo runs the offer and takes the note away', async () => {
    const undo = vi.fn(async () => {});
    renderWithProviders(<Offerer message="Comment deleted." undo={undo} />, 'en');
    fireEvent.click(screen.getByRole('button', { name: 'offer Comment deleted.' }));
    expect(screen.getByText('Comment deleted.')).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    });
    expect(undo).toHaveBeenCalledOnce();
    expect(screen.queryByText('Comment deleted.')).not.toBeInTheDocument();
  });

  it('says so when Undo fails', async () => {
    const undo = vi.fn(async () => {
      throw new Error('broken on purpose');
    });
    renderWithProviders(<Offerer message="Comment deleted." undo={undo} />, 'en');
    fireEvent.click(screen.getByRole('button', { name: 'offer Comment deleted.' }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    });
    expect(
      screen.getByText('That couldn’t be undone. Try again from the page.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Undo' })).not.toBeInTheDocument();
  });

  it('goes by itself after 8 seconds', () => {
    vi.useFakeTimers();
    renderWithProviders(<Offerer message="Removed." undo={async () => {}} />, 'en');
    fireEvent.click(screen.getByRole('button', { name: 'offer Removed.' }));
    act(() => vi.advanceTimersByTime((UNDO_SECONDS - 1) * 1000));
    expect(screen.getByText('Removed.')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1500));
    expect(screen.queryByText('Removed.')).not.toBeInTheDocument();
  });

  it('shows only the newest offer', () => {
    renderWithProviders(
      <>
        <Offerer message="First." undo={async () => {}} />
        <Offerer message="Second." undo={async () => {}} />
      </>,
      'en',
    );
    fireEvent.click(screen.getByRole('button', { name: 'offer First.' }));
    fireEvent.click(screen.getByRole('button', { name: 'offer Second.' }));
    expect(screen.queryByText('First.')).not.toBeInTheDocument();
    expect(screen.getByText('Second.')).toBeInTheDocument();
  });
});
