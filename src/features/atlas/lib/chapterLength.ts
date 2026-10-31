/**
 * chapterLength: when the writing view warns that a chapter is getting too long (story
 * S1-E17-23: "a chapter nearing the editor's limit for one chapter … a warning suggests
 * splitting it").
 *
 * The editor's real limit is in characters, not words: MAXIMUM_CHAPTER_CHARACTERS
 * (src/schemas/chapter.ts, 100,000). The story's "about 40,000 words" is noted in the pull
 * request as a board mismatch; the warning follows the real limit.
 * Who calls it: ChapterWordsLine.
 */
import { MAXIMUM_CHAPTER_CHARACTERS } from '@/schemas/chapter';

/** The share of the limit at which the warning starts: nine tenths. */
const warningShare = 0.9;

/**
 * Whether a chapter is close to the most one chapter can hold.
 *
 * @param characterCount - the characters in the chapter's text now
 * @returns true from nine tenths of the limit
 */
export function isNearChapterLimit(characterCount: number): boolean {
  return characterCount >= MAXIMUM_CHAPTER_CHARACTERS * warningShare;
}
