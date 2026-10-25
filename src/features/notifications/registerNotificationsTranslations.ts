/**
 * Adds the notifications text (the "notifications" namespace) to the translations when the
 * Notifications page first renders (story S1-E7-01).
 *
 * Why not with the rest: the page loads only when opened, so its text stays out of every other
 * page's first download. The bell's own label lives in common.json (nav.notifications), because
 * the bell is in the top bar on every page. Same pattern as the comments and people texts.
 * Who calls it: every component in src/features/notifications/components, through
 * useNotificationsTranslation().
 */
import type { i18n as I18nInstance } from 'i18next';
import { useTranslation } from 'react-i18next';

import englishNotifications from '@/locales/en/notifications.json';
import romanianNotifications from '@/locales/ro/notifications.json';

/**
 * Registers the notifications texts once; calling it again does nothing.
 *
 * @param i18n - the app's translation instance (from useTranslation())
 */
export function registerNotificationsTranslations(i18n: I18nInstance): void {
  if (i18n.hasResourceBundle('ro', 'notifications')) return;
  i18n.addResourceBundle('ro', 'notifications', romanianNotifications);
  i18n.addResourceBundle('en', 'notifications', englishNotifications);
}

/**
 * useTranslation('notifications'), after making sure the texts are registered.
 *
 * @returns what useTranslation('notifications') returns: t and the i18n instance
 */
export function useNotificationsTranslation() {
  // Step 1: the instance this component renders with (the app's, or a test's).
  const { i18n } = useTranslation();
  // Step 2: add the notifications texts to it the first time a notifications component renders.
  registerNotificationsTranslations(i18n);
  // Step 3: hand back the usual translation helpers for the "notifications" namespace.
  return useTranslation('notifications');
}
