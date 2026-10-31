/**
 * searchGroups: search results grouped by type, in the order the database sent them (story
 * S1-E17-30: "they are grouped by type").
 *
 * Who calls it: components/AtlasSearchPage.tsx. What it calls: nothing.
 */
import type { SearchResult } from '../api/search';
import type { AtlasItemKind } from './itemAddress';

/** One type's results. */
export interface SearchGroup {
  kind: AtlasItemKind;
  results: SearchResult[];
}

/**
 * Groups results by type.
 *
 * @param results - the results, already sorted by type then title (search_story())
 * @returns one group per type that has results, in the order the types first appear
 */
export function groupSearchResults(results: SearchResult[]): SearchGroup[] {
  const groups: SearchGroup[] = [];
  for (const result of results) {
    const group = groups.find((candidate) => candidate.kind === result.kind);
    if (group === undefined) groups.push({ kind: result.kind, results: [result] });
    else group.results.push(result);
  }
  return groups;
}
