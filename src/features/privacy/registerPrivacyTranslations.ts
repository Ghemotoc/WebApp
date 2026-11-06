/**
 * Adds the text of privacy settings and online status (the "privacy" namespace) to the
 * translations when one of this folder's components first renders (story S1-E13-01).
 *
 * Why not with the rest: the text is only needed on Settings, the Library and next to names, so
 * it travels with them, as Messages' does. Who calls it: every component in this folder, through
 * usePrivacyTranslation().
 */
import { createNamespaceTranslations } from '@/lib/namespace-translations';
import englishPrivacy from '@/locales/en/privacy.json';
import romanianPrivacy from '@/locales/ro/privacy.json';

const privacyTranslations = createNamespaceTranslations('privacy', romanianPrivacy, englishPrivacy);

/**
 * Registers the texts once; calling it again does nothing.
 *
 * @param i18n - the app's translation instance (from useTranslation())
 */
export const registerPrivacyTranslations = privacyTranslations.register;

/**
 * The translation hook for this folder: registers the texts first, then reads them.
 *
 * @returns useTranslation('privacy')
 */
export const usePrivacyTranslation = privacyTranslations.useNamespaceTranslation;
