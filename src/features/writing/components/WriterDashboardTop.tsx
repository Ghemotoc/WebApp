/**
 * WriterDashboardTop: the writer dashboard's upper half (story S1-E3-07; board WriterDashboard
 * 4.1): "How readers respond" with its five tiles, then "Followers over time" and "Not published
 * yet" side by side (one column on a phone).
 *
 * Who uses it: YourWritingPage, once the writer has a story. What it calls: DashboardTotals,
 * FollowersChart and NotPublishedYet; the numbers come in from useWriterDashboard.
 */
import type { DashboardPeriod, WriterDashboard } from '../api/dashboard';

import { DashboardTotals } from './DashboardTotals';
import { FollowersChart } from './FollowersChart';
import { NotPublishedYet } from './NotPublishedYet';

/** What the upper half needs. */
export interface WriterDashboardTopProps {
  dashboard: WriterDashboard;
  period: DashboardPeriod;
  onPeriodChange: (period: DashboardPeriod) => void;
  /** Story titles by slug, for the draft rows. */
  storyTitles: Map<string, string>;
}

/**
 * Renders the upper half.
 *
 * @param props - the numbers, the period and the story titles
 * @returns the sections
 */
export function WriterDashboardTop({
  dashboard,
  period,
  onPeriodChange,
  storyTitles,
}: WriterDashboardTopProps) {
  return (
    <>
      <DashboardTotals dashboard={dashboard} period={period} onPeriodChange={onPeriodChange} />
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,380px),1fr))] gap-5">
        <FollowersChart
          weeks={dashboard.followersByWeek}
          allTimeFollowers={dashboard.totals.followersAllTime}
        />
        <NotPublishedYet chapters={dashboard.chapters} storyTitles={storyTitles} />
      </div>
    </>
  );
}
