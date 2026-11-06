/**
 * FollowersChart: "Followers over time" on the writer dashboard (story S1-E3-07; board
 * WriterDashboard 4.1).
 *
 * Board values: a white card, eyebrow, the 26 px heading with the follower count, "+n this
 * week" in green, eight bars 200 px high (gold, this week in plum) with the number above each and
 * the week's Monday below ("< 5" above a bar from fewer than 5), and the note "Weeks start on Monday." The chart is one image with a
 * text alternative listing every week's number (WCAG 1.1.1); the numbers on it are hidden from
 * screen readers so they aren't read twice. A week with new followers from 1 to 4 reads "fewer
 * than 5" and gets a short bar that never shows its real size (criterion 2).
 * Who uses it: WriterDashboardTop. Its numbers come from writer_dashboard() (followers_by_week).
 */
import { useTranslation } from 'react-i18next';

import { Eyebrow } from '@/components/ui/Eyebrow';
import { dateLocaleFor, ROMANIA_TIME_ZONE } from '@/lib/romania-time';

import type { FollowersWeek } from '../api/dashboard';
import { barHeightPercent, formatShownCount } from '../lib/dashboardNumbers';

/**
 * A week's Monday as "5 Oct".
 *
 * @param weekStart - YYYY-MM-DD
 * @param language - the interface language
 * @returns the short date
 */
function weekLabel(weekStart: string, language: string): string {
  return new Intl.DateTimeFormat(dateLocaleFor(language), {
    timeZone: ROMANIA_TIME_ZONE,
    day: 'numeric',
    month: 'short',
  }).format(new Date(`${weekStart}T12:00:00Z`));
}

/** One bar with its number above it. */
function WeekBar({
  value,
  height,
  isThisWeek,
}: {
  value: string;
  height: number;
  isThisWeek: boolean;
}) {
  return (
    <div className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
      <span aria-hidden="true" className="text-center text-xs font-semibold text-body">
        {value}
      </span>
      <div
        aria-hidden="true"
        className={isThisWeek ? 'w-full rounded-t-lg bg-primary' : 'w-full rounded-t-lg bg-gold'}
        style={{ height: `${height}%` }}
      />
    </div>
  );
}

/** The card's heading row: the follower count and "+n this week". */
function FollowersHeading({
  allTimeFollowers,
  thisWeek,
}: {
  allTimeFollowers: number | null;
  thisWeek: number | null;
}) {
  const { t, i18n } = useTranslation('writing');
  const fewer = t('dashboard.fewerThanFive');
  // The heading can't say an exact number below 5 either.
  const heading =
    allTimeFollowers === null
      ? t('dashboard.followers.headingFew')
      : t('dashboard.followers.heading', {
          count: allTimeFollowers,
          value: formatShownCount(allTimeFollowers, i18n.language, fewer),
        });
  return (
    <div className="flex flex-wrap items-end justify-between gap-2">
      <div className="flex flex-col gap-1.5">
        <Eyebrow>{t('dashboard.followers.eyebrow')}</Eyebrow>
        <h2
          id="dashboard-followers-heading"
          className="m-0 font-heading text-[26px] font-bold text-heading"
        >
          {heading}
        </h2>
      </div>
      {thisWeek !== null && thisWeek > 0 && (
        <span className="text-sm font-semibold text-[var(--success-text)]">
          {t('dashboard.followers.thisWeek', {
            value: formatShownCount(thisWeek, i18n.language, fewer),
          })}
        </span>
      )}
    </div>
  );
}

/** What the chart needs. */
export interface FollowersChartProps {
  weeks: FollowersWeek[];
  /** All-time followers, for the heading (the tiles may show the last 30 days). */
  allTimeFollowers: number | null;
}

/**
 * Renders the card.
 *
 * @param props.weeks - the last 8 weeks, oldest first
 * @param props.allTimeFollowers - the follower count for the heading
 * @returns the card
 */
export function FollowersChart({ weeks, allTimeFollowers }: FollowersChartProps) {
  const { t, i18n } = useTranslation('writing');
  // Step 1: each week's words, and the tallest week for the bars' scale.
  const values = weeks.map((week) =>
    formatShownCount(week.total, i18n.language, t('dashboard.fewerThanFive')),
  );
  // Above a narrow bar "fewer than 5" is shortened ("< 5"); the chart's text alternative says it in full.
  const barValues = weeks.map((week) =>
    formatShownCount(week.total, i18n.language, t('dashboard.fewerShort')),
  );
  const tallest = Math.max(5, ...weeks.map((week) => week.total ?? 0));
  // Step 2: the card: heading, bars, week labels and the note.
  return (
    <section
      aria-labelledby="dashboard-followers-heading"
      className="flex flex-col gap-[18px] rounded-3xl border border-border bg-surface px-[26px] py-6 shadow-card"
    >
      <FollowersHeading
        allTimeFollowers={allTimeFollowers}
        thisWeek={weeks.at(-1)?.total ?? null}
      />
      <div
        role="img"
        aria-label={t('dashboard.followers.chartLabel', { values: values.join(', ') })}
        className="flex h-[200px] items-end gap-2.5 border-b border-border px-0.5"
      >
        {weeks.map((week, index) => (
          <WeekBar
            key={week.weekStart}
            value={barValues[index] ?? ''}
            height={barHeightPercent(week.total, tallest)}
            isThisWeek={index === weeks.length - 1}
          />
        ))}
      </div>
      <div aria-hidden="true" className="-mt-2 flex gap-2.5 px-0.5">
        {weeks.map((week) => (
          <span key={week.weekStart} className="min-w-0 flex-1 text-center text-xs text-meta">
            {weekLabel(week.weekStart, i18n.language)}
          </span>
        ))}
      </div>
      <p className="m-0 text-sm text-meta">{t('dashboard.followers.note')}</p>
    </section>
  );
}
