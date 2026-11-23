/**
 * HubMonthSummary: "Writing month" on the right of the Home page's hero (bundle GAPS-12f; since
 * CALM-7c the simplified board New-Home: "6,240 of 20,000 words", the thread bar, "5 days in a
 * row · 1,980 words a day keeps you on track" and a link to the badges).
 *
 * The writer's own words this calendar month against the goal, the streak and the words a day
 * that would still reach the goal. Private: only the writer sees it, and nobody is ranked. The
 * badges sit lower on the page (HubMonth), so the link jumps there.
 * Who shows it: HubHero. What it calls: useHubMonth and lib/monthPace.ts.
 */
import { MetaLine, type MetaFact } from '@/components/ui/MetaLine';
import { Notice } from '@/components/ui/Notice';
import { dateLocaleFor } from '@/lib/romania-time';

import { monthPercent, type HubMonth } from '../api/hubMonth';
import { useHubMonth } from '../hooks/useHubMonth';
import { wordsPerDayToGoal } from '../lib/monthPace';
import { useHubTranslation } from '../registerHubTranslations';

/** The id of the badges section lower on the page, which the link jumps to. */
export const monthBadgesAnchor = 'hub-badges';

/**
 * The meta line's facts: the streak, then the pace or the goal reached.
 *
 * @param month - the writer's month
 * @param now - today, for the days left
 * @param t - the hub namespace's translate function
 * @param numbers - the number formatter for the interface language
 * @returns the facts
 */
function monthFacts(
  month: HubMonth,
  now: Date,
  t: ReturnType<typeof useHubTranslation>['t'],
  numbers: Intl.NumberFormat,
): MetaFact[] {
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
  return [{ text: streak }, { text: paceText }];
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
    <section aria-labelledby="hub-month" className="flex flex-col gap-3">
      <h2 id="hub-month" className="m-0 type-subheading">
        {t('hub.month.eyebrow')}
      </h2>
      <p className="m-0 flex flex-wrap items-baseline gap-x-2">
        <span className="type-heading">{numbers.format(month.words)}</span>
        <span className="text-ink-muted">{t('hub.month.ofGoal', { goal })}</span>
      </p>
      {/* The thread on its track (board New-Home), with its value for screen readers. */}
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
      <MetaLine facts={monthFacts(month, now, t, numbers)} />
      <a
        href={`#${monthBadgesAnchor}`}
        className="inline-flex min-h-11 items-center self-start font-semibold text-link underline"
      >
        {t('hub.month.seeBadges')}
      </a>
    </section>
  );
}
