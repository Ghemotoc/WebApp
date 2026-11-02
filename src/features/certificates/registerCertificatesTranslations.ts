/**
 * Adds the certificate texts (the "certificates" namespace) to the translations when a
 * certificate component first renders (bundle CLASSES, part e; story S1-E8-12).
 *
 * Why not with the rest: the certificate pages load in their own files when someone opens them, so
 * their texts travel with them and the first page stays small (the same pattern as spaces).
 * Who calls it: every component in src/features/certificates/components and the staff
 * Certificates tab, through useCertificatesTranslation().
 */
import type { i18n as I18nInstance } from 'i18next';
import { useTranslation } from 'react-i18next';

import englishCertificates from '@/locales/en/certificates.json';
import romanianCertificates from '@/locales/ro/certificates.json';

/**
 * Registers the certificate texts once; calling it again does nothing.
 *
 * @param i18n - the app's translation instance (from useTranslation())
 */
export function registerCertificatesTranslations(i18n: I18nInstance): void {
  if (i18n.hasResourceBundle('ro', 'certificates')) return;
  i18n.addResourceBundle('ro', 'certificates', romanianCertificates);
  i18n.addResourceBundle('en', 'certificates', englishCertificates);
}

/**
 * useTranslation('certificates'), after making sure the certificate texts are registered.
 *
 * @returns what useTranslation('certificates') returns: t and the i18n instance
 */
export function useCertificatesTranslation() {
  // Step 1: the instance this component renders with (the app's, or a test's).
  const { i18n } = useTranslation();
  // Step 2: add the certificate texts to it the first time any space component renders.
  registerCertificatesTranslations(i18n);
  // Step 3: hand back the usual translation helpers for the "certificates" namespace.
  return useTranslation('certificates');
}
