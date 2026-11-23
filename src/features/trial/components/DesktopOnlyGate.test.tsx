/**
 * Tests for the computers-only trial gate (TRIAL-DESKTOP; board J33).
 * Proves: a phone sees "For now, the test runs on a computer" while the flag is on; a computer,
 * or a phone while the flag is off, sees the page; the DSA contact points stay open on a phone;
 * Copy link copies the address.
 */
import { fireEvent, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useFeatureFlags } from '@/features/flags/hooks/useFeatureFlags';
import { renderWithProviders } from '@/test/renderWithProviders';

import { isTouchFirstDevice } from '../lib/touchFirstDevice';
import { DesktopOnlyGate } from './DesktopOnlyGate';

vi.mock('@/features/flags/hooks/useFeatureFlags', () => ({ useFeatureFlags: vi.fn() }));
vi.mock('@/features/branding/components/BrandMark', () => ({ BrandMark: () => <span>Logo</span> }));
vi.mock('../lib/touchFirstDevice', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/touchFirstDevice')>()),
  isTouchFirstDevice: vi.fn(),
}));

/** Sets the device and the flag. */
function setUp(device: 'phone' | 'computer', isFlagOn: boolean) {
  vi.mocked(isTouchFirstDevice).mockReturnValue(device === 'phone');
  vi.mocked(useFeatureFlags).mockReturnValue({
    isOn: (key: string, safeDefault: boolean) => (key === 'desktop_only' ? isFlagOn : safeDefault),
    isLoaded: true,
    hasFailed: false,
  });
}

/** Opens a page inside the gate. */
function openPage(path: string) {
  const router = createMemoryRouter(
    [{ path: '*', element: <DesktopOnlyGate>{<p>The page itself</p>}</DesktopOnlyGate> }],
    { initialEntries: [path] },
  );
  return renderWithProviders(<RouterProvider router={router} />, 'en');
}

beforeEach(() => vi.mocked(useFeatureFlags).mockReset());

describe('DesktopOnlyGate', () => {
  it('shows a phone the computers-only page while the flag is on', async () => {
    setUp('phone', true);
    openPage('/stories/turnul');
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'For now, the test runs on a computer',
      }),
    ).toBeTruthy();
    expect(screen.queryByText('The page itself')).toBeNull();
    expect(screen.getByText('Phones and tablets are coming later.')).toBeTruthy();
  });

  it('shows a computer the page, even while the flag is on, without reading the flags', () => {
    setUp('computer', true);
    openPage('/stories/turnul');
    expect(screen.getByText('The page itself')).toBeTruthy();
    expect(useFeatureFlags).not.toHaveBeenCalled();
  });

  it('shows a phone the page while the flag is off', () => {
    setUp('phone', false);
    openPage('/');
    expect(screen.getByText('The page itself')).toBeTruthy();
  });

  it('keeps the Legal centre, Contact us and the report form open on a phone', () => {
    setUp('phone', true);
    for (const path of ['/legal/terms', '/contact', '/report', '/ro/en/legal/privacy']) {
      const { unmount } = openPage(path);
      expect(screen.getByText('The page itself')).toBeTruthy();
      unmount();
    }
  });

  it('copies the address on Copy link and says so', async () => {
    setUp('phone', true);
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    openPage('/stories/turnul');
    fireEvent.click(await screen.findByRole('button', { name: 'Copy link' }));
    expect(await screen.findByText('Link copied.')).toBeTruthy();
    expect(writeText).toHaveBeenCalledWith(window.location.href);
  });
});
