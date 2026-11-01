/**
 * ForumSearchForm: "Search forum threads and posts" (bundle FORUMS-1, part f; S1-E8-10; board
 * 5.1's search field).
 *
 * On the forum index it is the board's field and "Search". On the results page it also shows the
 * two filters the story asks for: a forum (its subforums included) and an author's username.
 * Submitting opens /forums/search with the search in the address, so the back button and a
 * shared link both work.
 * Who uses it: ForumsPage and ForumSearchPage. What it calls: the router.
 */
import { useId, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';

import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/SearchInput';
import { Select } from '@/components/ui/Select';
import { TextInput } from '@/components/ui/TextInput';

import type { ForumSearchQuery } from '../api/forumSearch';
import { useForumIndex } from '../hooks/useForumIndex';
import { forumFilterOptions, forumSearchAddress } from '../lib/forumSearchAddress';
import { useForumsTranslation } from '../registerForumsTranslations';

/** An empty search, for the forum index. */
const emptySearch: ForumSearchQuery = { term: '', forumSlug: null, authorHandle: null };

/**
 * The forum and author filters.
 *
 * @param props.search - the search being written
 * @param props.onChange - called with the changed search
 * @returns the two fields
 */
function SearchFilters({
  search,
  onChange,
}: {
  search: ForumSearchQuery;
  onChange: (next: ForumSearchQuery) => void;
}) {
  const { t } = useForumsTranslation();
  const id = useId();
  const { entries } = useForumIndex();
  return (
    <div className="flex flex-wrap items-end gap-4">
      <Select
        id={`${id}-forum`}
        label={t('search.forum')}
        isLabelVisible
        options={forumFilterOptions(entries ?? [], t('search.allForums'))}
        value={search.forumSlug ?? ''}
        onChange={(value) => onChange({ ...search, forumSlug: value === '' ? null : value })}
      />
      <div className="w-full max-w-[280px]">
        <TextInput
          id={`${id}-author`}
          label={t('search.author')}
          placeholder={t('search.authorPlaceholder')}
          value={search.authorHandle ?? ''}
          onChange={(event) => onChange({ ...search, authorHandle: event.target.value })}
        />
      </div>
    </div>
  );
}

/**
 * Renders the form.
 *
 * @param props.initial - the search already made (the results page), or none (the index)
 * @param props.showsFilters - whether to show the forum and author filters
 * @returns the search form
 */
export function ForumSearchForm({
  initial = emptySearch,
  showsFilters = false,
}: {
  initial?: ForumSearchQuery;
  showsFilters?: boolean;
}) {
  const { t } = useForumsTranslation();
  const navigate = useNavigate();
  const id = useId();
  const [search, setSearch] = useState(initial);

  /** Opens the results page for what was typed. */
  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void navigate(forumSearchAddress(search));
  }

  return (
    <form role="search" onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-[1_1_420px]">
          <SearchInput
            id={`${id}-term`}
            name="q"
            label={t('search.label')}
            placeholder={t('search.label')}
            value={search.term}
            onChange={(event) => setSearch({ ...search, term: event.target.value })}
          />
        </div>
        <Button type="submit" variant="secondary" size="lg">
          {t('search.submit')}
        </Button>
      </div>
      {showsFilters && <SearchFilters search={search} onChange={setSearch} />}
    </form>
  );
}
