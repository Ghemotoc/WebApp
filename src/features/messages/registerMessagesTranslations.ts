/**
 * Adds the text of private messages (the "messages" namespace) to the translations when a
 * Messages page first renders (story S1-E9-01).
 *
 * Why not with the rest: the text is only needed on these pages, so it travels with them, as
 * moderator mail's does. Who calls it: every component in this folder, through
 * useMessagesTranslation(). The top bar's link reads its words from common.json instead.
 */
import { createNamespaceTranslations } from '@/lib/namespace-translations';
import englishMessages from '@/locales/en/messages.json';
import romanianMessages from '@/locales/ro/messages.json';

const messagesTranslations = createNamespaceTranslations(
  'messages',
  romanianMessages,
  englishMessages,
);

/**
 * Registers the texts once; calling it again does nothing.
 *
 * @param i18n - the app's translation instance (from useTranslation())
 */
export const registerMessagesTranslations = messagesTranslations.register;

/**
 * The translation hook for this folder: registers the texts first, then reads them.
 *
 * @returns useTranslation('messages')
 */
export const useMessagesTranslation = messagesTranslations.useNamespaceTranslation;
