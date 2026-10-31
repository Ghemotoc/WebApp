/**
 * The "handled in time" sums for the Reports by tier table on the staff Metrics page (story
 * S1-E11-04; board AdminMetrics).
 *
 * Who calls it: components/metrics/TierNumbersTable.tsx. Pure, so it is unit-tested on its own.
 */
import type { TierNumbers } from '../api/metricsOverview';

/**
 * The share of measured cases handled within the time limit, in whole per cent.
 *
 * @param inTime - cases decided by their deadline
 * @param measured - cases decided or past their deadline
 * @returns the per cent, or null when nothing can be measured yet (no division by zero)
 */
export function shareInTime(inTime: number, measured: number): number | null {
  if (measured === 0) return null;
  return Math.round((100 * inTime) / measured);
}

/**
 * Every tier added together, for the line above the table ("45 of 48 handled in time").
 *
 * @param tiers - the rows from admin_metrics_overview()
 * @returns the sums of measured and in-time cases
 */
export function tierTotals(tiers: TierNumbers[]): { measured: number; inTime: number } {
  let measured = 0;
  let inTime = 0;
  for (const tier of tiers) {
    measured += tier.measured;
    inTime += tier.inTime;
  }
  return { measured, inTime };
}
