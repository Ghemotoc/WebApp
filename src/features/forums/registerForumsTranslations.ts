/**
 * Adds the forum texts (the "forums" namespace) to the translations when a forum component first
 * renders (bundle FORUMS-1, part a).
 *
 * Why not with the rest: the forum pages load in their own files when someone opens them, so
 * their texts travel with them and the first page stays small. Same pattern as the library texts.
 * Who calls it: every component in src/features/forums/components, through
 * useForumsTranslation().
 */
import type { i18n as I18nInstance } from 'i18next';
import { useTranslation } from 'react-i18next';

import englishForums from '@/locales/en/forums.json';
import romanianForums from '@/locales/ro/forums.json';

/**
 * Registers the forum texts once; calling it again does nothing.
 *
 * @param i18n - the app's translation instance (from useTranslation())
 */
export function registerForumsTranslations(i18n: I18nInstance): void {
  if (i18n.hasResourceBundle('ro', 'forums')) return;
  i18n.addResourceBundle('ro', 'forums', romanianForums);
  i18n.addResourceBundle('en', 'forums', englishForums);
}

/**
 * useTranslation('forums'), after making sure the forum texts are registered.
 *
 * @returns what useTranslation('forums') returns: t and the i18n instance
 */
export function useForumsTranslation() {
  // Step 1: the instance this component renders with (the app's, or a test's).
  const { i18n } = useTranslation();
  // Step 2: add the forum texts to it the first time any forum component renders.
  registerForumsTranslations(i18n);
  // Step 3: hand back the usual translation helpers for the "forums" namespace.
  return useTranslation('forums');
}
