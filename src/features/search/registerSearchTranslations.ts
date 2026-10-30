/**
 * Adds the search texts (the "search" namespace) to the translations when a search page or the
 * search field first renders (story S1-E5-04).
 *
 * Why not with the rest: the search pages load in their own files, so their texts travel with
 * them and the first page stays small. Same pattern as the discovery texts.
 * Who calls it: every component in src/features/search/components, through useSearchTranslation().
 */
import type { i18n as I18nInstance } from 'i18next';
import { useTranslation } from 'react-i18next';

import englishSearch from '@/locales/en/search.json';
import romanianSearch from '@/locales/ro/search.json';

/**
 * Registers the search texts once; calling it again does nothing.
 *
 * @param i18n - the app's translation instance (from useTranslation())
 */
export function registerSearchTranslations(i18n: I18nInstance): void {
  if (i18n.hasResourceBundle('ro', 'search')) return;
  i18n.addResourceBundle('ro', 'search', romanianSearch);
  i18n.addResourceBundle('en', 'search', englishSearch);
}

/**
 * useTranslation('search'), after making sure the search texts are registered.
 *
 * @returns what useTranslation('search') returns: t and the i18n instance
 */
export function useSearchTranslation() {
  // Step 1: the instance this component renders with (the app's, or a test's).
  const { i18n } = useTranslation();
  // Step 2: add the search texts the first time any search component renders.
  registerSearchTranslations(i18n);
  // Step 3: the usual helpers for the "search" namespace.
  return useTranslation('search');
}
