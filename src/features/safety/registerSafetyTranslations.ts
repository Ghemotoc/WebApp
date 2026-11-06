/**
 * Adds the safety contacts text (the "safety" namespace) to the translations when the block first
 * renders (story S1-E10-13a). The block travels with the report dialog and the contact page, so
 * its text travels with it, as the reporting namespace does.
 * Who calls it: SafetyContactsBlock, before it renders anything.
 */
import { createNamespaceTranslations } from '@/lib/namespace-translations';
import englishSafety from '@/locales/en/safety.json';
import romanianSafety from '@/locales/ro/safety.json';

const safetyTranslations = createNamespaceTranslations('safety', romanianSafety, englishSafety);

/**
 * Registers the safety texts once; calling it again does nothing.
 *
 * @param i18n - the app's translation instance (from useTranslation())
 */
export const registerSafetyTranslations = safetyTranslations.register;
