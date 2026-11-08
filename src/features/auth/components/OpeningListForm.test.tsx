/**
 * Tests for "Tell me when you open here" on the not-open page (bundle G5, part a; story S1-E2-10).
 * The server call gets fixed answers; the server itself is tested in server/opening-list.test.ts
 * and the database in supabase/tests/database/313-opening-list.test.sql.
 */
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';

import { joinOpeningList } from '../api/openingList';

import { OpeningListForm } from './OpeningListForm';

vi.mock('../api/openingList', () => ({ joinOpeningList: vi.fn() }));

/** Shows the form for a connection in the given country (null: none found). */
function showForm(country: string | null) {
  const router = createMemoryRouter([
    { path: '/', element: <OpeningListForm country={country} /> },
  ]);
  renderWithProviders(<RouterProvider router={router} />, 'en');
}

beforeEach(() => {
  vi.mocked(joinOpeningList).mockReset();
});

describe('OpeningListForm', () => {
  it('asks only for the email when the connection gave the country, then says to check it', async () => {
    vi.mocked(joinOpeningList).mockResolvedValue('listed');
    showForm('FR');
    expect(screen.queryByLabelText(/country/i)).toBeNull();
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'reader@example.test' },
    });
    fireEvent.click(screen.getByRole('button', { name: /tell me when you open here/i }));
    expect(await screen.findByText(/check your email/i)).toBeTruthy();
    expect(vi.mocked(joinOpeningList).mock.calls[0]?.[0]).toMatchObject({
      email: 'reader@example.test',
      countryCode: undefined,
    });
  });

  it('asks for the country when the connection gave none, and sends nothing without it', async () => {
    showForm(null);
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'reader@example.test' },
    });
    fireEvent.click(screen.getByRole('button', { name: /tell me when you open here/i }));
    expect(await screen.findByText(/choose your country/i)).toBeTruthy();
    expect(joinOpeningList).not.toHaveBeenCalled();
  });

  it('shows a bad address under the field', async () => {
    vi.mocked(joinOpeningList).mockResolvedValue('invalid');
    showForm('FR');
    fireEvent.click(screen.getByRole('button', { name: /tell me when you open here/i }));
    await waitFor(() => {
      expect(screen.getByLabelText(/email address/i).getAttribute('aria-invalid')).toBe('true');
    });
  });

  it('offers sign-up when the country opened in the meantime', async () => {
    vi.mocked(joinOpeningList).mockResolvedValue('already_open');
    showForm('FR');
    fireEvent.click(screen.getByRole('button', { name: /tell me when you open here/i }));
    expect(await screen.findByRole('link', { name: /sign up/i })).toBeTruthy();
  });
});
