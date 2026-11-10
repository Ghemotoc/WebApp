/**
 * HubMonth: "Writing month" and "Badges this month" in the Writers' hub's side column (bundle
 * GAPS-12f; board WritersHub: "42% of 15,000 · Writing month · 5-day streak · 6,240 words" and
 * the badge row).
 *
 * The writer's own words this calendar month against 15,000, as a bar with its percentage, the
 * streak of days in a row with new words, and five badges, each "Earned" or "Not yet" in words
 * as well as with a tick, so colour is never the only sign. Private: only the writer sees it,
 * and nobody is ranked.
 * Who shows it: WritersHubPage. What it calls: useHubMonth.
 */
import { CheckIcon } from '@/components/icons/CheckIcon';
import { Notice } from '@/components/ui/Notice';
import { dateLocaleFor } from '@/lib/romania-time';

import { monthBadgeKeys, monthPercent, type HubMonth as HubMonthNumbers } from '../api/hubMonth';
import { useHubMonth } from '../hooks/useHubMonth';
import { useHubTranslation } from '../registerHubTranslations';

/**
 * The bar, the percentage of the goal, and the streak with the month's words.
 *
 * @param props.month - the writer's month
 * @returns the top part of the card
 */
function MonthProgress({ month }: { month: HubMonthNumbers }) {
  const { t, i18n } = useHubTranslation();
  const numbers = new Intl.NumberFormat(dateLocaleFor(i18n.language));
  const percent = monthPercent(month.words, month.goal);
  const goal = numbers.format(month.goal);
  // The streak, or that there is none yet; then the words, joined as on the board.
  const streak =
    month.streakDays > 0
      ? t('hub.month.streak', { count: month.streakDays })
      : t('hub.month.noStreak');
  const words = t('hub.month.words', {
    count: month.words,
    formatted: numbers.format(month.words),
  });
  return (
    <div className="flex flex-col gap-2">
      <p className="m-0 flex flex-wrap items-baseline gap-x-2">
        <span className="font-heading text-[34px] leading-none font-bold text-heading">
          {percent}%
        </span>
        <span className="text-sm text-body">{t('hub.month.ofGoal', { goal })}</span>
      </p>
      <div
        role="progressbar"
        aria-label={t('hub.month.progressLabel', { percent, goal })}
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-2 overflow-hidden rounded-full bg-tint"
      >
        <div className="h-full rounded-full bg-heading" style={{ width: `${percent}%` }} />
      </div>
      <p className="m-0 text-sm text-meta">
        {streak} · {words}
      </p>
    </div>
  );
}

/**
 * The five badges, one row each with a fine line between (DoD: lists of labels and values).
 *
 * @param props.badges - which are earned
 * @returns the list under its small heading
 */
function MonthBadges({ badges }: { badges: HubMonthNumbers['badges'] }) {
  const { t } = useHubTranslation();
  return (
    <div className="flex flex-col gap-1">
      <h3 id="hub-month-badges" className="m-0 text-sm font-semibold text-heading">
        {t('hub.month.badgesHeading')}
      </h3>
      <ul aria-labelledby="hub-month-badges" className="m-0 flex list-none flex-col p-0">
        {monthBadgeKeys.map((key) => (
          <li
            key={key}
            className="flex items-center justify-between gap-4 border-b border-border py-2.5 last:border-b-0"
          >
            <span className="text-sm text-body">{t(`hub.month.badges.${key}`)}</span>
            {badges[key] ? (
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-heading">
                <CheckIcon aria-hidden="true" />
                {t('hub.month.earned')}
              </span>
            ) : (
              <span className="text-sm text-meta">{t('hub.month.notYet')}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Renders the card under its eyebrow heading.
 *
 * @returns the section; the card waits for the numbers, and a failed read says so in plain words
 */
export function HubMonth() {
  const { t } = useHubTranslation();
  const { month, loadFailed } = useHubMonth();
  return (
    <section aria-labelledby="hub-month" className="flex flex-col gap-4">
      <h2 id="hub-month" className="eyebrow m-0">
        {t('hub.month.eyebrow')}
      </h2>
      {loadFailed && <Notice tone="error">{t('hub.month.loadFailed')}</Notice>}
      {month !== null && (
        <div className="flex flex-col gap-5 rounded-card border border-border bg-surface p-5 shadow-card">
          <MonthProgress month={month} />
          <MonthBadges badges={month.badges} />
          <p className="m-0 text-[13px] text-meta">{t('hub.month.note')}</p>
        </div>
      )}
    </section>
  );
}
