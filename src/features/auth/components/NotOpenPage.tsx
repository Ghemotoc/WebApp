/**
 * NotOpenPage: "We're not open in your country yet" (story S1-E2-10). There is no board for it; it
 * follows the auth card (board 2.2).
 *
 * Who shows it: the router, at /not-open; SignUpPage sends a visitor here once sign-up is public
 * and their country's market is closed or unknown. During the invited March test nobody is sent
 * here (decided 17 Oct 2026, 19:43, Q6).
 * "Tell me when you open here" (bundle G5, part a; Robert, 7 Nov 2026, 11:57 UTC): the visitor can
 * leave an email address to hear once, on the day their country opens (OpeningListForm). The
 * waiting list of an open country (WAITLIST-1) stays on the sign-up form itself.
 * What it reads: the country of the connection (useSignUpMarket), to name it and to tell the form
 * whether it must ask for the country.
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { useSignUpMarket } from '../hooks/useSignUpMarket';

import { AuthCard } from './AuthCard';
import { OpeningListForm } from './OpeningListForm';

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
      <OpeningListForm country={country} />
      <div className="flex flex-wrap gap-4">
        <Link
          to="/"
          className="inline-flex h-11 items-center rounded-full button-main px-5 text-sm font-semibold no-underline"
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
