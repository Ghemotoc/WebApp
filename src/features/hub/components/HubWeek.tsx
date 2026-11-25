/**
 * HubWeek: "This week" in the Writers' hub's side column (bundle GAPS-12b; board WritersHub,
 * "Your week", named without the possessive: copy rule, 9 Nov 2026).
 *
 * Four numbers for the last 7 days, side by side: chapters posted, reads, comments and new
 * followers (user story 1.3, board A03-WritersHub). A number
 * that comes from fewer than 5 people reads "fewer than 5", as on the dashboard (S1-E3-07
 * criterion 2). "Every number" opens the full statistics on /write.
 * Who shows it: WritersHubPage. What it calls: useHubWeek → my_week_numbers();
 * formatShownCount from the writing feature, so both screens write numbers the same way.
 */
import { Link } from 'react-router';

import { buttonClassName } from '@/components/ui/buttonStyles';
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
 * Renders the four numbers side by side, each with its label above (board A03-WritersHub: a
 * hairline on top, the label in meta, the number in the display font at 32/40). "Every number"
 * at the heading's right opens the full statistics on /write.
 *
 * @returns the section
 */
export function HubWeek() {
  const { t, i18n } = useHubTranslation();
  const { week, loadFailed } = useHubWeek();
  const fewerThanFive = t('hub.week.fewerThanFive');
  return (
    <section aria-labelledby="hub-week" className="flex flex-col">
      <div className="mb-3 flex items-start justify-between gap-4">
        <h2 id="hub-week" className="m-0 type-heading">
          {t('hub.week.eyebrow')}
        </h2>
        <Link to="/write" className={buttonClassName({ variant: 'text' })}>
          {t('hub.week.seeStatistics')}
        </Link>
      </div>
      {loadFailed && <Notice tone="error">{t('hub.week.loadFailed')}</Notice>}
      {week !== null && (
        <dl className="m-0 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {weekRows.map((row) => (
            <div key={row.key} className="flex flex-col gap-1 border-t border-hairline py-4">
              {/* Labels keep two lines' room, so the numbers line up when one label wraps. */}
              <dt className="min-h-9 type-meta text-ink-muted">{t(`hub.week.${row.key}`)}</dt>
              {/* A number in the display font; "fewer than 5" (a total from fewer than five
                  people, kept hidden) reads as words, so it takes the label size instead. */}
              <dd
                className={
                  week[row.field] === null
                    ? 'm-0 type-label text-ink-heading'
                    : 'm-0 font-heading type-title text-ink-heading'
                }
              >
                {formatShownCount(week[row.field], i18n.language, fewerThanFive)}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
