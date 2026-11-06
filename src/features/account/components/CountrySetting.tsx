/**
 * CountrySetting: "Country you live in: Romania" in Settings › Account, with "Change country"
 * (bundle MARKETS-1, story S1-E2-20; board 6.3 drew it as a row taken from the connection).
 *
 * Why it changed: the ages that apply (joining, a parent's consent) follow the law where a person
 * lives, so the person says where that is (Robert, 6 Nov 2026; replaces Q20, "never asked").
 * "Change country" opens CountryChangeForm, which checks the new country's rule before saving.
 * Who shows it: AccountNamesSection. It uses LabelRows, the label-and-value rows of the DoD.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { LabelRows } from '@/components/ui/LabelRows';
import { countryName } from '@/features/safety/lib/countries';

import type { MyNames } from '../api/accountNames';

import { CountryChangeForm } from './CountryChangeForm';

/**
 * The country (and region) in words.
 *
 * @param names - the person's account details
 * @param language - the reader's language
 * @param unknownText - the words when no country is known
 * @returns "Canada (QC)", "Romania" or the unknown text
 */
function placeInWords(names: MyNames, language: string, unknownText: string): string {
  if (names.countryCode === null) return unknownText;
  const country = countryName(names.countryCode, language);
  return names.legalRegionCode === '' ? country : `${country} (${names.legalRegionCode})`;
}

/**
 * Renders the row, or the form while changing it.
 *
 * @param props.names - the person's account details, the country among them
 * @returns the setting
 */
export function CountrySetting({ names }: { names: MyNames }) {
  const { t, i18n } = useTranslation('account');
  const [isChanging, setIsChanging] = useState(false);
  const value = placeInWords(names, i18n.language, t('country.unknown'));

  return (
    <div className="flex flex-col gap-3">
      <LabelRows rows={[{ label: t('country.label'), value }]} />
      <p className="m-0 text-[13px] text-meta">{t('country.note')}</p>
      {isChanging ? (
        <CountryChangeForm
          idPrefix="settings"
          startCountry={names.countryCode ?? ''}
          startRegion={names.legalRegionCode}
          onCancel={() => setIsChanging(false)}
        />
      ) : (
        <Button variant="secondary" className="self-start" onClick={() => setIsChanging(true)}>
          {t('country.change')}
        </Button>
      )}
    </div>
  );
}
