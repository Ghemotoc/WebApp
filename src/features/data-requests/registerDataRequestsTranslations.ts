/**
 * Adds the text of data requests (the "dataRequests" namespace) to the translations when one of
 * this folder's components first renders (bundle ADMIN-2, part c1; story S1-E11-09).
 *
 * Why not with the rest: only Staff › Data requests and one Settings panel use it, so it travels
 * with this folder, as Download my data's does. Who calls it: every component in this folder,
 * through useDataRequestsTranslation().
 */
import type { i18n as I18nInstance } from 'i18next';
import { useTranslation } from 'react-i18next';

import englishDataRequests from '@/locales/en/dataRequests.json';
import romanianDataRequests from '@/locales/ro/dataRequests.json';

/**
 * Registers the texts once; calling it again does nothing.
 *
 * @param i18n - the app's translation instance (from useTranslation())
 */
export function registerDataRequestsTranslations(i18n: I18nInstance): void {
  if (i18n.hasResourceBundle('ro', 'dataRequests')) return;
  i18n.addResourceBundle('ro', 'dataRequests', romanianDataRequests);
  i18n.addResourceBundle('en', 'dataRequests', englishDataRequests);
}

/**
 * The translation hook for this folder: registers the texts first, then reads them.
 *
 * @returns useTranslation('dataRequests')
 */
export function useDataRequestsTranslation() {
  // Step 1: the instance this component renders with (the app's, or a test's).
  const { i18n } = useTranslation();
  // Step 2: add the texts to it the first time a component here renders.
  registerDataRequestsTranslations(i18n);
  // Step 3: the usual helpers for the "dataRequests" namespace.
  return useTranslation('dataRequests');
}
