/**
 * ClassCompetitionCard: class competitions on a class space's page (bundle CLASS-POINTS, part 2;
 * story S1-E8-15).
 *
 * What it shows:
 * - the running competition: its name, dates, where it stands and every criterion in full, with
 *   "Join the competition" for a pupil and the teacher's controls for the teacher;
 * - a Winner card for each competition whose results are published (WinnerCard);
 * - to the teacher of a class with no running competition: the way to start one (after the
 *   school year is set).
 * A plain class with no competition shows pupils nothing: nobody wins (decision 11). There is no
 * list of pupils, no score and no number of points anywhere here, and no ad or banner.
 * Who shows it: SpacePage, for a class space the viewer may read.
 * What it calls: useClassCompetitions → class_competitions().
 */
import { Link } from 'react-router';

import { Eyebrow } from '@/components/ui/Eyebrow';
import { Notice } from '@/components/ui/Notice';
import { dayText } from '@/features/class-points/lib/classPointsDates';
import { ReportButton } from '@/features/reporting/components/ReportButton';

import type { ClassCompetitions, RunningCompetition } from '../api/classCompetitions';
import { useClassCompetitions } from '../hooks/useClassCompetitions';
import { useClassCompetitionsTranslation } from '../registerClassCompetitionsTranslations';

import { PupilControls, TeacherControls } from './CompetitionControls';
import { CriteriaList } from './CriteriaList';
import { WinnerCard } from './WinnerCard';

/** The card's own classes, as the other cards on a class page. */
const cardClasses =
  'flex flex-col gap-3 rounded-card border border-border bg-surface px-6 py-5 shadow-card';

/**
 * Where the competition stands, in a sentence.
 *
 * @returns "Starts …", "Open until …" or that the teacher is assessing
 */
function PhaseLine({ competition }: { competition: RunningCompetition }) {
  const { t, i18n } = useClassCompetitionsTranslation();
  const day = (date: string) => dayText(date, i18n.language);
  if (competition.phase === 'upcoming') {
    return <>{t('card.phase.upcoming', { date: day(competition.startsOn) })}</>;
  }
  if (competition.phase === 'open') {
    return <>{t('card.phase.open', { date: day(competition.endsOn) })}</>;
  }
  return <>{t('card.phase.judging')}</>;
}

/**
 * The running competition: name, dates, criteria and the viewer's controls.
 *
 * @returns the card
 */
function RunningCard({ competitions, slug }: { competitions: ClassCompetitions; slug: string }) {
  const { t, i18n } = useClassCompetitionsTranslation();
  const competition = competitions.running;
  if (competition === null) return null;
  const isTeacher = competitions.role === 'teacher';
  const day = (date: string) => dayText(date, i18n.language);
  return (
    <section aria-labelledby="class-competition-heading" className={cardClasses}>
      <Eyebrow>{t('card.eyebrow')}</Eyebrow>
      <h2
        id="class-competition-heading"
        className="m-0 font-heading text-2xl font-bold text-heading"
      >
        {competition.name}
      </h2>
      <p className="m-0 text-sm text-body">
        {t('card.dates', { start: day(competition.startsOn), end: day(competition.endsOn) })}
      </p>
      <p className="m-0 font-semibold text-ink">
        <PhaseLine competition={competition} />
      </p>
      {!competitions.areWinnersAllowed && (
        <p className="m-0 text-sm text-body">{t('card.noWinners')}</p>
      )}
      <CriteriaList criteria={competition.criteria} />
      {isTeacher ? (
        <TeacherControls competition={competition} slug={slug} />
      ) : (
        <>
          <PupilControls competition={competition} slug={slug} />
          <span className="self-end">
            <ReportButton
              itemType="class_competition"
              itemReference={competition.id}
              itemLabel={t('card.report', { name: competition.name })}
            />
          </span>
        </>
      )}
    </section>
  );
}

/**
 * For the teacher of a class with no running competition: the way to start one.
 *
 * @returns the card; nothing in an archived class
 */
function StartCard({ competitions, slug }: { competitions: ClassCompetitions; slug: string }) {
  const { t } = useClassCompetitionsTranslation();
  if (competitions.isArchived) return null;
  const hasGrade = competitions.grade !== null;
  return (
    <section aria-labelledby="class-competition-heading" className={cardClasses}>
      <Eyebrow>{t('card.eyebrow')}</Eyebrow>
      <h2
        id="class-competition-heading"
        className="m-0 font-heading text-2xl font-bold text-heading"
      >
        {t('card.startTitle')}
      </h2>
      <p className="m-0 text-sm text-body">{t('card.startBody')}</p>
      {!hasGrade && <p className="m-0 text-sm text-body">{t('card.needsGrade')}</p>}
      <Link
        to={hasGrade ? `/spaces/${slug}/competition` : `/spaces/${slug}/settings`}
        className="w-fit font-semibold text-link underline"
      >
        {hasGrade ? t('card.start') : t('card.openSettings')}
      </Link>
    </section>
  );
}

/**
 * Renders the running competition (or the teacher's way to start one) and the Winner cards.
 *
 * @param props.slug - the class's address
 * @returns the cards, or nothing for someone outside the class or a class with no competition
 */
export function ClassCompetitionCard({ slug }: { slug: string }) {
  const { t } = useClassCompetitionsTranslation();
  const read = useClassCompetitions(slug);
  if (read.isError) return <Notice tone="error">{t('card.loadFailed')}</Notice>;
  const competitions = read.data;
  if (competitions === undefined || competitions === null) return null;
  const isTeacher = competitions.role === 'teacher';
  return (
    <>
      {competitions.running !== null && <RunningCard competitions={competitions} slug={slug} />}
      {competitions.running === null && isTeacher && (
        <StartCard competitions={competitions} slug={slug} />
      )}
      {competitions.published.map((card) => (
        <WinnerCard key={card.id} card={card} slug={slug} isTeacher={isTeacher} />
      ))}
    </>
  );
}
