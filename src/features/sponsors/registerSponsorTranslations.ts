/**
 * Adds the text of Staff › Sponsors (the "sponsors" namespace) to the translations when a
 * sponsors screen first renders (story S1-E12-02; bundle SPONSORS-b2).
 *
 * Why not with the rest: only the staff screens need it, so it travels with them. A campaign's
 * own words (its line of text and alt text) are written by staff in both languages and stored
 * with the campaign, never in these files.
 * Who calls it: every component in this folder, through useSponsorTranslation().
 */
import { createNamespaceTranslations } from '@/lib/namespace-translations';
import englishSponsors from '@/locales/en/sponsors.json';
import romanianSponsors from '@/locales/ro/sponsors.json';

const sponsorTranslations = createNamespaceTranslations(
  'sponsors',
  romanianSponsors,
  englishSponsors,
);

/**
 * Registers the texts once; calling it again does nothing.
 *
 * @param i18n - the app's translation instance (from useTranslation())
 */
export const registerSponsorTranslations = sponsorTranslations.register;

/**
 * The translation hook for this folder: registers the texts first, then reads them.
 *
 * @returns useTranslation('sponsors')
 */
export const useSponsorTranslation = sponsorTranslations.useNamespaceTranslation;
