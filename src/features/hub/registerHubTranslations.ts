/**
 * Adds the Writers' hub and Resources text (the "hub" namespace) to the translations when one of
 * the two pages first renders (bundle G9 WRITING, part a).
 *
 * Why not with the rest: both pages load only when opened, so their text stays out of every other
 * page's first download. The Resources link in the account menu lives in common.json
 * (nav.resources), because the menu is on every page. Same pattern as the notifications texts.
 * Who calls it: every component in src/features/hub/components, through useHubTranslation().
 */
import { createNamespaceTranslations } from '@/lib/namespace-translations';
import englishHub from '@/locales/en/hub.json';
import romanianHub from '@/locales/ro/hub.json';

const hubTranslations = createNamespaceTranslations('hub', romanianHub, englishHub);

/**
 * useTranslation('hub'), after making sure the texts are registered.
 *
 * @returns what useTranslation('hub') returns: t and the i18n instance
 */
export const useHubTranslation = hubTranslations.useNamespaceTranslation;
