/**
 * Tests for the members-only front door (TRIAL-WALL; Robert, 23 Nov 2026).
 * Proves: while members_only is on, a signed-out visitor who opens Library, Together or search
 * lands on the home page, while the home page, Read (Discover, a story, a chapter preview),
 * signing in and the legal pages stay open; a member passes; with the flag off or unreadable,
 * the page shows as usual.
 */
import { screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useSession } from '@/features/auth/hooks/useSession';
import { useFeatureFlags } from '@/features/flags/hooks/useFeatureFlags';
import { renderWithProviders } from '@/test/renderWithProviders';

import { SignedOutGate } from './SignedOutGate';

vi.mock('@/features/auth/hooks/useSession', () => ({ useSession: vi.fn() }));
vi.mock('@/features/flags/hooks/useFeatureFlags', () => ({ useFeatureFlags: vi.fn() }));

/** Sets who is signed in and the flag; "failed" means the flags could not be read. */
function setUp(visitor: 'member' | 'signed out', flag: 'on' | 'off' | 'failed') {
  vi.mocked(useSession).mockReturnValue({
    userId: visitor === 'member' ? 'member-id' : null,
    isKnown: true,
  });
  vi.mocked(useFeatureFlags).mockReturnValue({
    isOn: (key: string, safeDefault: boolean) =>
      key === 'members_only' ? flag === 'on' : safeDefault,
    isLoaded: flag !== 'failed',
    hasFailed: flag === 'failed',
  });
}

/** Opens a page inside the gate; the home page says so, so a jump to it can be seen. */
function openPage(path: string) {
  const router = createMemoryRouter(
    [
      { path: '/', element: <p>The home page</p> },
      { path: '*', element: <SignedOutGate>{<p>The page itself</p>}</SignedOutGate> },
    ],
    { initialEntries: [path] },
  );
  return renderWithProviders(<RouterProvider router={router} />, 'en');
}

beforeEach(() => {
  vi.mocked(useSession).mockReset();
  vi.mocked(useFeatureFlags).mockReset();
});

describe('SignedOutGate', () => {
  it('sends a signed-out visitor from Library, Together and search to the home page while the flag is on', async () => {
    setUp('signed out', 'on');
    for (const path of ['/library', '/forums', '/search?q=vreme', '/u/inkwolf', '/write']) {
      const { unmount } = openPage(path);
      expect(await screen.findByText('The home page')).toBeTruthy();
      expect(screen.queryByText('The page itself')).toBeNull();
      unmount();
    }
  });

  it('keeps Read, signing in and the legal pages open to a signed-out visitor', () => {
    setUp('signed out', 'on');
    const openPaths = [
      '/discover',
      '/discover/c/fantasy',
      '/s/statia-meteo',
      '/s/statia-meteo/abc12345',
      '/sign-in',
      '/join/abc',
      '/legal/terms',
      '/contact',
      '/ro/en/legal/privacy',
    ];
    for (const path of openPaths) {
      const { unmount } = openPage(path);
      expect(screen.getByText('The page itself')).toBeTruthy();
      unmount();
    }
  });

  it('lets a member open any page', () => {
    setUp('member', 'on');
    openPage('/library');
    expect(screen.getByText('The page itself')).toBeTruthy();
  });

  it('shows the page while the flag is off', () => {
    setUp('signed out', 'off');
    openPage('/library');
    expect(screen.getByText('The page itself')).toBeTruthy();
  });

  it('shows the page when the flags cannot be read, so the site never locks itself', () => {
    setUp('signed out', 'failed');
    openPage('/library');
    expect(screen.getByText('The page itself')).toBeTruthy();
  });
});
