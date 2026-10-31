/**
 * SetupProfileNotice: the way back to setup from any page (stories S1-E2-04 and S1-E2-06).
 *
 * It shows one of two panels to a signed-in person:
 * - "Choose a username", until one is chosen: the database keeps the account read-only until then
 *   (account_state() answers handle_missing);
 * - "Finish setting up your profile", for a new account with a username whose setup steps are
 *   still due (my_onboarding(); S1-E2-06), until they finish or skip them.
 * Who shows it: AppLayout, at the top of every page except /setup itself.
 * What it calls: useMyNames and useMyOnboarding. Signed out, or with nothing to do, it shows nothing.
 */
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router';

import { PageContainer } from '@/components/ui/PageContainer';
import { useMyOnboarding } from '@/features/onboarding/hooks/useMyOnboarding';

import { useMyNames } from '../hooks/useMyNames';

/**
 * Renders the notice, or nothing.
 *
 * @returns the panel when a signed-in person has no username or hasn't finished setup
 */
export function SetupProfileNotice() {
  const { t } = useTranslation('account');
  const { pathname } = useLocation();
  const { names } = useMyNames();
  const { onboarding } = useMyOnboarding();
  if (names === null || pathname === '/setup') return null;
  // Step 1: which panel, if any. The username comes first, because without it nothing works.
  let keyPrefix: string | null = null;
  if (names.handle === null) keyPrefix = 'notice';
  else if (onboarding?.isDue === true) keyPrefix = 'onboarding.notice';
  if (keyPrefix === null) return null;

  return (
    <PageContainer className="pt-6">
      <section
        aria-labelledby="setup-notice-title"
        className="flex flex-col gap-3 rounded-card border border-border bg-tint p-6"
      >
        <h2 id="setup-notice-title" className="m-0 font-heading text-[24px] font-bold text-heading">
          {t(`${keyPrefix}.heading`)}
        </h2>
        <p className="m-0 text-body">{t(`${keyPrefix}.body`)}</p>
        <Link
          to="/setup"
          className="inline-flex h-11 items-center self-start rounded-full bg-primary px-5 text-sm font-semibold text-on-primary no-underline hover:opacity-90"
        >
          {t(`${keyPrefix}.action`)}
        </Link>
      </section>
    </PageContainer>
  );
}
