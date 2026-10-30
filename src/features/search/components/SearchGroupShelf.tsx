/**
 * SearchGroupShelf: the results of one group as a shelf: one scrolling line of at most 20, ending
 * with "View more" to the group's See all page when there are more (story S1-E5-04, fourth
 * criterion; CLAUDE.md rule 20).
 *
 * Stories use the shared story card with its full-title cover (fifth criterion); writers and tags
 * their own cards. Who uses it: SearchResults.
 */
import { designsForRow, resolveCoverChoice } from '@/components/covers/automaticCover';
import { Shelf } from '@/components/ui/Shelf';
import { ListedStoryCard } from '@/features/discovery/components/ListedStoryCard';

import { groupAddress, type SearchGroup } from '../lib/searchAddresses';
import { groupTotal, type SearchGroupResults } from '../lib/searchGroups';
import { useSearchTranslation } from '../registerSearchTranslations';

import { TagResultCard } from './TagResultCard';
import { WriterResultCard } from './WriterResultCard';

/**
 * The shelf items for one group.
 *
 * @param group - which group
 * @param results - every group's first page
 * @returns the keyed cards
 */
function itemsFor(group: SearchGroup, results: SearchGroupResults) {
  if (group === 'writers') {
    return results.writers.items.map((writer) => ({
      key: writer.handle,
      content: <WriterResultCard writer={writer} />,
    }));
  }
  if (group === 'tags') {
    return results.tags.items.map((tag) => ({
      key: tag.name,
      content: <TagResultCard tag={tag} />,
    }));
  }
  const covers = designsForRow(results.stories.stories);
  return results.stories.stories.map((story, index) => ({
    key: story.slug,
    content: <ListedStoryCard story={story} cover={covers[index] ?? resolveCoverChoice(story)} />,
  }));
}

/**
 * Renders the shelf.
 *
 * @param props.group - which group
 * @param props.term - the search term, for the See all address
 * @param props.results - every group's first page
 * @returns the shelf section
 */
export function SearchGroupShelf({
  group,
  term,
  results,
}: {
  group: SearchGroup;
  term: string;
  results: SearchGroupResults;
}) {
  const { t } = useSearchTranslation();
  const total = groupTotal(group, results);
  return (
    <Shelf
      title={t(`groups.${group}Title`, { count: total })}
      items={itemsFor(group, results)}
      seeAllHref={groupAddress(group, term)}
      totalCount={total}
    />
  );
}
