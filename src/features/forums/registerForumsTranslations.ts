/**
 * Adds the forum texts (the "forums" namespace) to the translations when a forum component first
 * renders (bundle FORUMS-1, part a).
 *
 * Why not with the rest: the forum pages load in their own files when someone opens them, so
 * their texts travel with them and the first page stays small. Same pattern as the library texts.
 * Who calls it: every component in src/features/forums/components, through
 * useForumsTranslation().
 */
import { createNamespaceTranslations } from '@/lib/namespace-translations';
import englishForums from '@/locales/en/forums.json';
import romanianForums from '@/locales/ro/forums.json';

const forumsTranslations = createNamespaceTranslations('forums', romanianForums, englishForums);

/**
 * Registers the forum texts once; calling it again does nothing.
 *
 * @param i18n - the app's translation instance (from useTranslation())
 */
export const registerForumsTranslations = forumsTranslations.register;

/**
 * useTranslation('forums'), after making sure the forum texts are registered.
 *
 * @returns what useTranslation('forums') returns: t and the i18n instance
 */
export const useForumsTranslation = forumsTranslations.useNamespaceTranslation;
