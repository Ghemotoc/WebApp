/**
 * Adds the website editors' text (the "websiteAdmin" namespace) to the translations when the page
 * first renders (stories S1-E11-06, S1-E11-10 and S1-E11-12). Only owners and admins open it, so
 * its text stays out of the reader's bundle, as the settings namespace does.
 * Who calls it: WebsiteAdminPage, before it renders anything.
 */
import type { i18n as I18nInstance } from 'i18next';

import englishWebsiteAdmin from '@/locales/en/websiteAdmin.json';
import romanianWebsiteAdmin from '@/locales/ro/websiteAdmin.json';

/**
 * Registers the website editors' texts once; calling it again does nothing.
 *
 * @param i18n - the app's translation instance (from useTranslation())
 */
export function registerWebsiteAdminTranslations(i18n: I18nInstance): void {
  if (i18n.hasResourceBundle('ro', 'websiteAdmin')) return;
  i18n.addResourceBundle('ro', 'websiteAdmin', romanianWebsiteAdmin);
  i18n.addResourceBundle('en', 'websiteAdmin', englishWebsiteAdmin);
}
