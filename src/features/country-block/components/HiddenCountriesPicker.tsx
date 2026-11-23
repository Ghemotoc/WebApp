/**
 * HiddenCountriesPicker: the countries where a story is hidden, as board D07 draws "Where it
 * shows" (bundle COUNTRY-1; Robert, 21 Nov 2026).
 *
 * Each hidden country is a pressed chip with a tick; selecting it again takes it off the list
 * ("Select a country again to show the story there"). Under the chips, "Add a country" offers the
 * markets not chosen yet. The line under that says what hiding does. The parent saves the list.
 * Who uses it: StoryWhereItShowsSection (a writer's story settings) and ClassicCountriesPanel
 * (staff, for a classic). What it calls: useMarketCodes for the drop-down's countries.
 */
import { useId } from 'react';
import { useTranslation } from 'react-i18next';

import { Chip } from '@/components/ui/Chip';
import { Select } from '@/components/ui/Select';
import { countryName } from '@/features/discovery/lib/countryNames';

import { useMarketCodes } from '../hooks/useMarketCodes';
import { addableCountries, withCountry, withoutCountry } from '../lib/hiddenCountries';

/** What the picker needs. */
export interface HiddenCountriesPickerProps {
  /** The two-letter codes chosen so far. */
  hidden: readonly string[];
  /** Called with the whole new list after each change. */
  onChange: (hidden: string[]) => void;
}

/**
 * Renders the chips, the drop-down and the explanation.
 *
 * @returns the picker
 */
export function HiddenCountriesPicker({ hidden, onChange }: HiddenCountriesPickerProps) {
  const { t, i18n } = useTranslation('common');
  const selectId = useId();
  const hintId = useId();
  const marketCodes = useMarketCodes();
  // Step 1: the drop-down starts on "Choose a country", then lists the markets left to add.
  const choices = addableCountries(marketCodes, hidden, i18n.language);
  const options = [
    { value: '', label: t('hiddenCountries.choose') },
    ...choices.map((choice) => ({ value: choice.code, label: choice.name })),
  ];
  return (
    <div className="flex flex-col gap-4">
      {hidden.length > 0 && (
        <div
          role="group"
          aria-label={t('hiddenCountries.groupLabel')}
          className="flex flex-wrap gap-2"
        >
          {hidden.map((code) => (
            // Step 2: a chosen country, pressed; pressing it again shows the story there again.
            <Chip
              key={code}
              isPressed
              onPressedChange={() => onChange(withoutCountry(hidden, code))}
            >
              {countryName(code, i18n.language)}
            </Chip>
          ))}
        </div>
      )}
      <Select
        id={selectId}
        label={t('hiddenCountries.addLabel')}
        isLabelVisible
        placement="form"
        options={options}
        value=""
        // Step 3: picking a country adds it; the drop-down goes back to "Choose a country".
        onChange={(code) => {
          if (code !== '') onChange(withCountry(hidden, code));
        }}
        descriptionId={hintId}
      />
      <p id={hintId} className="m-0 type-body text-ink-muted">
        {t('hiddenCountries.hint')}
      </p>
    </div>
  );
}
