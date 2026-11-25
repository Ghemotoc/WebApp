/**
 * Tests for who sees what at "/" (TRIAL-WALL, Robert, 23 Nov 2026; user story 1.1, 25 Nov 2026).
 * Proves: a signed-in member who opens the site's address sees their own Home there (board A01),
 * without being sent anywhere else, and a visitor sees the website home page. Both pages are
 * stubbed: only the choice is under test here (the pages themselves are covered by e2e specs).
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
vi.mock('@/features/hub/components/MemberHomePage', () => ({
  MemberHomePage: () => <p>The member's Home</p>,
}));

/** Opens "/" with the home page there. */
function openHome() {
  const router = createMemoryRouter([{ path: '/', element: <WebsiteHomePage /> }], {
    initialEntries: ['/'],
  });
  renderWithProviders(<RouterProvider router={router} />, 'en');
  return router;
}

describe('WebsiteHomePage', () => {
  it('shows a signed-in member their own Home at the same address', async () => {
    vi.mocked(useSession).mockReturnValue({ userId: 'member-1', isKnown: true });
    const router = openHome();
    expect(await screen.findByText("The member's Home")).toBeTruthy();
    expect(router.state.location.pathname).toBe('/');
  });

  it('shows a visitor the website home page', () => {
    vi.mocked(useSession).mockReturnValue({ userId: null, isKnown: true });
    const router = openHome();
    expect(router.state.location.pathname).toBe('/');
    expect(screen.queryByText("The member's Home")).toBeNull();
  });
});
