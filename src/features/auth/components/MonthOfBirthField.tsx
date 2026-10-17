/**
 * MonthOfBirthField: the month of birth, shown only when the year leaves the age unclear at 13 or 16,
 * board 2.1 (story S1-E2-02; decided 16 Oct 2026, Q16). For every other year the month is never
 * asked and never stored. Never the day (CLAUDE.md rule 5).
 *
 * The tooltip says why: "You turn 13 this year. The month tells us if you're 12 or 13 now".
 * Month names come from the browser in the interface language (Intl), in Romanian or English.
 * Who uses it: SignUpForm.
 */
import { useTranslation } from 'react-i18next';

import { ChevronDownIcon } from '@/components/icons/ChevronDownIcon';
import { InfoTooltip } from '@/components/ui/InfoTooltip';

/** What the field needs. */
interface MonthOfBirthFieldProps {
  value: string;
  /** The age the person turns this year (13 or 16), for the tooltip. */
  ageTurningThisYear: number;
  problem?: string;
  onChange: (value: string) => void;
}

/**
 * The twelve month names in a language.
 *
 * @param language - the interface language
 * @returns January to December, as words
 */
function monthNames(language: string): string[] {
  const format = new Intl.DateTimeFormat(language, { month: 'long', timeZone: 'UTC' });
  return Array.from({ length: 12 }, (_unused, index) =>
    format.format(new Date(Date.UTC(2000, index, 1))),
  );
}

/**
 * Renders the field.
 *
 * @returns the label with its tooltip, the drop-down and any error
 */
export function MonthOfBirthField({
  value,
  ageTurningThisYear,
  problem,
  onChange,
}: MonthOfBirthFieldProps) {
  const { t, i18n } = useTranslation('auth');
  const errorId = problem === undefined ? undefined : 'sign-up-birth-month-error';
  const describedBy = ['sign-up-birth-month-why', errorId].filter(Boolean).join(' ');
  return (
    <div className="flex flex-col gap-1.5">
      <div className="relative flex items-center gap-2">
        <label htmlFor="sign-up-birth-month" className="text-sm font-semibold text-ink">
          {t('signUp.birthMonth.label')}
        </label>
        <InfoTooltip
          tooltipId="sign-up-birth-month-why"
          buttonLabel={t('signUp.birthMonth.why')}
          text={t('signUp.birthMonth.tooltip', {
            older: ageTurningThisYear,
            younger: ageTurningThisYear - 1,
          })}
        />
      </div>
      <span className="relative inline-flex w-fit max-w-full items-center">
        <select
          id="sign-up-birth-month"
          value={value}
          aria-describedby={describedBy}
          aria-invalid={problem === undefined ? undefined : true}
          onChange={(event) => onChange(event.target.value)}
          className="h-11 w-auto cursor-pointer appearance-none rounded-full border border-control-border bg-surface pr-9 pl-4 font-body text-sm font-semibold text-ink"
        >
          <option value="">{t('signUp.birthMonth.placeholder')}</option>
          {monthNames(i18n.language).map((name, index) => (
            <option key={name} value={String(index + 1)}>
              {name}
            </option>
          ))}
        </select>
        <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-ink" />
      </span>
      {problem !== undefined && (
        <p id={errorId} className="m-0 text-sm text-destructive">
          {t(problem)}
        </p>
      )}
    </div>
  );
}
