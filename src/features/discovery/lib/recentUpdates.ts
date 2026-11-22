/**
 * recentUpdates: which stories had a chapter out in the last seven days (bundle CALM-7c; board
 * New-Read: "Writers you follow updated 6 stories this week" and the "New chapter" state on the
 * featured story).
 *
 * Who calls it: components/FollowedUpdatesFact.tsx and components/FeaturedSlide.tsx. What it
 * calls: nothing; it only compares dates the list already carries (lastChapterPublishedAt).
 */
import type { ListedStory } from '../api/storyLists';

/** A week, in milliseconds: "this week" means the last seven days, not the calendar week. */
const weekInMilliseconds = 7 * 24 * 60 * 60 * 1000;

/**
 * Whether a story's latest chapter came out in the last seven days.
 *
 * @param story - a story from a list
 * @param now - the time to count back from (a test passes its own)
 * @returns true for a chapter out in the last seven days; false with no chapter date
 */
export function hadChapterThisWeek(
  story: Pick<ListedStory, 'lastChapterPublishedAt'>,
  now: Date = new Date(),
): boolean {
  // Step 1: a story without a published chapter date has nothing new.
  if (story.lastChapterPublishedAt === null) return false;
  // Step 2: compare the age of the latest chapter with a week.
  const publishedAt = new Date(story.lastChapterPublishedAt).getTime();
  return now.getTime() - publishedAt <= weekInMilliseconds;
}

/**
 * How many stories in a list had a chapter out in the last seven days.
 *
 * @param stories - the stories (the first page of a list is enough: at most 20)
 * @param now - the time to count back from
 * @returns the count
 */
export function storiesUpdatedThisWeek(
  stories: readonly Pick<ListedStory, 'lastChapterPublishedAt'>[],
  now: Date = new Date(),
): number {
  return stories.filter((story) => hadChapterThisWeek(story, now)).length;
}
