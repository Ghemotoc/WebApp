/**
 * Adds the text of support tickets (the "support" namespace) to the translations when a support
 * page first renders (story S1-E11-13; bundle ADMIN-2h1).
 *
 * Why not with the rest: the text is only needed on these pages and the Settings card, so it
 * travels with them, as moderator mail's does. Who calls it: every component in this folder,
 * through useSupportTranslation().
 */
import { createNamespaceTranslations } from '@/lib/namespace-translations';
import englishSupport from '@/locales/en/support.json';
import romanianSupport from '@/locales/ro/support.json';

const supportTranslations = createNamespaceTranslations('support', romanianSupport, englishSupport);

/**
 * Registers the texts once; calling it again does nothing.
 *
 * @param i18n - the app's translation instance (from useTranslation())
 */
export const registerSupportTranslations = supportTranslations.register;

/**
 * The translation hook for this folder: registers the texts first, then reads them.
 *
 * @returns useTranslation('support')
 */
export const useSupportTranslation = supportTranslations.useNamespaceTranslation;
