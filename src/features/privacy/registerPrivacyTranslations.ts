/**
 * Adds the text of privacy settings and online status (the "privacy" namespace) to the
 * translations when one of this folder's components first renders (story S1-E13-01).
 *
 * Why not with the rest: the text is only needed on Settings, the Library and next to names, so
 * it travels with them, as Messages' does. Who calls it: every component in this folder, through
 * usePrivacyTranslation().
 */
import type { i18n as I18nInstance } from 'i18next';
import { useTranslation } from 'react-i18next';

import englishPrivacy from '@/locales/en/privacy.json';
import romanianPrivacy from '@/locales/ro/privacy.json';

/**
 * Registers the texts once; calling it again does nothing.
 *
 * @param i18n - the app's translation instance (from useTranslation())
 */
export function registerPrivacyTranslations(i18n: I18nInstance): void {
  if (i18n.hasResourceBundle('ro', 'privacy')) return;
  i18n.addResourceBundle('ro', 'privacy', romanianPrivacy);
  i18n.addResourceBundle('en', 'privacy', englishPrivacy);
}

/**
 * The translation hook for this folder: registers the texts first, then reads them.
 *
 * @returns useTranslation('privacy')
 */
export function usePrivacyTranslation() {
  // Step 1: the instance this component renders with (the app's, or a test's).
  const { i18n } = useTranslation();
  // Step 2: add the texts to it the first time a component here renders.
  registerPrivacyTranslations(i18n);
  // Step 3: the usual helpers for the "privacy" namespace.
  return useTranslation('privacy');
}
