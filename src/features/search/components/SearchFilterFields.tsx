/**
 * SearchFilterFields: the filters and the sort for the stories a search found (user story 1.8,
 * board A08-SearchResults): Sort by, Status, Language, Rating and Length as radio groups, then
 * Clear filters.
 *
 * Each choice applies at once (board A08: "the filters apply at once"), by rewriting the address
 * in place.
 * Who uses it: SearchStoriesTab, in the left column from 1024 px and in a sheet below.
 * What it calls: FilterRadios and SearchRangeFilters; the parent applies the new request.
 */
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import type { ListRequest } from '@/features/discovery/api/storyLists';

import { filtersOn, searchLanguages, searchSorts, sortInUse } from '../lib/searchFilters';
import { useSearchTranslation } from '../registerSearchTranslations';

import { FilterRadios } from './FilterRadios';
import { SearchRangeFilters } from './SearchRangeFilters';

/** What the fields need. */
export interface SearchFilterFieldsProps {
  request: ListRequest;
  onChange: (next: ListRequest) => void;
}

/** The value a radio group uses for "no filter". */
const both = 'both';

/**
 * Renders the five groups and Clear filters.
 *
 * @param props.request - the search list with its filters
 * @param props.onChange - applies a new set of filters
 * @returns the fields
 */
export function SearchFilterFields({ request, onChange }: SearchFilterFieldsProps) {
  const { t } = useSearchTranslation();
  const { t: tWriting } = useTranslation('writing');
  return (
    <div className="flex flex-col gap-6">
      <FilterRadios
        legend={t('filters.sortBy')}
        choices={searchSorts.map((sort) => ({ value: sort, label: t(`filters.sort.${sort}`) }))}
        value={sortInUse(request)}
        onChoose={(sort) => {
          const sortOrder = searchSorts.find((choice) => choice === sort) ?? null;
          onChange({ ...request, sortOrder });
        }}
      />
      <FilterRadios
        legend={t('filters.status')}
        choices={[
          { value: 'ongoing', label: tWriting('status.ongoing') },
          { value: 'completed', label: tWriting('status.completed') },
          { value: both, label: t('filters.both') },
        ]}
        value={request.completion ?? both}
        onChoose={(status) => {
          const completion = status === 'ongoing' || status === 'completed' ? status : null;
          onChange({ ...request, completion });
        }}
      />
      <FilterRadios
        legend={t('filters.language')}
        choices={[
          ...searchLanguages.map((code) => ({
            value: code,
            label: t(`filters.languages.${code}`),
          })),
          { value: both, label: t('filters.both') },
        ]}
        value={request.languageCode ?? both}
        onChoose={(code) => onChange({ ...request, languageCode: code === both ? null : code })}
      />
      <SearchRangeFilters request={request} onChange={onChange} />
      {filtersOn(request) > 0 && (
        <Button
          variant="text"
          className="self-start"
          onClick={() =>
            onChange({
              ...request,
              completion: null,
              languageCode: null,
              storyRating: null,
              storyLength: null,
            })
          }
        >
          {t('filters.clear')}
        </Button>
      )}
    </div>
  );
}
