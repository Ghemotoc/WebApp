/**
 * Adds the avatar builder's text (the "avatars" namespace) when an avatar component first renders
 * (bundle ADMIN-2, part g). Same pattern as registerPeopleTranslations: the many part names are
 * only needed in Settings, so they stay out of the first download every page makes.
 * Who calls it: the components in src/features/avatars/components, through
 * useAvatarsTranslation(). Staff can override the text from the admin site (S1-E11-18).
 */
import { createNamespaceTranslations } from '@/lib/namespace-translations';
import englishAvatars from '@/locales/en/avatars.json';
import romanianAvatars from '@/locales/ro/avatars.json';

const avatarTranslations = createNamespaceTranslations('avatars', romanianAvatars, englishAvatars);

/**
 * Registers the avatar texts once; calling it again does nothing.
 *
 * @param i18n - the app's translation instance (from useTranslation())
 */
export const registerAvatarTranslations = avatarTranslations.register;

/**
 * useTranslation('avatars'), after making sure the avatar texts are registered.
 *
 * @returns what useTranslation('avatars') returns
 */
export const useAvatarsTranslation = avatarTranslations.useNamespaceTranslation;
