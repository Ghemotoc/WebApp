/**
 * MaintenanceGate: shows the maintenance page instead of the page someone opened while
 * maintenance mode is on, except to staff and on the pages that stay open (story S1-E1-05).
 *
 * Who uses it: AppLayout (src/app/shell/AppLayout.tsx), around the notices and the page, so the
 * top bar, the language menu and the footer stay as they are.
 * What it calls: hooks/useMaintenanceMode.ts and lib/openDuringMaintenance.ts.
 * Acceptance criterion: "Given maintenance mode switched on in admin, when a user opens the app,
 * then they see a maintenance page while staff can still sign in." Until the settings screen
 * (S1-E11-03) an admin switches the flag in the SQL editor (supabase/README.md).
 */
import type { ReactNode } from 'react';
import { useLocation } from 'react-router';

import { useMaintenanceMode } from '../hooks/useMaintenanceMode';
import { isOpenDuringMaintenance } from '../lib/openDuringMaintenance';
import { MaintenancePage } from './MaintenancePage';

/** What the gate wraps. */
interface MaintenanceGateProps {
  children: ReactNode;
}

/**
 * Renders the page, or the maintenance page in its place.
 *
 * @returns the children, or MaintenancePage while maintenance applies to this person and page
 */
export function MaintenanceGate({ children }: MaintenanceGateProps) {
  const { pathname } = useLocation();
  const maintenance = useMaintenanceMode();

  if (!maintenance.isClosedForThisPerson || isOpenDuringMaintenance(pathname)) {
    return children;
  }
  return (
    <MaintenancePage onCheckAgain={maintenance.checkAgain} isChecking={maintenance.isChecking} />
  );
}
