/**
 * Adds the text of data requests (the "dataRequests" namespace) to the translations when one of
 * this folder's components first renders (bundle ADMIN-2, part c1; story S1-E11-09).
 *
 * Why not with the rest: only Staff › Data requests and one Settings panel use it, so it travels
 * with this folder, as Download my data's does. Who calls it: every component in this folder,
 * through useDataRequestsTranslation().
 */
import { createNamespaceTranslations } from '@/lib/namespace-translations';
import englishDataRequests from '@/locales/en/dataRequests.json';
import romanianDataRequests from '@/locales/ro/dataRequests.json';

const dataRequestsTranslations = createNamespaceTranslations(
  'dataRequests',
  romanianDataRequests,
  englishDataRequests,
);

/**
 * Registers the texts once; calling it again does nothing.
 *
 * @param i18n - the app's translation instance (from useTranslation())
 */
export const registerDataRequestsTranslations = dataRequestsTranslations.register;

/**
 * The translation hook for this folder: registers the texts first, then reads them.
 *
 * @returns useTranslation('dataRequests')
 */
export const useDataRequestsTranslation = dataRequestsTranslations.useNamespaceTranslation;
