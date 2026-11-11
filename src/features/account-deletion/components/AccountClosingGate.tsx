/**
 * AccountClosingGate: while the signed-in account is closing, the closing-account page replaces
 * the notices and the page (story S1-E13-03), with one difference for an account that closed
 * because nobody used it (bundle INACTIVE-2).
 *
 * Why a gate: a closing account can't write and is hidden from everyone, so every other page
 * would only show errors. The log-in pages stay reachable (a different person can log in on this
 * device), and so do the legal pages, which the closing page doesn't replace.
 * The two kinds of closing (Robert, 11 Nov 2026, 19:43 UTC):
 *   - 'requested': the person chose "Delete my account". Every page shows the closing page until
 *     they choose "Keep account", so a stray click can't undo a deletion they asked for.
 *   - 'unused': the nightly job closed it after 5 years. The closing page shows only at
 *     ACCOUNT_CLOSING_PATH, where the closing email's link lands and the data can be downloaded
 *     without keeping the account. Opening any other page means the person is using the site
 *     again, so the account is kept (KeepByUsing).
 * Who uses it: AppLayout, around the notices and <Outlet />, inside MaintenanceGate.
 * What it calls: useMyAccountDeletion; ClosingAccountPage; KeepByUsing.
 */
import type { ReactNode } from 'react';
import { useLocation } from 'react-router';

import { ACCOUNT_CLOSING_PATH } from '@/lib/account-closing-path';

import { useMyAccountDeletion } from '../hooks/useAccountDeletion';

import { ClosingAccountPage } from './ClosingAccountPage';
import { KeepByUsing } from './KeepByUsing';

/** Pages a closing account can still open: logging in as someone else, and the legal texts. */
const openPathPrefixes = ['/sign-in', '/join', '/legal', '/auth/'];

/**
 * Renders the closing page, the "opening the account again" step or the children.
 *
 * @param props.children - the notices and the page
 * @returns one of the three
 */
export function AccountClosingGate({ children }: { children: ReactNode }) {
  const deletion = useMyAccountDeletion();
  const { pathname } = useLocation();
  const isOpenPath = openPathPrefixes.some((prefix) => pathname.startsWith(prefix));
  // Step 1: an open account, a signed-out visitor or a page that stays reachable: the page itself.
  if (deletion.data?.state !== 'closing' || isOpenPath) return <>{children}</>;
  // Step 2: an unused account on any page but the download page is being used again: keep it.
  if (deletion.data.reason === 'unused' && pathname !== ACCOUNT_CLOSING_PATH) {
    return <KeepByUsing />;
  }
  // Step 3: otherwise the closing page.
  return (
    <ClosingAccountPage deleteAfter={deletion.data.deleteAfter} reason={deletion.data.reason} />
  );
}
