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
import { createNamespaceTranslations } from '@/lib/namespace-translations';
import englishLibrary from '@/locales/en/library.json';
import romanianLibrary from '@/locales/ro/library.json';

const libraryTranslations = createNamespaceTranslations('library', romanianLibrary, englishLibrary);

/**
 * Registers the library texts once; calling it again does nothing.
 *
 * @param i18n - the app's translation instance (from useTranslation())
 */
export const registerLibraryTranslations = libraryTranslations.register;

/**
 * useTranslation('library'), after making sure the library texts are registered.
 *
 * @returns what useTranslation('library') returns: t and the i18n instance
 */
export const useLibraryTranslation = libraryTranslations.useNamespaceTranslation;
