/**
 * MemberTrialFeedback: for a signed-in member, the "Report a bug" tab while the trial_feedback
 * flag is on, nothing otherwise (TRIAL-FEEDBACK; board J30).
 *
 * Who uses it: TrialFeedback, which fetches this file only once someone is signed in, so a
 * visitor's first download carries none of it.
 * What it calls: the public flags (useFeatureFlags) and, only while the flag is on, BugReportTab.
 */
import { lazy, Suspense } from 'react';

import { useFeatureFlags } from '@/features/flags/hooks/useFeatureFlags';

/** The tab and its panel, in their own file. */
const BugReportTab = lazy(async () => {
  const module = await import('./BugReportTab');
  return { default: module.BugReportTab };
});

/**
 * Shows the tab while the flag is on.
 *
 * @returns the tab, or nothing
 */
export function MemberTrialFeedback() {
  const { isOn } = useFeatureFlags();
  if (!isOn('trial_feedback', false)) return null;
  return (
    <Suspense fallback={null}>
      <BugReportTab />
    </Suspense>
  );
}
