/**
 * Adds the text of Staff › Sponsors (the "sponsors" namespace) to the translations when a
 * sponsors screen first renders (story S1-E12-02; bundle SPONSORS-b2).
 *
 * Why not with the rest: only the staff screens need it, so it travels with them. A campaign's
 * own words (its line of text and alt text) are written by staff in both languages and stored
 * with the campaign, never in these files.
 * Who calls it: every component in this folder, through useSponsorTranslation().
 */
import type { i18n as I18nInstance } from 'i18next';
import { useTranslation } from 'react-i18next';

import englishSponsors from '@/locales/en/sponsors.json';
import romanianSponsors from '@/locales/ro/sponsors.json';

/**
 * Registers the texts once; calling it again does nothing.
 *
 * @param i18n - the app's translation instance (from useTranslation())
 */
export function registerSponsorTranslations(i18n: I18nInstance): void {
  if (i18n.hasResourceBundle('ro', 'sponsors')) return;
  i18n.addResourceBundle('ro', 'sponsors', romanianSponsors);
  i18n.addResourceBundle('en', 'sponsors', englishSponsors);
}

/**
 * The translation hook for this folder: registers the texts first, then reads them.
 *
 * @returns useTranslation('sponsors')
 */
export function useSponsorTranslation() {
  const { i18n } = useTranslation();
  registerSponsorTranslations(i18n);
  return useTranslation('sponsors');
}
