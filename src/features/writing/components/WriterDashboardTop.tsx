/**
 * WriterDashboardTop: the writer dashboard's upper half (story S1-E3-07; board WriterDashboard
 * 4.1): "How readers respond" with its five figures (the page's one glass hero since CALM-7c),
 * then the followers line (CALM-7b) and "Not published yet" side by side from 1024 px, 64 px apart
 * (board simplified/New-Write; one column below).
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
      <div className="grid items-start gap-12 lg:grid-cols-2 lg:gap-16">
        <FollowersChart
          allTimeFollowers={dashboard.totals.followersAllTime}
          thisWeek={dashboard.totals.followersThisWeek}
        />
        <NotPublishedYet chapters={dashboard.chapters} storyTitles={storyTitles} />
      </div>
    </>
  );
}
