/**
 * SetupPage: "Set up your profile", step 1 of screen 2.5 (story S1-E2-04;
 * design/boards/Onboarding.dc.html).
 *
 * Who shows it: the router, at /setup. The email confirmation page and the "Choose a username"
 * notice (SetupProfileNotice) link here.
 * What it shows: the username (required) and the pen name (optional), then "Save and continue",
 * which goes to the home page. The board's other parts come with later stories: the interface
 * language is the language menu (S1-E1-04), the country comes from the connection (S1-E2-10), and
 * the county, likes and step 3 are S1-E2-06 and S1-E2-11 (after March).
 * Someone who already has a username is sent to the home page; they change names in Settings.
 * Signed out, it says to log in.
 */
import { useTranslation } from 'react-i18next';
import { Navigate } from 'react-router';

import { Eyebrow } from '@/components/ui/Eyebrow';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';

import { useMyNames } from '../hooks/useMyNames';

import { SetupForm } from './SetupForm';

/**
 * What goes in the card: a wait, an error, the signed-out line or the form.
 *
 * @param props.account - useMyNames's result
 * @returns the card's body
 */
function SetupCardBody({ account }: { account: ReturnType<typeof useMyNames> }) {
  const { t } = useTranslation('account');
  if (!account.isKnown) return null;
  if (!account.isSignedIn) return <p className="m-0 text-body">{t('settings.signedOut')}</p>;
  if (account.loadFailed) return <Notice tone="error">{t('errors.loadFailed')}</Notice>;
  return <SetupForm account={account} />;
}

/**
 * Renders the page.
 *
 * @returns the setup screen, or a redirect home when a username is already chosen
 */
export function SetupPage() {
  const { t } = useTranslation('account');
  const account = useMyNames();
  // A username chosen before this visit: setup is done. (Saving here navigates by itself.)
  if (account.names?.handle != null && !account.handleSave.isSuccess) {
    return <Navigate to="/" replace />;
  }

  return (
    <PageContainer className="tmc-rise flex justify-center pt-12 pb-7">
      <title>{t('setup.documentTitle')}</title>
      <section
        aria-labelledby="setup-heading"
        className="flex w-full max-w-[560px] flex-col gap-5 rounded-card border border-border bg-surface p-[clamp(20px,5vw,32px)] shadow-card"
      >
        <div className="flex flex-col gap-2">
          <Eyebrow>{t('setup.eyebrow')}</Eyebrow>
          <h1 id="setup-heading" className="m-0 font-heading text-[30px] font-bold text-heading">
            {t('setup.heading')}
          </h1>
          <p className="m-0 text-body">{t('setup.intro')}</p>
        </div>
        <SetupCardBody account={account} />
      </section>
    </PageContainer>
  );
}
