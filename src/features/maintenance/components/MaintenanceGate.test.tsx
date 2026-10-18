/**
 * Tests for the maintenance gate (story S1-E1-05: "Given maintenance mode switched on in admin,
 * when a user opens the app, then they see a maintenance page while staff can still sign in").
 * The flag and the staff check are stubbed here; e2e/maintenance.spec.ts uses the real ones.
 */
import { fireEvent, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';

import { useMaintenanceMode, type MaintenanceState } from '../hooks/useMaintenanceMode';
import { MaintenanceGate } from './MaintenanceGate';

vi.mock('../hooks/useMaintenanceMode', () => ({ useMaintenanceMode: vi.fn() }));

const checkAgain = vi.fn();

/** Sets what the maintenance hook answers. */
function maintenanceAnswer(isClosedForThisPerson: boolean) {
  const state: MaintenanceState = { isClosedForThisPerson, checkAgain, isChecking: false };
  vi.mocked(useMaintenanceMode).mockReturnValue(state);
}

/** Opens a page inside the gate. */
function openPage(path: string) {
  const router = createMemoryRouter(
    [
      {
        path: '*',
        element: (
          <MaintenanceGate>
            <p>The page itself</p>
          </MaintenanceGate>
        ),
      },
    ],
    { initialEntries: [path] },
  );
  return renderWithProviders(<RouterProvider router={router} />, 'en');
}

beforeEach(() => checkAgain.mockReset());

describe('MaintenanceGate', () => {
  it('shows the page when maintenance mode is off', () => {
    maintenanceAnswer(false);
    openPage('/');
    expect(screen.getByText('The page itself')).toBeTruthy();
  });

  it('shows the maintenance page to a reader while maintenance mode is on', () => {
    maintenanceAnswer(true);
    openPage('/settings');
    expect(screen.getByRole('heading', { level: 1, name: /We’re updating/ })).toBeTruthy();
    expect(screen.queryByText('The page itself')).toBeNull();
    expect(screen.getByRole('link', { name: 'Staff sign-in' }).getAttribute('href')).toBe(
      '/sign-in',
    );
  });

  it('keeps the log-in page and the Legal centre open, so staff can still sign in', () => {
    maintenanceAnswer(true);
    openPage('/sign-in');
    expect(screen.getByText('The page itself')).toBeTruthy();
  });

  it('keeps the Legal centre open', () => {
    maintenanceAnswer(true);
    openPage('/legal/contact');
    expect(screen.getByText('The page itself')).toBeTruthy();
  });

  it('reads the flag again on "Check again"', () => {
    maintenanceAnswer(true);
    openPage('/');
    fireEvent.click(screen.getByRole('button', { name: 'Check again' }));
    expect(checkAgain).toHaveBeenCalledTimes(1);
  });
});
