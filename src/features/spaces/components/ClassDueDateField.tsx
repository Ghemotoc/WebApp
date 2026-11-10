/**
 * ClassDueDateField: the teacher sets, changes or clears a class assignment's due date (bundle
 * MUST-1, part d; IDEA-20261108-8).
 *
 * A labelled date field with Save, and Clear once a date is set. The field never offers a day
 * already gone, and the database refuses one too (hint due_in_past). Once saved, the thread shows
 * "Due Friday 14 Nov", the class space lists it, and students who haven't replied get one reminder
 * the day before.
 * Who shows it: ClassRepliesPanel, which only the teacher (or someone acting for them) sees.
 * What it calls: useSaveThreadDueDate → set_forum_thread_due_date().
 */
import { useId, useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { TextInput } from '@/components/ui/TextInput';

import { DueDateError } from '../api/classThreadReplies';
import { useSaveThreadDueDate } from '../hooks/useClassThreadReplies';
import { useSpacesTranslation } from '../registerSpacesTranslations';

/** Today in Romanian time, as the date field writes it ("2026-11-14"): the earliest day offered. */
function romanianToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Bucharest' }).format(new Date());
}

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
 * @param props.dueOn - the date already set, or null
 * @returns the form
 */
export function ClassDueDateField({ threadId, dueOn }: { threadId: string; dueOn: string | null }) {
  const { t } = useSpacesTranslation();
  const fieldId = useId();
  const [day, setDay] = useState(dueOn ?? '');
  const saving = useSaveThreadDueDate(threadId);

  /** Save: sends the chosen day; an empty field does nothing (Clear removes a date). */
  const save = (event: FormEvent) => {
    event.preventDefault();
    if (day === '') return;
    saving.mutate(day);
  };

  /** Clear: takes the date off, so the thread is no longer an assignment with a date. */
  const clear = () => {
    setDay('');
    saving.mutate(null);
  };

  return (
    <form onSubmit={save} className="flex flex-col gap-3">
      <TextInput
        id={fieldId}
        type="date"
        label={t('classReplies.due.label')}
        hint={t('classReplies.due.hint')}
        min={romanianToday()}
        value={day}
        onChange={(event) => setDay(event.target.value)}
        className="w-fit"
      />
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={saving.isPending || day === ''}>
          {t('classReplies.due.save')}
        </Button>
        {dueOn !== null && (
          <Button variant="secondary" onClick={clear} disabled={saving.isPending}>
            {t('classReplies.due.clear')}
          </Button>
        )}
      </div>
      {saving.isSuccess && (
        <p role="status" className="m-0 text-sm text-body">
          {t('classReplies.due.saved')}
        </p>
      )}
      {saving.isError && <Notice tone="error">{t(failureKey(saving.error))}</Notice>}
    </form>
  );
}
