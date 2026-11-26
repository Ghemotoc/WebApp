/**
 * DeleteAccountPage: /delete-account, the website's account deletion page (story S1-E13-03,
 * criterion 5; Google Play asks for a web address where people can delete their account without
 * the app, and the Settings board names it).
 *
 * Signed in, it opens Settings › Delete account. Signed out, it says how: log in, open Settings ›
 * Delete account, log in again to confirm; with the 14 days, a Log in button and the support
 * address for anyone who can't log in. Drawn as board J19 (user stories, bundle 10): one centred
 * card (NoticeCard) with the steps as a plain numbered list, the 14 days as a line of text and the
 * support address in the small meta size.
 * Who shows it: the router, at /delete-account, loaded when opened.
 * What it calls: useSession (features/auth); the 14 days are the default of account_deletion_days.
 */
import { Link, Navigate } from 'react-router';

import { NoticeCard } from '@/components/ui/NoticeCard';
import { buttonClassName } from '@/components/ui/buttonStyles';
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
    <ol
      aria-label={t('page.stepsLabel')}
      className="m-0 flex list-decimal flex-col gap-1 pl-6 type-body text-ink"
    >
      {steps.map((step) => (
        <li key={step}>{t(`page.steps.${step}`)}</li>
      ))}
    </ol>
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
    <NoticeCard
      heading={t('page.heading')}
      headingId="delete-account-heading"
      documentTitle={t('page.title')}
    >
      <p className="m-0 type-body text-ink-muted">{t('page.intro')}</p>
      <StepList />
      <p className="m-0 type-body text-ink-muted">{t('page.after', { count: deletionDays })}</p>
      <Link to="/sign-in" className={buttonClassName({ size: 'lg' })}>
        {t('page.logIn')}
      </Link>
      <p className="m-0 type-meta text-ink-muted">
        {t('page.noAccess', { email: brand.supportEmail })}
      </p>
    </NoticeCard>
  );
}
