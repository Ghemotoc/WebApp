/**
 * HubMonth: "Badges this month" in the Writers' hub's side column (bundle GAPS-12f; user story
 * 1.3, board A03-WritersHub). The Home page's writing month card links here ("See the badges").
 *
 * Five badges as pills, the earned ones filled with a tick and "earned" or "not yet" read out,
 * so colour is never the only sign. Private: only the writer sees it, and nobody is ranked.
 * Who shows it: WritersHubPage. What it calls: useHubMonth.
 */
import { CheckIcon } from '@/components/icons/CheckIcon';
import { cn } from '@/lib/utils';

import { monthBadgeKeys, type HubMonth as HubMonthNumbers } from '../api/hubMonth';
import { useHubMonth } from '../hooks/useHubMonth';
import { useHubTranslation } from '../registerHubTranslations';

import { monthBadgesAnchor } from './HubMonthSummary';

/**
 * Renders "Badges this month": one quiet pill per badge, the earned ones filled with a tick
 * (board A03-WritersHub draws them as chips; they are facts, not buttons, so they are a list).
 *
 * @returns the section, or nothing while the month loads
 */
export function HubMonth() {
  const { t } = useHubTranslation();
  const { month } = useHubMonth();
  if (month === null) return null;
  return (
    <section
      id={monthBadgesAnchor}
      aria-labelledby="hub-month-badges"
      className="flex scroll-mt-24 flex-col gap-3"
    >
      <h2 id="hub-month-badges" className="m-0 type-heading">
        {t('hub.month.badgesHeading')}
      </h2>
      <MonthBadges badges={month.badges} />
      <p className="m-0 type-meta text-ink-muted">{t('hub.month.note')}</p>
    </section>
  );
}

/**
 * The badges, earned or not yet.
 *
 * @param props.badges - which badges the writer earned this month
 * @returns the list
 */
function MonthBadges({ badges }: { badges: HubMonthNumbers['badges'] }) {
  const { t } = useHubTranslation();
  return (
    <ul aria-labelledby="hub-month-badges" className="m-0 flex list-none flex-wrap gap-2 p-0">
      {monthBadgeKeys.map((key) => (
        <li
          key={key}
          className={cn(
            'inline-flex h-9 items-center gap-2 rounded-full border-[0.5px] px-4 type-body leading-none font-semibold',
            badges[key]
              ? 'border-chip-on bg-chip-on text-chip-on-text'
              : 'border-control-border bg-surface text-ink-heading',
          )}
        >
          {badges[key] && <CheckIcon aria-hidden="true" />}
          {t(`hub.month.badges.${key}`)}
          <span className="sr-only">
            {' '}
            ({badges[key] ? t('hub.month.earned') : t('hub.month.notYet')})
          </span>
        </li>
      ))}
    </ul>
  );
}
