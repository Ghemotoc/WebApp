/**
 * Tests for the error page (story S1-E1-05, board 7.4 card 4): a page that fails to draw shows
 * "Something went wrong on our side", reports the error once and shows the code to quote.
 */
import { screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';

import { reportError } from '../lib/errorReporter';
import { reloadOnceForNewRelease } from '../lib/staleBuild';
import { ErrorPage } from './ErrorPage';

vi.mock('../lib/errorReporter', () => ({ reportError: vi.fn() }));
vi.mock('../lib/staleBuild', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/staleBuild')>()),
  reloadOnceForNewRelease: vi.fn(),
}));

/** A page that always fails while drawing. */
function BrokenPage(): never {
  throw new TypeError('Cannot draw this page');
}

/** A page whose code file belongs to an older release and could not be loaded. */
function StalePage(): never {
  throw new TypeError('Failed to fetch dynamically imported module: /assets/DiscoverPage-old.js');
}

/** Opens the broken page at an address, with the error page as its error element. */
function openBrokenPage(path: string, Page: () => never = BrokenPage) {
  const router = createMemoryRouter(
    [{ path: '/join/:code', element: <Page />, errorElement: <ErrorPage /> }],
    { initialEntries: [path] },
  );
  return renderWithProviders(<RouterProvider router={router} />, 'en');
}

beforeEach(() => {
  vi.mocked(reportError).mockReset().mockResolvedValue('E-4F7A2C');
  vi.mocked(reloadOnceForNewRelease).mockReset().mockReturnValue(true);
  // React logs the error it caught; that is expected here.
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

describe('ErrorPage', () => {
  it('shows what happened and what to do next', async () => {
    openBrokenPage('/join/SECRETCODE');

    expect(
      screen.getByRole('heading', { level: 1, name: 'Something went wrong on our side' }),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Go to Home' }).getAttribute('href')).toBe('/');
    expect(screen.getByRole('link', { name: 'Contact us' }).getAttribute('href')).toBe(
      '/legal/contact',
    );
    expect(await screen.findByText('Error code E-4F7A2C')).toBeTruthy();
  });

  it('reports the route pattern, never the code in the address', async () => {
    openBrokenPage('/join/SECRETCODE');

    await waitFor(() => expect(reportError).toHaveBeenCalled());
    const [thrown, routePath] = vi.mocked(reportError).mock.calls[0] ?? [];
    expect(thrown).toBeInstanceOf(TypeError);
    expect(routePath).toBe('/join/:code');
  });

  it('shows no code when nothing was stored', async () => {
    vi.mocked(reportError).mockResolvedValue(null);
    openBrokenPage('/join/SECRETCODE');

    await waitFor(() => expect(reportError).toHaveBeenCalled());
    expect(screen.queryByText(/Error code/)).toBeNull();
  });

  it('reloads by itself when the page belongs to an older release, and reports nothing', () => {
    openBrokenPage('/join/SECRETCODE', StalePage);

    expect(reloadOnceForNewRelease).toHaveBeenCalled();
    expect(screen.queryByRole('heading', { name: 'Something went wrong on our side' })).toBeNull();
    expect(reportError).not.toHaveBeenCalled();
  });

  it("shows the error page when the reload already happened and didn't help", async () => {
    vi.mocked(reloadOnceForNewRelease).mockReturnValue(false);
    openBrokenPage('/join/SECRETCODE', StalePage);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Something went wrong on our side' }),
    ).toBeTruthy();
    await waitFor(() => expect(reportError).toHaveBeenCalled());
  });

  it('never reloads for an ordinary error', () => {
    openBrokenPage('/join/SECRETCODE');

    expect(reloadOnceForNewRelease).not.toHaveBeenCalled();
  });
});
