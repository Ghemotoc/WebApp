/**
 * Sets up translations: Romanian and English, Romanian first for everyone (story S1-E1-01).
 *
 * Rule: the interface opens in Romanian whatever the device language, and English is one choice away
 * (decided 17 Oct 2026, 11:48). So there is no browser-language detection here, ever. The language
 * drop-downs and saving the choice to the account live in src/features/language/ (S1-E1-04); main.tsx
 * starts this instance in the language this browser last chose (src/lib/language-preference.ts).
 *
 * Where things come in from: src/locales/<language>/common.json (the /design page adds its own
 * design.json when it loads, so production builds never carry it), and the product and company names from
 * src/config/brand.ts, which every translation can use as {{productName}} and {{companyName}}.
 * Where things go: src/app/AppProviders.tsx gives this instance to React; components call
 * `useTranslation()` from react-i18next and then `t('home.welcome')`.
 * The check `npm run i18n:check` (scripts/check-i18n-keys.ts) fails when a key exists in one
 * language and not the other.
 */
import i18next, { type i18n as I18nInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';

import { brand } from '@/config/brand';
import englishCommon from '@/locales/en/common.json';
import romanianCommon from '@/locales/ro/common.json';

/** The languages the interface is available in. Romanian comes first. */
export const supportedLanguages = ['ro', 'en'] as const;

/** One of the supported language codes. */
export type SupportedLanguage = (typeof supportedLanguages)[number];

/** Romanian for everyone on the first visit (decided 17 Oct 2026, 11:48). */
export const defaultLanguage: SupportedLanguage = 'ro';

/**
 * Says whether a value is one of the interface languages.
 *
 * @param value - anything: a stored value, a database column, a drop-down value
 * @returns true for 'ro' or 'en'
 */
export function isSupportedLanguage(value: unknown): value is SupportedLanguage {
  return supportedLanguages.includes(value as SupportedLanguage);
}

/** All translations, grouped by language and then by namespace (one JSON file per namespace). */
const translations = {
  ro: { common: romanianCommon },
  en: { common: englishCommon },
};

/**
 * Creates and starts a translation instance.
 *
 * @param language - the language to start in; defaults to Romanian
 * @returns a ready instance. Resources are bundled, so initialisation finishes synchronously and the
 *   first render already has the right text (no flash of translation keys).
 * Errors: none expected; i18next logs a warning for a missing key rather than throwing.
 */
export function createI18n(language: SupportedLanguage = defaultLanguage): I18nInstance {
  // A fresh instance, so tests can render in English without changing the app's language.
  const instance = i18next.createInstance();

  // Connect it to React and start it with the bundled translations.
  void instance.use(initReactI18next).init({
    resources: translations,
    lng: language,
    fallbackLng: defaultLanguage,
    supportedLngs: supportedLanguages,
    defaultNS: 'common',
    ns: ['common'],
    initAsync: false,
    interpolation: {
      // React already escapes text it renders, so i18next must not escape it a second time.
      escapeValue: false,
      // {{productName}} and {{companyName}} are filled in from the brand config in every string.
      defaultVariables: { productName: brand.productName, companyName: brand.companyName },
    },
  });

  return instance;
}

/**
 * Keeps <html lang="..."> in step with the interface language, so screen readers pronounce the
 * text correctly (WCAG 2.2, 3.1.1 Language of page).
 *
 * @param instance - the translation instance to follow
 */
export function syncDocumentLanguage(instance: I18nInstance): void {
  // Set it once now, then again every time the language changes.
  document.documentElement.lang = instance.language;
  instance.on('languageChanged', (language) => {
    document.documentElement.lang = language;
  });
}
