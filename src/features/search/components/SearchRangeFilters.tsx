/**
 * SearchRangeFilters: the Rating and Length filters of the search results (user story 1.8,
 * board A08-SearchResults), under Sort, Status and Language.
 *
 * Rating keeps one rating (or any); Length keeps stories under 10 readable chapters or with 10
 * or more (or any). The database does the filtering (browse_stories(), story_rating and
 * story_length), so the count and the pages stay right. A rating above the reader's age never
 * shows whatever is picked (CLAUDE.md rule 18), which the hint under Rating says.
 * Who uses it: SearchFilterFields.
 * What it calls: FilterRadios; the parent applies the new request.
 */
import { useTranslation } from 'react-i18next';

import { storyLengths } from '@/features/discovery/api/storyLists';
import type { ListRequest } from '@/features/discovery/api/storyLists';
import { storyRatings } from '@/schemas/story';

import { useSearchTranslation } from '../registerSearchTranslations';

import { FilterRadios } from './FilterRadios';

/** The value both groups use for "no filter". */
const anyValue = 'any';

/** What the two groups need. */
export interface SearchRangeFiltersProps {
  request: ListRequest;
  onChange: (next: ListRequest) => void;
}

/**
 * Renders the Rating and Length groups.
 *
 * @param props.request - the search list with its filters
 * @param props.onChange - applies a new set of filters
 * @returns the two fieldsets
 */
export function SearchRangeFilters({ request, onChange }: SearchRangeFiltersProps) {
  const { t } = useSearchTranslation();
  const { t: tWriting } = useTranslation('writing');
  return (
    <>
      <FilterRadios
        legend={t('filters.rating')}
        choices={[
          { value: anyValue, label: t('filters.anyRating') },
          ...storyRatings.map((rating) => ({ value: rating, label: tWriting(`rating.${rating}`) })),
        ]}
        value={request.storyRating ?? anyValue}
        hint={t('filters.ratingHint')}
        onChoose={(picked) => {
          // Only a known rating becomes a filter; "Any rating" clears it.
          const storyRating = storyRatings.find((rating) => rating === picked) ?? null;
          onChange({ ...request, storyRating });
        }}
      />
      <FilterRadios
        legend={t('filters.length')}
        choices={[
          { value: anyValue, label: t('filters.anyLength') },
          ...storyLengths.map((length) => ({
            value: length,
            label: t(`filters.lengths.${length}`),
          })),
        ]}
        value={request.storyLength ?? anyValue}
        onChoose={(picked) => {
          const storyLength = storyLengths.find((length) => length === picked) ?? null;
          onChange({ ...request, storyLength });
        }}
      />
    </>
  );
}
