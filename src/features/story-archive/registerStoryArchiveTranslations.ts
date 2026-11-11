/**
 * Adds the text of Archived stories (the "storyArchive" namespace) to the translations when one
 * of this folder's components first renders (bundle ARCHIVE-1).
 *
 * Why not with the rest: the text is needed only in Settings, so it travels with this folder.
 * Who calls it: every component in this folder, through useStoryArchiveTranslation().
 */
import { createNamespaceTranslations } from '@/lib/namespace-translations';
import englishStoryArchive from '@/locales/en/storyArchive.json';
import romanianStoryArchive from '@/locales/ro/storyArchive.json';

const storyArchiveTranslations = createNamespaceTranslations(
  'storyArchive',
  romanianStoryArchive,
  englishStoryArchive,
);

/**
 * Registers the texts once; calling it again does nothing.
 *
 * @param i18n - the app's translation instance (from useTranslation())
 */
export const registerStoryArchiveTranslations = storyArchiveTranslations.register;

/**
 * The translation hook for this folder: registers the texts first, then reads them.
 *
 * @returns useTranslation('storyArchive')
 */
export const useStoryArchiveTranslation = storyArchiveTranslations.useNamespaceTranslation;
