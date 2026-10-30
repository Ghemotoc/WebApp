/**
 * Adds the tag queue's text (the "tagsAdmin" namespace) to the translations when the page first
 * renders (CMS-1e). Only the moderation team opens it, so its text stays out of the reader's
 * bundle, as the website editors' does.
 * Who calls it: TagsAdminPage, before it renders anything.
 */
import type { i18n as I18nInstance } from 'i18next';

import englishTagsAdmin from '@/locales/en/tagsAdmin.json';
import romanianTagsAdmin from '@/locales/ro/tagsAdmin.json';

/**
 * Registers the tag queue's texts once; calling it again does nothing.
 *
 * @param i18n - the app's translation instance (from useTranslation())
 */
export function registerTagsAdminTranslations(i18n: I18nInstance): void {
  if (i18n.hasResourceBundle('ro', 'tagsAdmin')) return;
  i18n.addResourceBundle('ro', 'tagsAdmin', romanianTagsAdmin);
  i18n.addResourceBundle('en', 'tagsAdmin', englishTagsAdmin);
}
