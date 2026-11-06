/**
 * Adds the text of Delete my account (the "accountDeletion" namespace) to the translations when
 * one of this folder's components first renders (story S1-E13-03).
 *
 * Why not with the rest: the text is needed only on Settings, /delete-account and the
 * closing-account page, so it travels with this folder, as Download my data's does. Who calls it:
 * every component and hook in this folder, through useAccountDeletionTranslation().
 */
import { createNamespaceTranslations } from '@/lib/namespace-translations';
import englishAccountDeletion from '@/locales/en/accountDeletion.json';
import romanianAccountDeletion from '@/locales/ro/accountDeletion.json';

const accountDeletionTranslations = createNamespaceTranslations(
  'accountDeletion',
  romanianAccountDeletion,
  englishAccountDeletion,
);

/**
 * Registers the texts once; calling it again does nothing.
 *
 * @param i18n - the app's translation instance (from useTranslation())
 */
export const registerAccountDeletionTranslations = accountDeletionTranslations.register;

/**
 * The translation hook for this folder: registers the texts first, then reads them.
 *
 * @returns useTranslation('accountDeletion')
 */
export const useAccountDeletionTranslation = accountDeletionTranslations.useNamespaceTranslation;
