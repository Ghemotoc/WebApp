/**
 * HomeShelves: the home page's rows (story S1-E5-08, bundle LOOK-3; board Website-Home):
 * "Trending this week" with genre chips that narrow the row, "Completed stories" and "New and
 * rising writers".
 *
 * The rows are the shared Discover shelves, which already keep to ratings, blocks and removed
 * content (S1-E5-01) and end with "View more" (S1-E5-09, CLAUDE.md rule 20). The chips are one
 * radio group: "All" or one category; the row keeps its stories while the next ones load, so the
 * chips never move. New and rising writers lists only writers who may be put on show
 * (rising_writers(), LOOK-4c; D4) and is hidden when there are none. Titles are interface text.
 * Who shows it: WebsiteHomePage. What it calls: DiscoverShelf, RisingWritersShelf, ChoiceChips.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ChoiceChips } from '@/components/ui/ChoiceChips';
import type { ListRequest } from '@/features/discovery/api/storyLists';
import { DiscoverShelf } from '@/features/discovery/components/DiscoverShelf';
import { RisingWritersShelf } from '@/features/discovery/components/RisingWritersShelf';
import { useStoryFormOptions } from '@/features/writing/hooks/useStoryFormOptions';

/** The value of the "All" chip. */
const allGenres = '';

/**
 * A shelf's list, with at most a category.
 *
 * @param kind - the list
 * @param categorySlug - one category, or null for all
 * @returns the request
 */
function shelfRequest(kind: ListRequest['kind'], categorySlug: string | null = null): ListRequest {
  return { kind, key: null, categorySlug, completion: null, languageCode: null, sortOrder: null };
}

/**
 * Trending this week, with its genre chips.
 *
 * @returns the shelf
 */
function TrendingShelf() {
  const { t } = useTranslation();
  const { categories } = useStoryFormOptions();
  const [genre, setGenre] = useState(allGenres);
  // Step 1: "All", then every category in the categories table's order.
  const options = [
    { value: allGenres, label: t('website.allGenres') },
    ...categories.map((category) => ({
      value: category.slug,
      label: t(`categories.${category.slug}`, { ns: 'writing' }),
    })),
  ];
  // Step 2: the row for the chosen genre; an empty genre says so instead of vanishing.
  return (
    <DiscoverShelf
      anchorId="trending"
      eyebrow={t('website.trendingEyebrow')}
      title={t('website.trending')}
      request={shelfRequest('popular', genre === allGenres ? null : genre)}
      emptyNote={t('website.noTrending')}
      toolbar={
        categories.length === 0 ? undefined : (
          <ChoiceChips
            label={t('website.genreChips')}
            options={options}
            value={genre}
            onChange={setGenre}
          />
        )
      }
    />
  );
}

/**
 * Renders the rows.
 *
 * @returns the shelves
 */
export function HomeShelves() {
  const { t } = useTranslation();
  return (
    <>
      <TrendingShelf />
      <DiscoverShelf
        anchorId="completed"
        eyebrow={t('website.completedEyebrow')}
        title={t('website.completed')}
        request={shelfRequest('completed')}
      />
      <RisingWritersShelf place="home" anchorId="writers" />
    </>
  );
}
