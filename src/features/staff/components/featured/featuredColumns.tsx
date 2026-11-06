/**
 * The columns of the Featured ranking table, and how each one sorts (story S1-E5-10).
 *
 * Staff can sort by any column (criterion 2). Sorting changes only the order on this screen:
 * ranks and scores come from the database and are the same for everyone.
 * Who uses it: FeaturedTable (headings and cells) and FeaturedPage (the sort drop-down).
 */
import type { TFunction } from 'i18next';
import type { ReactNode } from 'react';

import type { FeaturedCandidate } from '../../api/featured';

/** The columns that sort. */
export const featuredSortKeys = [
  'rank',
  'rankChange',
  'readsThisWeek',
  'readThrough',
  'followers',
  'firstPublishedAt',
] as const;
export type FeaturedSortKey = (typeof featuredSortKeys)[number];

/** The order the screen shows: a column and a direction. */
export interface FeaturedSort {
  key: FeaturedSortKey;
  isAscending: boolean;
}

/**
 * A sortable value for one story and column; a missing value sorts last either way.
 *
 * @returns the number, or null when there is none
 */
function sortValue(story: FeaturedCandidate, key: FeaturedSortKey): number | null {
  if (key === 'firstPublishedAt') {
    return story.firstPublishedAt === null ? null : Date.parse(story.firstPublishedAt);
  }
  return story[key];
}

/**
 * The stories in the order staff chose.
 *
 * @returns a new, sorted list
 */
export function sortedCandidates(
  stories: FeaturedCandidate[],
  sort: FeaturedSort,
): FeaturedCandidate[] {
  const direction = sort.isAscending ? 1 : -1;
  return [...stories].sort((first, second) => {
    const firstValue = sortValue(first, sort.key);
    const secondValue = sortValue(second, sort.key);
    if (firstValue === secondValue) return first.title.localeCompare(second.title);
    if (firstValue === null) return 1;
    if (secondValue === null) return -1;
    return (firstValue - secondValue) * direction;
  });
}

/**
 * The cells of one row, after the pick box and the story, in the headings' order.
 *
 * @param t - the staff translation function
 * @param formatDate - the reader's date format
 * @returns the headings and a function giving one story's cells
 */
export function featuredColumns(t: TFunction, formatDate: (iso: string) => string) {
  const headings = [
    t('featured.columns.rank'),
    t('featured.columns.rankChange'),
    t('featured.columns.readsThisWeek'),
    t('featured.columns.readThrough'),
    t('featured.columns.followers'),
    t('featured.columns.firstPublishedAt'),
    t('featured.columns.rating'),
    t('featured.columns.canFeature'),
  ];
  const cellsOf = (story: FeaturedCandidate): ReactNode[] => [
    story.rank === null ? t('featured.notRanked') : String(story.rank),
    rankChangeText(t, story.rankChange),
    String(story.readsThisWeek),
    `${String(Math.round(story.readThrough * 100))}%`,
    String(story.followers),
    story.firstPublishedAt === null ? '' : formatDate(story.firstPublishedAt),
    t(`rating.${story.rating}`, { ns: 'writing' }),
    story.ineligibleReason === null
      ? t('featured.canFeature')
      : t(`featured.reasons.${story.ineligibleReason}`),
  ];
  return { headings, cellsOf };
}

/**
 * The rank change in words: "Up 5", "Down 2", "No change" or "New this week".
 *
 * @returns the text
 */
function rankChangeText(t: TFunction, change: number | null): string {
  if (change === null) return t('featured.change.new');
  if (change > 0) return t('featured.change.up', { count: change });
  if (change < 0) return t('featured.change.down', { count: -change });
  return t('featured.change.same');
}
