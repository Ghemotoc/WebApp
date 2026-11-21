/**
 * DesktopOnlyGate: while the desktop_only flag is on, a phone or a touch-only tablet sees "For
 * now, the test runs on a computer" instead of the page it opened (TRIAL-DESKTOP; Robert,
 * 21 Nov 2026: the trial is desktop only at first; board J33).
 *
 * Who uses it: AppLayout (src/app/shell/AppLayout.tsx), around the whole frame, so a phone sees
 * the page alone, with no top bar or tab bar. Staff pages have their own frame and stay open.
 * What it calls: hooks/useIsTouchFirstDevice.ts and, only on a touch-first device, TouchDeviceGate
 * (fetched in its own file, so a computer's first download carries only these few lines).
 * It is a notice, not a lock: the database's own rules are unchanged.
 */
import { lazy, Suspense, type ReactNode } from 'react';

import { useIsTouchFirstDevice } from '../hooks/useIsTouchFirstDevice';

/** The phone side of the gate: the flags and the computers-only page. */
const TouchDeviceGate = lazy(async () => {
  const module = await import('./TouchDeviceGate');
  return { default: module.TouchDeviceGate };
});

/** What the gate wraps. */
interface DesktopOnlyGateProps {
  children: ReactNode;
}

/**
 * Renders the page, or the computers-only page in its place on a phone or tablet.
 *
 * @returns the children on a computer; TouchDeviceGate's answer on a phone or tablet
 */
export function DesktopOnlyGate({ children }: DesktopOnlyGateProps) {
  const isTouchFirst = useIsTouchFirstDevice();
  if (!isTouchFirst) return children;
  // While the phone side arrives, nothing shows, so the page never flashes before the notice.
  return (
    <Suspense fallback={null}>
      <TouchDeviceGate>{children}</TouchDeviceGate>
    </Suspense>
  );
}
