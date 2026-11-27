/**
 * ClassCompetitionCard: class competitions on a class space's page (bundle CLASS-POINTS, part 2;
 * story S1-E8-15).
 *
 * What it shows:
 * - the running competition as board G03 draws it (BOOKS-8, user story 8.3): "Open · Closes …",
 *   its name, its dates and who picks, the criteria with "What each criterion needs", then
 *   "Join the competition" for a pupil and the teacher's controls for the teacher;
 * - to the teacher of a class with no running competition: the way to start one (after the
 *   school year is set).
 * A plain class with no competition shows pupils nothing: nobody wins (decision 11). There is no
 * list of pupils, no score and no number of points anywhere here, and no ad or banner.
 * The Winner card sits further down the page, under the threads (ClassLatestWinner).
 * Who shows it: ClassSpaceContent, for a class space the viewer may read.
 * What it calls: useClassCompetitions → class_competitions().
 */
import { useState } from 'react';
import { Link } from 'react-router';

import { Button } from '@/components/ui/Button';
import { MetaLine, type MetaFact } from '@/components/ui/MetaLine';
import { Notice } from '@/components/ui/Notice';
import { ReportButton } from '@/features/reporting/components/ReportButton';
import { formatLocalDayAndTime } from '@/lib/local-time';

import type { ClassCompetitions, RunningCompetition } from '../api/classCompetitions';
import { useClassCompetitions } from '../hooks/useClassCompetitions';
import { useClassCompetitionsTranslation } from '../registerClassCompetitionsTranslations';

import { PupilControls, TeacherControls } from './CompetitionControls';
import { CriteriaList } from './CriteriaList';

/** The other cards on a class page (the teacher's start card). */
const cardClasses =
  'flex flex-col gap-3 rounded-card border border-border bg-surface px-6 py-4 shadow-card';

/** Board G03: the competition is the page's one raised panel, 32 px inside (24 on a phone). */
const panelClasses =
  'flex flex-col gap-2 rounded-card border border-border bg-surface p-6 shadow-card md:p-8';

/**
 * The meta line above the name: where the competition stands, in bold, and its next moment.
 *
 * @returns "Open · Closes Friday 4 December, 17:45" and the like
 */
function PhaseLine({ competition }: { competition: RunningCompetition }) {
  const { t, i18n } = useClassCompetitionsTranslation();
  const moment = (instant: string) => formatLocalDayAndTime(new Date(instant), i18n.language);
  const facts: MetaFact[] = [{ text: t(`card.state.${competition.phase}`), kind: 'state' }];
  if (competition.phase === 'upcoming') {
    facts.push({ text: t('card.phase.upcoming', { date: moment(competition.startsAt) }) });
  } else if (competition.phase === 'open') {
    facts.push({ text: t('card.phase.open', { date: moment(competition.endsAt) }) });
  } else {
    facts.push({ text: t('card.phase.judging') });
  }
  return <MetaLine facts={facts} />;
}

/**
 * "What each criterion needs": opens and closes the learning outcomes (board G03).
 *
 * @returns the text button
 */
function OutcomesToggle({ isOpen, onToggle }: { isOpen: boolean; onToggle: () => void }) {
  const { t } = useClassCompetitionsTranslation();
  return (
    <Button
      type="button"
      variant="text"
      aria-expanded={isOpen}
      aria-controls="class-competition-criteria"
      onClick={onToggle}
    >
      {t('card.outcomesToggle')}
    </Button>
  );
}

/** What the running panel needs. */
interface RunningCardProps {
  competitions: ClassCompetitions;
  slug: string;
  /** The teacher's name, for "Ms Ionescu picks one winner". */
  teacherName: string;
  /** How many pupils the class has, for the teacher's "9 of 28 pupils entered so far". */
  pupilCount: number;
}

/**
 * The running competition (board G03): where it stands, its name, its dates and who picks, the
 * criteria, then the viewer's controls.
 *
 * @returns the panel
 */
function RunningCard({ competitions, slug, teacherName, pupilCount }: RunningCardProps) {
  const { t, i18n } = useClassCompetitionsTranslation();
  const [showOutcomes, setShowOutcomes] = useState(false);
  const competition = competitions.running;
  if (competition === null) return null;
  const isTeacher = competitions.role === 'teacher';
  // CALM-7d: both moments on the viewer's own clock ("Monday 1 March, 08:00").
  const moment = (instant: string) => formatLocalDayAndTime(new Date(instant), i18n.language);
  const toggle = (
    <OutcomesToggle isOpen={showOutcomes} onToggle={() => setShowOutcomes(!showOutcomes)} />
  );
  // Below grade 8 nobody wins, so the line says every entrant is a Contestant (decision 11).
  // The teacher reads "You pick one winner" (board G08); pupils read the teacher's name.
  const picksKey = isTeacher ? 'card.picksYou' : 'card.picks';
  const pickKey = competitions.areWinnersAllowed ? picksKey : 'card.noWinners';
  return (
    <section aria-labelledby="class-competition-heading" className={panelClasses}>
      <PhaseLine competition={competition} />
      <h2 id="class-competition-heading" className="m-0 type-heading text-ink-heading">
        {competition.name}
      </h2>
      <p className="m-0 max-w-[34em] type-body text-ink">
        {t('card.dates', { start: moment(competition.startsAt), end: moment(competition.endsAt) })}{' '}
        {t(pickKey, { teacher: teacherName })}
      </p>
      <CriteriaList
        id="class-competition-criteria"
        criteria={competition.criteria}
        showOutcomes={showOutcomes}
      />
      <div className="pt-4">
        {isTeacher ? (
          <TeacherControls competition={competition} slug={slug} pupilCount={pupilCount}>
            {toggle}
          </TeacherControls>
        ) : (
          <PupilControls competition={competition} slug={slug}>
            {toggle}
          </PupilControls>
        )}
      </div>
      {!isTeacher && (
        <span className="self-end">
          <ReportButton
            itemType="class_competition"
            itemReference={competition.id}
            itemLabel={t('card.report', { name: competition.name })}
          />
        </span>
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
      <h2
        id="class-competition-heading"
        className="m-0 font-heading type-heading font-bold text-ink-heading"
      >
        {t('card.startTitle')}
      </h2>
      <p className="m-0 type-body text-ink-muted">{t('card.startBody')}</p>
      {!hasGrade && <p className="m-0 type-body text-ink-muted">{t('card.needsGrade')}</p>}
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
 * Renders the running competition, or the teacher's way to start one.
 *
 * @param props.slug - the class's address
 * @param props.teacherName - the teacher's pen name or handle
 * @param props.pupilCount - how many pupils the class has (for the teacher's count line)
 * @returns the cards, or nothing for someone outside the class or a class with no competition
 */
export function ClassCompetitionCard(props: {
  slug: string;
  teacherName: string;
  pupilCount?: number;
}) {
  const { slug, teacherName, pupilCount = 0 } = props;
  const { t } = useClassCompetitionsTranslation();
  const read = useClassCompetitions(slug);
  if (read.isError) return <Notice tone="error">{t('card.loadFailed')}</Notice>;
  const competitions = read.data;
  if (competitions === undefined || competitions === null) return null;
  const isTeacher = competitions.role === 'teacher';
  return (
    <>
      {competitions.running !== null && (
        <RunningCard
          competitions={competitions}
          slug={slug}
          teacherName={teacherName}
          pupilCount={pupilCount}
        />
      )}
      {competitions.running === null && isTeacher && (
        <StartCard competitions={competitions} slug={slug} />
      )}
    </>
  );
}
