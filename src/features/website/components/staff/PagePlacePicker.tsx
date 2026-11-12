/**
 * PagePlacePicker: the side panel of every website editor, where staff pick the language they are
 * editing (bundle LOCALISE-1; Robert, 11 Nov 2026: "on the admin side, on the side, I can select
 * the language and edit things as needed").
 *
 * One page per entry: picking another language shows the same page in that language, not another
 * page. English is the main language; in any other language a field left empty shows the English
 * text. "Country wording" stays on "Every country" unless one country needs its own wording (a
 * legal section, a local contest): then the languages are that country's. Notices hold every
 * language in one form, so their editor shows the country choice only (S1-E11-10).
 * Who uses it: WebsiteAdminPage. What it calls: useMarkets and useInterfaceLanguages; names come
 * from the browser's own list of country and language names.
 */
import { useTranslation } from 'react-i18next';

import { Select } from '@/components/ui/Select';
import { countryName } from '@/features/safety/lib/countries';
import { languageNameOf } from '@/features/settings/lib/marketNames';

import { everyCountry } from '../../api/websiteContentStore';
import { mainContentLanguage, useInterfaceLanguages } from '../../hooks/useInterfaceLanguages';
import { useMarkets } from '../../hooks/useMarkets';

/** What the picker needs. */
interface PagePlacePickerProps {
  /** The country whose wording is edited; everyCountry for the shared page. */
  marketCode: string;
  language: string;
  isLanguageShown: boolean;
  /** Reports the picked country, language and the languages that place can be written in. */
  onChange: (marketCode: string, language: string, languages: string[]) => void;
}

/** What the list of languages needs. */
interface LanguageChoicesProps {
  languages: string[];
  language: string;
  isFallbackSaid: boolean;
  onPick: (language: string) => void;
}

/**
 * The languages as a list of radio buttons, one row each, so the whole list shows at once.
 *
 * @returns the group
 */
function LanguageChoices({ languages, language, isFallbackSaid, onPick }: LanguageChoicesProps) {
  const { t } = useTranslation('websiteAdmin');
  return (
    <fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
      <legend className="mb-2 p-0 text-sm font-semibold text-heading">
        {t('picker.language')}
      </legend>
      {languages.map((code) => (
        <label
          key={code}
          className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-control-border bg-surface px-3 text-[15px] text-body has-[:checked]:border-primary has-[:checked]:font-semibold has-[:checked]:text-heading"
        >
          <input
            type="radio"
            name="website-language"
            value={code}
            checked={code === language}
            onChange={() => onPick(code)}
            className="size-5 accent-primary"
          />
          {/* Each language in its own words ("Svenska"), said right by screen readers. */}
          <span lang={code}>{languageNameOf(code, code)}</span>
        </label>
      ))}
      {isFallbackSaid && <p className="m-0 text-sm text-body">{t('picker.languageHint')}</p>}
    </fieldset>
  );
}

/**
 * Renders the side panel: the languages, then the country choice.
 *
 * @returns the picker
 */
export function PagePlacePicker({
  marketCode,
  language,
  isLanguageShown,
  onChange,
}: PagePlacePickerProps) {
  const { t, i18n } = useTranslation('websiteAdmin');
  const markets = useMarkets();
  const interfaceLanguages = useInterfaceLanguages();
  // The languages a place can be written in: the interface's for the shared page, the country's
  // own for a country's wording.
  const languagesOf = (place: string): string[] => {
    if (place === everyCountry) return interfaceLanguages;
    return markets.find((candidate) => candidate.countryCode === place)?.languages ?? [language];
  };
  const languages = languagesOf(marketCode);
  return (
    <aside aria-label={t('picker.label')} className="flex flex-col gap-5">
      {isLanguageShown && (
        <LanguageChoices
          languages={languages}
          language={language}
          isFallbackSaid={marketCode === everyCountry && language !== mainContentLanguage}
          onPick={(picked) => onChange(marketCode, picked, languages)}
        />
      )}
      <div className="flex flex-col gap-2">
        <Select
          id="website-market"
          label={t('picker.market')}
          options={[
            { value: everyCountry, label: t('picker.everyCountry') },
            ...markets.map((candidate) => ({
              value: candidate.countryCode,
              label: countryName(candidate.countryCode, i18n.language),
            })),
          ]}
          value={marketCode}
          onChange={(place) => {
            // Keep the language when the new place has it; otherwise its first.
            const offered = languagesOf(place);
            const kept = offered.includes(language)
              ? language
              : (offered[0] ?? mainContentLanguage);
            onChange(place, kept, offered);
          }}
        />
        <p className="m-0 text-sm text-body">{t('picker.marketHint')}</p>
      </div>
    </aside>
  );
}
