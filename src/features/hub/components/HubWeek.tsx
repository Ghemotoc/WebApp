/**
 * HubWeek: "This week" in the Writers' hub's side column (bundle GAPS-12b; board WritersHub,
 * "Your week", named without the possessive: copy rule, 9 Nov 2026).
 *
 * Four rows, each a label and its number for the last 7 days: chapters posted, reads, comments
 * and new followers, with a fine line between rows (DoD: lists of labels and values). A number
 * that comes from fewer than 5 people reads "fewer than 5", as on the dashboard (S1-E3-07
 * criterion 2). A link under the rows opens the full statistics on /write.
 * Who shows it: WritersHubPage. What it calls: useHubWeek → my_week_numbers();
 * formatShownCount from the writing feature, so both screens write numbers the same way.
 */
import { Link } from 'react-router';

import { Notice } from '@/components/ui/Notice';
import { formatShownCount } from '@/features/writing/lib/dashboardNumbers';

import type { HubWeek as HubWeekNumbers } from '../api/hubWeek';
import { useHubWeek } from '../hooks/useHubWeek';
import { useHubTranslation } from '../registerHubTranslations';

/** The rows, in the board's order: the locale key and the number each one shows. */
const weekRows: {
  key: 'chapters' | 'reads' | 'comments' | 'followers';
  field: keyof HubWeekNumbers;
}[] = [
  { key: 'chapters', field: 'chaptersPosted' },
  { key: 'reads', field: 'reads' },
  { key: 'comments', field: 'comments' },
  { key: 'followers', field: 'followers' },
];

/**
 * Renders the card under its eyebrow heading.
 *
 * @returns the section; the rows wait for the numbers, and a failed read says so in plain words
 */
export function HubWeek() {
  const { t, i18n } = useHubTranslation();
  const { week, loadFailed } = useHubWeek();
  const fewerThanFive = t('hub.week.fewerThanFive');
  return (
    <section aria-labelledby="hub-week" className="flex flex-col gap-4">
      <h2 id="hub-week" className="eyebrow m-0">
        {t('hub.week.eyebrow')}
      </h2>
      {loadFailed && <Notice tone="error">{t('hub.week.loadFailed')}</Notice>}
      {week !== null && (
        <div className="flex flex-col gap-3 rounded-card border border-border bg-surface p-5 shadow-card">
          <dl className="m-0 flex flex-col">
            {weekRows.map((row) => (
              <div
                key={row.key}
                className="flex items-baseline justify-between gap-4 border-b border-border py-2.5 last:border-b-0"
              >
                <dt className="text-sm text-body">{t(`hub.week.${row.key}`)}</dt>
                <dd className="m-0 text-right font-heading text-[19px] font-bold text-heading">
                  {formatShownCount(week[row.field], i18n.language, fewerThanFive)}
                </dd>
              </div>
            ))}
          </dl>
          <Link to="/write" className="self-start text-sm font-semibold text-link underline">
            {t('hub.week.seeStatistics')}
          </Link>
        </div>
      )}
    </section>
  );
}
