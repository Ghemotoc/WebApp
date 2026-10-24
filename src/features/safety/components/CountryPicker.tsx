/**
 * CountryPicker: "Not your country?", the list of every country the research covers (story
 * S1-E10-13a; decided 23 Oct 2026, Q9b: all ten, Romania first).
 *
 * The list and the names come from lib/countries.ts (the browser's own names, in the page's
 * language). Who shows it: SafetyContactsBlock.
 */
import { useTranslation } from 'react-i18next';

import { Select } from '@/components/ui/Select';

import { countryName, coveredCountries } from '../lib/countries';

/** What the picker needs. */
interface CountryPickerProps {
  chosen: string | null;
  onChoose: (countryCode: string) => void;
}

/**
 * Renders the drop-down.
 *
 * @returns the labelled select, Romania first and the rest by name
 */
export function CountryPicker({ chosen, onChoose }: CountryPickerProps) {
  const { t, i18n } = useTranslation('safety');
  const [romania, ...others] = coveredCountries;
  const ordered = [
    romania,
    ...others.sort((first, second) =>
      countryName(first ?? '', i18n.language).localeCompare(
        countryName(second ?? '', i18n.language),
        i18n.language,
      ),
    ),
  ];
  const options = [
    { value: '', label: t('block.chooseCountry') },
    ...ordered.map((code) => ({
      value: code ?? '',
      label: countryName(code ?? '', i18n.language),
    })),
  ];
  return (
    <Select
      id="safety-country"
      label={t('block.notYourCountry')}
      isLabelVisible
      options={options}
      value={chosen ?? ''}
      onChange={(value) => {
        if (value !== '') onChoose(value);
      }}
    />
  );
}
