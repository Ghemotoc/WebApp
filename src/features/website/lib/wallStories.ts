/**
 * wallStories: which stories the home page's cover wall shows (bundle LOOK-2, the design
 * catch-up; board Website-Home, the cover wall).
 *
 * The wall is the site's first picture and must suit every visitor, so it keeps only All ages
 * and 13+ stories, whoever is looking (CLAUDE.md rule 18; brief LOOK-2). Nothing is invented:
 * with no such stories the wall is empty.
 * Who calls it: components/HeroCollage.tsx. What it calls: nothing.
 */
import type { ListedStory } from '@/features/discovery/api/storyLists';

/** How many covers the wall holds: three columns of two, as on the board. */
const wallSize = 6;

/** The ratings the wall may show to anyone (CLAUDE.md rule 18; brief LOOK-2). */
const wallRatings = new Set<ListedStory['rating']>(['all_ages', '13_plus']);

/**
 * The stories for the wall: the first six Trending ones rated All ages or 13+.
 *
 * @param stories - the Trending list, in its order
 * @returns at most six stories
 */
export function wallStories(stories: ListedStory[]): ListedStory[] {
  return stories.filter((story) => wallRatings.has(story.rating)).slice(0, wallSize);
}
