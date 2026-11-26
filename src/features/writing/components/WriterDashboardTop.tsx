/**
 * WriterDashboardTop: the writer dashboard's upper half (story S1-E3-07; board WriterDashboard
 * 4.1): "How readers respond" with its five figures (the page's one glass hero since CALM-7c),
 * then the followers line (CALM-7b) and "Not published yet" side by side from 1024 px, 64 px apart
 * (board simplified/New-Write; one column below), then the page's first advert (board D01, user
 * story 5.1; slot write_wide, which staff turn off or book in Sponsors › Placements).
 *
 * Who uses it: YourWritingPage, once the writer has a story. What it calls: DashboardTotals,
 * FollowersChart, NotPublishedYet and PageAdSlot; the numbers come in from useWriterDashboard.
 */
import { PageAdSlot } from '@/features/ads/components/PageAdSlot';

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
      <PageAdSlot pageKey="write" position={1} className="mx-auto w-full max-w-[970px]" />
    </>
  );
}
