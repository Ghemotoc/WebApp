/**
 * SignUpCountryField: the sign-up form's "Country you live in" (and "Province or state" where a
 * region has its own age law), wired to the form's answers (bundle MARKETS-1, story S1-E2-20).
 *
 * Who uses it: SignUpForm, before the year of birth, because the country's law can make the month
 * matter. What it calls: the shared CountryFields; choosing a country clears the region.
 */
import type { useSignUpForm } from '../hooks/useSignUpForm';

import { CountryFields } from './CountryFields';

/** What the field needs. */
interface SignUpCountryFieldProps {
  form: ReturnType<typeof useSignUpForm>;
}

/**
 * Renders the country (and region) for sign-up.
 *
 * @returns the fields
 */
export function SignUpCountryField({ form }: SignUpCountryFieldProps) {
  const { answers, setField, problems } = form;
  return (
    <CountryFields
      idPrefix="sign-up"
      country={answers.country}
      region={answers.legalRegion}
      ageRules={form.ageRules}
      problem={problems.country}
      onChange={(country, region) => {
        setField('country', country);
        setField('legalRegion', region);
      }}
    />
  );
}
