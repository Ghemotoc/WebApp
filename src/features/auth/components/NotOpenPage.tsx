/**
 * NotOpenPage: "We're not open in your country yet" (story S1-E2-10). There is no board for it; it
 * follows the auth card (board 2.2).
 *
 * Who shows it: the router, at /not-open; SignUpPage sends a visitor here once sign-up is public
 * and their country's market is closed or unknown. During the invited March test nobody is sent
 * here (decided 17 Oct 2026, 19:43, Q6).
 * No email is kept here. The waiting list (WAITLIST-1, which reversed Q15 on 6 Nov 2026) is on
 * the sign-up form itself; a closed country can't join it, so this page only says to come back.
 * What it reads: the country of the connection (useSignUpMarket), only to name it.
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { useSignUpMarket } from '../hooks/useSignUpMarket';

import { AuthCard } from './AuthCard';

/**
 * Renders the page.
 *
 * @returns the "not open yet" screen
 */
export function NotOpenPage() {
  const { t, i18n } = useTranslation('auth');
  // Asked only to name the country; whether sign-up is closed doesn't matter on this page.
  const { country } = useSignUpMarket(false);
  const countryName =
    country === null
      ? null
      : new Intl.DisplayNames([i18n.language], { type: 'region' }).of(country);

  return (
    <AuthCard
      documentTitle={t('notOpen.documentTitle')}
      eyebrow={t('notOpen.eyebrow')}
      heading={t('notOpen.heading')}
      intro={
        countryName === null || countryName === undefined
          ? t('notOpen.bodyUnknown')
          : t('notOpen.body', { country: countryName })
      }
    >
      <p className="m-0 text-body">{t('notOpen.noEmail')}</p>
      <div className="flex flex-wrap gap-4">
        <Link
          to="/"
          className="inline-flex h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-on-primary no-underline hover:opacity-90"
        >
          {t('notOpen.readStories')}
        </Link>
        <Link to="/legal/terms" className="inline-flex min-h-11 items-center text-link underline">
          {t('notOpen.legal')}
        </Link>
      </div>
    </AuthCard>
  );
}
