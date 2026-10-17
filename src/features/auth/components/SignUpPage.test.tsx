/**
 * Tests for the sign-up screen (story S1-E2-01). The data hooks get fixed answers; Supabase Auth
 * and the sign-up trigger are tested in supabase/tests/database/023 and e2e/sign-up.spec.ts.
 */
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useFeatureFlags } from '@/features/flags/hooks/useFeatureFlags';
import { useLegalVersions } from '@/features/legal/hooks/useLegalVersions';
import { renderWithProviders } from '@/test/renderWithProviders';

import { signUp } from '../api/signUp';
import { useInviteCheck } from '../hooks/useInviteCheck';
import { checkPasswordLeak } from '../lib/passwordLeak';

import { SignUpPage } from './SignUpPage';

vi.mock('@/features/flags/hooks/useFeatureFlags', () => ({ useFeatureFlags: vi.fn() }));
vi.mock('@/features/legal/hooks/useLegalVersions', () => ({ useLegalVersions: vi.fn() }));
vi.mock('../hooks/useInviteCheck', () => ({ useInviteCheck: vi.fn() }));
vi.mock('../lib/passwordLeak', () => ({ checkPasswordLeak: vi.fn() }));
vi.mock('../api/signUp', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/signUp')>()),
  signUp: vi.fn(),
}));
vi.mock('@/lib/supabase', () => ({ getSupabaseClient: vi.fn(async () => ({})) }));

/** Sets the flags as in March: invite only, adults only. */
function marchFlags() {
  vi.mocked(useFeatureFlags).mockReturnValue({
    isOn: (key: string) => key === 'invite_only' || key === 'adults_only',
    isLoaded: true,
  });
}

/** The invite check's answer for the code in the address. */
function inviteAnswer(status: 'valid' | 'ended' | 'unknown' | null) {
  vi.mocked(useInviteCheck).mockReturnValue({
    isPending: status === null,
    isError: false,
    data: status ?? undefined,
  } as unknown as ReturnType<typeof useInviteCheck>);
}

/** Opens sign-up at an address. */
function openSignUp(path: string) {
  const router = createMemoryRouter(
    [
      { path: '/sign-up', element: <SignUpPage /> },
      { path: '/join/:code', element: <SignUpPage /> },
    ],
    { initialEntries: [path] },
  );
  return renderWithProviders(<RouterProvider router={router} />, 'en');
}

/** Fills the whole form correctly. */
function fillForm() {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'new.writer@example.com' } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'a long passphrase' } });
  fireEvent.change(screen.getByLabelText('Confirm password'), {
    target: { value: 'a long passphrase' },
  });
  fireEvent.change(screen.getByLabelText('Year of birth'), { target: { value: '1990' } });
  fireEvent.click(screen.getByRole('checkbox'));
}

beforeEach(() => {
  vi.clearAllMocks();
  marchFlags();
  vi.mocked(useLegalVersions).mockImplementation(
    (slug: string) =>
      ({
        isError: false,
        data: [
          {
            id: `${slug}-en`,
            version_label: '0.1',
            language: 'en',
            published_at: '2026-10-17T12:00:00Z',
          },
        ],
      }) as unknown as ReturnType<typeof useLegalVersions>,
  );
  vi.mocked(checkPasswordLeak).mockResolvedValue('not_leaked');
});

describe('SignUpPage while the test is invite only', () => {
  it('without a code, explains the test is by invitation and shows no form', () => {
    inviteAnswer(null);
    openSignUp('/sign-up');
    expect(screen.getByRole('heading', { name: 'The test is by invitation' })).toBeInTheDocument();
    expect(screen.queryByRole('form', { name: 'Join with email' })).not.toBeInTheDocument();
  });

  it('with an ended code, says the invitation has ended', () => {
    inviteAnswer('ended');
    openSignUp('/join/EXPIRED');
    expect(
      screen.getByText(/This invitation has ended, ask the person who invited you/),
    ).toBeInTheDocument();
  });

  it('with a working code, shows the form with only the fields the story allows', () => {
    inviteAnswer('valid');
    openSignUp('/join/GOOD');
    const form = screen.getByRole('form', { name: 'Join with email' });
    expect(form).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm password')).toBeInTheDocument();
    expect(screen.getByLabelText('Year of birth')).toBeInTheDocument();
    expect(screen.getByRole('checkbox')).not.toBeChecked();
    expect(screen.queryByLabelText(/username|pen name/i)).not.toBeInTheDocument();
  });

  it('leaves out the age check step while the test is for adults only', () => {
    inviteAnswer('valid');
    openSignUp('/join/GOOD');
    expect(screen.queryByText('Age check')).not.toBeInTheDocument();
    expect(screen.getByText('Your profile')).toBeInTheDocument();
  });
});

describe('the sign-up form', () => {
  beforeEach(() => inviteAnswer('valid'));

  it('says whether the two passwords match before the person continues', () => {
    openSignUp('/join/GOOD');
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'a long passphrase' } });
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'a long' } });
    expect(screen.getByText('The passwords don’t match yet.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Confirm password'), {
      target: { value: 'a long passphrase' },
    });
    expect(screen.getByText('The passwords match.')).toBeInTheDocument();
  });

  it('refuses a 9-character password with a plain message', async () => {
    openSignUp('/join/GOOD');
    fillForm();
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: '123456789' } });
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: '123456789' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByText('Use at least 10 characters.')).toBeInTheDocument();
    expect(signUp).not.toHaveBeenCalled();
  });

  it('refuses a leaked password', async () => {
    vi.mocked(checkPasswordLeak).mockResolvedValue('leaked');
    openSignUp('/join/GOOD');
    fillForm();
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(
      await screen.findByText(/on a list of leaked passwords, so someone could guess it/),
    ).toBeInTheDocument();
    expect(signUp).not.toHaveBeenCalled();
  });

  it('sends the invite, the year, the legal versions shown and the language, then says to check the email', async () => {
    openSignUp('/join/GOOD');
    fillForm();
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
    await waitFor(() => expect(signUp).toHaveBeenCalled());
    expect(vi.mocked(signUp).mock.calls[0]?.[2]).toEqual({
      inviteCode: 'GOOD',
      termsVersionId: 'terms-en',
      privacyVersionId: 'privacy-en',
      locale: 'en',
    });
    expect(await screen.findByText(/We sent a link to new.writer@example.com/)).toBeInTheDocument();
  });

  it('offers an emailed log-in link instead of a password', () => {
    openSignUp('/join/GOOD');
    fireEvent.click(screen.getByRole('button', { name: 'Email me a log-in link instead' }));
    expect(screen.queryByLabelText('Password')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Use a password instead' })).toBeInTheDocument();
  });

  it('links to the Terms and the Privacy notice in a new tab', () => {
    openSignUp('/join/GOOD');
    expect(screen.getByRole('link', { name: /^Terms/ })).toHaveAttribute('href', '/legal/terms');
    expect(screen.getByRole('link', { name: /^Privacy notice/ })).toHaveAttribute(
      'target',
      '_blank',
    );
  });
});
