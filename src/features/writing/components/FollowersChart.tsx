/**
 * FollowersChart: the followers section on the Write page, a line graph with a time range menu
 * (bundle CALM-7b; Robert, 20 Nov 2026, 12:07 UTC: "followers as a line graph with a time range
 * menu, like LinkedIn"; design handover Step 4; board New-Write, "147 followers").
 *
 * Board values: the heading with the total ("147 followers", or "Fewer than 5 followers" from 1
 * to 4), a meta line with the state first ("+21 this week", "fewer than 5 this week", nothing at
 * 0) and "Followers over time", the "Time range" drop-down at the right (Last 7, 30, 90 or 365
 * days, 90 when the page opens, not saved), then the line and a caption saying what one point is.
 * The heading and the meta line always state the numbers, so the drawing is never the only place
 * a number lives; a hidden table repeats every point for screen readers. Since CALM-7c it sits on
 * the page with no card around it (board simplified/New-Write).
 * Who uses it: WriterDashboardTop. What it calls: useFollowersLine → writer_followers_line(), and
 * FollowersLinePlot and FollowersTable to draw it.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { MetaLine, type MetaFact } from '@/components/ui/MetaLine';
import { Notice } from '@/components/ui/Notice';
import { Select } from '@/components/ui/Select';

import type { ShownCount } from '../api/dashboard';
import {
  defaultFollowersRange,
  followersRanges,
  stepOf,
  type FollowersRange,
} from '../api/followersLine';
import { useFollowersLine } from '../hooks/useFollowersLine';
import { formatShownCount } from '../lib/dashboardNumbers';

import { FollowersLinePlot } from './FollowersLinePlot';
import { FollowersTable } from './FollowersTable';

/** What the card needs. */
export interface FollowersChartProps {
  /** Every follower, for the heading; null for "fewer than 5". */
  allTimeFollowers: ShownCount;
  /** New follows since Monday; null for "fewer than 5". */
  thisWeek: ShownCount;
}

/**
 * The heading's words: "147 followers", or "Fewer than 5 followers".
 *
 * @param allTimeFollowers - the total
 * @returns the heading
 */
function useHeading(allTimeFollowers: ShownCount): string {
  const { t, i18n } = useTranslation('writing');
  if (allTimeFollowers === null) return t('dashboard.followers.headingFew');
  return t('dashboard.followers.heading', {
    count: allTimeFollowers,
    value: formatShownCount(allTimeFollowers, i18n.language, ''),
  });
}

/**
 * The meta line's facts: the week's change first, as a state, then "Followers over time".
 *
 * @param thisWeek - new follows since Monday
 * @returns the facts
 */
function useMetaFacts(thisWeek: ShownCount): MetaFact[] {
  const { t, i18n } = useTranslation('writing');
  const label: MetaFact = { text: t('dashboard.followers.eyebrow') };
  if (thisWeek === 0) return [label];
  const change =
    thisWeek === null
      ? t('dashboard.followers.thisWeekFew')
      : t('dashboard.followers.thisWeek', { value: formatShownCount(thisWeek, i18n.language, '') });
  return [{ text: change, kind: 'state' }, label];
}

/** The "Time range" drop-down, with its label read by screen readers only (board). */
function RangeMenu({
  range,
  onChange,
}: {
  range: FollowersRange;
  onChange: (range: FollowersRange) => void;
}) {
  const { t } = useTranslation('writing');
  return (
    <Select
      id="followers-range"
      label={t('dashboard.followers.rangeLabel')}
      placement="form"
      options={followersRanges.map((days) => ({
        value: String(days),
        label: t(`dashboard.followers.ranges.${days}`),
      }))}
      value={String(range)}
      onChange={(value) => {
        // Only the four offered values come back from the drop-down.
        const chosen = followersRanges.find((days) => String(days) === value);
        if (chosen !== undefined) onChange(chosen);
      }}
    />
  );
}

/**
 * Renders the card.
 *
 * @param props.allTimeFollowers - the total for the heading
 * @param props.thisWeek - the week's new follows for the meta line
 * @returns the card
 */
export function FollowersChart({ allTimeFollowers, thisWeek }: FollowersChartProps) {
  const { t } = useTranslation('writing');
  // Step 1: the range (90 days when the page opens; not saved) and its points.
  const [range, setRange] = useState<FollowersRange>(defaultFollowersRange);
  const { points, loadFailed } = useFollowersLine(range);
  const step = stepOf(range);
  const heading = useHeading(allTimeFollowers);
  const facts = useMetaFacts(thisWeek);
  // Step 2: the heading row, then the line with its caption and hidden table.
  return (
    <section aria-labelledby="dashboard-followers-heading" className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 id="dashboard-followers-heading" className="type-heading m-0 text-ink-heading">
            {heading}
          </h2>
          <MetaLine facts={facts} />
        </div>
        <RangeMenu range={range} onChange={setRange} />
      </div>
      {loadFailed && <Notice tone="error">{t('dashboard.followers.loadFailed')}</Notice>}
      {points !== null && (
        <figure className="m-0 flex flex-col gap-2">
          <FollowersLinePlot points={points} step={step} range={range} />
          <FollowersTable points={points} step={step} range={range} />
          <figcaption className="type-meta">{t(`dashboard.followers.note.${step}`)}</figcaption>
        </figure>
      )}
    </section>
  );
}
