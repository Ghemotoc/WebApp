/**
 * DeleteAccountPage: /delete-account, the website's account deletion page (story S1-E13-03,
 * criterion 5; Google Play asks for a web address where people can delete their account without
 * the app, and the Settings board names it).
 *
 * Signed in, it opens Settings › Delete account. Signed out, it says how: log in, open Settings ›
 * Delete account, log in again to confirm; with the 14 days, a Log in button and the support
 * address for anyone who can't log in.
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
    <PageContainer className="flex max-w-[640px] flex-col gap-5 pt-12 pb-7">
      <title>{t('page.title')}</title>
      <h1 className="m-0 font-heading text-[32px] font-bold text-heading">{t('page.heading')}</h1>
      <p className="m-0 text-body">{t('page.intro')}</p>
      <div className="flex flex-col gap-2">
        <Eyebrow>{t('page.stepsLabel')}</Eyebrow>
        <ol className="m-0 flex list-decimal flex-col gap-1 pl-5 text-body">
          {steps.map((step) => (
            <li key={step}>{t(`page.steps.${step}`)}</li>
          ))}
        </ol>
      </div>
      <p className="m-0 text-body">{t('page.after', { count: deletionDays })}</p>
      <Link
        to="/sign-in"
        className="inline-flex h-12 w-fit items-center rounded-full bg-primary px-6 text-[15px] font-semibold text-on-primary hover:opacity-90"
      >
        {t('page.logIn')}
      </Link>
      <p className="m-0 text-sm text-meta">{t('page.noAccess', { email: brand.supportEmail })}</p>
    </PageContainer>
  );
}
