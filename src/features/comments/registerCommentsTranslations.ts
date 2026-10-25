/**
 * Adds the comments text (the "comments" namespace) to the translations when the comments area
 * first renders (story S1-E6-01).
 *
 * Why not with the rest: the comments sit under the chapter, in their own file that the reader
 * fetches after the text (src/features/reading/components/ChapterComments.tsx), so the reader
 * stays inside its script budget (e2e/reader-performance.spec.ts, S1-E4-01b). Same pattern as
 * the people, reporting and staff texts.
 * Who calls it: every component in src/features/comments/components, through
 * useCommentsTranslation().
 */
import type { i18n as I18nInstance } from 'i18next';
import { useTranslation } from 'react-i18next';

import englishComments from '@/locales/en/comments.json';
import romanianComments from '@/locales/ro/comments.json';

/**
 * Registers the comments texts once; calling it again does nothing.
 *
 * @param i18n - the app's translation instance (from useTranslation())
 */
export function registerCommentsTranslations(i18n: I18nInstance): void {
  if (i18n.hasResourceBundle('ro', 'comments')) return;
  i18n.addResourceBundle('ro', 'comments', romanianComments);
  i18n.addResourceBundle('en', 'comments', englishComments);
}

/**
 * useTranslation('comments'), after making sure the comments texts are registered.
 *
 * @returns what useTranslation('comments') returns: t and the i18n instance
 */
export function useCommentsTranslation() {
  // Step 1: the instance this component renders with (the app's, or a test's).
  const { i18n } = useTranslation();
  // Step 2: add the comments texts to it the first time any comments component renders.
  registerCommentsTranslations(i18n);
  // Step 3: hand back the usual translation helpers for the "comments" namespace.
  return useTranslation('comments');
}
