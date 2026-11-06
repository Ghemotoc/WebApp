/**
 * Adds the certificate texts (the "certificates" namespace) to the translations when a
 * certificate component first renders (bundle CLASSES, part e; story S1-E8-12).
 *
 * Why not with the rest: the certificate pages load in their own files when someone opens them, so
 * their texts travel with them and the first page stays small (the same pattern as spaces).
 * Who calls it: every component in src/features/certificates/components and the staff
 * Certificates tab, through useCertificatesTranslation().
 */
import { createNamespaceTranslations } from '@/lib/namespace-translations';
import englishCertificates from '@/locales/en/certificates.json';
import romanianCertificates from '@/locales/ro/certificates.json';

const certificatesTranslations = createNamespaceTranslations(
  'certificates',
  romanianCertificates,
  englishCertificates,
);

/**
 * Registers the certificate texts once; calling it again does nothing.
 *
 * @param i18n - the app's translation instance (from useTranslation())
 */
export const registerCertificatesTranslations = certificatesTranslations.register;

/**
 * useTranslation('certificates'), after making sure the certificate texts are registered.
 *
 * @returns what useTranslation('certificates') returns: t and the i18n instance
 */
export const useCertificatesTranslation = certificatesTranslations.useNamespaceTranslation;
