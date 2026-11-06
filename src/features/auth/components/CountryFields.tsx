/**
 * CountryFields: "Country you live in", and "Province or state" for a country where a region has
 * its own age law (bundle MARKETS-1, stories S1-E2-20 and S1-E2-21).
 *
 * Who uses it: SignUpForm (sign-up starts on the country of the connection) and the country
 * setting in Settings › Account (CountrySetting). The age rules by country decide which regions
 * are offered: only those with their own row in country_age_rules (Quebec, Florida …), plus
 * "Somewhere else in Canada". Country names come from the browser in the page's language
 * (Intl.DisplayNames), sorted the way that language sorts.
 * Changing the country clears the region, so a region never belongs to another country.
 */
import { useId } from 'react';
import { useTranslation } from 'react-i18next';

import { Select, type SelectOption } from '@/components/ui/Select';
import { countryName } from '@/features/safety/lib/countries';
import type { AgeRule } from '@/lib/age-rules';
import { countryCodes } from '@/lib/country-codes';

/** What the fields need. */
interface CountryFieldsProps {
  /** A prefix for the fields' ids, unique on the page. */
  idPrefix: string;
  country: string;
  region: string;
  ageRules: readonly AgeRule[];
  /** The problem to show under the country, as a translation key in auth.json, if any. */
  problem?: string;
  onChange: (country: string, region: string) => void;
}

/**
 * The countries, named and sorted in the page's language, with a "Choose a country" first when
 * none is chosen yet.
 *
 * @param language - the page's language
 * @param hasChoice - whether a country is already chosen
 * @param chooseLabel - the words of the empty choice
 * @returns the options
 */
function countryOptions(language: string, hasChoice: boolean, chooseLabel: string): SelectOption[] {
  const collator = new Intl.Collator(language);
  const named = countryCodes
    .map((code) => ({ value: code, label: countryName(code, language) }))
    .sort((first, second) => collator.compare(first.label, second.label));
  return hasChoice ? named : [{ value: '', label: chooseLabel }, ...named];
}

/**
 * The regions with their own age law in a country, after "Somewhere else in …".
 *
 * @param ageRules - every rule
 * @param country - the chosen country
 * @param elsewhereLabel - the words of the rest of the country
 * @returns the options; only the first when the country has no such region
 */
function regionOptions(
  ageRules: readonly AgeRule[],
  country: string,
  elsewhereLabel: string,
): SelectOption[] {
  const regions = ageRules
    .filter((rule) => rule.countryCode === country && rule.regionCode !== '')
    .map((rule) => ({ value: rule.regionCode, label: regionLabel(rule) }));
  return [{ value: '', label: elsewhereLabel }, ...regions];
}

/**
 * A region's name without its country ("Quebec", not "Canada: Quebec").
 *
 * @param rule - the region's rule
 * @returns the name
 */
function regionLabel(rule: AgeRule): string {
  return rule.regionName === '' ? rule.regionCode : rule.regionName;
}

/**
 * Renders the country, and the region when the country has regions with their own ages.
 *
 * @returns the fields
 */
export function CountryFields({
  idPrefix,
  country,
  region,
  ageRules,
  problem,
  onChange,
}: CountryFieldsProps) {
  const { t, i18n } = useTranslation('auth');
  const hintId = useId();
  const problemId = useId();
  const regions = regionOptions(
    ageRules,
    country,
    t('signUp.country.elsewhere', { country: countryName(country, i18n.language) }),
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <Select
          id={`${idPrefix}-country`}
          label={t('signUp.country.label')}
          isLabelVisible
          options={countryOptions(i18n.language, country !== '', t('signUp.country.choose'))}
          value={country}
          descriptionId={problem === undefined ? hintId : `${hintId} ${problemId}`}
          onChange={(value) => onChange(value, '')}
        />
        <p id={hintId} className="m-0 text-[13px] text-meta">
          {t('signUp.country.hint')}
        </p>
        {problem !== undefined && (
          <p id={problemId} className="m-0 text-sm text-destructive">
            {t(problem)}
          </p>
        )}
      </div>
      {regions.length > 1 && (
        <Select
          id={`${idPrefix}-region`}
          label={t('signUp.country.regionLabel')}
          isLabelVisible
          options={regions}
          value={region}
          onChange={(value) => onChange(country, value)}
        />
      )}
    </div>
  );
}
