/**
 * HubMonthSummary: "Writing month" on the right of the Home page's hero (bundle GAPS-12f; board
 * A01 since Robert's review of 25 Nov 2026: "Writing month · day 20", "6,240 of 20,000 words",
 * the thread bar, "5 days in a row · 1,980 words a day keep you on track" and "See the writing
 * month board").
 *
 * The writer's own words this calendar month against the goal, the streak and the words a day
 * that would still reach the goal. Private: only the writer sees it, and nobody is ranked. The
 * badges are on the Writers' hub (HubMonth, board A03), so the link opens /hub at them.
 * Who shows it: HubHero. What it calls: useHubMonth and lib/monthPace.ts.
 */
import { Link } from 'react-router';

import { Notice } from '@/components/ui/Notice';
import { dateLocaleFor } from '@/lib/romania-time';

import { monthPercent, type HubMonth } from '../api/hubMonth';
import { useHubMonth } from '../hooks/useHubMonth';
import { wordsPerDayToGoal, writingMonthDay } from '../lib/monthPace';
import { useHubTranslation } from '../registerHubTranslations';

/** The id of the badges section lower on the page, which the link jumps to. */
export const monthBadgesAnchor = 'hub-badges';

/**
 * The small line under the bar: the streak, then the pace or the goal reached, joined by a
 * middot (one sentence, so it wraps as text on a narrow card instead of breaking at the dot).
 *
 * @param month - the writer's month
 * @param now - today, for the days left
 * @param t - the hub namespace's translate function
 * @param numbers - the number formatter for the interface language
 * @returns the line
 */
function monthFacts(
  month: HubMonth,
  now: Date,
  t: ReturnType<typeof useHubTranslation>['t'],
  numbers: Intl.NumberFormat,
): string {
  // Step 1: the days in a row, or that there is no streak yet.
  const streak =
    month.streakDays > 0
      ? t('hub.month.daysInRow', { count: month.streakDays })
      : t('hub.month.noStreak');
  // Step 2: the words a day still needed, or that the goal is reached.
  const pace = wordsPerDayToGoal(month.words, month.goal, now);
  const paceText =
    pace === 0
      ? t('hub.month.goalReached')
      : t('hub.month.pace', { count: pace, formatted: numbers.format(pace) });
  return `${streak} · ${paceText}`;
}

/**
 * Renders the summary.
 *
 * @param props.now - today, passed in so the page shares one date
 * @returns the section, a plain message when the month can't be read, or nothing while it loads
 */
export function HubMonthSummary({ now }: { now: Date }) {
  const { t, i18n } = useHubTranslation();
  const { month, loadFailed } = useHubMonth();
  if (loadFailed) return <Notice tone="error">{t('hub.month.loadFailed')}</Notice>;
  if (month === null) return null;
  const numbers = new Intl.NumberFormat(dateLocaleFor(i18n.language));
  const percent = monthPercent(month.words, month.goal);
  const goal = numbers.format(month.goal);
  return (
    <section aria-labelledby="hub-month" className="flex h-full flex-col gap-3">
      <h2 id="hub-month" className="m-0 type-label">
        {t('hub.month.heading', { day: writingMonthDay(now) })}
      </h2>
      <p className="m-0 font-semibold text-ink-heading">
        {t('hub.month.wordsOfGoal', { words: numbers.format(month.words), goal })}
      </p>
      {/* The thread on its track (board A01), with its value for screen readers. */}
      <div
        role="progressbar"
        aria-label={t('hub.month.progressLabel', { percent, goal })}
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-2 overflow-hidden rounded-full bg-tint"
      >
        <div className="h-full rounded-full bg-thread" style={{ width: `${percent}%` }} />
      </div>
      <p className="m-0 type-meta text-ink-muted">{monthFacts(month, now, t, numbers)}</p>
      {/* The badges and the month live on the Writers' hub (board A03), so the link opens it. */}
      <Link
        to={`/hub#${monthBadgesAnchor}`}
        className="mt-auto inline-flex min-h-11 items-center self-start font-semibold text-ink-heading underline"
      >
        {t('hub.month.seeBoard')}
      </Link>
    </section>
  );
}
