/**
 * ClassPointsCard: class points on a class space's page (bundle CLASS-POINTS, part 1; stories
 * S1-E8-13 and S1-E8-14).
 *
 * What it shows, only while the teacher has class points on:
 * - to a pupil: "10 points to give this week", how many are left, the day a new budget starts,
 *   how to give them and the points their own chapters received. Never a total of anyone else's,
 *   and no list of pupils in any order (Robert, 13 Nov 2026, decisions 2 and 5).
 * - to the teacher: that points are on, and the link to the table at /spaces/<slug>/points.
 * Anyone else sees nothing. No ad or banner sits beside it (class spaces never have ads).
 * Who shows it: SpacePage, for a class space the viewer may read.
 * What it calls: useClassPointsSummary → class_points_summary().
 */
import { Link } from 'react-router';

import { Eyebrow } from '@/components/ui/Eyebrow';
import { Notice } from '@/components/ui/Notice';

import type { ClassPointsSummary } from '../api/classPoints';
import { useClassPointsSummary } from '../hooks/useClassPoints';
import { dayText } from '../lib/classPointsDates';
import { useClassPointsTranslation } from '../registerClassPointsTranslations';

/** The card's own classes, as the other cards on a class page. */
const cardClasses =
  'flex flex-col gap-2 rounded-card border border-border bg-surface px-6 py-5 shadow-card';

/**
 * A pupil's week: the budget, what is left, when it resets and what they received.
 *
 * @returns the card's lines
 */
function PupilLines({ summary }: { summary: ClassPointsSummary }) {
  const { t, i18n } = useClassPointsTranslation();
  if (summary.week === null) return null;
  const { budget } = summary;
  const { left, resetsOn } = summary.week;
  return (
    <>
      <h2 id="class-points-heading" className="m-0 font-heading text-2xl font-bold text-heading">
        {t('card.pupilTitle', { count: budget })}
      </h2>
      <p className="m-0 font-semibold text-ink">{t('card.left', { count: budget, left })}</p>
      <p className="m-0 text-sm text-body">
        {t('card.resets', { date: dayText(resetsOn, i18n.language) })}{' '}
        {t('card.howTo', { cap: summary.cap })}
      </p>
      <p className="m-0 text-sm text-body">
        {t('card.received', { count: summary.receivedTotal ?? 0 })}
      </p>
    </>
  );
}

/**
 * The teacher's lines: points are on, and the way to the table.
 *
 * @returns the card's lines
 */
function TeacherLines({ slug }: { slug: string }) {
  const { t } = useClassPointsTranslation();
  return (
    <>
      <h2 id="class-points-heading" className="m-0 font-heading text-2xl font-bold text-heading">
        {t('card.teacherTitle')}
      </h2>
      <p className="m-0 text-sm text-body">{t('card.teacherBody')}</p>
      <Link to={`/spaces/${slug}/points`} className="w-fit font-semibold text-link underline">
        {t('card.openTable')}
      </Link>
    </>
  );
}

/**
 * Renders the card, or nothing while points are off or for someone outside the class.
 *
 * @param props.slug - the class's address
 * @returns the card
 */
export function ClassPointsCard({ slug }: { slug: string }) {
  const { t } = useClassPointsTranslation();
  const read = useClassPointsSummary(slug);
  if (read.isError) return <Notice tone="error">{t('card.loadFailed')}</Notice>;
  const summary = read.data;
  if (summary === undefined || summary === null || !summary.isEnabled) return null;
  return (
    <section aria-labelledby="class-points-heading" className={cardClasses}>
      <Eyebrow>{t('card.eyebrow')}</Eyebrow>
      {summary.role === 'teacher' ? <TeacherLines slug={slug} /> : <PupilLines summary={summary} />}
    </section>
  );
}
