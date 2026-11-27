/**
 * TeacherPointsForm: the teacher gives points and an optional private note to a pupil's chapter
 * or assignment reply (bundle CLASS-POINTS, part 1; story S1-E8-14).
 *
 * What it shows (board G10-TeacherPoints, BOOKS-8 part 8b): a number from 0 to the most a teacher
 * may give with − and + (TeacherPointsStepper), the private note (only while the staff switch
 * class_teacher_notes is on; it has no reply box, and only that pupil, the teacher and our
 * moderators read it), on a chapter the line saying what the writer sees and until when it can
 * change, "Save points and note" and, once there are points, "Remove teacher points" as a text
 * button.
 * Who shows it: ChapterClassPoints (under a chapter) and ReplyTeacherPoints (under a reply), for
 * the class's teacher only. What it calls: useSetTeacherPoints → set_teacher_points(), which
 * checks the caller is that class's teacher and writes the class's log.
 */
import { type FormEvent, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { FieldProblem } from '@/components/ui/FieldProblem';
import { Textarea } from '@/components/ui/Textarea';

import type { ClassPointsFailure, TeacherPoints } from '../api/classPoints';
import { useSetTeacherPoints } from '../hooks/useClassPoints';
import { useClassPointsTranslation } from '../registerClassPointsTranslations';

import { TeacherPointsStepper } from './TeacherPointsStepper';

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
function FormButtons(props: {
  canRemove: boolean;
  isRunning: boolean;
  onRemove: () => void;
  withNote: boolean;
}) {
  const { t } = useClassPointsTranslation();
  return (
    <div className="flex flex-wrap items-center gap-6">
      <Button type="submit" disabled={props.isRunning}>
        {props.withNote ? t('chapter.teacher.saveBoth') : t('chapter.teacher.save')}
      </Button>
      {props.canRemove && (
        <Button variant="text" disabled={props.isRunning} onClick={props.onRemove}>
          {t('chapter.teacher.remove')}
        </Button>
      )}
    </div>
  );
}

/**
 * The stepper and, after a save with a number out of range, what is wrong with it.
 *
 * @returns the stepper and its problem line
 */
function PointsField(props: {
  id: string;
  typed: string;
  max: number;
  onChange: (typed: string) => void;
  isOutOfRange: boolean;
}) {
  const { t } = useClassPointsTranslation();
  const problemId = `${props.id}-problem`;
  return (
    <>
      <TeacherPointsStepper
        id={props.id}
        typed={props.typed}
        max={props.max}
        onChange={props.onChange}
        problemId={props.isOutOfRange ? problemId : undefined}
      />
      <FieldProblem id={problemId} isShown={props.isOutOfRange}>
        {t('failures.range')}
      </FieldProblem>
    </>
  );
}

/**
 * The private note: only that pupil, the teacher and the moderators read it, with no replies.
 *
 * @returns the text area with its hint
 */
function NoteField(props: {
  id: string;
  note: string;
  noteMax: number;
  onChange: (note: string) => void;
}) {
  const { t } = useClassPointsTranslation();
  return (
    <Textarea
      id={props.id}
      label={t('chapter.teacher.noteLabel')}
      hint={t('chapter.teacher.noteHint')}
      rows={3}
      maxLength={props.noteMax}
      value={props.note}
      className="max-w-[480px]"
      onChange={(event) => props.onChange(event.target.value)}
    />
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
      <PointsField
        id={fieldId}
        typed={typed}
        max={max}
        onChange={setTyped}
        isOutOfRange={outcome === 'range'}
      />
      {areNotesOn && (
        <NoteField id={`${fieldId}-note`} note={note} noteMax={noteMax} onChange={setNote} />
      )}
      {kind === 'chapter' && (
        <p className="m-0 type-meta">
          {t('chapter.teacher.writerSees', { points: pointsFrom(typed) ?? 0 })}
        </p>
      )}
      <FormButtons
        canRemove={current !== null}
        isRunning={saver.isRunning}
        onRemove={remove}
        withNote={areNotesOn}
      />
      <FormOutcome outcome={outcome} failure={saver.failure?.failure ?? null} />
    </form>
  );
}
