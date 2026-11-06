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
import { createNamespaceTranslations } from '@/lib/namespace-translations';
import englishComments from '@/locales/en/comments.json';
import romanianComments from '@/locales/ro/comments.json';

const commentsTranslations = createNamespaceTranslations(
  'comments',
  romanianComments,
  englishComments,
);

/**
 * Registers the comments texts once; calling it again does nothing.
 *
 * @param i18n - the app's translation instance (from useTranslation())
 */
export const registerCommentsTranslations = commentsTranslations.register;

/**
 * useTranslation('comments'), after making sure the comments texts are registered.
 *
 * @returns what useTranslation('comments') returns: t and the i18n instance
 */
export const useCommentsTranslation = commentsTranslations.useNamespaceTranslation;
