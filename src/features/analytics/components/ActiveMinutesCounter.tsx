/**
 * ActiveMinutesCounter: draws nothing; while someone is signed in, it tells the database once a
 * minute that they use the app, for the investor numbers' daily totals (story S1-E15-04, bundle
 * ANALYTICS-1a).
 *
 * Only totals and each member's last day are kept, never a history of their days or pages
 * (decided 17 Oct 2026, 12:34: no per-reader records). Signed-out visitors send nothing, so no
 * cookie or IP address is needed (CLAUDE.md rule 7).
 * Who shows it: AppLayout, once for the whole app. What it calls: useSession and useActiveMinutes.
 */
import { useSession } from '@/features/auth/hooks/useSession';

import { useActiveMinutes } from '../hooks/useActiveMinutes';

/**
 * Runs the counter.
 *
 * @returns nothing to draw
 */
export function ActiveMinutesCounter() {
  const { userId } = useSession();
  useActiveMinutes(userId !== null);
  return null;
}
