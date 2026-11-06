/**
 * Adds the Contact us page's text (the "contact" namespace) to the translations when the page
 * loads (story S1-E14-04).
 *
 * Why not with the rest: the page is loaded only when someone opens it, so its text travels with
 * it, as the staff and reporting namespaces do.
 * Who calls it: ContactPage, before it renders anything.
 */
import { createNamespaceTranslations } from '@/lib/namespace-translations';
import englishContact from '@/locales/en/contact.json';
import romanianContact from '@/locales/ro/contact.json';

const contactTranslations = createNamespaceTranslations('contact', romanianContact, englishContact);

/**
 * Registers the contact texts once; calling it again does nothing.
 *
 * @param i18n - the app's translation instance (from useTranslation())
 */
export const registerContactTranslations = contactTranslations.register;
