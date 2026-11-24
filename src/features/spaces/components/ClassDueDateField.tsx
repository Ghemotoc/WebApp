/**
 * ClassDueDateField: the teacher sets, changes or clears when a class assignment is due (bundle
 * MUST-1, part d, IDEA-20261108-8; a date, a time and the teacher's own time zone since CALM-7d,
 * part 2: "assignment due -> DateTimeField (date, time, zone, member local)", DESIGN 21 Nov 2026,
 * approved by Robert).
 *
 * The shared DateTimeField with Save, and Remove once a moment is set. The database refuses a
 * moment already past (hint due_in_past). Once saved, the thread shows "Due Friday 14 Nov, 08:00"
 * on each member's own clock, the class space lists it, and students who haven't replied get one
 * reminder in the day before.
 * Who shows it: ClassRepliesPanel, which only the teacher (or someone acting for them) sees.
 * What it calls: DateTimeField, deviceTimeZone(), the helpers in lib/assignmentDue.ts and
 * useSaveThreadDueDate → set_forum_thread_due_date().
 */
import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/Button';
import { DateTimeField } from '@/components/ui/DateTimeField';
import { Notice } from '@/components/ui/Notice';
import { useMissingField } from '@/lib/forms/useMissingField';
import { deviceTimeZone } from '@/lib/local-time';

import { DueDateError } from '../api/classThreadReplies';
import { useSaveThreadDueDate } from '../hooks/useClassThreadReplies';
import { dueAtOf, dueFieldsOf } from '../lib/assignmentDue';
import { useSpacesTranslation } from '../registerSpacesTranslations';

/**
 * The plain words for a refused save.
 *
 * @param error - what the save threw
 * @returns the locale key
 */
function failureKey(error: unknown): string {
  if (error instanceof DueDateError && error.failure !== 'unknown') {
    return `classReplies.due.failures.${error.failure}`;
  }
  return 'classReplies.due.failures.unknown';
}

/**
 * Renders the field.
 *
 * @param props.threadId - the thread's ID
 * @param props.dueAt - the moment already set (ISO), or null
 * @returns the form
 */
export function ClassDueDateField({ threadId, dueAt }: { threadId: string; dueAt: string | null }) {
  const { t } = useSpacesTranslation();
  const [fields, setFields] = useState(dueFieldsOf(dueAt));
  const saving = useSaveThreadDueDate(threadId);
  // The moment the typed date and time mean; null while the date is empty or not a real one.
  const chosenMoment = dueAtOf(fields);
  // Design books item 9: Save stays pressable and says the date is missing beside the field.
  const missing = useMissingField(chosenMoment === null, 'class-due-date');

  /** Save: sends the chosen moment, or says it is missing (Remove takes a date off). */
  const save = (event: FormEvent) => {
    event.preventDefault();
    if (!missing.isReadyToSend() || chosenMoment === null) return;
    saving.mutate(chosenMoment);
  };

  /** Remove: takes the date off, so the thread is no longer an assignment with a date. */
  const clear = () => {
    setFields(dueFieldsOf(null));
    saving.mutate(null);
  };

  return (
    <form onSubmit={save} className="flex flex-col gap-3">
      <DateTimeField
        id="class-due"
        value={fields}
        onChange={setFields}
        dateLabel={t('classReplies.due.label')}
        timeLabel={t('classReplies.due.time')}
        note={t('classReplies.due.hint', { zone: deviceTimeZone() })}
        skippedHourNote={(time) => t('classReplies.due.skippedHourNote', { time })}
        dateErrorMessage={missing.isShown ? t('classReplies.due.missing') : undefined}
      />
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={saving.isPending}>
          {t('classReplies.due.save')}
        </Button>
        {dueAt !== null && (
          <Button variant="secondary" onClick={clear} disabled={saving.isPending}>
            {t('classReplies.due.clear')}
          </Button>
        )}
      </div>
      {saving.isSuccess && (
        <p role="status" className="m-0 type-body text-ink-muted">
          {t('classReplies.due.saved')}
        </p>
      )}
      {saving.isError && <Notice tone="error">{t(failureKey(saving.error))}</Notice>}
    </form>
  );
}
