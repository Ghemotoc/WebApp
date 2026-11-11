/**
 * AccountClosingRedirect: what ACCOUNT_CLOSING_PATH shows to anyone whose account isn't closing
 * (bundle INACTIVE-2).
 *
 * The closing email links to this address through the log-in page. For a closing account,
 * AccountClosingGate (around every page) shows the closing page here, so this component is never
 * drawn for it. Everyone else is sent on: a visitor who isn't logged in to the log-in page, which
 * comes back here; a person whose account is open to Settings › Download data, the same download.
 * It waits until the account's state is known before sending anyone on: for a moment after the
 * page loads the gate doesn't know yet that the account is closing, and sending a closing account
 * to Settings in that moment would count as using the site and keep it.
 * Who shows it: the router, at ACCOUNT_CLOSING_PATH, loaded when opened.
 * What it calls: useSession (features/auth) and useMyAccountDeletion.
 */
import { Navigate } from 'react-router';

import { useSession } from '@/features/auth/hooks/useSession';
import { ACCOUNT_CLOSING_PATH } from '@/lib/account-closing-path';

import { useMyAccountDeletion } from '../hooks/useAccountDeletion';

/**
 * Sends the person on.
 *
 * @returns nothing until the session and the account's state are known, then a redirect
 */
export function AccountClosingRedirect() {
  const { userId, isKnown } = useSession();
  const deletion = useMyAccountDeletion();
  // Step 1: wait until we know whether someone is logged in.
  if (!isKnown) return null;
  // Step 2: logged out: the log-in page, which returns here.
  if (userId === null) {
    return <Navigate to={`/sign-in?next=${encodeURIComponent(ACCOUNT_CLOSING_PATH)}`} replace />;
  }
  // Step 3: wait for the account's state; a closing account stays here, where the gate shows
  // the closing page. If the state can't be read, Settings will say what is wrong.
  if (deletion.isPending || deletion.data?.state === 'closing') return null;
  // Step 4: an open account downloads its data in Settings.
  return <Navigate to="/settings#download-my-data" replace />;
}
