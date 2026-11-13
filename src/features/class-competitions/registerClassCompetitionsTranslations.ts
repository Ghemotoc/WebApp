/**
 * Adds the text of class competitions (the "classCompetitions" namespace) to the translations
 * when one of its screens first renders (bundle CLASS-POINTS, part 2). Only class spaces show
 * it, so its text stays out of the first page's download and the chapter reader's script budget
 * (S1-E4-01b), as the classPoints namespace does.
 * Who calls it: every component in ./components, through the hook.
 * What it calls: src/lib/namespace-translations.ts.
 */
import { createNamespaceTranslations } from '@/lib/namespace-translations';
import englishClassCompetitions from '@/locales/en/classCompetitions.json';
import romanianClassCompetitions from '@/locales/ro/classCompetitions.json';

const classCompetitionsTranslations = createNamespaceTranslations(
  'classCompetitions',
  romanianClassCompetitions,
  englishClassCompetitions,
);

/**
 * Registers the class competition texts once; calling it again does nothing.
 *
 * @param i18n - the app's translation instance (from useTranslation())
 */
export const registerClassCompetitionsTranslations = classCompetitionsTranslations.register;

/**
 * useTranslation('classCompetitions'), after making sure the texts are registered.
 *
 * @returns the usual translation helpers for the classCompetitions namespace
 */
export const useClassCompetitionsTranslation =
  classCompetitionsTranslations.useNamespaceTranslation;
