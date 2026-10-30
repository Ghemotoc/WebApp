/**
 * SearchResults: what a search found, under the search field (story S1-E5-04; board Search 3.2).
 *
 * The count across every group, then one chip per group that found something ("Stories 4",
 * "Writers 2", "Tags 1") and the chosen group's shelf, then the line about what search never
 * shows. With nothing found: "No results for …" and a way to Discover (board 3.2, "When nothing
 * matches"). The database leaves out what this reader may not see, so the page adds no rules.
 * Who uses it: SearchPage. What it calls: useSearchResults().
 */
import { useState } from 'react';
import { Link } from 'react-router';

import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { Notice } from '@/components/ui/Notice';

import { useSearchResults } from '../hooks/useSearchResults';
import { searchGroups, type SearchGroup } from '../lib/searchAddresses';
import { groupTotal, type SearchGroupResults } from '../lib/searchGroups';
import { useSearchTranslation } from '../registerSearchTranslations';

import { SearchGroupShelf } from './SearchGroupShelf';

/** "No results for …", with the way to Discover. */
function NothingFound({ term }: { term: string }) {
  const { t } = useSearchTranslation();
  return (
    <EmptyState
      title={t('empty.title', { term })}
      description={t('empty.description')}
      action={
        <Link
          to="/discover"
          className="inline-flex h-11 w-fit items-center rounded-full bg-primary px-5 text-sm font-semibold text-on-primary no-underline hover:opacity-90"
        >
          {t('empty.browse')}
        </Link>
      }
    />
  );
}

/** The groups with results, as chips; the chosen one is pressed. */
function GroupChips({
  groups,
  chosen,
  results,
  onChoose,
}: {
  groups: SearchGroup[];
  chosen: SearchGroup;
  results: SearchGroupResults;
  onChoose: (group: SearchGroup) => void;
}) {
  const { t } = useSearchTranslation();
  return (
    <div role="group" aria-label={t('groups.label')} className="flex flex-wrap gap-2">
      {groups.map((group) => (
        <Chip key={group} isPressed={group === chosen} onPressedChange={() => onChoose(group)}>
          {t(`groups.${group}`)}
          <span className="rounded-full bg-tint px-1.5 text-xs text-heading">{groupTotal(group, results)}</span>
        </Chip>
      ))}
    </div>
  );
}

/** The count, the chips, the chosen group's shelf and the safety line. */
function FoundResults({ term, results }: { term: string; results: SearchGroupResults }) {
  const { t } = useSearchTranslation();
  const groups = searchGroups.filter((group) => groupTotal(group, results) > 0);
  const [picked, setPicked] = useState<SearchGroup | null>(null);
  const chosen = picked !== null && groups.includes(picked) ? picked : groups[0];
  const total = groups.reduce((sum, group) => sum + groupTotal(group, results), 0);
  if (chosen === undefined) return <NothingFound term={term} />;
  return (
    <div className="flex flex-col gap-6">
      <p aria-live="polite" className="m-0 text-base text-body">
        {t('page.count', { count: total })}
      </p>
      <GroupChips groups={groups} chosen={chosen} results={results} onChoose={setPicked} />
      <SearchGroupShelf group={chosen} term={term} results={results} />
      <p className="m-0 text-sm text-meta">{t('groups.safetyNote')}</p>
    </div>
  );
}

/**
 * Renders the results, a wait (nothing), or a plain error.
 *
 * @param props.term - the search term from the address
 * @returns the results block
 */
export function SearchResults({ term }: { term: string }) {
  const { t } = useSearchTranslation();
  const found = useSearchResults(term);
  if (found.loadFailed) return <Notice tone="error">{t('page.loadFailed')}</Notice>;
  if (!found.isLoaded || found.stories === null || found.writers === null || found.tags === null) {
    return null;
  }
  return (
    <FoundResults
      key={term}
      term={term}
      results={{ stories: found.stories, writers: found.writers, tags: found.tags }}
    />
  );
}
