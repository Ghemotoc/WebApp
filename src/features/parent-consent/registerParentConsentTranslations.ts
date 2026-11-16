/**
 * Adds the text of the parental consent screens (the "parentConsent" namespace) to the
 * translations when one of them first renders (bundle TRANSLATE-1b). Only an under-16's consent
 * page, the parent's answer page and Settings show it, so the text stays out of the first page's
 * download and the chapter reader's script budget (S1-E4-01b), as the appearance namespace does.
 * The notice under the top bar (ParentConsentNotice) is on every page, so its few lines stay in
 * account.json ("parentConsent.notice.*" and "parentConsent.withdrawnHeading").
 * Who calls it: the components and hooks of this folder, through the hook.
 * What it calls: src/lib/namespace-translations.ts.
 */
import { createNamespaceTranslations } from '@/lib/namespace-translations';
import englishParentConsent from '@/locales/en/parentConsent.json';
import romanianParentConsent from '@/locales/ro/parentConsent.json';

const parentConsentTranslations = createNamespaceTranslations(
  'parentConsent',
  romanianParentConsent,
  englishParentConsent,
);

/**
 * Registers the parental consent texts once; calling it again does nothing.
 *
 * @param i18n - the app's translation instance (from useTranslation())
 */
export const registerParentConsentTranslations = parentConsentTranslations.register;

/**
 * useTranslation('parentConsent'), after making sure the texts are registered.
 *
 * @returns the usual translation helpers for the parentConsent namespace
 */
export const useParentConsentTranslation = parentConsentTranslations.useNamespaceTranslation;
