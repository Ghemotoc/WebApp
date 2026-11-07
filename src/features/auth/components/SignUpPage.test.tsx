/**
 * Tests for the sign-up screen (story S1-E2-01, with the username from S1-E2-04). The data hooks
 * get fixed answers; Supabase Auth and the sign-up trigger are tested in
 * supabase/tests/database/023 and 157 and in e2e/sign-up.spec.ts.
 */
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { checkHandle } from '@/features/account/api/accountNames';
import { useFeatureFlags } from '@/features/flags/hooks/useFeatureFlags';
import { useLegalVersions } from '@/features/legal/hooks/useLegalVersions';
import { renderWithProviders } from '@/test/renderWithProviders';

import { signUp } from '../api/signUp';
import { useAgeRules } from '../hooks/useAgeRules';
import { useInviteCheck } from '../hooks/useInviteCheck';
import { checkPasswordLeak } from '../lib/passwordLeak';

import { SignUpPage } from './SignUpPage';

vi.mock('@/features/account/api/accountNames', () => ({ checkHandle: vi.fn() }));
vi.mock('@/features/flags/hooks/useFeatureFlags', () => ({ useFeatureFlags: vi.fn() }));
vi.mock('@/features/legal/hooks/useLegalVersions', () => ({ useLegalVersions: vi.fn() }));
vi.mock('../hooks/useInviteCheck', () => ({ useInviteCheck: vi.fn() }));
vi.mock('../hooks/useAgeRules', () => ({ useAgeRules: vi.fn() }));
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

/** A few of the age rules by country (MARKETS-1), as country_age_rules holds them. */
function ageRule(
  country: string,
  region: string,
  consentBelow: number,
  blockedBelow: number | null,
) {
  return {
    id: `${country}${region}`,
    countryCode: country,
    regionCode: region,
    name: country,
    regionName: region === 'QC' ? 'Quebec' : '',
    minimumAge: 13,
    parentalConsentBelow: consentBelow,
    signupBlockedBelow: blockedBelow,
    legalBasis: '',
    source: '',
    dateChecked: '2026-11-06',
    confidence: 'high' as const,
    status: 'to_verify' as const,
    notes: '',
  };
}
const ageRules = [
  ageRule('ZZ', '', 16, null),
  ageRule('RO', '', 16, null),
  ageRule('CA', '', 13, null),
  ageRule('CA', 'QC', 14, null),
  ageRule('AU', '', 15, 16),
];

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
  fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'new.writer' } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'a long passphrase' } });
  fireEvent.change(screen.getByLabelText('Confirm password'), {
    target: { value: 'a long passphrase' },
  });
  fireEvent.change(screen.getByLabelText('Country you live in'), { target: { value: 'RO' } });
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
  vi.mocked(checkHandle).mockResolvedValue('ok');
  vi.mocked(useAgeRules).mockReturnValue({ data: ageRules } as unknown as ReturnType<
    typeof useAgeRules
  >);
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
    expect(screen.getByLabelText('Username')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm password')).toBeInTheDocument();
    expect(screen.getByLabelText('Year of birth')).toBeInTheDocument();
    expect(screen.getByRole('checkbox')).not.toBeChecked();
    expect(screen.queryByLabelText(/pen name/i)).not.toBeInTheDocument();
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
      // No Pages Function in unit tests: the country is unknown, which the invited test admits.
      signupToken: null,
      signupIpToken: null,
      country: null,
      ageRules,
      isWaitlistOn: false,
    });
    expect(vi.mocked(signUp).mock.calls[0]?.[1]).toMatchObject({ country: 'RO', legalRegion: '' });
    expect(await screen.findByText(/We sent a link to new.writer@example.com/)).toBeInTheDocument();
  });

  it('sends the chosen username with the account (S1-E2-04)', async () => {
    openSignUp('/join/GOOD');
    fillForm();
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
    await waitFor(() => expect(signUp).toHaveBeenCalled());
    expect(vi.mocked(signUp).mock.calls[0]?.[1]).toMatchObject({ handle: 'new.writer' });
  });

  it('refuses a username someone already has and sends nothing', async () => {
    vi.mocked(checkHandle).mockResolvedValue('taken');
    openSignUp('/join/GOOD');
    fillForm();
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findAllByText(/Someone already has this username/)).not.toHaveLength(0);
    expect(signUp).not.toHaveBeenCalled();
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

describe('the year of birth (S1-E2-02)', () => {
  beforeEach(() => inviteAnswer('valid'));

  /** A year that makes the person this old by year this year. */
  const yearsAgo = (years: number) => String(new Date().getFullYear() - years);

  it('asks for the month only when the year leaves the age unclear at 13 or 16', () => {
    openSignUp('/join/GOOD');
    fireEvent.change(screen.getByLabelText('Year of birth'), { target: { value: yearsAgo(16) } });
    expect(screen.getByLabelText('Month of birth')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Year of birth'), { target: { value: yearsAgo(30) } });
    expect(screen.queryByLabelText('Month of birth')).not.toBeInTheDocument();
  });

  it('explains why in a tooltip, without promising an age check while the test is adults only', () => {
    openSignUp('/join/GOOD');
    expect(screen.getByLabelText('Year of birth')).toHaveAccessibleDescription(
      'We ask for the year, and sometimes the month, to pick the right safety settings.',
    );
    expect(screen.queryByText('A quick age check comes next.')).not.toBeInTheDocument();
  });

  it('refuses an under-13, keeps nothing and sends nothing', async () => {
    openSignUp('/join/GOOD');
    fillForm();
    fireEvent.change(screen.getByLabelText('Year of birth'), { target: { value: yearsAgo(10) } });
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Sorry, you can’t create an account right now.',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(
      await screen.findByText(
        'We don’t keep anything you typed. You can try again once you turn 13.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument();
    expect(signUp).not.toHaveBeenCalled();
  });

  it('while the test is adults only, refuses a 15-year-old kindly and sends nothing', async () => {
    openSignUp('/join/GOOD');
    fillForm();
    fireEvent.change(screen.getByLabelText('Year of birth'), { target: { value: yearsAgo(17) } });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(
      await screen.findByText(/This early test is for invited adults only/),
    ).toBeInTheDocument();
    expect(signUp).not.toHaveBeenCalled();
  });
});

describe('the country you live in (MARKETS-1)', () => {
  beforeEach(() => inviteAnswer('valid'));

  /** A year that makes the person this old by year this year. */
  const yearsAgo = (years: number) => String(new Date().getFullYear() - years);

  it('asks for the country and sends nothing without one', async () => {
    openSignUp('/join/GOOD');
    fillForm();
    fireEvent.change(screen.getByLabelText('Country you live in'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByText('Choose the country you live in.')).toBeInTheDocument();
    expect(signUp).not.toHaveBeenCalled();
  });

  it('asks for the province only where one has its own ages, and the month at Quebec’s 14', () => {
    openSignUp('/join/GOOD');
    fireEvent.change(screen.getByLabelText('Country you live in'), { target: { value: 'RO' } });
    expect(screen.queryByLabelText('Province or state')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Country you live in'), { target: { value: 'CA' } });
    fireEvent.change(screen.getByLabelText('Province or state'), { target: { value: 'QC' } });
    fireEvent.change(screen.getByLabelText('Year of birth'), { target: { value: yearsAgo(14) } });
    expect(screen.getByLabelText('Month of birth')).toBeInTheDocument();
  });

  it('once minors may join, refuses a 14-year-old in Australia by name and sends nothing', async () => {
    vi.mocked(useFeatureFlags).mockReturnValue({
      isOn: (key: string) => key === 'invite_only',
      isLoaded: true,
    });
    openSignUp('/join/GOOD');
    fillForm();
    fireEvent.change(screen.getByLabelText('Country you live in'), { target: { value: 'AU' } });
    fireEvent.change(screen.getByLabelText('Year of birth'), { target: { value: yearsAgo(15) } });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByText(/isn’t open to under-16s in Australia yet/)).toBeInTheDocument();
    expect(signUp).not.toHaveBeenCalled();
  });
});

describe('SignUpPage with the waiting list (WAITLIST-1)', () => {
  /** The flags with the waiting list on, as on staging from WAITLIST-1. */
  function waitlistFlags() {
    vi.mocked(useFeatureFlags).mockReturnValue({
      isOn: (key: string) => ['invite_only', 'adults_only', 'waitlist'].includes(key),
      isLoaded: true,
    });
  }

  /** Fills the form as fillForm() does, ticking the terms box by its name (two boxes now). */
  function fillWaitlistForm() {
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'new.writer@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'new.writer' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'a long passphrase' } });
    fireEvent.change(screen.getByLabelText('Confirm password'), {
      target: { value: 'a long passphrase' },
    });
    fireEvent.change(screen.getByLabelText('Country you live in'), { target: { value: 'RO' } });
    fireEvent.change(screen.getByLabelText('Year of birth'), { target: { value: '1990' } });
    fireEvent.click(screen.getByRole('checkbox', { name: /I agree to the/ }));
  }

  it('shows the form without a code, headed "Join the waiting list"', () => {
    waitlistFlags();
    openSignUp('/sign-up');
    expect(screen.getByRole('heading', { name: 'Join the waiting list' })).toBeInTheDocument();
    expect(
      screen.getByRole('radiogroup', { name: 'What do you want to do here?' }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText('Invitation code')).not.toBeInTheDocument();
  });

  it('asks "write, read or both" before sending anything', async () => {
    waitlistFlags();
    openSignUp('/sign-up');
    fillWaitlistForm();
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByText('Choose write, read or both.')).toBeInTheDocument();
    expect(signUp).not.toHaveBeenCalled();
  });

  it('sends the answer and the news opt-in, then says "You’re on the list"', async () => {
    waitlistFlags();
    openSignUp('/sign-up');
    fillWaitlistForm();
    fireEvent.click(screen.getByRole('radio', { name: 'Write' }));
    fireEvent.click(screen.getByRole('checkbox', { name: /occasional news/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
    await waitFor(() => expect(signUp).toHaveBeenCalled());
    expect(vi.mocked(signUp).mock.calls[0]?.[1]).toMatchObject({
      waitlistInterest: 'write',
      newsEmails: true,
    });
    expect(vi.mocked(signUp).mock.calls[0]?.[2]).toMatchObject({
      inviteCode: null,
      isWaitlistOn: true,
    });
    expect(await screen.findByRole('heading', { name: 'You’re on the list' })).toBeInTheDocument();
  });

  it('still takes a code in the address, which skips the queue', () => {
    waitlistFlags();
    openSignUp('/join/GOOD');
    expect(screen.getByRole('heading', { name: 'Create your account' })).toBeInTheDocument();
    expect(screen.getByText(/Invitation accepted/)).toBeInTheDocument();
  });
});
