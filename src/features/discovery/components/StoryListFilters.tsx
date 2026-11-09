/**
 * StoryListFilters: the filters on a See all, category or tag page (story S1-E5-09; board 3.10;
 * liquid glass layout from bundle G7c, boards DiscoverGenre, DiscoverTag and DiscoverAll).
 *
 * Category is a row of chips (one choice, "Any" first). Status is a segmented control, Ongoing,
 * Completed or Both, as the boards draw it; language is a drop-down of the story languages, each
 * written in its own language; "Sort by" is a drop-down of the six sorts (S1-E5-02), on the right
 * of the same row from 640 px. A filter the page already is (the category on a category page, the
 * status on Completed) isn't offered. Every change goes into the address, so the filtered list
 * can be shared (S1-E5-09, fourth criterion).
 * Board difference: the boards fold category and language into a "Filters" button; they stay on
 * the page here so nothing that worked before needs an extra click (decisions log, G7c).
 * Who uses it: StoryListPage. What it calls: useStoryFormOptions (categories and languages).
 */
import { ChoiceChips, type ChoiceOption } from '@/components/ui/ChoiceChips';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Select } from '@/components/ui/Select';
import { useStoryFormOptions } from '@/features/writing/hooks/useStoryFormOptions';

import type { CompletionStatus, ListRequest, SortOrder } from '../api/storyLists';
import { categoryAccent } from '../lib/categoryAccents';
import { sortChoicesFor } from '../lib/listAddresses';
import { useDiscoveryTranslation } from '../registerDiscoveryTranslations';

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
 * story still filters.
 *
 * @returns the drop-down
 */
function LanguageSelect({ request, onChange }: Omit<StoryListFiltersProps, 'sortOrder'>) {
  const { t } = useDiscoveryTranslation();
  const { languages } = useStoryFormOptions();
  const languageOptions = [
    { value: anyValue, label: t('seeAll.anyLanguage') },
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
 * Renders the filters: category chips first (when the page isn't a category), then one row with
 * the status and language on the left and the sort on the right.
 *
 * @returns the group of filters
 */
export function StoryListFilters({ request, sortOrder, onChange }: StoryListFiltersProps) {
  const { t } = useDiscoveryTranslation();
  const categoryOptions = useCategoryOptions();
  return (
    <div role="group" aria-label={t('seeAll.filtersLabel')} className="flex flex-col gap-5">
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
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
          {request.kind !== 'completed' && <StatusSegments request={request} onChange={onChange} />}
          <LanguageSelect request={request} onChange={onChange} />
        </div>
        <SortSelect request={request} sortOrder={sortOrder} onChange={onChange} />
      </div>
    </div>
  );
}
