/**
 * Adds the space texts (the "spaces" namespace) to the translations when a space component first
 * renders (bundle FORUMS-2, part a; story S1-E8-06).
 *
 * Why not with the rest: the space pages load in their own files when someone opens them, so
 * their texts travel with them and the first page stays small (the same pattern as the forums).
 * Who calls it: every component in src/features/spaces/components, through
 * useSpacesTranslation().
 */
import { createNamespaceTranslations } from '@/lib/namespace-translations';
import englishSpaces from '@/locales/en/spaces.json';
import romanianSpaces from '@/locales/ro/spaces.json';

const spacesTranslations = createNamespaceTranslations('spaces', romanianSpaces, englishSpaces);

/**
 * Registers the space texts once; calling it again does nothing.
 *
 * @param i18n - the app's translation instance (from useTranslation())
 */
export const registerSpacesTranslations = spacesTranslations.register;

/**
 * useTranslation('spaces'), after making sure the space texts are registered.
 *
 * @returns what useTranslation('spaces') returns: t and the i18n instance
 */
export const useSpacesTranslation = spacesTranslations.useNamespaceTranslation;
