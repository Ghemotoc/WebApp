/**
 * BirthFields: the year of birth, the month when needed, and the age rules' inline alert
 * (stories S1-E2-01 and S1-E2-02; board 2.1).
 *
 * The month appears only when the chosen year leaves the age unclear at 13 or 16 (Q16); choosing
 * another year clears it, so a month is never sent for a year that doesn't need it. When the
 * year (and month) make the person under 13, or under 18 while adults_only is on, the board's
 * inline alert says "Sorry, you can't create an account right now." straight away; pressing
 * "Create account" then shows the full reason and clears the form (AgeRefusal).
 * Who uses it: SignUpForm.
 */
import { useTranslation } from 'react-i18next';

import { birthYearNeedsMonth, romanianToday } from '@/lib/age';

import type { useSignUpForm } from '../hooks/useSignUpForm';

import { MonthOfBirthField } from './MonthOfBirthField';
import { YearOfBirthField } from './YearOfBirthField';

/** What the fields need. */
interface BirthFieldsProps {
  form: ReturnType<typeof useSignUpForm>;
  includesAgeCheck: boolean;
}

/**
 * Renders the year, the month when needed, and the alert when the age rules refuse.
 *
 * @returns the fields
 */
export function BirthFields({ form, includesAgeCheck }: BirthFieldsProps) {
  const { t } = useTranslation('auth');
  const { answers, setField, problems, ageOutcome } = form;
  const today = romanianToday();
  const year = Number(answers.birthYear);
  const needsMonth = answers.birthYear !== '' && birthYearNeedsMonth(year, today);

  /** A new year clears the month, so a month is only ever kept for a year that needs it. */
  function changeYear(value: string) {
    setField('birthYear', value);
    setField('birthMonth', '');
  }

  return (
    <>
      <YearOfBirthField
        value={answers.birthYear}
        problem={problems.birthYear}
        includesAgeCheck={includesAgeCheck}
        onChange={changeYear}
      />
      {needsMonth && (
        <MonthOfBirthField
          value={answers.birthMonth}
          ageTurningThisYear={today.year - year}
          problem={problems.birthMonth}
          onChange={(value) => setField('birthMonth', value)}
        />
      )}
      {(ageOutcome === 'under_13' || ageOutcome === 'adults_only') && (
        <p
          role="alert"
          className="m-0 rounded-2xl bg-panel px-4 py-3 text-sm font-semibold text-destructive"
        >
          {t('signUp.refusal.heading')}
        </p>
      )}
    </>
  );
}
