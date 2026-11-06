/**
 * Adds the text of moderator mail (the "mail" namespace) to the translations when a mail page
 * first renders (story S1-E10-11).
 *
 * Why not with the rest: the text is only needed on these pages, so it travels with them, as the
 * statements texts do. Who calls it: every component in this folder, through useMailTranslation().
 */
import { createNamespaceTranslations } from '@/lib/namespace-translations';
import englishMail from '@/locales/en/mail.json';
import romanianMail from '@/locales/ro/mail.json';

const mailTranslations = createNamespaceTranslations('mail', romanianMail, englishMail);

/**
 * Registers the texts once; calling it again does nothing.
 *
 * @param i18n - the app's translation instance (from useTranslation())
 */
export const registerMailTranslations = mailTranslations.register;

/**
 * The translation hook for this folder: registers the texts first, then reads them.
 *
 * @returns useTranslation('mail')
 */
export const useMailTranslation = mailTranslations.useNamespaceTranslation;
