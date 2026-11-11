/**
 * Sets up translations: Romanian and English, Romanian first for everyone (story S1-E1-01), plus
 * Swedish, Danish and Norwegian Bokmål once their files land (bundle MARKETS-2, part a).
 *
 * Rule: the interface opens in Romanian whatever the device language, and English is one choice away
 * (decided 17 Oct 2026, 11:48). So there is no browser-language detection here, ever. The language
 * drop-downs and saving the choice to the account live in src/features/language/ (S1-E1-04); main.tsx
 * starts this instance in the language this browser last chose (src/lib/language-preference.ts).
 *
 * Where things come in from: src/locales/<language>/common.json, legal.json (the Legal centre,
 * S1-E14-01) and auth.json (sign-up and sign-in, S1-E2-01), account.json (setup and Settings, S1-E2-04), writing.json (the writer screens, S1-E3-01), reading.json (the story page and reader, S1-E3-05); editor.json (the chapter editor, S1-E3-02a) loads with the editor instead (src/features/writing/registerEditorTranslations.ts); email.json is for the emails only (Auth, S1-E11-19, and notifications, S1-E7-02)
 * (scripts/build-auth-email-templates.ts) (the /design page adds its own
 * design.json when it loads, so production builds never carry it), and the product and company names from
 * src/config/brand.ts, which every translation can use as {{productName}} and {{companyName}}.
 * Where things go: src/app/AppProviders.tsx gives this instance to React; components call
 * `useTranslation()` from react-i18next and then `t('home.welcome')`.
 * The check `npm run i18n:check` (scripts/check-i18n-keys.ts) fails when a key exists in one
 * language and not the other.
 * The Nordic languages (MARKETS-2a): any JSON file in src/locales/sv/, da/ or nb/ is picked up on
 * its own (import.meta.glob), so a translation lands by adding the file. A key that isn't
 * translated yet falls back to English, never to Romanian (the brief: "missing keys fall back to
 * English"). Which languages a person can pick is the languages table's status
 * (useOpenInterfaceLanguages()); a closed language shows in no menu.
 */
import i18next, { type i18n as I18nInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';

import { brand } from '@/config/brand';
import {
  interfaceLanguages,
  isInterfaceLanguage,
  type InterfaceLanguage,
} from '@/schemas/interfaceLanguages';
import englishAccount from '@/locales/en/account.json';
import englishAuth from '@/locales/en/auth.json';
import englishCommon from '@/locales/en/common.json';
import englishLegal from '@/locales/en/legal.json';
import romanianAccount from '@/locales/ro/account.json';
import romanianAuth from '@/locales/ro/auth.json';
import romanianCommon from '@/locales/ro/common.json';
import romanianLegal from '@/locales/ro/legal.json';
// Lane A: writing and reading (S1-E3, S1-E4).
import englishReading from '@/locales/en/reading.json';
import englishWriting from '@/locales/en/writing.json';
import romanianReading from '@/locales/ro/reading.json';
import romanianWriting from '@/locales/ro/writing.json';

/**
 * The languages the interface knows (the one list in src/schemas/interfaceLanguages.ts). Open or
 * not is the database's business; this is every code a translation instance accepts.
 */
export const supportedLanguages = interfaceLanguages;

/** One of the supported language codes. */
export type SupportedLanguage = InterfaceLanguage;

/** Romanian for everyone on the first visit (decided 17 Oct 2026, 11:48). */
export const defaultLanguage: SupportedLanguage = 'ro';

/**
 * Says whether a value is one of the interface languages.
 *
 * @param value - anything: a stored value, a database column, a drop-down value
 * @returns true for en, ro, sv, da or nb
 */
export function isSupportedLanguage(value: unknown): value is SupportedLanguage {
  return isInterfaceLanguage(value);
}

/** The Nordic translation files, found at build time; none until the MARKETS thread sends them. */
const nordicFiles = import.meta.glob<{ default: Record<string, unknown> }>(
  '../locales/{sv,da,nb}/*.json',
  { eager: true },
);

/**
 * Groups the Nordic translation files by language and namespace, the shape i18next wants.
 *
 * @returns for example { sv: { common: {...} } }; an empty object while no file exists
 */
function nordicTranslations(): Record<string, Record<string, Record<string, unknown>>> {
  const grouped: Record<string, Record<string, Record<string, unknown>>> = {};
  for (const [path, file] of Object.entries(nordicFiles)) {
    // Step 1: "../locales/sv/common.json" gives the language "sv" and the namespace "common".
    const match = /\/locales\/([a-z]+)\/([a-z-]+)\.json$/.exec(path);
    const language = match?.[1];
    const namespace = match?.[2];
    if (language === undefined || namespace === undefined) continue;
    // Step 2: add it under its language.
    grouped[language] = { ...grouped[language], [namespace]: file.default };
  }
  return grouped;
}

/** All translations, grouped by language and then by namespace (one JSON file per namespace). */
const translations = {
  ro: {
    common: romanianCommon,
    legal: romanianLegal,
    auth: romanianAuth,
    account: romanianAccount,
    writing: romanianWriting,
    reading: romanianReading,
  },
  en: {
    common: englishCommon,
    legal: englishLegal,
    auth: englishAuth,
    account: englishAccount,
    writing: englishWriting,
    reading: englishReading,
  },
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
    resources: { ...nordicTranslations(), ...translations },
    lng: language,
    // Romanian and English fall back to Romanian, as before; a Nordic key not translated yet reads
    // in English (MARKETS-2a), then Romanian as the last resort.
    fallbackLng: { sv: ['en'], da: ['en'], nb: ['en'], default: [defaultLanguage] },
    supportedLngs: [...supportedLanguages],
    defaultNS: 'common',
    ns: ['common', 'legal', 'auth', 'account'],
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
