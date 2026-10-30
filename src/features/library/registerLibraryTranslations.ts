/**
 * Adds the Library texts (the "library" namespace) to the translations when a library component
 * first renders (story S1-E4-03).
 *
 * Why not with the rest: the Library page loads in its own file when the reader opens it, so its
 * texts travel with it and the first page stays small. Same pattern as the discovery and people
 * texts.
 * Who calls it: every component in src/features/library/components, through
 * useLibraryTranslation().
 */
import type { i18n as I18nInstance } from 'i18next';
import { useTranslation } from 'react-i18next';

import englishLibrary from '@/locales/en/library.json';
import romanianLibrary from '@/locales/ro/library.json';

/**
 * Registers the library texts once; calling it again does nothing.
 *
 * @param i18n - the app's translation instance (from useTranslation())
 */
export function registerLibraryTranslations(i18n: I18nInstance): void {
  if (i18n.hasResourceBundle('ro', 'library')) return;
  i18n.addResourceBundle('ro', 'library', romanianLibrary);
  i18n.addResourceBundle('en', 'library', englishLibrary);
}

/**
 * useTranslation('library'), after making sure the library texts are registered.
 *
 * @returns what useTranslation('library') returns: t and the i18n instance
 */
export function useLibraryTranslation() {
  // Step 1: the instance this component renders with (the app's, or a test's).
  const { i18n } = useTranslation();
  // Step 2: add the library texts to it the first time any library component renders.
  registerLibraryTranslations(i18n);
  // Step 3: hand back the usual translation helpers for the "library" namespace.
  return useTranslation('library');
}
