/**
 * Adds the space texts (the "spaces" namespace) to the translations when a space component first
 * renders (bundle FORUMS-2, part a; story S1-E8-06).
 *
 * Why not with the rest: the space pages load in their own files when someone opens them, so
 * their texts travel with them and the first page stays small (the same pattern as the forums).
 * Who calls it: every component in src/features/spaces/components, through
 * useSpacesTranslation().
 */
import type { i18n as I18nInstance } from 'i18next';
import { useTranslation } from 'react-i18next';

import englishSpaces from '@/locales/en/spaces.json';
import romanianSpaces from '@/locales/ro/spaces.json';

/**
 * Registers the space texts once; calling it again does nothing.
 *
 * @param i18n - the app's translation instance (from useTranslation())
 */
export function registerSpacesTranslations(i18n: I18nInstance): void {
  if (i18n.hasResourceBundle('ro', 'spaces')) return;
  i18n.addResourceBundle('ro', 'spaces', romanianSpaces);
  i18n.addResourceBundle('en', 'spaces', englishSpaces);
}

/**
 * useTranslation('spaces'), after making sure the space texts are registered.
 *
 * @returns what useTranslation('spaces') returns: t and the i18n instance
 */
export function useSpacesTranslation() {
  // Step 1: the instance this component renders with (the app's, or a test's).
  const { i18n } = useTranslation();
  // Step 2: add the space texts to it the first time any space component renders.
  registerSpacesTranslations(i18n);
  // Step 3: hand back the usual translation helpers for the "spaces" namespace.
  return useTranslation('spaces');
}
