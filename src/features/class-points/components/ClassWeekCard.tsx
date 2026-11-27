/**
 * ClassWeekCard: "This week" on the teacher's class page (bundle BOOKS-8, part 8b; board
 * G08-ClassTeacher, user story 8.8: "This week: totals for the whole class only, never one
 * pupil's; the class points table is one tap away").
 *
 * What it shows: the heading, "Totals for the class, never for one pupil here.", four label and
 * value rows (class points given of what the class could give, notes from classmates, chapters
 * shared since Monday, points reported and still being checked) and "Open class points". With
 * class points off it says so instead of the rows. No box, as on the board.
 * Who shows it: ClassSpaceContent, for the teacher only (the database sends the totals to nobody
 * else). What it calls: useClassPointsSummary → class_points_summary()'s 'week'.
 */
import { Link } from 'react-router';

import { buttonClassName } from '@/components/ui/buttonStyles';
import { LabelRows } from '@/components/ui/LabelRows';

import type { ClassWeekTotals } from '../api/classPointsSummary';
import { useClassPointsSummary } from '../hooks/useClassPoints';
import { useClassPointsTranslation } from '../registerClassPointsTranslations';

/**
 * The four rows.
 *
 * @param props.week - this week's totals
 * @returns the label and value list
 */
function WeekRows({ week }: { week: ClassWeekTotals }) {
  const { t } = useClassPointsTranslation();
  const reported =
    week.reported === 0
      ? t('week.reportedNone')
      : t('week.reportedValue', { count: week.reported });
  return (
    <LabelRows
      look="spread"
      rows={[
        {
          label: t('week.given'),
          value: t('week.givenValue', { given: week.given, possible: week.possible }),
        },
        { label: t('week.notes'), value: week.notes },
        {
          label: t('week.chapters'),
          value: t('week.chaptersValue', { count: week.chaptersShared }),
        },
        { label: t('week.reported'), value: reported },
      ]}
    />
  );
}

/**
 * Renders the section.
 *
 * @param props.slug - the class's address
 * @returns the section, or nothing for anyone but the teacher
 */
export function ClassWeekCard({ slug }: { slug: string }) {
  const { t } = useClassPointsTranslation();
  const summary = useClassPointsSummary(slug).data;
  if (summary === undefined || summary === null || summary.role !== 'teacher') return null;
  const week = summary.classWeek;
  return (
    <section aria-labelledby="class-week-heading" className="flex flex-col gap-2">
      <h2 id="class-week-heading" className="m-0 type-subheading">
        {t('week.title')}
      </h2>
      <p className="m-0 type-body text-ink-muted">{t('week.intro')}</p>
      {summary.isEnabled && week !== null ? (
        <WeekRows week={week} />
      ) : (
        <p className="m-0 type-body text-ink-muted">{t('week.off')}</p>
      )}
      <Link to={`/spaces/${slug}/points`} className={buttonClassName({ variant: 'text' }, 'w-fit')}>
        {t('card.openTable')}
      </Link>
    </section>
  );
}
