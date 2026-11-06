/**
 * Adds the staff forum page's text (the "forumsAdmin" namespace) to the translations when the page
 * first renders (bundle FORUMS-1, part a). Only the owner and admins open it, so its text stays
 * out of the reader's bundle, as the tag queue's does.
 * Who calls it: ForumsAdminPage, before it renders anything.
 */
import { createNamespaceTranslations } from '@/lib/namespace-translations';
import englishForumsAdmin from '@/locales/en/forumsAdmin.json';
import romanianForumsAdmin from '@/locales/ro/forumsAdmin.json';

const forumsAdminTranslations = createNamespaceTranslations(
  'forumsAdmin',
  romanianForumsAdmin,
  englishForumsAdmin,
);

/**
 * Registers the staff forum texts once; calling it again does nothing.
 *
 * @param i18n - the app's translation instance (from useTranslation())
 */
export const registerForumsAdminTranslations = forumsAdminTranslations.register;
