/**
 * ResetPasswordPage: choosing a new password from the reset email (story S1-E2-05).
 *
 * Address: /reset-password?token_hash=…&type=recovery (supabase/templates/recovery.html). There is
 * no board for this screen; it follows the log-in card (board 2.2) and its "Password changed"
 * state: "Your new password is saved. We logged you out on every other device and sent you an
 * email about the change."
 * What it does: hands the one-time token to Supabase (verifyOtp, type recovery), which signs the
 * person in on this device; then NewPasswordForm saves the password. An expired or used link says
 * so and offers a new one.
 * What it calls: api/signIn.ts → openResetLink(); NewPasswordForm → saveNewPassword().
 */
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router';

import { getSupabaseClient } from '@/lib/supabase';

import { openResetLink } from '../api/signIn';
import { useNewPasswordForm } from '../hooks/useNewPasswordForm';

import { AuthCard } from './AuthCard';
import { NewPasswordForm } from './NewPasswordForm';

/** The link styled as the main button. */
const primaryLinkClasses =
  'inline-flex h-11 items-center self-start rounded-full button-main px-5 text-sm font-semibold no-underline';

/** Which state the page is in. */
type ResetView = 'saved' | 'checking' | 'expired' | 'form';

/** Each state's heading and the line under it (keys in the auth namespace). */
const viewTexts: Record<ResetView, { heading: string; intro?: string }> = {
  saved: { heading: 'reset.doneHeading', intro: 'reset.doneBody' },
  checking: { heading: 'reset.heading' },
  expired: { heading: 'reset.expiredHeading', intro: 'reset.expiredBody' },
  form: { heading: 'reset.heading', intro: 'reset.body' },
};

/**
 * Opens the reset link once and says whether it worked.
 *
 * @param tokenHash - the token from the address, or null
 * @returns TanStack Query's result: data is true when the person is signed in to reset
 */
function useResetLink(tokenHash: string | null) {
  // The token works once, so the answer is never fetched again.
  return useQuery({
    queryKey: ['reset-link', tokenHash],
    staleTime: Infinity,
    retry: false,
    queryFn: async () => {
      const client = await getSupabaseClient();
      if (client === null || tokenHash === null) return false;
      return openResetLink(client, tokenHash);
    },
  });
}

/**
 * Renders the page.
 *
 * @returns "Opening your link…", the form, the saved message or the expired message
 */
export function ResetPasswordPage() {
  const { t } = useTranslation('auth');
  const [searchParams] = useSearchParams();
  const link = useResetLink(searchParams.get('token_hash'));
  const form = useNewPasswordForm();

  // Step 1: which state the page is in.
  let view: ResetView = 'form';
  if (form.isSaved) view = 'saved';
  else if (link.isPending) view = 'checking';
  else if (link.data !== true) view = 'expired';
  const texts = viewTexts[view];

  // Step 2: the card for that state.
  return (
    <AuthCard
      documentTitle={t('reset.documentTitle')}
      eyebrow={t('forgot.eyebrow')}
      heading={t(texts.heading)}
      intro={texts.intro === undefined ? undefined : t(texts.intro)}
    >
      {view === 'saved' && (
        <Link to="/" className={primaryLinkClasses}>
          {t('reset.continue')}
        </Link>
      )}
      {view === 'checking' && (
        <p role="status" className="m-0 text-body">
          {t('reset.checking')}
        </p>
      )}
      {view === 'expired' && (
        <Link to="/forgot-password" className={primaryLinkClasses}>
          {t('reset.askAgain')}
        </Link>
      )}
      {view === 'form' && <NewPasswordForm form={form} />}
    </AuthCard>
  );
}
