/**
 * HubMonth: "Badges this month" lower on the Home page (bundle GAPS-12f; since CALM-7c the words,
 * the bar and the streak sit in the hero, HubMonthSummary, and this card keeps the badges, which
 * the summary's "See the badges" link jumps to).
 *
 * Five badges, each "Earned" or "Not yet" in words as well as with a tick, so colour is never the
 * only sign. Private: only the writer sees it, and nobody is ranked.
 * Who shows it: WritersHubPage. What it calls: useHubMonth.
 */
import { CheckIcon } from '@/components/icons/CheckIcon';

import { monthBadgeKeys, type HubMonth as HubMonthNumbers } from '../api/hubMonth';
import { useHubMonth } from '../hooks/useHubMonth';
import { useHubTranslation } from '../registerHubTranslations';

import { monthBadgesAnchor } from './HubMonthSummary';

/**
 * Renders the badges card. The month's read failing is said once, in the hero's summary.
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
      className="flex scroll-mt-24 flex-col gap-2 rounded-card border border-border bg-surface p-4 shadow-card"
    >
      <h2 id="hub-month-badges" className="m-0 type-subheading">
        {t('hub.month.badgesHeading')}
      </h2>
      <MonthBadges badges={month.badges} />
      <p className="m-0 type-meta text-ink-muted">{t('hub.month.note')}</p>
    </section>
  );
}

/**
 * The five badges, one row each with a fine line between (DoD: lists of labels and values).
 *
 * @param props.badges - which are earned
 * @returns the list
 */
function MonthBadges({ badges }: { badges: HubMonthNumbers['badges'] }) {
  const { t } = useHubTranslation();
  return (
    <ul aria-labelledby="hub-month-badges" className="m-0 flex list-none flex-col p-0">
      {monthBadgeKeys.map((key) => (
        <li
          key={key}
          className="flex items-center justify-between gap-4 border-b border-border py-3 last:border-b-0"
        >
          <span className="type-body text-ink-muted">{t(`hub.month.badges.${key}`)}</span>
          {badges[key] ? (
            <span className="inline-flex items-center gap-2 type-body font-semibold text-ink-heading">
              <CheckIcon aria-hidden="true" />
              {t('hub.month.earned')}
            </span>
          ) : (
            <span className="type-body text-ink-muted">{t('hub.month.notYet')}</span>
          )}
        </li>
      ))}
    </ul>
  );
}
