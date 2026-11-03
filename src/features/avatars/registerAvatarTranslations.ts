/**
 * Adds the avatar builder's text (the "avatars" namespace) when an avatar component first renders
 * (bundle ADMIN-2, part g). Same pattern as registerPeopleTranslations: the many part names are
 * only needed in Settings, so they stay out of the first download every page makes.
 * Who calls it: the components in src/features/avatars/components, through
 * useAvatarsTranslation(). Staff can override the text from the admin site (S1-E11-18).
 */
import type { i18n as I18nInstance } from 'i18next';
import { useTranslation } from 'react-i18next';

import englishAvatars from '@/locales/en/avatars.json';
import romanianAvatars from '@/locales/ro/avatars.json';

/**
 * Registers the avatar texts once; calling it again does nothing.
 *
 * @param i18n - the app's translation instance (from useTranslation())
 */
export function registerAvatarTranslations(i18n: I18nInstance): void {
  if (i18n.hasResourceBundle('ro', 'avatars')) return;
  i18n.addResourceBundle('ro', 'avatars', romanianAvatars);
  i18n.addResourceBundle('en', 'avatars', englishAvatars);
}

/**
 * useTranslation('avatars'), after making sure the avatar texts are registered.
 *
 * @returns what useTranslation('avatars') returns
 */
export function useAvatarsTranslation() {
  const { i18n } = useTranslation();
  registerAvatarTranslations(i18n);
  return useTranslation('avatars');
}
