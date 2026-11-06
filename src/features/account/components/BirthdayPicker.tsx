/**
 * BirthdayPicker: the month drop-down for a birthday (story S1-E2-12; QA-7, 6 Nov 2026: the
 * month only, never a day or a year, so it can't make a full date of birth with the year of
 * birth; CLAUDE.md rule 5).
 *
 * Month names come from Intl in the interface language, so the code holds none.
 * Who shows it: BirthdayForm (Settings › Birthday) and the staff "Correct birthday" action
 * (AccountActionForm). What it calls: onChange with the new month as text ('' for none).
 */
import { useTranslation } from 'react-i18next';

import { Select } from '@/components/ui/Select';

import type { BirthdayChoice } from '../api/birthday';

/** What the picker needs. */
export interface BirthdayPickerProps {
  /** Prefix for the drop-down's id, so two pickers never share one. */
  idPrefix: string;
  value: BirthdayChoice;
  onChange: (value: BirthdayChoice) => void;
}

/**
 * The month options, named in the interface language.
 *
 * @param language - the interface language
 * @param noneLabel - the "Not set" option's text
 * @returns the options, "Not set" first
 */
function monthOptions(language: string, noneLabel: string) {
  const formatter = new Intl.DateTimeFormat(language, { month: 'long', timeZone: 'UTC' });
  const months = Array.from({ length: 12 }, (_, index) => ({
    value: String(index + 1),
    label: formatter.format(new Date(Date.UTC(2000, index, 1))),
  }));
  return [{ value: '', label: noneLabel }, ...months];
}

/**
 * Renders the month drop-down.
 *
 * @returns the drop-down
 */
export function BirthdayPicker({ idPrefix, value, onChange }: BirthdayPickerProps) {
  const { t, i18n } = useTranslation('account');
  return (
    <Select
      id={`${idPrefix}-month`}
      label={t('birthday.month')}
      isLabelVisible
      placement="form"
      value={value.month}
      onChange={(month) => onChange({ month })}
      options={monthOptions(i18n.language, t('birthday.noMonth'))}
    />
  );
}
