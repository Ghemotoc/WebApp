/**
 * StaffSessionEnded: what a staff member sees once their 12-hour staff session has run out
 * (bundle DASH-1; Robert, 6 Nov 2026, 18:32 UTC, saw an empty admin site instead).
 *
 * Who shows it: StaffLayout, instead of the staff frame, when my_staff_session_ended() says the
 * person holds a staff role but their session is older than staff_session_hours (S1-E11-01). The
 * server already refuses every staff action by then (is_staff_session()); this page only says so
 * and offers one button: sign out here and log in again, then come back to the admin site.
 * What it calls: signOutHere (features/auth/api/signIn.ts), then /sign-in?next=/staff, which
 * returns to /staff after the log-in (features/auth/lib/nextPath.ts).
 * Plain components, no doodles (CLAUDE.md, Designs: staff screens).
 */
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';

import { Button } from '@/components/ui/Button';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { PageContainer } from '@/components/ui/PageContainer';
import { signOutHere } from '@/features/auth/api/signIn';
import { getSupabaseClient } from '@/lib/supabase';

import { forgetStaffAccess } from '../hooks/useMyStaffAccess';

/** The log-in page, set to come back to the admin site afterwards. */
const signInAgainPath = '/sign-in?next=/staff';

/**
 * Renders the page.
 *
 * @returns the "Your staff session has ended" page
 */
export function StaffSessionEnded() {
  const { t } = useTranslation('staff');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutFailed, setSignOutFailed] = useState(false);

  /** Ends the old session on this device, so the log-in starts a fresh 12-hour one. */
  async function signInAgain() {
    setIsSigningOut(true);
    setSignOutFailed(false);
    try {
      const client = await getSupabaseClient();
      if (client !== null) await signOutHere(client);
      // The new session must be asked afresh, not shown this page again from the cache.
      forgetStaffAccess(queryClient);
      void navigate(signInAgainPath);
    } catch {
      // Supabase couldn't be reached: say so and let the person try again.
      setSignOutFailed(true);
      setIsSigningOut(false);
    }
  }

  return (
    <div className="min-h-dvh bg-paper text-ink">
      <main id="main" tabIndex={-1} className="focus:outline-none">
        <PageContainer className="flex max-w-[720px] flex-col gap-4 pt-16 pb-12">
          <title>{t('sessionEnded.documentTitle')}</title>
          <Eyebrow>{t('shell.eyebrow')}</Eyebrow>
          <h1 className="m-0 font-heading text-[34px] font-bold text-heading">
            {t('sessionEnded.heading')}
          </h1>
          <p className="m-0 text-body">{t('sessionEnded.body')}</p>
          <div className="flex flex-wrap items-center gap-4">
            <Button onClick={() => void signInAgain()} disabled={isSigningOut}>
              {isSigningOut ? t('sessionEnded.signingOut') : t('sessionEnded.signInAgain')}
            </Button>
            <Link to="/" className="font-semibold text-link underline">
              {t('sessionEnded.goHome')}
            </Link>
          </div>
          {signOutFailed && (
            <p role="alert" className="m-0 text-(--error-text)">
              {t('sessionEnded.signOutFailed')}
            </p>
          )}
        </PageContainer>
      </main>
    </div>
  );
}
