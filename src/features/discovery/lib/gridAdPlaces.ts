/**
 * gridAdPlaces: where the ads go in a long grid of stories (bundle G7e; Robert's design rules,
 * 7 Nov 2026, "Content rules": "Long story grids carry an ad after every 10 stories, so each
 * 'Show more' brings more ads in among the new stories", and "On list pages the first ad sits
 * high, near the top, not at the bottom").
 *
 * Who calls it: StoryGrid (src/features/discovery/components/), for the See all, category, tag,
 * classics and search lists. What it calls: nothing; it is plain arithmetic, so it is easy to test.
 */

/** How many stories sit between one ad and the next. */
export const storiesBetweenAds = 10;

/**
 * Whether an ad follows the story at this place in the grid.
 *
 * The first ad follows story number `firstAdAfter` (counting from 1), then one follows every 10th
 * story after it. No ad follows the last story, so a list never ends on an ad and a short list
 * (shorter than `firstAdAfter` plus one) has none in it.
 *
 * @param storyNumber - the story's place in the grid, counting from 1
 * @param storyCount - how many stories the grid shows now
 * @param firstAdAfter - the story the first ad follows (1 or more)
 * @returns true when an ad sits straight after this story
 */
export function isAdAfterStory(
  storyNumber: number,
  storyCount: number,
  firstAdAfter: number,
): boolean {
  // Step 1: never after the last story, and never before the first ad's place.
  if (storyNumber >= storyCount) return false;
  if (storyNumber < firstAdAfter) return false;
  // Step 2: the first ad's place, then every 10th story after it.
  return (storyNumber - firstAdAfter) % storiesBetweenAds === 0;
}
