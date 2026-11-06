/**
 * Adds the text of landing pages (the "landingPages" namespace) to the translations when a
 * landing page or its editor first renders (story S1-E11-14; bundle CONTESTS-13a1).
 *
 * Why not with the rest: only /c/<slug> and Staff › Website › Landing pages need it, so it
 * travels with them. The page's own words come from the CMS, never from these files (decided
 * 17 Oct 2026, 19:14); these hold only the interface around them ("Key dates", "This contest has
 * ended"). Who calls it: every component in this folder, through useLandingPageTranslation().
 */
import { createNamespaceTranslations } from '@/lib/namespace-translations';
import englishLandingPages from '@/locales/en/landingPages.json';
import romanianLandingPages from '@/locales/ro/landingPages.json';

const landingPageTranslations = createNamespaceTranslations(
  'landingPages',
  romanianLandingPages,
  englishLandingPages,
);

/**
 * Registers the texts once; calling it again does nothing.
 *
 * @param i18n - the app's translation instance (from useTranslation())
 */
export const registerLandingPageTranslations = landingPageTranslations.register;

/**
 * The translation hook for this folder: registers the texts first, then reads them.
 *
 * @returns useTranslation('landingPages')
 */
export const useLandingPageTranslation = landingPageTranslations.useNamespaceTranslation;
