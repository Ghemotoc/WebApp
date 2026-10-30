/**
 * Adds the text of moderator mail (the "mail" namespace) to the translations when a mail page
 * first renders (story S1-E10-11).
 *
 * Why not with the rest: the text is only needed on these pages, so it travels with them, as the
 * statements texts do. Who calls it: every component in this folder, through useMailTranslation().
 */
import type { i18n as I18nInstance } from 'i18next';
import { useTranslation } from 'react-i18next';

import englishMail from '@/locales/en/mail.json';
import romanianMail from '@/locales/ro/mail.json';

/**
 * Registers the texts once; calling it again does nothing.
 *
 * @param i18n - the app's translation instance (from useTranslation())
 */
export function registerMailTranslations(i18n: I18nInstance): void {
  if (i18n.hasResourceBundle('ro', 'mail')) return;
  i18n.addResourceBundle('ro', 'mail', romanianMail);
  i18n.addResourceBundle('en', 'mail', englishMail);
}

/**
 * The translation hook for this folder: registers the texts first, then reads them.
 *
 * @returns useTranslation('mail')
 */
export function useMailTranslation() {
  // Step 1: the instance this component renders with (the app's, or a test's).
  const { i18n } = useTranslation();
  // Step 2: add the texts to it the first time a component here renders.
  registerMailTranslations(i18n);
  // Step 3: the usual helpers for the "mail" namespace.
  return useTranslation('mail');
}
