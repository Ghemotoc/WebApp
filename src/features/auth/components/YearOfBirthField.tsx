/**
 * YearOfBirthField: the year of birth on the sign-up form, board 2.1 (stories S1-E2-01, S1-E2-02).
 *
 * A year picker, never a full date of birth (CLAUDE.md rule 5). Years run from this year back 100
 * years, as on the board; under-13 years stay in the list so the form can say why it refuses them.
 * The "i" button explains why we ask (the Definition of Done's tooltip pattern). While the age
 * check is part of sign-up (adults_only off, S1-E2-08 live), a visible line also says a quick age
 * check follows; in March there is no age check, so neither says so (decided 17 Oct 2026, 12:44).
 * It uses the one drop-down style: only as wide as its longest option, 44 px, 14 px chevron
 * 14 px from the right, a #8E7B99 border (DoD drop-down rule).
 * Who uses it: SignUpForm.
 */
import { useTranslation } from 'react-i18next';

import { ChevronDownIcon } from '@/components/icons/ChevronDownIcon';
import { InfoTooltip } from '@/components/ui/InfoTooltip';

import { listBirthYears } from '../lib/birthYears';

/** What the field needs. */
interface YearOfBirthFieldProps {
  value: string;
  problem?: string;
  /** True while sign-up is followed by the age check; false in March. */
  includesAgeCheck: boolean;
  onChange: (value: string) => void;
}

/**
 * Renders the field.
 *
 * @returns the label with its tooltip, the drop-down, the age-check line and any error
 */
export function YearOfBirthField({
  value,
  problem,
  includesAgeCheck,
  onChange,
}: YearOfBirthFieldProps) {
  const { t } = useTranslation('auth');
  const errorId = problem === undefined ? undefined : 'sign-up-birth-year-error';
  const describedBy = ['sign-up-birth-year-why', errorId].filter(Boolean).join(' ');
  return (
    <div className="flex flex-col gap-1.5">
      <div className="relative flex items-center gap-2">
        <label htmlFor="sign-up-birth-year" className="text-sm font-semibold text-ink">
          {t('signUp.birthYear.label')}
        </label>
        <InfoTooltip
          tooltipId="sign-up-birth-year-why"
          buttonLabel={t('signUp.birthYear.why')}
          text={t(
            includesAgeCheck ? 'signUp.birthYear.tooltipWithAgeCheck' : 'signUp.birthYear.tooltip',
          )}
        />
      </div>
      <span className="relative inline-flex w-fit max-w-full items-center">
        <select
          id="sign-up-birth-year"
          value={value}
          aria-describedby={describedBy}
          aria-invalid={problem === undefined ? undefined : true}
          onChange={(event) => onChange(event.target.value)}
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
      {includesAgeCheck && (
        <p className="m-0 pl-5 text-[13px] text-meta">{t('signUp.birthYear.ageCheckLine')}</p>
      )}
      {problem !== undefined && (
        <p id={errorId} className="m-0 text-sm text-destructive">
          {t(problem)}
        </p>
      )}
    </div>
  );
}
