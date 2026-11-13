/**
 * TeacherPointsForm: the teacher gives points and an optional private note to a pupil's chapter
 * or assignment reply (bundle CLASS-POINTS, part 1; story S1-E8-14).
 *
 * What it shows: a number from 0 to the most a teacher may give, the private note (only while the
 * staff switch class_teacher_notes is on; it has no reply box, and only that pupil, the teacher
 * and our moderators read it), "Save teacher points" and, once there are points, "Remove teacher
 * points".
 * Who shows it: ChapterClassPoints (under a chapter) and ReplyTeacherPoints (under a reply), for
 * the class's teacher only. What it calls: useSetTeacherPoints → set_teacher_points(), which
 * checks the caller is that class's teacher and writes the class's log.
 */
import { type FormEvent, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { Textarea } from '@/components/ui/Textarea';
import { TextInput } from '@/components/ui/TextInput';

import type { ClassPointsFailure, TeacherPoints } from '../api/classPoints';
import { useSetTeacherPoints } from '../hooks/useClassPoints';
import { useClassPointsTranslation } from '../registerClassPointsTranslations';

/** What the form needs. */
export interface TeacherPointsFormProps {
  /** Whether the work is a chapter or an assignment reply, and its row ID. */
  kind: 'chapter' | 'reply';
  targetId: string;
  /** The points already saved, or null. */
  current: TeacherPoints | null;
  /** The most points a teacher may give. */
  max: number;
  /** False while the staff switch for teacher notes is off. */
  areNotesOn: boolean;
  /** The longest note, in characters. */
  noteMax: number;
}

/**
 * Reads what the teacher typed as whole points.
 *
 * @param typed - the field's text
 * @returns the number, or null when it isn't a whole number
 */
function pointsFrom(typed: string): number | null {
  return /^\d+$/.test(typed.trim()) ? Number(typed.trim()) : null;
}

/** What the last press ended with; "range" is shown on the field itself. */
type Outcome = 'saved' | 'removed' | 'range' | null;

/**
 * What happened after a press, read out politely: the refusal, or "saved" or "removed".
 *
 * @param props.outcome - what the form itself knows
 * @param props.failure - why the database refused, or null
 * @returns the live region
 */
function FormOutcome({
  outcome,
  failure,
}: {
  outcome: Outcome;
  failure: ClassPointsFailure | null;
}) {
  const { t } = useClassPointsTranslation();
  return (
    <div aria-live="polite">
      {failure !== null && outcome === null && (
        <Notice tone="error">{t(`failures.${failure}`)}</Notice>
      )}
      {outcome === 'saved' && <Notice tone="success">{t('chapter.teacher.saved')}</Notice>}
      {outcome === 'removed' && <Notice tone="success">{t('chapter.teacher.removed')}</Notice>}
    </div>
  );
}

/**
 * "Save teacher points" and, once there are points, "Remove teacher points".
 *
 * @param props.canRemove - true when points are already saved
 * @param props.isRunning - true while a save or a removal is on its way
 * @param props.onRemove - takes the points away
 * @returns the buttons
 */
function FormButtons(props: { canRemove: boolean; isRunning: boolean; onRemove: () => void }) {
  const { t } = useClassPointsTranslation();
  return (
    <div className="flex flex-wrap gap-3">
      <Button type="submit" disabled={props.isRunning}>
        {t('chapter.teacher.save')}
      </Button>
      {props.canRemove && (
        <Button variant="secondary" disabled={props.isRunning} onClick={props.onRemove}>
          {t('chapter.teacher.remove')}
        </Button>
      )}
    </div>
  );
}

/**
 * Renders the form.
 *
 * @returns the fields, the buttons and what happened
 */
export function TeacherPointsForm(props: TeacherPointsFormProps) {
  const { kind, targetId, current, max, areNotesOn, noteMax } = props;
  const { t } = useClassPointsTranslation();
  const saver = useSetTeacherPoints();
  const [typed, setTyped] = useState(current === null ? '' : String(current.points));
  const [note, setNote] = useState(current?.note ?? '');
  const [outcome, setOutcome] = useState<Outcome>(null);

  /** Saves the points and the note. */
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const points = pointsFrom(typed);
    // The database checks the range too; saying so here saves a round trip.
    if (points === null || points > max) {
      setOutcome('range');
      return;
    }
    setOutcome(null);
    const request = { kind, targetId, points, note: areNotesOn ? note : '' };
    const saved = await saver.save(request).catch(() => undefined);
    if (saved !== undefined) setOutcome('saved');
  }

  /** Takes the points and the note away. */
  async function remove() {
    setOutcome(null);
    const removed = await saver.save({ kind, targetId, points: null, note: '' }).catch(() => false);
    if (removed === false) return;
    setTyped('');
    setNote('');
    setOutcome('removed');
  }

  const fieldId = `teacher-points-${targetId}`;
  return (
    <form className="flex flex-col gap-4" onSubmit={save}>
      <TextInput
        id={fieldId}
        label={t('chapter.teacher.pointsLabel', { max })}
        inputMode="numeric"
        value={typed}
        onChange={(event) => setTyped(event.target.value)}
        errorMessage={outcome === 'range' ? t('failures.range') : undefined}
        className="w-28"
      />
      {areNotesOn && (
        <Textarea
          id={`${fieldId}-note`}
          label={t('chapter.teacher.noteLabel')}
          hint={t('chapter.teacher.noteHint')}
          rows={3}
          maxLength={noteMax}
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      )}
      <FormButtons canRemove={current !== null} isRunning={saver.isRunning} onRemove={remove} />
      <FormOutcome outcome={outcome} failure={saver.failure?.failure ?? null} />
    </form>
  );
}
