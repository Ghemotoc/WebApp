/**
 * AgeCheckNotice: "Confirm your age", shown to a signed-in person whose account waits for an age
 * check (story S1-E2-08, part 08a).
 *
 * Why: until a check passes, the database keeps the account read-only (account_state() answers
 * age_check_pending or age_check_failed), so the person needs a way to the check from any page.
 * While the March test is for invited adults only (`adults_only` on), no account waits for one,
 * so the notice stays hidden.
 * Who shows it: AppLayout, at the top of every page except the age check pages themselves.
 * What it calls: useMyAgeCheck. Signed out, or with nothing to check, it shows nothing.
 */
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router';

import { PageContainer } from '@/components/ui/PageContainer';

import { useMyAgeCheck } from '../hooks/useMyAgeCheck';

/**
 * Renders the notice, or nothing.
 *
 * @returns the panel when the account waits for an age check
 */
export function AgeCheckNotice() {
  const { t } = useTranslation('account');
  const { pathname } = useLocation();
  const { check } = useMyAgeCheck();
  if (check == null || !check.needsCheck || pathname.startsWith('/age-check')) return null;

  return (
    <PageContainer className="pt-6">
      <section
        aria-labelledby="age-check-notice-title"
        className="flex flex-col gap-3 rounded-card border border-border bg-tint p-6"
      >
        <h2
          id="age-check-notice-title"
          className="m-0 font-heading text-[24px] font-bold text-heading"
        >
          {t('ageCheck.notice.heading')}
        </h2>
        <p className="m-0 text-body">{t('ageCheck.notice.body')}</p>
        <Link
          to="/age-check"
          className="inline-flex h-11 items-center self-start rounded-full button-main px-5 text-sm font-semibold no-underline"
        >
          {t('ageCheck.notice.action')}
        </Link>
      </section>
    </PageContainer>
  );
}
