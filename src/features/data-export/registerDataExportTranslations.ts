/**
 * Adds the text of Download my data and its Word files (the "dataExport" namespace) to the
 * translations when one of this folder's components first renders (story S1-E13-02).
 *
 * Why not with the rest: the text is only needed on Settings, so it travels with this folder, as
 * Privacy's does. Who calls it: every component and hook in this folder, through
 * useDataExportTranslation().
 */
import type { i18n as I18nInstance } from 'i18next';
import { useTranslation } from 'react-i18next';

import englishDataExport from '@/locales/en/dataExport.json';
import romanianDataExport from '@/locales/ro/dataExport.json';

/**
 * Registers the texts once; calling it again does nothing.
 *
 * @param i18n - the app's translation instance (from useTranslation())
 */
export function registerDataExportTranslations(i18n: I18nInstance): void {
  if (i18n.hasResourceBundle('ro', 'dataExport')) return;
  i18n.addResourceBundle('ro', 'dataExport', romanianDataExport);
  i18n.addResourceBundle('en', 'dataExport', englishDataExport);
}

/**
 * The translation hook for this folder: registers the texts first, then reads them.
 *
 * @returns useTranslation('dataExport')
 */
export function useDataExportTranslation() {
  // Step 1: the instance this component renders with (the app's, or a test's).
  const { i18n } = useTranslation();
  // Step 2: add the texts to it the first time a component here renders.
  registerDataExportTranslations(i18n);
  // Step 3: the usual helpers for the "dataExport" namespace.
  return useTranslation('dataExport');
}
