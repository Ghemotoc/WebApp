/**
 * ParentConsentNotice: "Ask a parent or guardian", shown to a signed-in writer under 16 whose
 * account waits for a parent's or guardian's yes (story S1-E2-03, criterion 1).
 *
 * Why: until a parent or guardian agrees, the database keeps the account read-only
 * (account_state() answers awaiting_parental_consent), so the writer needs a way to ask from any
 * page. While the March test is for invited adults only (`adults_only` on), no account waits, so
 * the notice stays hidden.
 * Who shows it: AppLayout, under AgeCheckNotice, on every page except the consent pages.
 * What it calls: useMyParentConsent. Signed out, or with nothing to ask, it shows nothing.
 * After a parent or guardian withdraws their consent, the notice says so in plain words instead:
 * what changed, what still works and where to read more (bundle IDEAS-2, idea IDEA-20261101-8).
 */
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router';

import { PageContainer } from '@/components/ui/PageContainer';

import { useMyParentConsent } from '../hooks/useMyParentConsent';

/**
 * Renders the notice, or nothing.
 *
 * @returns the panel when the account waits for a parent or guardian
 */
export function ParentConsentNotice() {
  const { t } = useTranslation('account');
  const { pathname } = useLocation();
  const { consent } = useMyParentConsent();
  if (consent == null || !consent.needsConsent || pathname.startsWith('/parent-consent'))
    return null;
  const isWithdrawn = consent.status === 'withdrawn';

  return (
    <PageContainer className="pt-6">
      <section
        aria-labelledby="parent-consent-notice-title"
        className="flex flex-col gap-3 rounded-card border border-border bg-tint p-6"
      >
        <h2
          id="parent-consent-notice-title"
          className="m-0 font-heading text-[24px] font-bold text-heading"
        >
          {t(isWithdrawn ? 'parentConsent.withdrawnHeading' : 'parentConsent.notice.heading')}
        </h2>
        <p className="m-0 text-body">
          {t(isWithdrawn ? 'parentConsent.notice.withdrawnBody' : 'parentConsent.notice.body')}
        </p>
        <Link
          to={isWithdrawn ? '/settings#parent-consent' : '/parent-consent'}
          className="inline-flex h-11 items-center self-start rounded-full bg-primary px-5 text-sm font-semibold text-on-primary no-underline hover:opacity-90"
        >
          {t(isWithdrawn ? 'parentConsent.notice.withdrawnAction' : 'parentConsent.notice.action')}
        </Link>
      </section>
    </PageContainer>
  );
}
