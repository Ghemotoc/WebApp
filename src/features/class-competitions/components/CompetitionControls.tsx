/**
 * CompetitionControls: what a pupil or the teacher can do with the running competition (bundle
 * CLASS-POINTS, part 2; story S1-E8-15).
 *
 * - A pupil: "Join the competition", or "Joined." with "Leave the competition" before it ends.
 *   Nobody is ever added by anyone else (Robert, 13 Nov 2026, 19:40 UTC).
 * - The teacher: how many pupils joined, and the ways to change, end, assess or delete it.
 * Who shows it: ClassCompetitionCard. What it calls: useCompetitionAction → the join, leave,
 * end and delete functions.
 */
import { Link } from 'react-router';

import { Button } from '@/components/ui/Button';
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

/**
 * A pupil's choice to join or leave.
 *
 * @returns the button, the note and any failure
 */
export function PupilControls({ competition }: ControlsProps) {
  const { t } = useClassCompetitionsTranslation();
  const action = useCompetitionAction(competition.id);
  const run = (what: CompetitionAction) => void action.act(what).catch(() => undefined);
  return (
    <div className="flex flex-col items-start gap-2">
      {competition.isEntrant && <p className="m-0 font-semibold text-ink">{t('card.joined')}</p>}
      {competition.canJoin && (
        <Button disabled={action.isRunning} onClick={() => run('join')}>
          {t('card.join')}
        </Button>
      )}
      {competition.canLeave && (
        <Button variant="secondary" disabled={action.isRunning} onClick={() => run('leave')}>
          {t('card.leave')}
        </Button>
      )}
      {(competition.canJoin || competition.canLeave) && (
        <p className="m-0 text-sm text-meta">{t('card.joinNote')}</p>
      )}
      <div aria-live="polite">
        {action.failure !== null && (
          <Notice tone="error">{t(`failures.${action.failure.failure}`)}</Notice>
        )}
      </div>
    </div>
  );
}

/**
 * The teacher's ways to change, end, assess or delete the competition.
 *
 * @returns the count, the links, the buttons and any failure
 */
export function TeacherControls({ competition, slug }: ControlsProps) {
  const { t } = useClassCompetitionsTranslation();
  const action = useCompetitionAction(competition.id);
  const run = (what: CompetitionAction) => void action.act(what).catch(() => undefined);
  return (
    <div className="flex flex-col items-start gap-3">
      <p className="m-0 font-semibold text-ink">
        {t('card.entrants', { count: competition.entrantCount ?? 0 })}
      </p>
      {competition.canEdit && (
        <Link to={`/spaces/${slug}/competition`} className="font-semibold text-link underline">
          {t('card.change')}
        </Link>
      )}
      {competition.canScore && (
        <Link
          to={`/spaces/${slug}/competition/${competition.id}/results`}
          className="font-semibold text-link underline"
        >
          {t('card.assess')}
        </Link>
      )}
      <div className="flex flex-wrap items-start gap-3">
        {competition.canEnd && (
          <ConfirmedButton
            label={t('card.end')}
            question={t('card.endConfirm')}
            yesLabel={t('card.endYes')}
            cancelLabel={t('card.cancel')}
            isDisabled={action.isRunning}
            onConfirm={() => run('end')}
          />
        )}
        <ConfirmedButton
          label={t('card.delete')}
          question={t('card.deleteConfirm')}
          yesLabel={t('card.deleteYes')}
          cancelLabel={t('card.cancel')}
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
