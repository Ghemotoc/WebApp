/**
 * MonthDayField: one day of the year (no year) picked as a day and a month, for the seasonal
 * look dates (bundle G12a; the StaffWebsiteSeasonal board's "First day" and "Last day").
 *
 * Two drop-downs inside one labelled group, so a screen reader hears "First day, group" and then
 * "Day" and "Month". When the month changes to one with fewer days, the day moves to the month's
 * last day instead of becoming a day that doesn't exist.
 * Who shows it: SeasonalWindowForm. What it calls: Select and the sums in lib/seasonalWindows.ts.
 */
import { useTranslation } from 'react-i18next';

import { Select } from '@/components/ui/Select';

import { daysInMonth, monthDayFrom, monthNames, partsOf } from '../../lib/seasonalWindows';

/** What the field needs. */
interface MonthDayFieldProps {
  id: string;
  legend: string;
  /** The day as month-day, for example "01-08". */
  value: string;
  onChange: (monthDay: string) => void;
  /** A hint under the field, if any. */
  hint?: string;
}

/**
 * Renders the field.
 *
 * @returns the day and month drop-downs
 */
export function MonthDayField({ id, legend, value, onChange, hint }: MonthDayFieldProps) {
  const { t, i18n } = useTranslation('websiteAdmin');
  const { month, day } = partsOf(value);
  const dayOptions = Array.from({ length: daysInMonth(month) }, (_, index) => ({
    value: String(index + 1),
    label: String(index + 1),
  }));
  const monthOptions = monthNames(i18n.language).map((name, index) => ({
    value: String(index + 1),
    label: name,
  }));
  /** Saves a new month, keeping the day inside it. */
  function changeMonth(newMonth: number) {
    onChange(monthDayFrom({ month: newMonth, day: Math.min(day, daysInMonth(newMonth)) }));
  }
  return (
    <fieldset
      className="m-0 flex flex-col gap-2 border-0 p-0"
      aria-describedby={hint === undefined ? undefined : `${id}-hint`}
    >
      <legend className="mb-2 text-sm font-semibold text-heading">{legend}</legend>
      <div className="flex flex-wrap gap-3">
        <Select
          id={`${id}-day`}
          label={t('seasonal.day')}
          isLabelVisible
          placement="form"
          value={String(day)}
          options={dayOptions}
          onChange={(picked) => onChange(monthDayFrom({ month, day: Number(picked) }))}
        />
        <Select
          id={`${id}-month`}
          label={t('seasonal.month')}
          isLabelVisible
          placement="form"
          value={String(month)}
          options={monthOptions}
          onChange={(picked) => changeMonth(Number(picked))}
        />
      </div>
      {hint !== undefined && (
        <p id={`${id}-hint`} className="m-0 text-sm text-meta">
          {hint}
        </p>
      )}
    </fieldset>
  );
}
