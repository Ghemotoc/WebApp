/**
 * Tests for who sees the website home page (TRIAL-WALL; Robert, 23 Nov 2026).
 * Proves: a signed-in member who opens the site's address is sent to their own home, the Writers'
 * hub, and a visitor stays on the website home page. The page's content is stubbed: only the
 * redirect is under test here (the page itself is covered by e2e/home.spec.ts).
 */
import { screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import { useSession } from '@/features/auth/hooks/useSession';
import { renderWithProviders } from '@/test/renderWithProviders';

import { WebsiteHomePage } from './WebsiteHomePage';

vi.mock('@/features/auth/hooks/useSession', () => ({ useSession: vi.fn() }));
vi.mock('../hooks/useWebsiteContent', () => ({
  useWebsiteContent: () => ({ entries: [], readFailed: false }),
}));
vi.mock('./HomeShelves', () => ({ HomeShelves: () => null }));

/** Opens "/" with the home page there and a stand-in for the Writers' hub. */
function openHome() {
  const router = createMemoryRouter(
    [
      { path: '/', element: <WebsiteHomePage /> },
      { path: '/hub', element: <p>The Writers' hub</p> },
    ],
    { initialEntries: ['/'] },
  );
  renderWithProviders(<RouterProvider router={router} />, 'en');
  return router;
}

describe('WebsiteHomePage', () => {
  it('sends a signed-in member to their own home, the Writers’ hub', () => {
    vi.mocked(useSession).mockReturnValue({ userId: 'member-1', isKnown: true });
    const router = openHome();
    expect(router.state.location.pathname).toBe('/hub');
    expect(screen.getByText("The Writers' hub")).toBeTruthy();
  });

  it('keeps a visitor on the website home page', () => {
    vi.mocked(useSession).mockReturnValue({ userId: null, isKnown: true });
    const router = openHome();
    expect(router.state.location.pathname).toBe('/');
    expect(screen.queryByText("The Writers' hub")).toBeNull();
  });
});
