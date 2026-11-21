/**
 * TrialFeedback: puts the "Report a bug" tab on member pages while the trial_feedback flag is on
 * (TRIAL-FEEDBACK; Robert, 21 Nov 2026: a side button to report bugs during the trial).
 *
 * Who uses it: AppLayout (src/app/shell/AppLayout.tsx). Staff pages have their own frame, so
 * staff never see it there.
 * What it calls: useSession and, only for a signed-in member, MemberTrialFeedback (fetched in its
 * own file), so a visitor's first download carries none of this feature but these few lines.
 * Signed-out visitors don't see it: a report needs an email to answer, and the trial is for
 * invited members (open question to Robert, 21 Nov 2026; the safe default is members only).
 */
import { lazy, Suspense } from 'react';

import { useSession } from '@/features/auth/hooks/useSession';

/** The flag check and the tab, in their own file. */
const MemberTrialFeedback = lazy(async () => {
  const module = await import('./MemberTrialFeedback');
  return { default: module.MemberTrialFeedback };
});

/**
 * Shows the tab to signed-in members while the flag is on.
 *
 * @returns the tab, or nothing
 */
export function TrialFeedback() {
  const { userId } = useSession();
  // The flags are read only once someone is signed in, so a visitor's page asks for nothing new.
  if (userId === null) return null;
  return (
    <Suspense fallback={null}>
      <MemberTrialFeedback />
    </Suspense>
  );
}
