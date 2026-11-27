/**
 * HomeShelves: the home page's rows (story S1-E5-08, bundle LOOK-3; board Website-Home):
 * "Trending this week" with genre chips that narrow the row and "Completed stories". "New and
 * rising writers" left the rows on 23 Nov 2026 (CALM-9, board A01): it now sits in the "Start
 * your first story" band, and on a member's home (/hub) in the Tools band.
 *
 * The rows are the shared Discover shelves, which already keep to ratings, blocks and removed
 * content (S1-E5-01) and end with "View more" (S1-E5-09, CLAUDE.md rule 20). The chips are one
 * radio group: "Every genre" or one category, under the row as board A01 draws them (Robert's
 * review of 25 Nov 2026; the copy rule allows no "All"); the row keeps its stories while the next
 * ones load, so the chips never move. Titles are interface text.
 * Who shows it: WebsiteHomePage. What it calls: DiscoverShelf, ChoiceChips.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ChoiceChips } from '@/components/ui/ChoiceChips';
import type { ListRequest } from '@/features/discovery/api/storyLists';
import { DiscoverShelf } from '@/features/discovery/components/DiscoverShelf';
import { useStoryCategories } from '@/features/writing/hooks/useStoryCategories';

/** The value of the "Every genre" chip. */
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
  const { categories } = useStoryCategories();
  const [genre, setGenre] = useState(allGenres);
  // Step 1: "Every genre", then every category in the categories table's order.
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
      toolbarPlacement="below"
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
    </>
  );
}
