/**
 * Adds the text of Download my data and its Word files (the "dataExport" namespace) to the
 * translations when one of this folder's components first renders (story S1-E13-02).
 *
 * Why not with the rest: the text is only needed on Settings, so it travels with this folder, as
 * Privacy's does. Who calls it: every component and hook in this folder, through
 * useDataExportTranslation().
 */
import { createNamespaceTranslations } from '@/lib/namespace-translations';
import englishDataExport from '@/locales/en/dataExport.json';
import romanianDataExport from '@/locales/ro/dataExport.json';

const dataExportTranslations = createNamespaceTranslations(
  'dataExport',
  romanianDataExport,
  englishDataExport,
);

/**
 * Registers the texts once; calling it again does nothing.
 *
 * @param i18n - the app's translation instance (from useTranslation())
 */
export const registerDataExportTranslations = dataExportTranslations.register;

/**
 * The translation hook for this folder: registers the texts first, then reads them.
 *
 * @returns useTranslation('dataExport')
 */
export const useDataExportTranslation = dataExportTranslations.useNamespaceTranslation;
