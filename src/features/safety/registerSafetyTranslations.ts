/**
 * Adds the safety contacts text (the "safety" namespace) to the translations when the block first
 * renders (story S1-E10-13a). The block travels with the report dialog and the contact page, so
 * its text travels with it, as the reporting namespace does.
 * Who calls it: SafetyContactsBlock, before it renders anything.
 */
import type { i18n as I18nInstance } from 'i18next';

import englishSafety from '@/locales/en/safety.json';
import romanianSafety from '@/locales/ro/safety.json';

/**
 * Registers the safety texts once; calling it again does nothing.
 *
 * @param i18n - the app's translation instance (from useTranslation())
 */
export function registerSafetyTranslations(i18n: I18nInstance): void {
  if (i18n.hasResourceBundle('ro', 'safety')) return;
  i18n.addResourceBundle('ro', 'safety', romanianSafety);
  i18n.addResourceBundle('en', 'safety', englishSafety);
}
