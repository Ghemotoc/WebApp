/**
 * StaffWorkspaceSignIn: what a staff member sees at any /staff address while their session isn't
 * a Google Workspace sign-in (story S1-E2-07b; architecture 1.8.1 and 1.8.3).
 *
 * Who shows it: StaffLayout, instead of the staff frame, when my_staff_sign_in() says a
 * Workspace sign-in is needed. That only happens once the owner has set the staff domain at
 * GO-LIVE; before then staff sign in as in March (S1-E2-07a). The server has already refused every
 * staff action on its own (is_staff_session()); this page says why and offers the way in.
 * The two steps:
 * 1. if the account isn't linked to a Google account on the staff domain yet, "Continue with
 *    Google" connects it, through the same connect flow as Settings › Ways to log in;
 * 2. once it is linked, "Continue with Google" signs in with Google, so the session itself is a
 *    Workspace sign-in, protected by Google's 2-Step Verification (decided 17 Oct 2026, 11:53).
 * What it calls: connectProvider() and startSocialLogIn() from the ways-to-log-in code.
 * Plain components, no doodles (CLAUDE.md, Designs: staff screens).
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Eyebrow } from '@/components/ui/Eyebrow';
import { PageContainer } from '@/components/ui/PageContainer';
import { connectProvider } from '@/features/account/api/loginMethods';
import { startSocialLogIn } from '@/features/auth/api/socialSignIn';
import { SocialButtons } from '@/features/auth/components/SocialButtons';
import { getSupabaseClient } from '@/lib/supabase';

/** What the page needs. */
interface StaffWorkspaceSignInProps {
  /** The staff domain, shown as "@domain". */
  domain: string;
  /** True when the account is already linked to a Google account on the domain. */
  isConnected: boolean;
}

/**
 * Renders the page.
 *
 * @returns the page, with one Google button and a plain error line when Google can't be reached
 */
export function StaffWorkspaceSignIn({ domain, isConnected }: StaffWorkspaceSignInProps) {
  const { t } = useTranslation('staff');
  const [isBusy, setIsBusy] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);

  /** Leaves for Google: to connect the account first, or to sign in once it is connected. */
  async function goToGoogle() {
    setIsBusy(true);
    setHasFailed(false);
    try {
      const client = await getSupabaseClient();
      if (client === null) throw new Error('No database settings.');
      if (isConnected) await startSocialLogIn(client, 'google');
      else await connectProvider(client, 'google');
    } catch {
      // Google or Supabase Auth refused to start; say so plainly and let the person try again.
      setHasFailed(true);
      setIsBusy(false);
    }
  }

  return (
    <div className="min-h-dvh bg-paper text-ink">
      <main id="main" tabIndex={-1} className="focus:outline-none">
        <PageContainer className="flex max-w-[720px] flex-col gap-4 pt-16 pb-12">
          <title>{t('workspace.documentTitle')}</title>
          <Eyebrow>{t('shell.eyebrow')}</Eyebrow>
          <h1 className="m-0 font-heading text-[34px] font-bold text-heading">
            {t('workspace.heading')}
          </h1>
          <p className="m-0 text-body">{t('workspace.why', { domain })}</p>
          <p className="m-0 text-body">
            {t(isConnected ? 'workspace.stepSignIn' : 'workspace.stepConnect', { domain })}
          </p>
          <div className="max-w-[360px]">
            <SocialButtons
              groupLabel={t('workspace.buttonGroup')}
              providers={['google']}
              isBusy={isBusy}
              onChoose={() => void goToGoogle()}
            />
          </div>
          {hasFailed ? (
            <p role="alert" className="m-0 text-body">
              {t('workspace.failed')}
            </p>
          ) : null}
        </PageContainer>
      </main>
    </div>
  );
}
