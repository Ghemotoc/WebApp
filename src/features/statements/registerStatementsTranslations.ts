/**
 * Adds the text of "My reports and decisions" (the "statements" namespace) to the translations
 * when the page first renders (story S1-E10-04).
 *
 * Why not with the rest: the text is only needed on that page, so it travels with it, as the
 * notifications texts do. Who calls it: every component in this folder, through
 * useStatementsTranslation().
 */
import type { i18n as I18nInstance } from 'i18next';
import { useTranslation } from 'react-i18next';

import englishStatements from '@/locales/en/statements.json';
import romanianStatements from '@/locales/ro/statements.json';

/**
 * Registers the texts once; calling it again does nothing.
 *
 * @param i18n - the app's translation instance (from useTranslation())
 */
export function registerStatementsTranslations(i18n: I18nInstance): void {
  if (i18n.hasResourceBundle('ro', 'statements')) return;
  i18n.addResourceBundle('ro', 'statements', romanianStatements);
  i18n.addResourceBundle('en', 'statements', englishStatements);
}

/**
 * The translation hook for this folder: registers the texts first, then reads them.
 *
 * @returns useTranslation('statements')
 */
export function useStatementsTranslation() {
  // Step 1: the instance this component renders with (the app's, or a test's).
  const { i18n } = useTranslation();
  // Step 2: add the texts to it the first time a component here renders.
  registerStatementsTranslations(i18n);
  // Step 3: the usual helpers for the "statements" namespace.
  return useTranslation('statements');
}
