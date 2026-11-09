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
 * story after it. No ad follows the last story of a longer list, so it never ends on an ad. A
 * short list (no more stories than `firstAdAfter`) has its one ad after its last story when
 * `isShortListAdded` is true, because there the end of the list is still near the top; a list
 * whose page already shows a banner above it passes false and has none in the grid.
 *
 * @param storyNumber - the story's place in the grid, counting from 1
 * @param storyCount - how many stories the grid shows now
 * @param firstAdAfter - the story the first ad follows (1 or more)
 * @param isShortListAdded - true to give a short list its one ad after its last story
 * @returns true when an ad sits straight after this story
 */
export function isAdAfterStory(
  storyNumber: number,
  storyCount: number,
  firstAdAfter: number,
  isShortListAdded: boolean,
): boolean {
  // Step 1: a short list has at most one ad, after its last story.
  if (storyCount <= firstAdAfter) return isShortListAdded && storyNumber === storyCount;
  // Step 2: a longer list: never after its last story, never before the first ad's place.
  if (storyNumber >= storyCount) return false;
  if (storyNumber < firstAdAfter) return false;
  // Step 3: the first ad's place, then every 10th story after it.
  return (storyNumber - firstAdAfter) % storiesBetweenAds === 0;
}
