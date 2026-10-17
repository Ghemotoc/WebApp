/**
 * YearOfBirthField: the year of birth on the sign-up form, board 2.1 (story S1-E2-01; S1-E2-02
 * adds the tooltip, the month when it's needed and the age rules).
 *
 * A year picker, never a full date of birth (CLAUDE.md rule 5). Years run from this year back 100
 * years, as on the board; under-13 years stay in the list so the form can say why it refuses them.
 * It uses the one drop-down style: only as wide as its longest option, 44 px, 14 px chevron 14 px
 * from the right, a #8E7B99 border (DoD drop-down rule).
 * Who uses it: SignUpForm.
 */
import type { ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { ChevronDownIcon } from '@/components/icons/ChevronDownIcon';

import { listBirthYears } from '../lib/birthYears';

/** What the field needs. */
interface YearOfBirthFieldProps {
  value: string;
  problem?: string;
  onChange: (value: string) => void;
}

/**
 * Renders the field.
 *
 * @returns the label, the drop-down and its error
 */
export function YearOfBirthField({ value, problem, onChange }: YearOfBirthFieldProps) {
  const { t } = useTranslation('auth');
  const errorId = problem === undefined ? undefined : 'sign-up-birth-year-error';
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="sign-up-birth-year" className="text-sm font-semibold text-ink">
        {t('signUp.birthYear.label')}
      </label>
      <span className="relative inline-flex w-fit max-w-full items-center">
        <select
          id="sign-up-birth-year"
          value={value}
          aria-describedby={errorId}
          aria-invalid={problem === undefined ? undefined : true}
          onChange={(event: ChangeEvent<HTMLSelectElement>) => onChange(event.target.value)}
          className="h-11 w-auto cursor-pointer appearance-none rounded-full border border-control-border bg-surface pr-9 pl-4 font-body text-sm font-semibold text-ink"
        >
          <option value="">{t('signUp.birthYear.placeholder')}</option>
          {listBirthYears().map((year) => (
            <option key={year} value={year}>
              {year}
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
