/**
 * SearchFilterFields: the filters and the sort for the stories a search found (user story 1.8,
 * board A08-SearchResults): Sort by, Status and Language as radio groups, then Clear filters.
 *
 * Each choice applies at once (board A08: "the filters apply at once"), by rewriting the address
 * in place. Real radio buttons, so the choice shows by the dot and its words, never by colour
 * alone (WCAG 1.4.1), and the arrow keys move inside a group.
 * Who uses it: SearchStoriesTab, in the left column from 1024 px and in a sheet below.
 * What it calls: nothing outside the page; the parent applies the new request.
 */
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import type { ListRequest } from '@/features/discovery/api/storyLists';

import { searchLanguages, searchSorts, sortInUse } from '../lib/searchFilters';
import { useSearchTranslation } from '../registerSearchTranslations';

/** One choice in a radio group. */
interface RadioChoice {
  value: string;
  label: string;
}

/** What one radio group needs. */
interface FilterRadiosProps {
  legend: string;
  choices: RadioChoice[];
  value: string;
  onChoose: (value: string) => void;
}

/**
 * One group of radio buttons under its name.
 *
 * @param props - the name, the choices, the one chosen and what to do on a change
 * @returns the fieldset
 */
function FilterRadios({ legend, choices, value, onChoose }: FilterRadiosProps) {
  const name = useId();
  // Step 1: the dot follows the click at once. The address changes inside a React transition
  // (React Router), so without this a controlled radio snaps back to the old choice until the
  // new address arrives, and on a slow device the dot visibly jumps back for a moment.
  const [shownValue, setShownValue] = useState(value);
  const [lastValue, setLastValue] = useState(value);
  // Step 2: a new value from outside (Clear filters, Back, the sheet) replaces the shown one.
  if (value !== lastValue) {
    setLastValue(value);
    setShownValue(value);
  }
  return (
    <fieldset className="m-0 flex flex-col gap-1 border-0 p-0">
      <legend className="mb-2 p-0 type-label font-semibold text-ink-heading">{legend}</legend>
      {choices.map((choice) => (
        <label
          key={choice.value}
          className="flex min-h-11 cursor-pointer items-center gap-3 type-label text-ink"
        >
          <input
            type="radio"
            name={name}
            value={choice.value}
            checked={choice.value === shownValue}
            onChange={() => {
              setShownValue(choice.value);
              onChoose(choice.value);
            }}
            className="size-5 shrink-0 accent-primary"
          />
          {choice.label}
        </label>
      ))}
    </fieldset>
  );
}

/** What the fields need. */
export interface SearchFilterFieldsProps {
  request: ListRequest;
  onChange: (next: ListRequest) => void;
}

/** The value a radio group uses for "no filter". */
const both = 'both';

/**
 * Renders the three groups and Clear filters.
 *
 * @param props.request - the search list with its filters
 * @param props.onChange - applies a new set of filters
 * @returns the fields
 */
export function SearchFilterFields({ request, onChange }: SearchFilterFieldsProps) {
  const { t } = useSearchTranslation();
  const { t: tWriting } = useTranslation('writing');
  const hasFilters = request.completion !== null || request.languageCode !== null;
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
      {hasFilters && (
        <Button
          variant="text"
          className="self-start"
          onClick={() => onChange({ ...request, completion: null, languageCode: null })}
        >
          {t('filters.clear')}
        </Button>
      )}
    </div>
  );
}
