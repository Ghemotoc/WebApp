/**
 * ConfirmEmailPage: where the link in the confirmation (or log-in) email lands (story S1-E2-01).
 * Address: /auth/confirm?token_hash=…&type=email (supabase/templates/). An email change uses
 * codes typed into Settings instead of links (S1-E2-05; Robert, 25 Oct 2026, 09:15).
 *
 * What it does: hands the one-time token to Supabase (verifyOtp). A sign-up link confirms the
 * email and signs the person in on this device; the token-hash link works on any device, unlike a
 * link that needs the browser the sign-up started in. "Continue" goes to the home page: the
 * username was chosen on the sign-up form (S1-E2-04), and an older account without one is asked
 * for it by the "Choose a username" notice. A used or expired link says so.
 * Look (bundle G6, board ConfirmEmail): the shared glass AuthCard with an eyebrow, the heading and
 * one line; a used link adds a glass "Sign up again" button, because signing up again is the fix.
 * The board's age check step strip is left out: the March test is for adults only (17 Oct 2026).
 * Who shows it: the router. What it calls: api/signUp.ts → confirmEmail().
 */
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router';

import { buttonClassName } from '@/components/ui/buttonStyles';
import { getSupabaseClient } from '@/lib/supabase';

import { confirmEmail } from '../api/signUp';
import { AuthCard } from './AuthCard';

/** Where the link stands: still checking, confirmed, or no longer working. */
type ConfirmationState = 'checking' | 'done' | 'failed';

/**
 * Hands the token to Supabase once and says how it went.
 *
 * @param tokenHash - the token from the link, or null when the link had none
 * @returns the state of the confirmation
 */
function useConfirmation(tokenHash: string | null): ConfirmationState {
  // The token is used once, so the answer is never fetched again.
  const confirmation = useQuery({
    queryKey: ['confirm-email', tokenHash],
    staleTime: Infinity,
    retry: false,
    queryFn: async () => {
      const client = await getSupabaseClient();
      if (client === null || tokenHash === null) return false;
      return confirmEmail(client, tokenHash);
    },
  });
  if (confirmation.isPending) return 'checking';
  return confirmation.data === true ? 'done' : 'failed';
}

/** The card's words for each state, as locale keys. */
const cardText: Record<ConfirmationState, { eyebrow: string; heading: string; body?: string }> = {
  checking: { eyebrow: 'confirm.eyebrow', heading: 'confirm.checkingHeading' },
  done: {
    eyebrow: 'confirm.doneEyebrow',
    heading: 'confirm.doneHeading',
    body: 'confirm.doneBody',
  },
  failed: {
    eyebrow: 'confirm.eyebrow',
    heading: 'confirm.failedHeading',
    body: 'confirm.failedBody',
  },
};

/**
 * Renders the page.
 *
 * @returns the glass card: "Confirming…", then whether the link worked
 */
export function ConfirmEmailPage() {
  const { t } = useTranslation('auth');
  const [searchParams] = useSearchParams();
  const state = useConfirmation(searchParams.get('token_hash'));
  const text = cardText[state];

  return (
    <AuthCard
      documentTitle={t('confirm.documentTitle')}
      eyebrow={t(text.eyebrow)}
      heading={t(text.heading)}
      intro={text.body === undefined ? undefined : t(text.body)}
    >
      {/* Screen readers hear "Confirming your email…" while the token is with Supabase. */}
      {state === 'checking' && (
        <p role="status" className="m-0 text-body">
          {t('confirm.checking')}
        </p>
      )}
      {state === 'done' && (
        <Link to="/" className={buttonClassName({ size: 'lg' }, 'w-full')}>
          {t('confirm.continue')}
        </Link>
      )}
      {state === 'failed' && (
        <Link
          to="/sign-up"
          className={buttonClassName({ variant: 'secondary', size: 'lg' }, 'w-full')}
        >
          {t('confirm.signUpAgain')}
        </Link>
      )}
    </AuthCard>
  );
}
