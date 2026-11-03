/**
 * useCommentLimit: how many characters a comment may have, for the comment box's counter
 * (story S1-E6-01; Robert, 2 Nov 2026, 22:09 to 22:11).
 *
 * A comment on the whole chapter, and its replies, may have comment_max_characters (3,000); a
 * comment on one paragraph, and every reply in its thread, paragraph_comment_max_characters
 * (500). The database applies the same settings (check_comment_text() and the
 * comments_too_long_for_a_paragraph trigger); this only keeps the counter honest.
 * Who calls it: CommentComposer. What it calls: usePublicSettings.
 */
import { usePublicSettings } from '@/features/flags/hooks/usePublicSettings';

/** The decided limits, used while the settings load or if they can't be read. */
export const decidedCommentLimits = { wholeChapter: 3000, paragraph: 500 } as const;

/**
 * The limit for one comment box.
 *
 * @param isOnParagraph - true for a comment on a paragraph or a reply in a paragraph's thread
 * @returns the most characters the comment may have
 */
export function useCommentLimit(isOnParagraph: boolean): number {
  const settings = usePublicSettings();
  if (isOnParagraph) {
    return settings.numberOf('paragraph_comment_max_characters', decidedCommentLimits.paragraph);
  }
  return settings.numberOf('comment_max_characters', decidedCommentLimits.wholeChapter);
}
