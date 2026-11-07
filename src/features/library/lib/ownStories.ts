/**
 * ownStories: which of the writer's own stories the Library's "My stories" shelf counts and shows
 * (bundle NAV-1).
 * Who calls it: LibraryShelves (the chip's size) and MyStoriesShelf (the cards).
 * What it calls: nothing; it reads the list useMyStories returned.
 */
import type { MyStory } from '@/features/writing/api/stories';

/**
 * The writer's stories that aren't deleted, in the order "Your writing" lists them. A deleted
 * story can still be restored for 30 days (S1-E3-05), but it belongs in "Recently deleted" on
 * Your writing, not on a shelf.
 *
 * @param stories - every story useMyStories returned, deleted ones included
 * @returns the live stories
 */
export function liveOwnStories(stories: MyStory[]): MyStory[] {
  return stories.filter((story) => story.deletedAt === null);
}
