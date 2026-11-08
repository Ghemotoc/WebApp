/**
 * ParentConsentNotice: "Ask a parent or guardian", shown to a signed-in writer whose account waits
 * for a parent's or guardian's yes (story S1-E2-03, criterion 1): below the age the law where they
 * live sets (16 in Romania, 13 in the UK, 14 in Quebec; MARKETS-1).
 * When the rules where they live changed (staff saved a new rule, or the member moved), the
 * notice says until when they can keep writing while they ask (14 days' grace, S1-E2-22).
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

import type { MyParentConsent } from '../api/parentConsent';

import { useMyParentConsent } from '../hooks/useMyParentConsent';

/** A stand-in while the consent loads, so the hooks above run in the same order every time. */
const emptyConsent: MyParentConsent = {
  needsConsent: false,
  graceUntil: null,
  status: null,
  parentEmail: null,
  language: null,
  sentAt: null,
  decidedAt: null,
  deadline: null,
  canSend: false,
};

/**
 * A date in words in the reader's language, Romanian time.
 *
 * @param value - the moment
 * @param language - the reader's language
 * @returns "20 November 2026" or "20 noiembrie 2026"
 */
function dateInWords(value: string, language: string): string {
  return new Intl.DateTimeFormat(language === 'en' ? 'en-GB' : 'ro', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Bucharest',
  }).format(new Date(value));
}

/**
 * The notice's sentence: withdrawn, during the grace, or waiting.
 *
 * @param consent - the member's consent
 * @returns the sentence, in the reader's language
 */
function useNoticeBody(consent: MyParentConsent): string {
  const { t, i18n } = useTranslation('account');
  if (consent.status === 'withdrawn') return t('parentConsent.notice.withdrawnBody');
  if (consent.graceUntil !== null) {
    return t('parentConsent.notice.graceBody', {
      date: dateInWords(consent.graceUntil, i18n.language),
    });
  }
  return t('parentConsent.notice.body');
}

/**
 * Renders the notice, or nothing.
 *
 * @returns the panel when the account waits for a parent or guardian
 */
export function ParentConsentNotice() {
  const { t } = useTranslation('account');
  const { pathname } = useLocation();
  const { consent } = useMyParentConsent();
  const body = useNoticeBody(consent ?? emptyConsent);
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
        <p className="m-0 text-body">{body}</p>
        <Link
          to={isWithdrawn ? '/settings#parent-consent' : '/parent-consent'}
          className="inline-flex h-11 items-center self-start rounded-full button-main px-5 text-sm font-semibold no-underline"
        >
          {t(isWithdrawn ? 'parentConsent.notice.withdrawnAction' : 'parentConsent.notice.action')}
        </Link>
      </section>
    </PageContainer>
  );
}
