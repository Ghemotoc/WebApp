/**
 * Adds the text of "Reports and decisions" (the "statements" namespace) to the translations
 * when the page first renders (story S1-E10-04).
 *
 * Why not with the rest: the text is only needed on that page, so it travels with it, as the
 * notifications texts do. Who calls it: every component in this folder, through
 * useStatementsTranslation().
 */
import { createNamespaceTranslations } from '@/lib/namespace-translations';
import englishStatements from '@/locales/en/statements.json';
import romanianStatements from '@/locales/ro/statements.json';

const statementsTranslations = createNamespaceTranslations(
  'statements',
  romanianStatements,
  englishStatements,
);

/**
 * Registers the texts once; calling it again does nothing.
 *
 * @param i18n - the app's translation instance (from useTranslation())
 */
export const registerStatementsTranslations = statementsTranslations.register;

/**
 * The translation hook for this folder: registers the texts first, then reads them.
 *
 * @returns useTranslation('statements')
 */
export const useStatementsTranslation = statementsTranslations.useNamespaceTranslation;
