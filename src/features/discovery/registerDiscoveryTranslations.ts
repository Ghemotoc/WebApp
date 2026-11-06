/**
 * Adds the Discover and story list texts (the "discovery" namespace) to the translations when a
 * discovery page first renders (stories S1-E5-01, S1-E5-09, S1-E5-02).
 *
 * Why not with the rest: the pages are loaded in their own files when the reader opens them, so
 * their texts travel with them and the first page stays small. Same pattern as the people,
 * comments and reporting texts.
 * Who calls it: every component in src/features/discovery/components, through
 * useDiscoveryTranslation().
 */
import { createNamespaceTranslations } from '@/lib/namespace-translations';
import englishDiscovery from '@/locales/en/discovery.json';
import romanianDiscovery from '@/locales/ro/discovery.json';

const discoveryTranslations = createNamespaceTranslations(
  'discovery',
  romanianDiscovery,
  englishDiscovery,
);

/**
 * Registers the discovery texts once; calling it again does nothing.
 *
 * @param i18n - the app's translation instance (from useTranslation())
 */
export const registerDiscoveryTranslations = discoveryTranslations.register;

/**
 * useTranslation('discovery'), after making sure the discovery texts are registered.
 *
 * @returns what useTranslation('discovery') returns: t and the i18n instance
 */
export const useDiscoveryTranslation = discoveryTranslations.useNamespaceTranslation;
