/**
 * Adds the settings screen's text (the "settings" namespace) to the translations when the page
 * first renders (story S1-E11-03). Only owners and admins open it, so its text stays out of the
 * reader's bundle, as the safety and reporting namespaces do.
 * Who calls it: SettingsPage, before it renders anything.
 */
import { createNamespaceTranslations } from '@/lib/namespace-translations';
import englishSettings from '@/locales/en/settings.json';
import romanianSettings from '@/locales/ro/settings.json';

const settingsTranslations = createNamespaceTranslations(
  'settings',
  romanianSettings,
  englishSettings,
);

/**
 * Registers the settings texts once; calling it again does nothing.
 *
 * @param i18n - the app's translation instance (from useTranslation())
 */
export const registerSettingsTranslations = settingsTranslations.register;
