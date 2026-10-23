/**
 * Adds the moderation screens' text (the "moderation" namespace) to the translations when one of
 * them loads (story S1-E10-03a).
 *
 * Why not with the rest: the admin site is a separate chunk whose code never ships in the
 * reader's bundle (architecture 1.8.1), so its text arrives with it, as the staff namespace does.
 * Who calls it: ModerationQueuePage and CasePage, before they render anything.
 */
import type { i18n as I18nInstance } from 'i18next';

import englishModeration from '@/locales/en/moderation.json';
import romanianModeration from '@/locales/ro/moderation.json';

/**
 * Registers the moderation texts once; calling it again does nothing.
 *
 * @param i18n - the app's translation instance (from useTranslation())
 */
export function registerModerationTranslations(i18n: I18nInstance): void {
  if (i18n.hasResourceBundle('ro', 'moderation')) return;
  i18n.addResourceBundle('ro', 'moderation', romanianModeration);
  i18n.addResourceBundle('en', 'moderation', englishModeration);
}
