/**
 * The forum search page's address and the choices in its forum filter (bundle FORUMS-1, part f;
 * story S1-E8-10).
 *
 * Who calls it: ForumSearchForm (to open a search) and ForumSearchPage (to read one). The search
 * lives in the address (/forums/search?q=…&forum=…&author=…) so the back button and a shared link
 * both work.
 */
import type { SelectOption } from '@/components/ui/Select';

import type { ForumSearchQuery } from '../api/forumSearch';

import type { ForumEntry } from '../api/forumIndex';

import { buildForumTree } from './forumTree';

/** The search page's path. */
export const forumSearchPath = '/forums/search';

/**
 * The address of a search.
 *
 * @param query - the term and filters; empty filters are left out of the address
 * @returns for example "/forums/search?q=dragoni&forum=first-chapters"
 */
export function forumSearchAddress(query: ForumSearchQuery): string {
  const parameters = new URLSearchParams({ q: query.term.trim() });
  if (query.forumSlug !== null) parameters.set('forum', query.forumSlug);
  const author = query.authorHandle?.trim() ?? '';
  if (author !== '') parameters.set('author', author);
  return `${forumSearchPath}?${parameters.toString()}`;
}

/**
 * Reads a search from the address.
 *
 * @param parameters - the address's search parameters
 * @returns the term ('' when none) and the filters (null when not set)
 */
export function forumSearchFromAddress(parameters: URLSearchParams): ForumSearchQuery {
  const forum = parameters.get('forum') ?? '';
  const author = parameters.get('author') ?? '';
  return {
    term: parameters.get('q') ?? '',
    forumSlug: forum === '' ? null : forum,
    authorHandle: author === '' ? null : author,
  };
}

/**
 * The forum filter's choices: "All forums", then each category with its forums and subforums,
 * indented by level so the tree reads in a plain drop-down.
 *
 * @param entries - every entry from the forum index
 * @param allLabel - the words for "All forums"
 * @returns the options; the value '' means every forum
 */
export function forumFilterOptions(entries: ForumEntry[], allLabel: string): SelectOption[] {
  const options: SelectOption[] = [{ value: '', label: allLabel }];
  for (const group of buildForumTree(entries)) {
    options.push({ value: group.category.slug, label: group.category.name });
    for (const { forum, subforums } of group.forums) {
      options.push({ value: forum.slug, label: `— ${forum.name}` });
      for (const subforum of subforums) {
        options.push({ value: subforum.slug, label: `— — ${subforum.name}` });
      }
    }
  }
  return options;
}
