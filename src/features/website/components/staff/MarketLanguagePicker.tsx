/**
 * MarketLanguagePicker: the first step of every website editor, pick the market and the language
 * (story S1-E11-06 criterion 2; architecture 1.8.6 step 1). Notices hold every language of their
 * market, so their editor asks for the market only (S1-E11-10).
 *
 * The markets come from the markets list (seeded by migration, managed on Staff › Settings,
 * S1-E11-05); each market offers its own languages. Names come from the browser's own list of
 * country and language names.
 * Who uses it: WebsiteAdminPage. What it calls: useMarkets.
 */
import { useTranslation } from 'react-i18next';

import { Select } from '@/components/ui/Select';
import { countryName } from '@/features/safety/lib/countries';
import { languageNameOf } from '@/features/settings/lib/marketNames';

import { useMarkets } from '../../hooks/useMarkets';

/** What the picker needs. */
interface MarketLanguagePickerProps {
  marketCode: string;
  language: string;
  isLanguageShown: boolean;
  onChange: (marketCode: string, language: string, marketLanguages: string[]) => void;
}

/**
 * Renders the two drop-downs.
 *
 * @returns the picker
 */
export function MarketLanguagePicker({
  marketCode,
  language,
  isLanguageShown,
  onChange,
}: MarketLanguagePickerProps) {
  const { t, i18n } = useTranslation('websiteAdmin');
  const markets = useMarkets();
  const market = markets.find((candidate) => candidate.countryCode === marketCode);
  const languages = market?.languages ?? [language];
  return (
    <div className="flex flex-wrap gap-4">
      <Select
        id="website-market"
        label={t('picker.market')}
        options={markets.map((candidate) => ({
          value: candidate.countryCode,
          label: countryName(candidate.countryCode, i18n.language),
        }))}
        value={marketCode}
        onChange={(value) => {
          const picked = markets.find((candidate) => candidate.countryCode === value)
            ?.languages ?? ['en'];
          onChange(value, picked[0] ?? 'en', picked);
        }}
      />
      {isLanguageShown && (
        <Select
          id="website-language"
          label={t('picker.language')}
          options={languages.map((code) => ({
            value: code,
            label: languageNameOf(code, i18n.language),
            lang: code,
          }))}
          value={language}
          onChange={(value) => onChange(marketCode, value, languages)}
        />
      )}
    </div>
  );
}
