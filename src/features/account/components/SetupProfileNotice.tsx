/**
 * SetupProfileNotice: "Choose a username", shown to a signed-in person who hasn't chosen one yet
 * (story S1-E2-04).
 *
 * Why: until a username is chosen, the database keeps the account read-only (account_state()
 * answers handle_missing), so the person needs a way back to setup from any page.
 * Who shows it: AppLayout, at the top of every page except /setup itself.
 * What it calls: useMyNames. Signed out, or with a username, it shows nothing.
 */
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router';

import { PageContainer } from '@/components/ui/PageContainer';

import { useMyNames } from '../hooks/useMyNames';

/**
 * Renders the notice, or nothing.
 *
 * @returns the panel when a signed-in person has no username
 */
export function SetupProfileNotice() {
  const { t } = useTranslation('account');
  const { pathname } = useLocation();
  const { names } = useMyNames();
  if (names === null || names.handle !== null || pathname === '/setup') return null;

  return (
    <PageContainer className="pt-6">
      <section
        aria-labelledby="setup-notice-title"
        className="flex flex-col gap-3 rounded-card border border-border bg-tint p-6"
      >
        <h2 id="setup-notice-title" className="m-0 font-heading text-[24px] font-bold text-heading">
          {t('notice.heading')}
        </h2>
        <p className="m-0 text-body">{t('notice.body')}</p>
        <Link
          to="/setup"
          className="inline-flex h-11 items-center self-start rounded-full bg-primary px-5 text-sm font-semibold text-on-primary no-underline hover:opacity-90"
        >
          {t('notice.action')}
        </Link>
      </section>
    </PageContainer>
  );
}
