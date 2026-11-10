/**
 * SearchResultItem: one search result (story S1-E17-30: "each opens its item").
 *
 * A row of a glass list (board AtlasSearch, G10c4), the whole row a link to the item (a
 * character's sheet, a bible entry, a chapter or a scene's chapter, the note on the Ideas page,
 * the timeline or the marketing field): its title in bold, then the snippet with the match
 * marked. Who uses it: AtlasSearchPage. What it calls: lib/itemAddress.ts and
 * HighlightedSnippet.
 */
import { Link } from 'react-router';

import { ChevronRightIcon } from '@/components/icons/ChevronRightIcon';

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
    <li data-testid="atlas-search-result" className="border-b border-border last:border-b-0">
      <Link
        to={itemAddress(slug, result)}
        className="flex min-h-[60px] items-center gap-3.5 px-[18px] py-2.5 text-heading no-underline hover:bg-tint"
      >
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-[15px] font-bold break-words">{title}</span>
          <span className="text-[13px] break-words text-body">
            <HighlightedSnippet snippet={result.snippet} query={query} />
          </span>
        </span>
        <ChevronRightIcon aria-hidden="true" className="shrink-0 text-meta" />
      </Link>
    </li>
  );
}
