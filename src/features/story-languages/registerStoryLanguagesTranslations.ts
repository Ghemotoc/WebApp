/**
 * Adds the text of the writer's Languages screens (the "storyLanguages" namespace) to the
 * translations when one of them first renders (bundle TRANSLATE-1c). Only those screens show it,
 * so the text stays out of the first page's download (S1-E4-01b, the reader's script budget).
 * Who calls it: the components of this folder, through the hook.
 * What it calls: src/lib/namespace-translations.ts.
 */
import { createNamespaceTranslations } from '@/lib/namespace-translations';
import englishStoryLanguages from '@/locales/en/storyLanguages.json';
import romanianStoryLanguages from '@/locales/ro/storyLanguages.json';

const storyLanguagesTranslations = createNamespaceTranslations(
  'storyLanguages',
  romanianStoryLanguages,
  englishStoryLanguages,
);

/**
 * Registers the texts once; calling it again does nothing.
 *
 * @param i18n - the app's translation instance (from useTranslation())
 */
export const registerStoryLanguagesTranslations = storyLanguagesTranslations.register;

/**
 * useTranslation('storyLanguages'), after making sure the texts are registered.
 *
 * @returns the usual translation helpers for the storyLanguages namespace
 */
export const useStoryLanguagesTranslation = storyLanguagesTranslations.useNamespaceTranslation;
