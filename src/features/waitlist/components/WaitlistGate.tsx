/**
 * WaitlistGate: while the signed-in person waits on the list, the holding page replaces the
 * notices and the page (bundle WAITLIST-1, story S1-E2-24).
 *
 * Why a gate: someone waiting can't write, read or post yet (account_state() 'waitlisted'), so
 * every other page would only show refusals. These stay reachable: logging in (someone else may
 * use this device), the legal pages, help, Contact us and their support tickets, and Settings,
 * where they can change their profile and emails or delete the account. If the place can't be
 * read, the page shows as usual: the database still refuses what a waiting account may not do.
 * Who uses it: AppLayout, inside AccountClosingGate.
 * What it calls: useMyWaitlist; WaitlistHoldingPage, fetched only for someone who waits, so its
 * code (the avatar builder, the likes picker) stays out of every member's first download (the
 * 280 KB budget, scripts/check-bundle-size.ts; QA-6).
 */
import { lazy, Suspense, type ReactNode } from 'react';
import { useLocation } from 'react-router';

import { useMyWaitlist } from '../hooks/useMyWaitlist';

/** The holding page, in its own file, fetched the first time it is needed. */
const WaitlistHoldingPage = lazy(async () => {
  const module = await import('./WaitlistHoldingPage');
  return { default: module.WaitlistHoldingPage };
});

/** Pages someone waiting can still open. */
const waitlistOpenPathPrefixes = [
  '/sign-in',
  '/sign-up',
  '/join',
  '/legal',
  '/auth/',
  '/settings',
  '/help',
  '/contact',
  '/reset-password',
  '/forgot-password',
  '/support',
  '/unsubscribe',
  '/delete-account',
];

/**
 * Renders the holding page or the children.
 *
 * @param props.children - the notices and the page
 * @returns one or the other
 */
export function WaitlistGate({ children }: { children: ReactNode }) {
  const place = useMyWaitlist();
  const { pathname } = useLocation();
  const isOpenPath = waitlistOpenPathPrefixes.some((prefix) => pathname.startsWith(prefix));
  if (place.data?.on_list === true && place.data.waiting && !isOpenPath) {
    // Nothing shows for the moment the page's code takes to arrive, rather than the page behind it.
    return (
      <Suspense fallback={null}>
        <WaitlistHoldingPage interest={place.data.interest} joinedAt={place.data.joined_at} />
      </Suspense>
    );
  }
  return <>{children}</>;
}
