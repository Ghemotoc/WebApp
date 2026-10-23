/**
 * Tests for the offline banner (story S1-E1-05: "Given the network drops, when the user is in the
 * app, then an offline banner appears"). Keeping unsaved editor text comes with S1-E3-02.
 */
import { act, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';

import { backOnlineMilliseconds } from '../hooks/useOnlineStatus';
import { OfflineBanner } from './OfflineBanner';

/** Makes the browser report a connection change, as it does when the network drops or returns. */
function setConnection(isOnline: boolean) {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(isOnline);
  act(() => {
    window.dispatchEvent(new Event(isOnline ? 'online' : 'offline'));
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('OfflineBanner', () => {
  it('shows nothing while online', () => {
    renderWithProviders(<OfflineBanner />, 'en');
    expect(screen.getByRole('status').textContent).toBe('');
  });

  it('says the reader is offline when the network drops', () => {
    renderWithProviders(<OfflineBanner />, 'en');
    setConnection(false);
    expect(screen.getByRole('status').textContent).toMatch(/You’re offline/);
  });

  it('says "back online" when the network returns, then goes away', () => {
    renderWithProviders(<OfflineBanner />, 'en');
    setConnection(false);
    setConnection(true);
    expect(screen.getByRole('status').textContent).toBe('You’re back online.');

    act(() => {
      vi.advanceTimersByTime(backOnlineMilliseconds);
    });
    expect(screen.getByRole('status').textContent).toBe('');
  });

  it('speaks Romanian too, with ș and ț', () => {
    renderWithProviders(<OfflineBanner />, 'ro');
    setConnection(false);
    expect(screen.getByRole('status').textContent).toMatch(/Nu ești conectat la internet/);
  });
});
