/**
 * Adds the text of Settings › Ways to log in (the "loginMethods" namespace) to the translations
 * when the section first renders (bundle CLASS-POINTS, part 1). Only the Settings page shows it,
 * so its text stays out of the first page's download and the chapter reader's script budget
 * (S1-E4-01b; e2e/reader-performance.spec.ts), as the appearance and settings namespaces do.
 * Who calls it: LoginMethodsSection, LoginMethodRow and useLoginMethodRows, through the hook.
 * What it calls: src/lib/namespace-translations.ts.
 */
import { createNamespaceTranslations } from '@/lib/namespace-translations';
import englishLoginMethods from '@/locales/en/loginMethods.json';
import romanianLoginMethods from '@/locales/ro/loginMethods.json';

const loginMethodsTranslations = createNamespaceTranslations(
  'loginMethods',
  romanianLoginMethods,
  englishLoginMethods,
);

/**
 * Registers the texts of Ways to log in once; calling it again does nothing.
 *
 * @param i18n - the app's translation instance (from useTranslation())
 */
export const registerLoginMethodsTranslations = loginMethodsTranslations.register;

/**
 * useTranslation('loginMethods'), after making sure the texts are registered.
 *
 * @returns the usual translation helpers for the loginMethods namespace
 */
export const useLoginMethodsTranslation = loginMethodsTranslations.useNamespaceTranslation;
