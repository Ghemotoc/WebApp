/**
 * SearchGroupRows: the results of one group as rows, on phones (bundle CALM-7c; handover Step 3,
 * "Search on phones"; board simplified/New-PhoneSearch).
 *
 * Stories and writers are lists split by the hairline; tags are text links that wrap. The rows
 * hold the same first page of at most 20 a shelf does, and when the group found more, "See 21
 * stories" under them opens the group's See all page, so the shelf rule still holds: never more
 * than 20 here, the rest one link away (CLAUDE.md rule 20).
 * Who uses it: SearchResults. What it calls: StoryResultRow, WriterResultRow and TagResultLinks.
 */
import { Link } from 'react-router';

import { designsForRow, resolveCoverChoice } from '@/components/covers/automaticCover';
import { buttonClassName } from '@/components/ui/buttonStyles';
import { MAXIMUM_SHELF_ITEMS } from '@/components/ui/Shelf';

import { groupAddress, type SearchGroup } from '../lib/searchAddresses';
import { groupTotal, type SearchGroupResults } from '../lib/searchGroups';
import { useSearchTranslation } from '../registerSearchTranslations';

import { StoryResultRow } from './StoryResultRow';
import { TagResultLinks } from './TagResultLinks';
import { WriterResultRow } from './WriterResultRow';

/** What the rows need. */
export interface SearchGroupRowsProps {
  group: SearchGroup;
  term: string;
  results: SearchGroupResults;
  /** The id of the heading that names the list ("12 stories"). */
  headingId: string;
}

/**
 * The rows or links for one group.
 *
 * @param props - the group, its results and the heading's id
 * @returns the list
 */
function GroupList({ group, results, headingId }: Omit<SearchGroupRowsProps, 'term'>) {
  // Tags: wrapped text links ("#mystery"), as the board's Popular tags.
  if (group === 'tags') {
    const tags = results.tags.items.slice(0, MAXIMUM_SHELF_ITEMS);
    return <TagResultLinks tags={tags} headingId={headingId} />;
  }
  // Writers: one row each with Follow.
  if (group === 'writers') {
    return (
      <ul aria-labelledby={headingId} className="m-0 list-none p-0">
        {results.writers.items.slice(0, MAXIMUM_SHELF_ITEMS).map((writer) => (
          <WriterResultRow key={writer.handle} writer={writer} />
        ))}
      </ul>
    );
  }
  // Stories: covers worked out together so neighbours differ (S1-E3-13).
  const stories = results.stories.stories.slice(0, MAXIMUM_SHELF_ITEMS);
  const covers = designsForRow(stories);
  return (
    <ul aria-labelledby={headingId} className="m-0 list-none p-0">
      {stories.map((story, index) => (
        <StoryResultRow
          key={story.slug}
          story={story}
          cover={covers[index] ?? resolveCoverChoice(story)}
        />
      ))}
    </ul>
  );
}

/**
 * How many results the rows show for a group: the first page, never more than 20.
 *
 * @param group - which group
 * @param results - every group's first page
 * @returns the number of rows drawn
 */
function shownCount(group: SearchGroup, results: SearchGroupResults): number {
  let pageLength = results.stories.stories.length;
  if (group === 'writers') pageLength = results.writers.items.length;
  if (group === 'tags') pageLength = results.tags.items.length;
  return Math.min(pageLength, MAXIMUM_SHELF_ITEMS);
}

/**
 * Renders the rows, then "See …" when the group found more than it shows.
 *
 * @param props - the group, the term, its results and the heading's id
 * @returns the rows block
 */
export function SearchGroupRows({ group, term, results, headingId }: SearchGroupRowsProps) {
  const { t } = useSearchTranslation();
  const total = groupTotal(group, results);
  const hasMore = total > shownCount(group, results);
  return (
    <div className="flex flex-col gap-3">
      <GroupList group={group} results={results} headingId={headingId} />
      {hasMore && (
        <Link to={groupAddress(group, term)} className={buttonClassName({ variant: 'text' })}>
          {t('rows.seeAll', { title: t(`groups.${group}Title`, { count: total }) })}
        </Link>
      )}
    </div>
  );
}
