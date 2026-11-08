/**
 * SocialReturnPage: where Google, Apple and Microsoft send the person back, /auth/social-return
 * (story S1-E2-09).
 *
 * What it does: reads the address before Supabase tidies it, then lets api/socialReturn.ts decide:
 * finish a sign-up started on the form, go home after a log-in, go back to Settings after
 * connecting a provider, or say why not (a sign-up rule refused, the email already has an account,
 * the person never joined, or they pressed Cancel at the provider).
 * Who shows it: the router. What it calls: api/socialReturn.ts → settleSocialReturn().
 */
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Navigate } from 'react-router';

import { EmptyState } from '@/components/ui/EmptyState';
import { PageContainer } from '@/components/ui/PageContainer';
import { getSupabaseClient } from '@/lib/supabase';

import {
  readSocialReturnAddress,
  settleSocialReturn,
  type SocialReturnOutcome,
} from '../api/socialReturn';

/** A link styled as the page's main button. */
function ActionLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="inline-flex h-11 items-center rounded-full button-main px-5 text-sm font-semibold no-underline"
    >
      {label}
    </Link>
  );
}

/** Where each message's button goes, and its text key. */
const actionOf: Record<string, { to: string; labelKey: string }> = {
  alreadyHasAccount: { to: '/sign-in', labelKey: 'socialReturn.logIn' },
  linkTaken: { to: '/settings#ways-to-log-in', labelKey: 'socialReturn.backToSettings' },
  cancelled: { to: '/sign-in', labelKey: 'socialReturn.logIn' },
  notJoined: { to: '/sign-up', labelKey: 'socialReturn.join' },
  failed: { to: '/sign-in', labelKey: 'socialReturn.logIn' },
  refused: { to: '/sign-up', labelKey: 'socialReturn.tryAgain' },
};

/**
 * What the page shows for an outcome that doesn't move on.
 *
 * @param props.outcome - a 'say' or 'refused' outcome
 * @returns the message with its button
 */
function OutcomeMessage({ outcome }: { outcome: Exclude<SocialReturnOutcome, { kind: 'go' }> }) {
  const { t } = useTranslation('auth');
  const key = outcome.kind === 'refused' ? `refused.${outcome.rule}` : outcome.message;
  const action = actionOf[outcome.kind === 'refused' ? 'refused' : outcome.message];
  return (
    <EmptyState
      title={t(`socialReturn.${key}.heading`)}
      description={t(`socialReturn.${key}.body`)}
      action={
        action === undefined ? undefined : <ActionLink to={action.to} label={t(action.labelKey)} />
      }
    />
  );
}

/**
 * The page's body: "One moment…", then where to go or what to say.
 *
 * @returns the body
 */
function SocialReturnBody() {
  const { t } = useTranslation('auth');
  // Read once, at the first render, before Supabase removes the tokens from the address.
  const [address] = useState(() => readSocialReturnAddress(window.location));
  // The provider's answer is used once, so it is never fetched again.
  const settled = useQuery({
    queryKey: ['social-return'],
    staleTime: Infinity,
    gcTime: 0,
    retry: false,
    queryFn: async (): Promise<SocialReturnOutcome> => {
      const client = await getSupabaseClient();
      if (client === null) return { kind: 'say', message: 'failed' };
      return settleSocialReturn(client, address);
    },
  });

  if (settled.isPending) {
    return (
      <p role="status" className="m-0 text-body">
        {t('socialReturn.checking')}
      </p>
    );
  }
  const outcome: SocialReturnOutcome = settled.data ?? { kind: 'say', message: 'failed' };
  if (outcome.kind === 'go') return <Navigate to={outcome.to} replace />;
  return <OutcomeMessage outcome={outcome} />;
}

/**
 * Renders the page.
 *
 * @returns the return page
 */
export function SocialReturnPage() {
  const { t } = useTranslation('auth');
  return (
    <PageContainer className="tmc-rise flex flex-col gap-4 pt-12 pb-7">
      <title>{t('socialReturn.documentTitle')}</title>
      <SocialReturnBody />
    </PageContainer>
  );
}
