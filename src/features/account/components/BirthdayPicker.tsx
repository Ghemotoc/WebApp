/**
 * BirthdayPicker: the month and day drop-downs for a birthday (story S1-E2-12; Robert, 25 Oct 2026,
 * 07:08 to 07:11: a day and month only, never the year).
 *
 * The month is enough; the day is optional and lists only the days the chosen month has. Month
 * names come from Intl in the interface language, so the code holds none.
 * Who shows it: BirthdayForm (Settings › Birthday) and the staff "Correct birthday" action
 * (AccountActionForm). What it calls: onChange with the new month and day as text ('' for none).
 */
import { useTranslation } from 'react-i18next';

import { Select } from '@/components/ui/Select';

import { daysInMonth, type BirthdayChoice } from '../api/birthday';

/** What the picker needs. */
export interface BirthdayPickerProps {
  /** Prefix for the drop-downs' ids, so two pickers never share one. */
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
  const months = daysInMonth.map((_, index) => ({
    value: String(index + 1),
    label: formatter.format(new Date(Date.UTC(2000, index, 1))),
  }));
  return [{ value: '', label: noneLabel }, ...months];
}

/**
 * The day options for a month.
 *
 * @param month - '1' to '12', or '' when no month is chosen
 * @param noneLabel - the "No day" option's text
 * @returns the options, "No day" first
 */
function dayOptions(month: string, noneLabel: string) {
  const dayCount = month === '' ? 0 : (daysInMonth[Number(month) - 1] ?? 0);
  const days = Array.from({ length: dayCount }, (_, index) => ({
    value: String(index + 1),
    label: String(index + 1),
  }));
  return [{ value: '', label: noneLabel }, ...days];
}

/**
 * The choice after a new month: a day that month doesn't have (31 in April) is dropped.
 *
 * @param month - the new month, '' for none
 * @param day - the day chosen so far
 * @returns the new choice
 */
function withMonth(month: string, day: string): BirthdayChoice {
  const dayFits = month !== '' && Number(day) <= (daysInMonth[Number(month) - 1] ?? 0);
  return { month, day: dayFits ? day : '' };
}

/**
 * Renders the two drop-downs side by side (they wrap on a phone).
 *
 * @returns the month and day drop-downs
 */
export function BirthdayPicker({ idPrefix, value, onChange }: BirthdayPickerProps) {
  const { t, i18n } = useTranslation('account');
  return (
    <div className="flex flex-wrap gap-4">
      <Select
        id={`${idPrefix}-month`}
        label={t('birthday.month')}
        isLabelVisible
        placement="form"
        value={value.month}
        onChange={(month) => onChange(withMonth(month, value.day))}
        options={monthOptions(i18n.language, t('birthday.noMonth'))}
      />
      <Select
        id={`${idPrefix}-day`}
        label={t('birthday.day')}
        isLabelVisible
        placement="form"
        value={value.day}
        onChange={(day) => onChange({ month: value.month, day })}
        options={dayOptions(value.month, t('birthday.noDay'))}
      />
    </div>
  );
}
