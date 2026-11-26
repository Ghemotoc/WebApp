/**
 * SearchResultItem: one search result (story S1-E17-30: "each opens its item").
 *
 * A row between hairlines (board E34, user stories bundle 6, story 6.15): the item's title in
 * bold as a link to it (a character's sheet, a story world entry, a chapter or a scene's chapter,
 * the note on the Ideas page, the timeline or the marketing field), then the snippet with the
 * match marked. Who uses it: AtlasSearchPage. What it calls: lib/itemAddress.ts and
 * HighlightedSnippet.
 */
import { Link } from 'react-router';

import type { SearchResult } from '../api/search';
import { itemAddress } from '../lib/itemAddress';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { HighlightedSnippet } from './HighlightedSnippet';

/** A chapter's title with its number: "Chapter 14: The register", or "Chapter 14" untitled. */
function useChapterTitle(result: SearchResult): string | null {
  const { t } = useAtlasTranslation();
  const number = result.number ?? null;
  if (result.kind !== 'chapter' || number === null) return null;
  if (result.title.trim() === '') return t('chapters.chapterUntitled', { number });
  return t('chapters.chapterTitle', { number, title: result.title });
}

/**
 * The title a result shows: a marketing field by its name (one of the writer's own details, ref
 * "detail-<id>", by the name the writer gave it; GAPS-2b), a chapter with its number (board
 * E34), anything else untitled as such.
 */
function useResultTitle(result: SearchResult): string {
  const { t } = useAtlasTranslation();
  const chapterTitle = useChapterTitle(result);
  if (result.kind === 'marketing' && result.ref.startsWith('detail-')) return result.title;
  if (result.kind === 'marketing') return t(`marketing.fields.${result.ref}`);
  if (chapterTitle !== null) return chapterTitle;
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
      className="flex min-w-0 flex-col border-t border-hairline py-3"
    >
      <Link
        to={itemAddress(slug, result)}
        className="self-start type-label font-semibold wrap-anywhere text-ink-heading no-underline hover:underline"
      >
        {title}
      </Link>
      <span className="type-body wrap-anywhere text-ink-muted">
        <HighlightedSnippet snippet={result.snippet} query={query} />
      </span>
    </li>
  );
}
