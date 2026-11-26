/**
 * StoryListFilters: the filters on a See all, category or tag page (story S1-E5-09; board 3.10;
 * user story 1.5, board A05-ReadList).
 *
 * On the page there is one quiet "Filter and sort" button and a short line saying what is in use
 * ("Ongoing and completed · Sorted by: Popular"). The button opens one panel, as on a shop (user
 * story 1.5, which replaces the G7c choice of keeping the filters on the page): the sort first,
 * then Ongoing, Completed or Both, the language, "Popular in" on the Popular list, and the
 * category chips. A filter the page already is (the category on a category page, the status on
 * Completed) isn't offered. Every change applies at once and goes into the address, so the
 * filtered list can be shared (S1-E5-09, fourth criterion); Done closes the panel.
 * Not yet in the panel: rating up to the reader's age, length and content labels to leave out,
 * which need new browse_stories() filters (a follow-up of user story 1.5).
 * Who uses it: StoryListPage. What it calls: Sheet, useStoryFormOptions (categories and
 * languages).
 */
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { ButtonRow } from '@/components/ui/ButtonRow';
import { ChoiceChips, type ChoiceOption } from '@/components/ui/ChoiceChips';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Select } from '@/components/ui/Select';
import { Sheet } from '@/components/ui/Sheet';
import { useStoryFormOptions } from '@/features/writing/hooks/useStoryFormOptions';

import {
  everyLanguage,
  followsReadingLanguages,
  type CompletionStatus,
  type ListRequest,
  type SortOrder,
} from '../api/storyLists';
import { categoryAccent } from '../lib/categoryAccents';
import { sortChoicesFor } from '../lib/listAddresses';
import { useDiscoveryTranslation } from '../registerDiscoveryTranslations';

import { PopularInSelect } from './PopularInSelect';

/** What the filters need. */
export interface StoryListFiltersProps {
  request: ListRequest;
  /** The sort in use: the address's, the one kept for this tab, or the list's own. */
  sortOrder: SortOrder;
  /** Called with the request after one filter changed. */
  onChange: (request: ListRequest) => void;
}

/** The value the chips, the segments and the drop-down use for "Any". */
const anyValue = '';

/**
 * The category chips, with the board's coloured dot.
 *
 * @returns "Any category" and one chip per category
 */
function useCategoryOptions(): ChoiceOption[] {
  const { t } = useDiscoveryTranslation();
  const { categories } = useStoryFormOptions();
  return [
    { value: anyValue, label: t('seeAll.anyCategory') },
    ...categories.map((category) => ({
      value: category.slug,
      label: t(`categories.${category.slug}`, { ns: 'writing' }),
      // The tone's text colour, 7:1 on white (categoryAccents.ts).
      dotColour: `var(--pill-${categoryAccent(category.slug)}-text)`,
    })),
  ];
}

/**
 * Ongoing, Completed or Both, as a segmented control (boards DiscoverTag and DiscoverAll).
 *
 * @returns the control
 */
function StatusSegments({ request, onChange }: Omit<StoryListFiltersProps, 'sortOrder'>) {
  const { t } = useDiscoveryTranslation();
  const options = [
    { value: 'ongoing', label: t('seeAll.ongoing') },
    { value: 'completed', label: t('seeAll.completed') },
    { value: anyValue, label: t('seeAll.anyStatus') },
  ];
  return (
    <SegmentedControl
      legend={t('seeAll.status')}
      isLegendVisible={false}
      name="story-list-status"
      options={options}
      value={request.completion ?? anyValue}
      onChange={(value) =>
        onChange({
          ...request,
          completion: value === anyValue ? null : (value as CompletionStatus),
        })
      }
    />
  );
}

/**
 * The language drop-down: every language stories may be written in, open or not, so an older
 * story still filters. On the lists that follow the languages someone reads (MARKETS-2c), the
 * first choice is "Languages I read" and "Every language" turns the filter off.
 *
 * @returns the drop-down
 */
function LanguageSelect({ request, onChange }: Omit<StoryListFiltersProps, 'sortOrder'>) {
  const { t } = useDiscoveryTranslation();
  const { languages } = useStoryFormOptions();
  const firstOptions = followsReadingLanguages(request.kind)
    ? [
        { value: anyValue, label: t('seeAll.readingLanguages') },
        { value: everyLanguage, label: t('seeAll.everyLanguage') },
      ]
    : [{ value: anyValue, label: t('seeAll.anyLanguage') }];
  const languageOptions = [
    ...firstOptions,
    ...languages.map(({ code }) => ({
      value: code,
      label: t(`languages.${code}`, { ns: 'writing', defaultValue: code }),
      lang: code,
    })),
  ];
  return (
    <Select
      id="story-list-language"
      label={t('seeAll.language')}
      isLabelVisible
      options={languageOptions}
      value={request.languageCode ?? anyValue}
      onChange={(value) =>
        onChange({ ...request, languageCode: value === anyValue ? null : value })
      }
    />
  );
}

/**
 * The "Sort by" drop-down, with the sorts this kind of list offers.
 *
 * @returns the drop-down
 */
function SortSelect({ request, sortOrder, onChange }: StoryListFiltersProps) {
  const { t } = useDiscoveryTranslation();
  const sortOptions = sortChoicesFor(request.kind).map((order) => ({
    value: order,
    label: t(`sort.${order}`),
  }));
  return (
    <Select
      id="story-list-sort"
      label={t('seeAll.sortBy')}
      isLabelVisible
      options={sortOptions}
      value={sortOrder}
      onChange={(value) => onChange({ ...request, sortOrder: value as SortOrder })}
    />
  );
}

/**
 * The fields inside the panel, top to bottom: sort, status, language, "Popular in", category.
 *
 * @returns the group of filters
 */
function FilterFields({ request, sortOrder, onChange }: StoryListFiltersProps) {
  const { t } = useDiscoveryTranslation();
  const categoryOptions = useCategoryOptions();
  return (
    <div role="group" aria-label={t('seeAll.filtersLabel')} className="flex flex-col gap-6">
      <SortSelect request={request} sortOrder={sortOrder} onChange={onChange} />
      {request.kind !== 'completed' && <StatusSegments request={request} onChange={onChange} />}
      <LanguageSelect request={request} onChange={onChange} />
      {/* MARKETS-2d: Popular can be ranked by one country. */}
      {request.kind === 'popular' && (
        <PopularInSelect
          id="story-list-popular-in"
          value={request.popularIn ?? ''}
          onChange={(value) => onChange({ ...request, popularIn: value })}
        />
      )}
      {request.kind !== 'category' && categoryOptions.length > 1 && (
        <ChoiceChips
          label={t('seeAll.category')}
          isLabelVisible
          options={categoryOptions}
          value={request.categorySlug ?? anyValue}
          onChange={(value) =>
            onChange({ ...request, categorySlug: value === anyValue ? null : value })
          }
        />
      )}
    </div>
  );
}

/**
 * The short line beside the button: the status in use, then the sort ("Ongoing and completed ·
 * Sorted by: Popular", board A05).
 *
 * @returns the line's text
 */
function useFilterSummary({ request, sortOrder }: Omit<StoryListFiltersProps, 'onChange'>) {
  const { t } = useDiscoveryTranslation();
  const parts: string[] = [];
  // Step 1: the status, unless the list is Completed already.
  if (request.kind !== 'completed') {
    parts.push(
      request.completion === null ? t('seeAll.bothStatuses') : t(`seeAll.${request.completion}`),
    );
  }
  // Step 2: the sort, always.
  parts.push(t('seeAll.sortedBy', { sort: t(`sort.${sortOrder}`) }));
  return parts.join(' · ');
}

/**
 * Renders the button, the line saying what is in use, and the panel.
 *
 * @returns the filter bar
 */
export function StoryListFilters({ request, sortOrder, onChange }: StoryListFiltersProps) {
  const { t } = useDiscoveryTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const summary = useFilterSummary({ request, sortOrder });
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="secondary" aria-haspopup="dialog" onClick={() => setIsOpen(true)}>
        {t('seeAll.filterAndSort')}
      </Button>
      <p className="m-0 type-meta text-ink-muted">{summary}</p>
      <Sheet isOpen={isOpen} onClose={() => setIsOpen(false)} title={t('seeAll.filterAndSort')}>
        <FilterFields request={request} sortOrder={sortOrder} onChange={onChange} />
        <ButtonRow>
          <Button onClick={() => setIsOpen(false)}>{t('seeAll.done')}</Button>
        </ButtonRow>
      </Sheet>
    </div>
  );
}
