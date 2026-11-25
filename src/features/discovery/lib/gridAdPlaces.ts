/**
 * gridAdPlaces: where the ads go in a long grid of stories (bundle G7e; Robert's design rules,
 * 7 Nov 2026, "Content rules": "Long story grids carry an ad after every 10 stories, so each
 * 'Show more' brings more ads in among the new stories"; Robert, 20 Nov 2026: "a banner every two
 * rows"; boards A05, A06 and A09 draw a 728 × 90 banner across the grid between rows).
 *
 * A banner takes a whole row, so it always sits between two full rows: after every two rows of
 * cards, and never closer than 10 stories apart, so a phone (two cards a row) and a tablet (four)
 * don't carry more ads than a computer (five, where two rows are exactly 10 stories).
 *
 * Who calls it: StoryGrid (src/features/discovery/components/), for the See all, genre, tag,
 * classics and search lists. What it calls: nothing; it is plain arithmetic, so it is easy to test.
 */

/** The fewest stories between one ad and the next (Robert's design rules, 7 Nov 2026). */
export const fewestStoriesBetweenAds = 10;

/** Rows of cards between two banners (Robert, 20 Nov 2026: "a banner every two rows"). */
const rowsBetweenAds = 2;

/** Where a grid's ads go: after which story the first comes, and how many stories apart. */
export interface GridAdPlaces {
  /** The story the first ad follows, counting from 1. */
  firstAfter: number;
  /** How many stories sit between one ad and the next. */
  storiesBetween: number;
  /** True to give a short list its one ad after its last story. */
  isShortListAdded: boolean;
}

/**
 * How many stories sit between two banners in a grid with this many cards a row: two rows, or
 * as many whole rows as reach 10 stories when two rows hold fewer.
 *
 * @param cardsPerRow - the grid's columns (2 on phones, 4 on tablets, 5 on computers)
 * @returns a whole number of rows' worth of stories, 10 or more
 */
export function storiesBetweenBanners(cardsPerRow: number): number {
  // Step 1: a grid always has at least one card a row.
  const columns = Math.max(1, Math.floor(cardsPerRow));
  // Step 2: enough whole rows to reach 10 stories, and never fewer than two rows.
  const rowsToReachTen = Math.ceil(fewestStoriesBetweenAds / columns);
  return columns * Math.max(rowsBetweenAds, rowsToReachTen);
}

/**
 * Whether an ad follows the story at this place in the grid.
 *
 * The first ad follows story number `places.firstAfter` (counting from 1), then one follows every
 * `places.storiesBetween` stories after it. No ad follows the last story of a longer list, so it
 * never ends on an ad. A short list (no more stories than `firstAfter`) has its one ad after its
 * last story when `isShortListAdded` is true, because there the end of the list is still near the
 * top; a list whose page already shows a banner above it passes false and has none in the grid.
 *
 * @param storyNumber - the story's place in the grid, counting from 1
 * @param storyCount - how many stories the grid shows now
 * @param places - where the first ad goes, how far apart the rest are, and the short-list rule
 * @returns true when an ad sits straight after this story
 */
export function isAdAfterStory(
  storyNumber: number,
  storyCount: number,
  places: GridAdPlaces,
): boolean {
  // Step 1: a short list has at most one ad, after its last story.
  if (storyCount <= places.firstAfter) {
    return places.isShortListAdded && storyNumber === storyCount;
  }
  // Step 2: a longer list: never after its last story, never before the first ad's place.
  if (storyNumber >= storyCount) return false;
  if (storyNumber < places.firstAfter) return false;
  // Step 3: the first ad's place, then one after every `storiesBetween` stories.
  return (storyNumber - places.firstAfter) % places.storiesBetween === 0;
}
