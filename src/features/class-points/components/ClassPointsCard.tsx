/**
 * ClassPointsCard: class points on a class space's page (bundle CLASS-POINTS, part 1; stories
 * S1-E8-13 and S1-E8-14).
 *
 * What it shows, only while the teacher has class points on:
 * - to a pupil (board G03, BOOKS-8): "10 points to give this week", how to give them, a meter and
 *   "7 of 10 left · new points on Monday", the chapters they gave points to this week with Move,
 *   and that points can be moved until Sunday at 23:59. The points their own chapters received
 *   show on those chapters (board G06). Never a total of anyone else's, and no list of pupils in
 *   any order (Robert, 13 Nov 2026, decisions 2 and 5).
 * - to the teacher: that points are on, and the link to the table at /spaces/<slug>/points.
 * Anyone else sees nothing. No ad or banner sits beside it (class spaces never have ads).
 * Who shows it: ClassSpaceContent, for a class space the viewer may read.
 * What it calls: useClassPointsSummary → class_points_summary().
 */
import { Link } from 'react-router';

import { MetaLine } from '@/components/ui/MetaLine';
import { Meter } from '@/components/ui/Meter';
import { Notice } from '@/components/ui/Notice';

import type { ClassPointsSummary, GivenPoints } from '../api/classPoints';
import { useClassPointsSummary } from '../hooks/useClassPoints';
import { weekdayText } from '../lib/classPointsDates';
import { useClassPointsTranslation } from '../registerClassPointsTranslations';

/** Board G03's box: the solid tint with no edge or shadow, 24 px inside, so the competition stays
 * the page's one raised panel. */
const cardClasses = 'flex flex-col gap-2 rounded-card bg-surface-solid p-6';

/**
 * One chapter the pupil gave points to this week, with Move (board G03).
 *
 * @param props.gift - the chapter and the points
 * @returns the list item
 */
function GivenRow({ gift }: { gift: GivenPoints }) {
  const { t } = useClassPointsTranslation();
  const address = `/s/${gift.storySlug}/${gift.chapterCode}`;
  return (
    <li className="flex items-center gap-3 border-t border-hairline py-3">
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <Link
          to={address}
          className="type-body font-semibold break-words text-ink-heading no-underline hover:underline"
        >
          {gift.storyTitle}
        </Link>
        <MetaLine
          facts={[
            { text: gift.writerName },
            { text: t('card.chapter', { number: gift.chapterPosition }) },
          ]}
        />
      </span>
      <span className="flex-none type-body font-semibold text-ink-heading">
        {t('card.points', { count: gift.points })}
      </span>
      {/* Moving points happens at the end of the chapter, where they were given. */}
      <Link
        to={`${address}#chapter-class-points-heading`}
        aria-label={t('card.moveLabel', { title: gift.storyTitle })}
        className="flex min-h-11 flex-none items-center type-body font-semibold text-ink-heading underline"
      >
        {t('card.move')}
      </Link>
    </li>
  );
}

/**
 * A pupil's week (board G03): the budget, how to give, a meter of what is left, the day new points
 * come and what was given this week. Never a total of anyone else's, and no list of pupils in any
 * order (Robert, 13 Nov 2026, decisions 2 and 5).
 *
 * @returns the card's lines
 */
function PupilLines({ summary }: { summary: ClassPointsSummary }) {
  const { t, i18n } = useClassPointsTranslation();
  if (summary.week === null) return null;
  const { budget } = summary;
  const { left, resetsOn } = summary.week;
  const given = budget - left;
  return (
    <>
      <h2 id="class-points-heading" className="m-0 type-subheading text-ink-heading">
        {t('card.pupilTitle', { count: budget })}
      </h2>
      <p className="m-0 type-body text-ink-muted">{t('card.intro', { cap: summary.cap })}</p>
      <Meter
        label={t('card.meterLabel')}
        value={given}
        max={budget}
        valueText={t('card.meterText', { count: budget, given })}
        className="mt-3 h-2 overflow-hidden rounded-full bg-tint"
      />
      <MetaLine
        facts={[
          { text: t('card.left', { count: budget, left }), kind: 'state' },
          { text: t('card.resetsShort', { day: weekdayText(resetsOn, i18n.language) }) },
        ]}
      />
      {summary.given.length > 0 && (
        <div className="flex flex-col pt-3">
          <h3 className="m-0 type-label font-semibold text-ink-heading">{t('card.givenTitle')}</h3>
          <ul className="m-0 flex list-none flex-col p-0">
            {summary.given.map((gift) => (
              <GivenRow key={`${gift.storySlug}/${gift.chapterCode}`} gift={gift} />
            ))}
          </ul>
        </div>
      )}
      <p className="m-0 type-meta text-ink-muted">{t('card.moveNote')}</p>
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
      <h2
        id="class-points-heading"
        className="m-0 font-heading type-heading font-bold text-ink-heading"
      >
        {t('card.teacherTitle')}
      </h2>
      <p className="m-0 type-body text-ink-muted">{t('card.teacherBody')}</p>
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
      {summary.role === 'teacher' ? <TeacherLines slug={slug} /> : <PupilLines summary={summary} />}
    </section>
  );
}
