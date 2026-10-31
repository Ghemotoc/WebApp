/**
 * OtherWaysToLogIn: the top of the log-in card, "Continue with Google / Apple / Microsoft" and
 * "Use a passkey", then "or" before the email form (story S1-E2-09; board SignIn.dc.html, "Other
 * ways to log in").
 *
 * Each part shows only while its flag is on: social_login for the providers, passkey_login for
 * the passkey (both off in March). With both off, nothing shows and the page is the S1-E2-05 form.
 * Who shows it: SignInPage.
 * What it calls: api/socialSignIn.ts. A provider log-in leaves for the provider and comes back to
 * /auth/social-return; a passkey log-in happens here and calls onSignedIn.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import lockIcon from '@/assets/icons/lock.svg';
import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { useFeatureFlags } from '@/features/flags/hooks/useFeatureFlags';
import { getSupabaseClient } from '@/lib/supabase';

import { signInWithPasskey, startSocialLogIn, type SocialProvider } from '../api/socialSignIn';

import { OrDivider } from './OrDivider';
import { SocialButtons } from './SocialButtons';

/** What went wrong, as a message key in auth.json. */
type Problem = 'social.logInFailed' | 'passkey.failed' | 'passkey.cancelled';

/**
 * The two actions and their state.
 *
 * @param onSignedIn - called after a passkey log-in
 * @returns logInWith, logInWithPasskey, isBusy and the problem to show
 */
function useOtherWays(onSignedIn: () => void) {
  const [isBusy, setIsBusy] = useState(false);
  const [problem, setProblem] = useState<Problem | null>(null);

  /** Leaves for the provider; on a failure to start, says so here. */
  async function logInWith(provider: SocialProvider) {
    setIsBusy(true);
    setProblem(null);
    try {
      const client = await getSupabaseClient();
      if (client === null) throw new Error('The app is not connected to its database.');
      await startSocialLogIn(client, provider);
    } catch {
      setProblem('social.logInFailed');
      setIsBusy(false);
    }
  }

  /** Asks the browser for a passkey, then goes on as after any log-in. */
  async function logInWithPasskey() {
    setIsBusy(true);
    setProblem(null);
    const client = await getSupabaseClient();
    const outcome = client === null ? 'failed' : await signInWithPasskey(client);
    setIsBusy(false);
    if (outcome === 'signed_in') onSignedIn();
    else setProblem(outcome === 'cancelled' ? 'passkey.cancelled' : 'passkey.failed');
  }

  return { logInWith, logInWithPasskey, isBusy, problem };
}

/**
 * Renders the other ways, or nothing while both flags are off.
 *
 * @param props.onSignedIn - what happens after a passkey log-in (SignInPage goes home)
 * @returns the buttons and the "or" divider
 */
export function OtherWaysToLogIn({ onSignedIn }: { onSignedIn: () => void }) {
  const { t } = useTranslation('auth');
  const flags = useFeatureFlags();
  const isSocialLoginOn = flags.isOn('social_login', false);
  const isPasskeyLoginOn = flags.isOn('passkey_login', false);
  const ways = useOtherWays(onSignedIn);
  if (!isSocialLoginOn && !isPasskeyLoginOn) return null;

  return (
    <>
      <div role="group" aria-label={t('social.logInGroup')} className="flex flex-col gap-[10px]">
        {isSocialLoginOn && (
          <SocialButtons
            groupLabel={t('social.providersGroup')}
            isBusy={ways.isBusy}
            onChoose={(provider) => void ways.logInWith(provider)}
          />
        )}
        {isPasskeyLoginOn && (
          <Button
            variant="secondary"
            size="lg"
            disabled={ways.isBusy}
            onClick={() => void ways.logInWithPasskey()}
          >
            <img src={lockIcon} alt="" aria-hidden="true" width={24} height={24} />
            {t('passkey.use')}
          </Button>
        )}
      </div>
      {ways.problem !== null && <Notice tone="error">{t(ways.problem)}</Notice>}
      <OrDivider label={t('social.or')} />
    </>
  );
}
