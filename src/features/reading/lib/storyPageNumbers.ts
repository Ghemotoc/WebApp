/**
 * Small counts the story page shows (bundle CALM-7c; board New-Story): the words in the published
 * chapters ("31.4k words") and whether a chapter is new ("New" in its row).
 * Who uses it: StoryStats and StoryChapterList. It calls nothing; every function here is pure.
 */
import type { StoryPageChapter, StoryPageData } from '../api/storyPage';

/** A chapter counts as new for a week after it went out (board New-Story's "New"). */
const newForDays = 7;

/**
 * Whether a published chapter went out in the last week.
 *
 * @param chapter - the chapter
 * @param now - the time now
 * @returns true while it is new
 */
export function isNewChapter(chapter: StoryPageChapter, now: Date): boolean {
  if (chapter.status !== 'published' || chapter.publishedAt === null) return false;
  const ageInDays = (now.getTime() - new Date(chapter.publishedAt).getTime()) / 86_400_000;
  return ageInDays >= 0 && ageInDays < newForDays;
}

/**
 * The words in the published chapters, or null when a chapter has no count yet (an older
 * chapter), so the line never shows a total that is too small.
 *
 * @param story - the story page
 * @returns the total, or null
 */
export function publishedWordTotal(story: StoryPageData): number | null {
  let total = 0;
  for (const chapter of story.chapters) {
    if (chapter.status !== 'published') continue;
    if (chapter.wordCount === null) return null;
    total += chapter.wordCount;
  }
  return total;
}
