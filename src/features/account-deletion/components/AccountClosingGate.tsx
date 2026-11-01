/**
 * AccountClosingGate: while the signed-in account is closing, the closing-account page replaces
 * the notices and the page (story S1-E13-03).
 *
 * Why a gate: a closing account can't write and is hidden from everyone, so every other page
 * would only show errors. The log-in pages stay reachable (a different person can log in on this
 * device), and so do the legal pages, which the closing page doesn't replace.
 * Who uses it: AppLayout, around the notices and <Outlet />, inside MaintenanceGate.
 * What it calls: useMyAccountDeletion; ClosingAccountPage.
 */
import type { ReactNode } from 'react';
import { useLocation } from 'react-router';

import { useMyAccountDeletion } from '../hooks/useAccountDeletion';

import { ClosingAccountPage } from './ClosingAccountPage';

/** Pages a closing account can still open: logging in as someone else, and the legal texts. */
const openPathPrefixes = ['/sign-in', '/join', '/legal', '/auth/'];

/**
 * Renders the closing page or the children.
 *
 * @param props.children - the notices and the page
 * @returns one or the other
 */
export function AccountClosingGate({ children }: { children: ReactNode }) {
  const deletion = useMyAccountDeletion();
  const { pathname } = useLocation();
  const isOpenPath = openPathPrefixes.some((prefix) => pathname.startsWith(prefix));
  if (deletion.data?.state === 'closing' && !isOpenPath) {
    return <ClosingAccountPage deleteAfter={deletion.data.deleteAfter} />;
  }
  return <>{children}</>;
}
