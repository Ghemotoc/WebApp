/**
 * Adds the website editors' text (the "websiteAdmin" namespace) to the translations when the page
 * first renders (stories S1-E11-06, S1-E11-10 and S1-E11-12). Only owners and admins open it, so
 * its text stays out of the reader's bundle, as the settings namespace does.
 * Who calls it: WebsiteAdminPage, before it renders anything.
 */
import { createNamespaceTranslations } from '@/lib/namespace-translations';
import englishWebsiteAdmin from '@/locales/en/websiteAdmin.json';
import romanianWebsiteAdmin from '@/locales/ro/websiteAdmin.json';

const websiteAdminTranslations = createNamespaceTranslations(
  'websiteAdmin',
  romanianWebsiteAdmin,
  englishWebsiteAdmin,
);

/**
 * Registers the website editors' texts once; calling it again does nothing.
 *
 * @param i18n - the app's translation instance (from useTranslation())
 */
export const registerWebsiteAdminTranslations = websiteAdminTranslations.register;
