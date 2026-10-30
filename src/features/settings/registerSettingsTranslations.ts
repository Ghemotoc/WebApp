/**
 * Adds the settings screen's text (the "settings" namespace) to the translations when the page
 * first renders (story S1-E11-03). Only owners and admins open it, so its text stays out of the
 * reader's bundle, as the safety and reporting namespaces do.
 * Who calls it: SettingsPage, before it renders anything.
 */
import type { i18n as I18nInstance } from 'i18next';

import englishSettings from '@/locales/en/settings.json';
import romanianSettings from '@/locales/ro/settings.json';

/**
 * Registers the settings texts once; calling it again does nothing.
 *
 * @param i18n - the app's translation instance (from useTranslation())
 */
export function registerSettingsTranslations(i18n: I18nInstance): void {
  if (i18n.hasResourceBundle('ro', 'settings')) return;
  i18n.addResourceBundle('ro', 'settings', romanianSettings);
  i18n.addResourceBundle('en', 'settings', englishSettings);
}
