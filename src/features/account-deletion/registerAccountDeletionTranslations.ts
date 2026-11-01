/**
 * Adds the text of Delete my account (the "accountDeletion" namespace) to the translations when
 * one of this folder's components first renders (story S1-E13-03).
 *
 * Why not with the rest: the text is needed only on Settings, /delete-account and the
 * closing-account page, so it travels with this folder, as Download my data's does. Who calls it:
 * every component and hook in this folder, through useAccountDeletionTranslation().
 */
import type { i18n as I18nInstance } from 'i18next';
import { useTranslation } from 'react-i18next';

import englishAccountDeletion from '@/locales/en/accountDeletion.json';
import romanianAccountDeletion from '@/locales/ro/accountDeletion.json';

/**
 * Registers the texts once; calling it again does nothing.
 *
 * @param i18n - the app's translation instance (from useTranslation())
 */
export function registerAccountDeletionTranslations(i18n: I18nInstance): void {
  if (i18n.hasResourceBundle('ro', 'accountDeletion')) return;
  i18n.addResourceBundle('ro', 'accountDeletion', romanianAccountDeletion);
  i18n.addResourceBundle('en', 'accountDeletion', englishAccountDeletion);
}

/**
 * The translation hook for this folder: registers the texts first, then reads them.
 *
 * @returns useTranslation('accountDeletion')
 */
export function useAccountDeletionTranslation() {
  // Step 1: the instance this component renders with (the app's, or a test's).
  const { i18n } = useTranslation();
  // Step 2: add the texts to it the first time a component here renders.
  registerAccountDeletionTranslations(i18n);
  // Step 3: the usual helpers for the "accountDeletion" namespace.
  return useTranslation('accountDeletion');
}
