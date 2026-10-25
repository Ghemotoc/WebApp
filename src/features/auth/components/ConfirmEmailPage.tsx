/**
 * ConfirmEmailPage: where the link in the confirmation (or log-in) email lands
 * (story S1-E2-01), and the two links of an email change (S1-E2-05, added 25 Oct 2026).
 * Addresses: /auth/confirm?token_hash=…&type=email and …&type=email_change (supabase/templates/).
 *
 * What it does: hands the one-time token to Supabase (verifyOtp). A sign-up link confirms the
 * email and signs the person in on this device; the token-hash link works on any device, unlike a
 * link that needs the browser the sign-up started in. "Continue" goes to the home page: the
 * username was chosen on the sign-up form (S1-E2-04), and an older account without one is asked
 * for it by the "Choose a username" notice. An email change link says whether the other link
 * still has to be opened or the address is changed. Either way, a used or expired link says so.
 * Who shows it: the router. What it calls: api/signUp.ts → confirmEmail() and
 * features/account/api/emailAddress.ts → confirmEmailChange().
 */
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router';

import { EmptyState } from '@/components/ui/EmptyState';
import { PageContainer } from '@/components/ui/PageContainer';
import { confirmEmailChange } from '@/features/account/api/emailAddress';
import { getSupabaseClient } from '@/lib/supabase';

import { confirmEmail } from '../api/signUp';

/** The button under a finished confirmation. */
function ContinueLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="inline-flex h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-on-primary no-underline"
    >
      {label}
    </Link>
  );
}

/** "Checking…" while the token is with Supabase. */
function Checking({ text }: { text: string }) {
  return (
    <p role="status" className="m-0 text-body">
      {text}
    </p>
  );
}

/**
 * The sign-up (or log-in) link: confirmed, or the link no longer works.
 *
 * @param props.tokenHash - the token from the link
 * @returns the page's body
 */
function SignUpConfirmation({ tokenHash }: { tokenHash: string | null }) {
  const { t } = useTranslation('auth');
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

  if (confirmation.isPending) return <Checking text={t('confirm.checking')} />;
  if (confirmation.data === true) {
    return (
      <EmptyState
        title={t('confirm.doneHeading')}
        description={t('confirm.doneBody')}
        action={<ContinueLink to="/" label={t('confirm.continue')} />}
      />
    );
  }
  return <EmptyState title={t('confirm.failedHeading')} description={t('confirm.failedBody')} />;
}

/**
 * One of the two email change links: the other one is still to open, the address is changed, or
 * the link no longer works.
 *
 * @param props.tokenHash - the token from the link
 * @returns the page's body
 */
function EmailChangeConfirmation({ tokenHash }: { tokenHash: string | null }) {
  const { t } = useTranslation('auth');
  // The token is used once, so the answer is never fetched again.
  const confirmation = useQuery({
    queryKey: ['confirm-email-change', tokenHash],
    staleTime: Infinity,
    retry: false,
    queryFn: async () => {
      const client = await getSupabaseClient();
      if (client === null || tokenHash === null) return 'link_not_working' as const;
      return confirmEmailChange(client, tokenHash);
    },
  });

  if (confirmation.isPending) return <Checking text={t('confirm.changeChecking')} />;
  if (confirmation.data === 'changed') {
    return (
      <EmptyState
        title={t('confirm.changedHeading')}
        description={t('confirm.changedBody')}
        action={<ContinueLink to="/settings" label={t('confirm.toSettings')} />}
      />
    );
  }
  if (confirmation.data === 'open_the_other_link') {
    return <EmptyState title={t('confirm.halfHeading')} description={t('confirm.halfBody')} />;
  }
  return (
    <EmptyState title={t('confirm.failedHeading')} description={t('confirm.changeFailedBody')} />
  );
}

/**
 * Renders the page.
 *
 * @returns "Checking…", then the answer for the kind of link it was
 */
export function ConfirmEmailPage() {
  const { t } = useTranslation('auth');
  const [searchParams] = useSearchParams();
  const tokenHash = searchParams.get('token_hash');
  const isEmailChange = searchParams.get('type') === 'email_change';

  return (
    <PageContainer className="tmc-rise flex flex-col gap-4 pt-12 pb-7">
      <title>{t('confirm.documentTitle')}</title>
      {isEmailChange ? (
        <EmailChangeConfirmation tokenHash={tokenHash} />
      ) : (
        <SignUpConfirmation tokenHash={tokenHash} />
      )}
    </PageContainer>
  );
}
