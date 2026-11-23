/**
 * PageGates: the page inside <main>, behind the gates that can replace it (split out of
 * AppLayout by TRIAL-WALL to keep that function short).
 *
 * From the outside in: SignedOutGate (members only, TRIAL-WALL), MaintenanceGate (S1-E1-05),
 * AccountClosingGate (S1-E13-03) and WaitlistGate (WAITLIST-1), then the account notices and
 * the route's own page.
 * Who uses it: AppLayout. What it calls: the four gates, AccountNotices and React Router's Outlet.
 */
import { Outlet } from 'react-router';

import { AccountClosingGate } from '@/features/account-deletion/components/AccountClosingGate';
import { MaintenanceGate } from '@/features/maintenance/components/MaintenanceGate';
import { SignedOutGate } from '@/features/trial/components/SignedOutGate';
import { WaitlistGate } from '@/features/waitlist/components/WaitlistGate';

import { AccountNotices } from './AccountNotices';

/**
 * Renders the route's page behind its gates.
 *
 * @returns the gates around the account notices and the page
 */
export function PageGates() {
  return (
    // While the site is for members only, signed-out visitors see only the home page and Read (TRIAL-WALL).
    <SignedOutGate>
      {/* While maintenance mode is on, the maintenance page replaces all of this (S1-E1-05). */}
      <MaintenanceGate>
        {/* While the account waits to be deleted, the closing page replaces the rest (S1-E13-03). */}
        <AccountClosingGate>
          {/* While the person waits on the list, the holding page replaces the rest (WAITLIST-1). */}
          <WaitlistGate>
            {/* The account notices: Terms, country, username, age check, consent, sanctions. */}
            <AccountNotices />
            <Outlet />
          </WaitlistGate>
        </AccountClosingGate>
      </MaintenanceGate>
    </SignedOutGate>
  );
}
