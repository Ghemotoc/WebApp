/**
 * TouchDeviceGate: on a phone or a touch-only tablet, the page, or "For now, the test runs on a
 * computer" in its place while the desktop_only flag is on (TRIAL-DESKTOP; board J33).
 *
 * Who uses it: DesktopOnlyGate, which fetches this file only on a touch-first device, so a
 * computer's first download carries none of it (the reader's download budget, QA-1b).
 * What it calls: the public flags (useFeatureFlags), lib/openOnPhones.ts and, only when it is
 * needed, ComputerOnlyPage.
 * While the flags load, or if they can't be read, the page opens as usual (the flag's safe
 * default is off).
 */
import { lazy, Suspense, type ReactNode } from 'react';
import { useLocation } from 'react-router';

import { useFeatureFlags } from '@/features/flags/hooks/useFeatureFlags';

import { isOpenOnPhones } from '../lib/openOnPhones';

/** The computers-only page, in its own file, fetched the first time a phone needs it. */
const ComputerOnlyPage = lazy(async () => {
  const module = await import('./ComputerOnlyPage');
  return { default: module.ComputerOnlyPage };
});

/** What the gate wraps. */
interface TouchDeviceGateProps {
  children: ReactNode;
}

/**
 * Shows the page, or the computers-only page while the flag is on and the page isn't one that
 * stays open on phones (the Legal centre and the other contact points).
 *
 * @returns the children, or ComputerOnlyPage
 */
export function TouchDeviceGate({ children }: TouchDeviceGateProps) {
  const { isOn } = useFeatureFlags();
  const { pathname } = useLocation();
  if (!isOn('desktop_only', false) || isOpenOnPhones(pathname)) return children;
  // Nothing shows for the moment the page's code takes to arrive, rather than the page behind it.
  return (
    <Suspense fallback={null}>
      <ComputerOnlyPage />
    </Suspense>
  );
}
