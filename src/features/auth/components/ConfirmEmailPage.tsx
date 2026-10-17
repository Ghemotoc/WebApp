/**
 * ConfirmEmailPage: where the link in the confirmation (or log-in) email lands
 * (story S1-E2-01). Address: /auth/confirm?token_hash=…&type=email (supabase/templates/).
 *
 * What it does: hands the one-time token to Supabase (verifyOtp), which confirms the email and
 * signs the person in on this device. The token-hash link works on any device, unlike a link that
 * needs the browser the sign-up started in. Then it says so, or that the link no longer works
 * (used, or older than an hour) and how to get a new one.
 * Who shows it: the router. What it calls: api/signUp.ts → confirmEmail().
 */
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router';

import { EmptyState } from '@/components/ui/EmptyState';
import { PageContainer } from '@/components/ui/PageContainer';
import { getSupabaseClient } from '@/lib/supabase';

import { confirmEmail } from '../api/signUp';

/**
 * Renders the page.
 *
 * @returns "Confirming…", then confirmed or the link has expired
 */
export function ConfirmEmailPage() {
  const { t } = useTranslation('auth');
  const [searchParams] = useSearchParams();
  const tokenHash = searchParams.get('token_hash');

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

  return (
    <PageContainer className="tmc-rise flex flex-col gap-4 pt-12 pb-7">
      <title>{t('confirm.documentTitle')}</title>
      {confirmation.isPending && (
        <p role="status" className="m-0 text-body">
          {t('confirm.checking')}
        </p>
      )}
      {confirmation.data === true && (
        <EmptyState
          title={t('confirm.doneHeading')}
          description={t('confirm.doneBody')}
          action={
            <Link
              to="/"
              className="inline-flex h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-on-primary no-underline"
            >
              {t('confirm.continue')}
            </Link>
          }
        />
      )}
      {(confirmation.data === false || confirmation.isError) && (
        <EmptyState title={t('confirm.failedHeading')} description={t('confirm.failedBody')} />
      )}
    </PageContainer>
  );
}
