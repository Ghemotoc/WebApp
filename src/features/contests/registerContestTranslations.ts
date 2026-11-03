/**
 * Adds the text of contests (the "contests" namespace) to the translations when a contest
 * screen first renders (story S1-E11-15; bundle CONTESTS-13b1).
 *
 * Why not with the rest: only the "Contests" card in a story's settings and Staff › Contests
 * need it, so it travels with them. The contest's own words (its name, prize, what counts) are
 * written by staff in both languages and stored with the contest, never in these files.
 * Who calls it: every component in this folder, through useContestTranslation().
 */
import type { i18n as I18nInstance } from 'i18next';
import { useTranslation } from 'react-i18next';

import englishContests from '@/locales/en/contests.json';
import romanianContests from '@/locales/ro/contests.json';

/**
 * Registers the texts once; calling it again does nothing.
 *
 * @param i18n - the app's translation instance (from useTranslation())
 */
export function registerContestTranslations(i18n: I18nInstance): void {
  if (i18n.hasResourceBundle('ro', 'contests')) return;
  i18n.addResourceBundle('ro', 'contests', romanianContests);
  i18n.addResourceBundle('en', 'contests', englishContests);
}

/**
 * The translation hook for this folder: registers the texts first, then reads them.
 *
 * @returns useTranslation('contests')
 */
export function useContestTranslation() {
  const { i18n } = useTranslation();
  registerContestTranslations(i18n);
  return useTranslation('contests');
}
