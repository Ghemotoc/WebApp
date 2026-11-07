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
 * What it calls: useMyWaitlist; WaitlistHoldingPage.
 */
import type { ReactNode } from 'react';
import { useLocation } from 'react-router';

import { useMyWaitlist } from '../hooks/useMyWaitlist';

import { WaitlistHoldingPage } from './WaitlistHoldingPage';

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
    return <WaitlistHoldingPage interest={place.data.interest} joinedAt={place.data.joined_at} />;
  }
  return <>{children}</>;
}
