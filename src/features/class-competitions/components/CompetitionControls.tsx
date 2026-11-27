/**
 * CompetitionControls: what a pupil or the teacher can do with the running competition (bundle
 * CLASS-POINTS, part 2; story S1-E8-15).
 *
 * - A pupil: "Join the competition", or "Joined." with "Leave the competition" before it ends.
 *   Nobody is ever added by anyone else (Robert, 13 Nov 2026, 19:40 UTC).
 * - The teacher (BOOKS-8 part 8b; board G08, user story 8.8): "See entries" (or "Assess the
 *   entries" once it has ended) and "Edit" while the criteria can still change, then "9 of 28
 *   pupils entered so far. Scoring opens when it closes." Ending early and deleting stay as text
 *   buttons under them (not on the board, but the teacher needs them).
 * Who shows it: ClassCompetitionCard. What it calls: useCompetitionAction → the join, leave,
 * end and delete functions.
 */
import type { ReactNode } from 'react';
import { Link } from 'react-router';

import { Button } from '@/components/ui/Button';
import { buttonClassName } from '@/components/ui/buttonStyles';
import { ButtonRow } from '@/components/ui/ButtonRow';
import { Notice } from '@/components/ui/Notice';

import type { CompetitionAction, RunningCompetition } from '../api/classCompetitions';
import { useCompetitionAction } from '../hooks/useClassCompetitions';
import { useClassCompetitionsTranslation } from '../registerClassCompetitionsTranslations';

import { ConfirmedButton } from './ConfirmedButton';

/** What both sets of controls need. */
interface ControlsProps {
  competition: RunningCompetition;
  /** The class's address. */
  slug: string;
}

/** What the teacher's controls need besides. */
interface TeacherControlsProps extends ControlsProps {
  /** How many pupils the class has, for "9 of 28 pupils entered so far". */
  pupilCount: number;
  /** The criteria toggle, which sits in the button row. */
  children?: ReactNode;
}

/**
 * The line under the teacher's buttons: how many entered so far while it is open, else how many
 * joined.
 *
 * @returns the meta line
 */
function EntrantsLine({ competition, pupilCount }: Omit<TeacherControlsProps, 'slug'>) {
  const { t } = useClassCompetitionsTranslation();
  const count = competition.entrantCount ?? 0;
  const text =
    competition.phase === 'judging'
      ? t('card.entrants', { count })
      : t('card.enteredSoFar', { count, pupils: pupilCount });
  return <p className="m-0 type-meta">{text}</p>;
}

/**
 * A pupil's choice to join or leave (board G03: a quiet button beside "What each criterion
 * needs", with the note under them).
 *
 * @param props.children - the criteria toggle, which sits in the same row
 * @returns the row, the note and any failure
 */
export function PupilControls({ competition, children }: ControlsProps & { children?: ReactNode }) {
  const { t } = useClassCompetitionsTranslation();
  const action = useCompetitionAction(competition.id);
  const run = (what: CompetitionAction) => void action.act(what).catch(() => undefined);
  return (
    <div className="flex flex-col gap-3">
      {competition.isEntrant && (
        <p className="m-0 type-body font-semibold text-ink">{t('card.joined')}</p>
      )}
      <ButtonRow>
        {competition.canJoin && (
          <Button variant="secondary" disabled={action.isRunning} onClick={() => run('join')}>
            {t('card.join')}
          </Button>
        )}
        {competition.canLeave && (
          <Button variant="secondary" disabled={action.isRunning} onClick={() => run('leave')}>
            {t('card.leave')}
          </Button>
        )}
        {children}
      </ButtonRow>
      <p className="m-0 type-meta text-ink-muted">{t('card.joinNote')}</p>
      <div aria-live="polite">
        {action.failure !== null && (
          <Notice tone="error">{t(`failures.${action.failure.failure}`)}</Notice>
        )}
      </div>
    </div>
  );
}

/**
 * The teacher's ways to see, change, end or delete the competition.
 *
 * @returns the buttons, the count line, the quieter actions and any failure
 */
export function TeacherControls(props: TeacherControlsProps) {
  const { competition, slug } = props;
  const { t } = useClassCompetitionsTranslation();
  const action = useCompetitionAction(competition.id);
  const run = (what: CompetitionAction) => void action.act(what).catch(() => undefined);
  const entriesLabel = competition.canScore ? t('card.assess') : t('card.seeEntries');
  return (
    <div className="flex flex-col gap-3">
      <ButtonRow>
        <Link
          to={`/spaces/${slug}/competition/${competition.id}/results`}
          className={buttonClassName({ variant: 'secondary' })}
        >
          {entriesLabel}
        </Link>
        {competition.canEdit && (
          <Link to={`/spaces/${slug}/competition`} className={buttonClassName({ variant: 'text' })}>
            {t('card.edit')}
          </Link>
        )}
        {props.children}
      </ButtonRow>
      <EntrantsLine competition={competition} pupilCount={props.pupilCount} />
      <div className="flex flex-wrap items-start gap-6">
        {competition.canEnd && (
          <ConfirmedButton
            label={t('card.end')}
            question={t('card.endConfirm')}
            yesLabel={t('card.endYes')}
            cancelLabel={t('card.cancel')}
            variant="text"
            isDisabled={action.isRunning}
            onConfirm={() => run('end')}
          />
        )}
        <ConfirmedButton
          label={t('card.delete')}
          question={t('card.deleteConfirm')}
          yesLabel={t('card.deleteYes')}
          cancelLabel={t('card.cancel')}
          variant="text"
          isDisabled={action.isRunning}
          onConfirm={() => run('delete')}
        />
      </div>
      <div aria-live="polite">
        {action.failure !== null && (
          <Notice tone="error">{t(`failures.${action.failure.failure}`)}</Notice>
        )}
      </div>
    </div>
  );
}
