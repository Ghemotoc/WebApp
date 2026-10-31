/**
 * SearchResultItem: one search result (story S1-E17-30: "each opens its item").
 *
 * Its title as a link to the item (a character's sheet, a bible entry, a chapter or a scene's
 * chapter, the note on the Ideas page, the timeline or the marketing field), then the snippet
 * with the match marked. Who uses it: AtlasSearchPage. What it calls: lib/itemAddress.ts and
 * HighlightedSnippet.
 */
import { Link } from 'react-router';

import type { SearchResult } from '../api/search';
import { itemAddress } from '../lib/itemAddress';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { HighlightedSnippet } from './HighlightedSnippet';

/** The title a result shows: a marketing field by its name, an untitled chapter as such. */
function useResultTitle(result: SearchResult): string {
  const { t } = useAtlasTranslation();
  if (result.kind === 'marketing') return t(`marketing.fields.${result.ref}`);
  if (result.title.trim() === '') return t('chapterPlan.untitled');
  return result.title;
}

/**
 * Renders the result.
 *
 * @param props.slug - the open story
 * @param props.result - the result
 * @param props.query - what was searched for, to mark in the snippet
 * @returns the list item
 */
export function SearchResultItem({
  slug,
  result,
  query,
}: {
  slug: string;
  result: SearchResult;
  query: string;
}) {
  const title = useResultTitle(result);
  return (
    <li
      data-testid="atlas-search-result"
      className="flex min-w-0 flex-col gap-1 border-b border-hairline py-3 last:border-b-0"
    >
      <Link
        to={itemAddress(slug, result)}
        className="inline-flex min-h-6 font-semibold break-words text-link underline"
      >
        {title}
      </Link>
      <p className="m-0 text-sm break-words text-body">
        <HighlightedSnippet snippet={result.snippet} query={query} />
      </p>
    </li>
  );
}
