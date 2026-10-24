/**
 * Adds the public report form's text (the "notices" namespace) to the translations when /report
 * first renders (story S1-E10-02).
 *
 * Why not with the rest: the text is only needed on that page, so it travels with it, as the
 * contact and reporting texts do. Who calls it: NoticePage, before it renders anything.
 */
import type { i18n as I18nInstance } from 'i18next';

import englishNotices from '@/locales/en/notices.json';
import romanianNotices from '@/locales/ro/notices.json';

/**
 * Registers the notice texts once; calling it again does nothing.
 *
 * @param i18n - the app's translation instance (from useTranslation())
 */
export function registerNoticeTranslations(i18n: I18nInstance): void {
  if (i18n.hasResourceBundle('ro', 'notices')) return;
  i18n.addResourceBundle('ro', 'notices', romanianNotices);
  i18n.addResourceBundle('en', 'notices', englishNotices);
}
