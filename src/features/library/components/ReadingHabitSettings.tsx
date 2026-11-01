/**
 * ReadingHabitSettings: the private reading streak's daily target and reminder, inside the
 * Library's "Your reading days" note (bundle IDEAS-1, part b; idea IDEA-20261031-13).
 *
 * The target is any number of minutes the reader types (Robert, 31 Oct 2026); the reminder is
 * off until ticked, needs a time, and for under-18s can't be between 22:00 and 07:00 (quiet hours,
 * Q50). The form checks this before saving (lib/habitChoices.ts) and the database checks it again.
 * Who uses it: ReadingHabitNote. What it calls: the save mutation from useReadingHabit.
 */
import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { TextInput } from '@/components/ui/TextInput';
import { quietHoursRefusal, type ReadingHabit } from '@/features/reading-habit/api/readingHabit';
import type { useReadingHabit } from '@/features/reading-habit/hooks/useReadingHabit';
import {
  checkHabitForm,
  type HabitForm,
  type HabitProblem,
} from '@/features/reading-habit/lib/habitChoices';

import { useLibraryTranslation } from '../registerLibraryTranslations';

/** What the settings need. */
interface ReadingHabitSettingsProps {
  habit: ReadingHabit;
  save: ReturnType<typeof useReadingHabit>['save'];
}

/** The form's first values, from what is saved. */
function formFrom(habit: ReadingHabit): HabitForm {
  return {
    target: habit.target === null ? '' : String(habit.target),
    remindersOn: habit.remindersOn,
    reminderTime: habit.reminderTime ?? '',
  };
}

/** The reminder's checkbox, with its hint. */
function ReminderCheckbox(props: { isChecked: boolean; onChange: (isChecked: boolean) => void }) {
  const { t } = useLibraryTranslation();
  return (
    <div className="flex min-h-11 items-start gap-3">
      <input
        id="reading-reminder"
        type="checkbox"
        className="mt-0.5 h-5 w-5 shrink-0"
        checked={props.isChecked}
        aria-describedby="reading-reminder-hint"
        onChange={(event) => props.onChange(event.target.checked)}
      />
      <div className="flex flex-col gap-0.5">
        <label htmlFor="reading-reminder" className="text-[15px] font-semibold text-heading">
          {t('habit.remindMe')}
        </label>
        <span id="reading-reminder-hint" className="text-[13px] leading-normal text-meta">
          {t('habit.remindHint')}
        </span>
      </div>
    </div>
  );
}

/** The line under the form: what to fix, a refusal, or "Saved." */
function SaveResult(props: {
  problem: HabitProblem | null;
  save: ReadingHabitSettingsProps['save'];
}) {
  const { t } = useLibraryTranslation();
  if (props.problem !== null) return <Notice tone="error">{t(`habit.${props.problem}`)}</Notice>;
  if (props.save.isError) {
    const isQuietHours = props.save.error.message === quietHoursRefusal;
    return (
      <Notice tone="error">{t(isQuietHours ? 'habit.quietHoursError' : 'habit.saveFailed')}</Notice>
    );
  }
  if (props.save.isSuccess) return <Notice tone="success">{t('habit.saved')}</Notice>;
  return null;
}

/**
 * Renders the target and reminder form.
 *
 * @returns the form
 */
export function ReadingHabitSettings({ habit, save }: ReadingHabitSettingsProps) {
  const { t } = useLibraryTranslation();
  const [form, setForm] = useState<HabitForm>(() => formFrom(habit));
  const [problem, setProblem] = useState<HabitProblem | null>(null);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    // Check first, so the reader sees what to fix without a round trip.
    const checked = checkHabitForm(form, habit.isUnder18);
    if ('problem' in checked) {
      setProblem(checked.problem);
      return;
    }
    setProblem(null);
    save.mutate(checked.choices);
  };
  return (
    <form className="flex flex-col gap-4" onSubmit={submit} noValidate>
      <h3 className="m-0 font-heading text-lg font-bold text-heading">
        {t('habit.settingsHeading')}
      </h3>
      <div className="max-w-[240px]">
        <TextInput
          id="reading-target"
          inputMode="numeric"
          label={t('habit.target')}
          hint={t('habit.targetHint')}
          value={form.target}
          onChange={(event) => setForm({ ...form, target: event.target.value })}
        />
      </div>
      <ReminderCheckbox
        isChecked={form.remindersOn}
        onChange={(isChecked) => setForm({ ...form, remindersOn: isChecked })}
      />
      {form.remindersOn && (
        <div className="max-w-[240px] pl-8">
          <TextInput
            id="reading-reminder-time"
            type="time"
            label={t('habit.reminderTime')}
            hint={habit.isUnder18 ? t('habit.quietHoursHint') : undefined}
            value={form.reminderTime}
            onChange={(event) => setForm({ ...form, reminderTime: event.target.value })}
          />
        </div>
      )}
      <SaveResult problem={problem} save={save} />
      <div>
        <Button type="submit" disabled={save.isPending}>
          {t('habit.save')}
        </Button>
      </div>
    </form>
  );
}
