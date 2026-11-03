/**
 * Adds the text of support tickets (the "support" namespace) to the translations when a support
 * page first renders (story S1-E11-13; bundle ADMIN-2h1).
 *
 * Why not with the rest: the text is only needed on these pages and the Settings card, so it
 * travels with them, as moderator mail's does. Who calls it: every component in this folder,
 * through useSupportTranslation().
 */
import type { i18n as I18nInstance } from 'i18next';
import { useTranslation } from 'react-i18next';

import englishSupport from '@/locales/en/support.json';
import romanianSupport from '@/locales/ro/support.json';

/**
 * Registers the texts once; calling it again does nothing.
 *
 * @param i18n - the app's translation instance (from useTranslation())
 */
export function registerSupportTranslations(i18n: I18nInstance): void {
  if (i18n.hasResourceBundle('ro', 'support')) return;
  i18n.addResourceBundle('ro', 'support', romanianSupport);
  i18n.addResourceBundle('en', 'support', englishSupport);
}

/**
 * The translation hook for this folder: registers the texts first, then reads them.
 *
 * @returns useTranslation('support')
 */
export function useSupportTranslation() {
  // Step 1: the instance this component renders with (the app's, or a test's).
  const { i18n } = useTranslation();
  // Step 2: add the texts to it the first time a component here renders.
  registerSupportTranslations(i18n);
  // Step 3: the usual helpers for the "support" namespace.
  return useTranslation('support');
}
