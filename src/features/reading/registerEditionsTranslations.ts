/**
 * Adds the text about a story's languages (the "editions" namespace: the "Read in" switch, the
 * note and "About this edition" on the story page, the screen for a chapter not translated yet)
 * to the translations when one of those first renders (bundle TRANSLATE-1b). Only a story in
 * several languages shows them, so the text stays out of the first page's download and the
 * chapter reader's script budget (S1-E4-01b), as the appearance namespace does. The one line the
 * reader's header needs ("Translated from … by …") stays in reading.json.
 * Who calls it: ReadInSwitch, StoryLanguageNote, StoryChapterList and MissingTranslationNotice,
 * through the hook.
 * What it calls: src/lib/namespace-translations.ts.
 */
import { createNamespaceTranslations } from '@/lib/namespace-translations';
import englishEditions from '@/locales/en/editions.json';
import romanianEditions from '@/locales/ro/editions.json';

const editionsTranslations = createNamespaceTranslations(
  'editions',
  romanianEditions,
  englishEditions,
);

/**
 * Registers the editions texts once; calling it again does nothing.
 *
 * @param i18n - the app's translation instance (from useTranslation())
 */
export const registerEditionsTranslations = editionsTranslations.register;

/**
 * useTranslation('editions'), after making sure the texts are registered.
 *
 * @returns the usual translation helpers for the editions namespace
 */
export const useEditionsTranslation = editionsTranslations.useNamespaceTranslation;
