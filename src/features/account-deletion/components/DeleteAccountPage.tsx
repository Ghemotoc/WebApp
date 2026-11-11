/**
 * DeleteAccountPage: /delete-account, the website's account deletion page (story S1-E13-03,
 * criterion 5; Google Play asks for a web address where people can delete their account without
 * the app, and the Settings board names it).
 *
 * Signed in, it opens Settings › Delete account. Signed out, it says how: log in, open Settings ›
 * Delete account, log in again to confirm; with the 14 days, a Log in button and the support
 * address for anyone who can't log in. In the liquid glass look (bundle G11c, the canvas's
 * DeleteAccount board) it is one glass card: the steps carry numbered rounds, and the 14 days sit
 * in a tinted box so they stand out.
 * Who shows it: the router, at /delete-account, loaded when opened.
 * What it calls: useSession (features/auth); the 14 days are the default of account_deletion_days.
 */
import { Link, Navigate } from 'react-router';

import { Eyebrow } from '@/components/ui/Eyebrow';
import { PageContainer } from '@/components/ui/PageContainer';
import { brand } from '@/config/brand';
import { useSession } from '@/features/auth/hooks/useSession';

import { useAccountDeletionTranslation } from '../registerAccountDeletionTranslations';

/** The steps, in order. */
const steps = ['logIn', 'open', 'confirm'] as const;

/** The default number of days (account_deletion_days), for a visitor who isn't signed in. */
const deletionDays = 14;

/**
 * The three steps, each with its number in a round, as on the board. The list stays an ordered
 * list, so screen readers still say "1 of 3"; the rounds are decoration and hidden from them.
 *
 * @returns the labelled list
 */
function StepList() {
  const { t } = useAccountDeletionTranslation();
  return (
    <div className="flex flex-col gap-3">
      <Eyebrow>{t('page.stepsLabel')}</Eyebrow>
      <ol className="m-0 flex list-none flex-col gap-3 p-0 text-body">
        {steps.map((step, index) => (
          <li key={step} className="flex items-start gap-3.5">
            <span
              aria-hidden="true"
              className="flex size-8 flex-none items-center justify-center rounded-full bg-tint font-bold text-heading"
            >
              {index + 1}
            </span>
            <span className="pt-1">{t(`page.steps.${step}`)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/**
 * Renders the page.
 *
 * @returns the page, or a redirect to Settings while signed in
 */
export function DeleteAccountPage() {
  const { t } = useAccountDeletionTranslation();
  const { userId, isKnown } = useSession();
  if (!isKnown) return null;
  if (userId !== null) return <Navigate to="/settings#delete-account" replace />;
  return (
    <PageContainer className="flex max-w-[720px] flex-col pt-10 pb-10">
      <title>{t('page.title')}</title>
      <section className="flex flex-col gap-4 rounded-card border border-border bg-surface p-6 shadow-card sm:px-10 sm:py-9">
        <h1 className="m-0 font-heading text-[32px] font-bold text-heading">{t('page.heading')}</h1>
        <p className="m-0 text-body">{t('page.intro')}</p>
        <StepList />
        <p className="m-0 rounded-2xl bg-tint px-4 py-3 text-sm text-body">
          {t('page.after', { count: deletionDays })}
        </p>
        <Link
          to="/sign-in"
          className="inline-flex h-12 w-fit items-center rounded-full button-main px-6 text-[15px] font-semibold"
        >
          {t('page.logIn')}
        </Link>
        <p className="m-0 text-sm text-meta">{t('page.noAccess', { email: brand.supportEmail })}</p>
      </section>
    </PageContainer>
  );
}
