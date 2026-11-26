/**
 * SearchLanguageFilter: the Language group of the search's filters (user story 1.8, board
 * A08-SearchResults), offering only the languages stories are written in (story S1-E3-01;
 * Robert, 26 Nov 2026: "Only the languages currently written in").
 *
 * The board draws English, Romanian and Both; with stories in more languages the last choice
 * says "Any language" instead of "Both". A language in the address stays a choice, so a shared
 * search still shows its filter.
 * Who uses it: SearchFilterFields. What it calls: FilterRadios and useLanguagesWrittenIn; the
 * parent applies the new request.
 */
import type { ListRequest } from '@/features/discovery/api/storyLists';
import { useLanguagesWrittenIn } from '@/features/discovery/hooks/useLanguagesWrittenIn';

import { useSearchTranslation } from '../registerSearchTranslations';

import { FilterRadios } from './FilterRadios';

/** What the group needs. */
export interface SearchLanguageFilterProps {
  request: ListRequest;
  onChange: (next: ListRequest) => void;
}

/** The value the group uses for "no filter". */
const noFilter = 'both';

/**
 * Renders the Language group.
 *
 * @returns the radio group
 */
export function SearchLanguageFilter({ request, onChange }: SearchLanguageFilterProps) {
  const { t } = useSearchTranslation();
  const chosen = request.languageCode;
  const { languages } = useLanguagesWrittenIn(chosen === null ? [] : [chosen]);
  // "Both" only reads right for two languages; otherwise "Any language".
  const noFilterLabel = languages.length === 2 ? t('filters.both') : t('filters.anyLanguage');
  return (
    <FilterRadios
      legend={t('filters.language')}
      choices={[
        ...languages.map(({ code, label }) => ({ value: code, label })),
        { value: noFilter, label: noFilterLabel },
      ]}
      value={chosen ?? noFilter}
      onChoose={(code) => onChange({ ...request, languageCode: code === noFilter ? null : code })}
    />
  );
}
