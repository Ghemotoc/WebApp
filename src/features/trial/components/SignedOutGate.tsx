/**
 * SignedOutGate: while the members_only flag is on, a signed-out visitor who opens any page but
 * the home page and the few open ones is sent to the home page, where "Get in" is (TRIAL-WALL;
 * Robert, 23 Nov 2026: "If I'm not logged in, I should only be able to see the main page where
 * it says get in. That's it, nothing else.").
 *
 * The flag is off by default, so the public, findable story pages of CALM-9 come back the day
 * staff switch it off in Staff › Settings. Signed-in members never notice it. While the session
 * or the flags are still loading, a closed page shows nothing rather than flashing its content;
 * if the flags can't be read, the page shows as usual (the flag's safe default is off).
 * It is a front door, not a lock: the database's own rules are unchanged.
 * Who uses it: AppLayout, around the notices and the page. What it calls: useSession,
 * useFeatureFlags and lib/openSignedOut.ts.
 */
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';

import { useSession } from '@/features/auth/hooks/useSession';
import { useFeatureFlags } from '@/features/flags/hooks/useFeatureFlags';

import { isOpenSignedOut } from '../lib/openSignedOut';

/**
 * Renders the page, nothing while it can't tell yet, or a jump to the home page.
 *
 * @param props.children - the notices and the page
 * @returns the children, null or a Navigate to "/"
 */
export function SignedOutGate({ children }: { children: ReactNode }) {
  const { userId, isKnown } = useSession();
  const flags = useFeatureFlags();
  const { pathname } = useLocation();
  // Step 1: members, and the pages that stay open, always pass.
  if (userId !== null || isOpenSignedOut(pathname)) return <>{children}</>;
  // Step 2: an unreadable flag counts as off, so the site never locks itself by mistake.
  if (flags.hasFailed) return <>{children}</>;
  // Step 3: until the session and the flags are known, show nothing rather than the page.
  if (!isKnown || !flags.isLoaded) return null;
  // Step 4: a signed-out visitor goes to the home page while the site is for members only.
  if (flags.isOn('members_only', false)) return <Navigate to="/" replace />;
  return <>{children}</>;
}
