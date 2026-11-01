/**
 * Adds the staff forum page's text (the "forumsAdmin" namespace) to the translations when the page
 * first renders (bundle FORUMS-1, part a). Only the owner and admins open it, so its text stays
 * out of the reader's bundle, as the tag queue's does.
 * Who calls it: ForumsAdminPage, before it renders anything.
 */
import type { i18n as I18nInstance } from 'i18next';

import englishForumsAdmin from '@/locales/en/forumsAdmin.json';
import romanianForumsAdmin from '@/locales/ro/forumsAdmin.json';

/**
 * Registers the staff forum texts once; calling it again does nothing.
 *
 * @param i18n - the app's translation instance (from useTranslation())
 */
export function registerForumsAdminTranslations(i18n: I18nInstance): void {
  if (i18n.hasResourceBundle('ro', 'forumsAdmin')) return;
  i18n.addResourceBundle('ro', 'forumsAdmin', romanianForumsAdmin);
  i18n.addResourceBundle('en', 'forumsAdmin', englishForumsAdmin);
}
