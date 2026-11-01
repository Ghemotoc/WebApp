/**
 * Adds the text of private messages (the "messages" namespace) to the translations when a
 * Messages page first renders (story S1-E9-01).
 *
 * Why not with the rest: the text is only needed on these pages, so it travels with them, as
 * moderator mail's does. Who calls it: every component in this folder, through
 * useMessagesTranslation(). The top bar's link reads its words from common.json instead.
 */
import type { i18n as I18nInstance } from 'i18next';
import { useTranslation } from 'react-i18next';

import englishMessages from '@/locales/en/messages.json';
import romanianMessages from '@/locales/ro/messages.json';

/**
 * Registers the texts once; calling it again does nothing.
 *
 * @param i18n - the app's translation instance (from useTranslation())
 */
export function registerMessagesTranslations(i18n: I18nInstance): void {
  if (i18n.hasResourceBundle('ro', 'messages')) return;
  i18n.addResourceBundle('ro', 'messages', romanianMessages);
  i18n.addResourceBundle('en', 'messages', englishMessages);
}

/**
 * The translation hook for this folder: registers the texts first, then reads them.
 *
 * @returns useTranslation('messages')
 */
export function useMessagesTranslation() {
  // Step 1: the instance this component renders with (the app's, or a test's).
  const { i18n } = useTranslation();
  // Step 2: add the texts to it the first time a component here renders.
  registerMessagesTranslations(i18n);
  // Step 3: the usual helpers for the "messages" namespace.
  return useTranslation('messages');
}
