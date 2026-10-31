/**
 * OnboardingPage: "Set up your profile", screen 2.5 (stories S1-E2-04 and S1-E2-06;
 * design/boards/Onboarding.dc.html).
 *
 * Who shows it: the router, at /setup. The email confirmation page and SetupProfileNotice link
 * here. What it calls: useMyOnboarding (my_onboarding()) and useMyNames.
 * What it shows, in order:
 * - signed out: a line saying to log in;
 * - setup due (a new account past the age check): the steps (OnboardingSteps);
 * - setup already done but no username yet (an older account): the username form alone, which
 *   goes to the home page when saved (S1-E2-04);
 * - setup done with a username: nothing to do, so the home page.
 */
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useNavigate } from 'react-router';

import { Eyebrow } from '@/components/ui/Eyebrow';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { SetupForm } from '@/features/account/components/SetupForm';
import { useMyNames } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';

import { useMyOnboarding } from '../hooks/useMyOnboarding';

import { OnboardingSteps } from './OnboardingSteps';

/**
 * The card with the page's heading around its body.
 *
 * @returns the page
 */
function SetupCard({ children }: { children: ReactNode }) {
  const { t } = useTranslation('account');
  return (
    <PageContainer className="tmc-rise flex justify-center pt-12 pb-7">
      <title>{t('onboarding.documentTitle')}</title>
      <section
        aria-labelledby="setup-heading"
        className="flex w-full max-w-[640px] flex-col gap-6 rounded-card border border-border bg-surface p-[clamp(20px,5vw,32px)] shadow-card"
      >
        <div className="flex flex-col gap-2">
          <Eyebrow>{t('onboarding.eyebrow')}</Eyebrow>
          <h1 id="setup-heading" className="m-0 font-heading text-[30px] font-bold text-heading">
            {t('onboarding.heading')}
          </h1>
          <p className="m-0 text-body">{t('onboarding.intro')}</p>
        </div>
        {children}
      </section>
    </PageContainer>
  );
}

/**
 * An older account that skipped the steps but still has no username: the form alone.
 *
 * @returns the form once the names have loaded, or null
 */
function UsernameOnly() {
  const account = useMyNames();
  const navigate = useNavigate();
  if (account.names === null) return null;
  return <SetupForm account={account} onDone={() => void navigate('/')} />;
}

/**
 * What goes in the card: a wait, an error, the signed-out line, the steps or the username form.
 *
 * @returns the card's body, or a redirect home when there is nothing to set up
 */
function SetupBody() {
  const { t } = useTranslation('account');
  const { userId, isKnown } = useSession();
  const state = useMyOnboarding();
  if (!isKnown) return null;
  if (userId === null) return <p className="m-0 text-body">{t('settings.signedOut')}</p>;
  if (state.loadFailed) return <Notice tone="error">{t('onboarding.loadFailed')}</Notice>;
  if (state.onboarding === undefined || state.onboarding === null) return null;
  if (state.onboarding.isDue)
    return <OnboardingSteps onboarding={state.onboarding} state={state} />;
  // Just finished here: OnboardingSteps is already on its way to Discover, so don't send home.
  if (state.savedKind === 'finish') return null;
  if (!state.onboarding.hasHandle) return <UsernameOnly />;
  return <Navigate to="/" replace />;
}

/**
 * Renders the page.
 *
 * @returns the setup screen
 */
export function OnboardingPage() {
  return (
    <SetupCard>
      <SetupBody />
    </SetupCard>
  );
}
