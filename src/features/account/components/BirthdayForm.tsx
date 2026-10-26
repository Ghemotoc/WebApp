/**
 * BirthdayForm: Settings › Birthday's form (story S1-E2-12; Robert, 25 Oct 2026, 07:08 to 07:11).
 *
 * The month is enough; the day is optional. There is no year, ever. Choosing "Not set" as the
 * month and saving removes the birthday.
 * Who shows it: BirthdaySettingsSection, once the saved birthday has loaded.
 * What it calls: BirthdayPicker (the drop-downs) and useMyBirthday's save() through props.
 */
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';

import { birthdayFromChoice, type Birthday, type BirthdayChoice } from '../api/birthday';
import type { useMyBirthday } from '../hooks/useMyBirthday';

import { BirthdayPicker } from './BirthdayPicker';

/** What the form needs. */
export interface BirthdayFormProps {
  saved: Birthday;
  birthday: ReturnType<typeof useMyBirthday>;
}

/**
 * Renders the drop-downs, the notices and the Save button.
 *
 * @returns the form
 */
export function BirthdayForm({ saved, birthday }: BirthdayFormProps) {
  const { t } = useTranslation('account');
  const [choice, setChoice] = useState<BirthdayChoice>({
    month: saved.month === null ? '' : String(saved.month),
    day: saved.day === null ? '' : String(saved.day),
  });

  /** Saves the choice. */
  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    birthday.save(birthdayFromChoice(choice));
  }

  return (
    <form noValidate className="flex flex-col gap-3" onSubmit={handleSubmit}>
      <BirthdayPicker
        idPrefix="settings-birthday"
        value={choice}
        onChange={(next) => {
          // A new choice clears the last "Saved" or "Not saved" line.
          birthday.reset();
          setChoice(next);
        }}
      />
      {birthday.saveFailed && <Notice tone="error">{t('birthday.saveFailed')}</Notice>}
      {birthday.isSaved && <Notice tone="success">{t('birthday.saved')}</Notice>}
      <div>
        <Button type="submit" variant="secondary" disabled={birthday.isSaving}>
          {birthday.isSaving ? t('birthday.saving') : t('birthday.save')}
        </Button>
      </div>
    </form>
  );
}
