/**
 * Adds the search texts (the "search" namespace) to the translations when a search page or the
 * search field first renders (story S1-E5-04).
 *
 * Why not with the rest: the search pages load in their own files, so their texts travel with
 * them and the first page stays small. Same pattern as the discovery texts.
 * Who calls it: every component in src/features/search/components, through useSearchTranslation().
 */
import { createNamespaceTranslations } from '@/lib/namespace-translations';
import englishSearch from '@/locales/en/search.json';
import romanianSearch from '@/locales/ro/search.json';

const searchTranslations = createNamespaceTranslations('search', romanianSearch, englishSearch);

/**
 * Registers the search texts once; calling it again does nothing.
 *
 * @param i18n - the app's translation instance (from useTranslation())
 */
export const registerSearchTranslations = searchTranslations.register;

/**
 * useTranslation('search'), after making sure the search texts are registered.
 *
 * @returns what useTranslation('search') returns: t and the i18n instance
 */
export const useSearchTranslation = searchTranslations.useNamespaceTranslation;
