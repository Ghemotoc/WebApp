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
import { createNamespaceTranslations } from '@/lib/namespace-translations';
import englishNotifications from '@/locales/en/notifications.json';
import romanianNotifications from '@/locales/ro/notifications.json';

const notificationsTranslations = createNamespaceTranslations(
  'notifications',
  romanianNotifications,
  englishNotifications,
);

/**
 * Registers the notifications texts once; calling it again does nothing.
 *
 * @param i18n - the app's translation instance (from useTranslation())
 */
export const registerNotificationsTranslations = notificationsTranslations.register;

/**
 * useTranslation('notifications'), after making sure the texts are registered.
 *
 * @returns what useTranslation('notifications') returns: t and the i18n instance
 */
export const useNotificationsTranslation = notificationsTranslations.useNamespaceTranslation;
