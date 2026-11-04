/**
 * Adds the text of ads (the "ads" namespace) to the translations when a page with an ad slot
 * first renders (bundle SPONSORS, part a1; story S1-E12-01).
 *
 * Why not with the rest: only public pages with slots need it, so it travels with them. The
 * labels themselves ("Ad", "Sponsored") stay in common.json, because the /design specimens use
 * them too. Who calls it: every component in this folder, through useAdsTranslation().
 */
import type { i18n as I18nInstance } from 'i18next';
import { useTranslation } from 'react-i18next';

import englishAds from '@/locales/en/ads.json';
import romanianAds from '@/locales/ro/ads.json';

/**
 * Registers the texts once; calling it again does nothing.
 *
 * @param i18n - the app's translation instance (from useTranslation())
 */
export function registerAdsTranslations(i18n: I18nInstance): void {
  if (i18n.hasResourceBundle('ro', 'ads')) return;
  i18n.addResourceBundle('ro', 'ads', romanianAds);
  i18n.addResourceBundle('en', 'ads', englishAds);
}

/**
 * The translation hook for this folder: registers the texts first, then reads them.
 *
 * @returns useTranslation('ads')
 */
export function useAdsTranslation() {
  const { i18n } = useTranslation();
  registerAdsTranslations(i18n);
  return useTranslation('ads');
}
