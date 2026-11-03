/**
 * Adds the text of landing pages (the "landingPages" namespace) to the translations when a
 * landing page or its editor first renders (story S1-E11-14; bundle CONTESTS-13a1).
 *
 * Why not with the rest: only /c/<slug> and Staff › Website › Landing pages need it, so it
 * travels with them. The page's own words come from the CMS, never from these files (decided
 * 17 Oct 2026, 19:14); these hold only the interface around them ("Key dates", "This contest has
 * ended"). Who calls it: every component in this folder, through useLandingPageTranslation().
 */
import type { i18n as I18nInstance } from 'i18next';
import { useTranslation } from 'react-i18next';

import englishLandingPages from '@/locales/en/landingPages.json';
import romanianLandingPages from '@/locales/ro/landingPages.json';

/**
 * Registers the texts once; calling it again does nothing.
 *
 * @param i18n - the app's translation instance (from useTranslation())
 */
export function registerLandingPageTranslations(i18n: I18nInstance): void {
  if (i18n.hasResourceBundle('ro', 'landingPages')) return;
  i18n.addResourceBundle('ro', 'landingPages', romanianLandingPages);
  i18n.addResourceBundle('en', 'landingPages', englishLandingPages);
}

/**
 * The translation hook for this folder: registers the texts first, then reads them.
 *
 * @returns useTranslation('landingPages')
 */
export function useLandingPageTranslation() {
  const { i18n } = useTranslation();
  registerLandingPageTranslations(i18n);
  return useTranslation('landingPages');
}
