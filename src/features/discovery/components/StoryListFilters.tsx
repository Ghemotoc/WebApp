/**
 * StoryListFilters: the filters on a See all, category or tag page (story S1-E5-09; board 3.10).
 *
 * Category and status are chips (one choice each, "Any" first); language is a drop-down of the
 * open story languages, each written in its own language. A filter the page already is (the
 * category on a category page, the status on Completed) isn't offered. Every change goes into the
 * address, so the filtered list can be shared (S1-E5-09, fourth criterion).
 * Who uses it: StoryListPage. What it calls: useStoryFormOptions (categories and languages).
 */
import { ChoiceChips, type ChoiceOption } from '@/components/ui/ChoiceChips';
import { Select } from '@/components/ui/Select';
import { useStoryFormOptions } from '@/features/writing/hooks/useStoryFormOptions';

import type { CompletionStatus, ListRequest } from '../api/storyLists';
import { categoryAccent } from '../lib/categoryAccents';
import { useDiscoveryTranslation } from '../registerDiscoveryTranslations';

/** What the filters need. */
export interface StoryListFiltersProps {
  request: ListRequest;
  /** Called with the request after one filter changed. */
  onChange: (request: ListRequest) => void;
}

/** The value the chips and the drop-down use for "Any". */
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
 * Renders the filters.
 *
 * @returns the group of filters
 */
export function StoryListFilters({ request, onChange }: StoryListFiltersProps) {
  const { t } = useDiscoveryTranslation();
  const { languages } = useStoryFormOptions();
  const categoryOptions = useCategoryOptions();
  const statusOptions: ChoiceOption[] = [
    { value: anyValue, label: t('seeAll.anyStatus') },
    { value: 'ongoing', label: t('seeAll.ongoing') },
    { value: 'completed', label: t('seeAll.completed') },
  ];
  const languageOptions = [
    { value: anyValue, label: t('seeAll.anyLanguage') },
    ...languages.map((code) => ({
      value: code,
      label: t(`languages.${code}`, { ns: 'writing' }),
      lang: code,
    })),
  ];
  return (
    <div role="group" aria-label={t('seeAll.filtersLabel')} className="flex flex-col gap-4">
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
      {request.kind !== 'completed' && (
        <ChoiceChips
          label={t('seeAll.status')}
          isLabelVisible
          options={statusOptions}
          value={request.completion ?? anyValue}
          onChange={(value) =>
            onChange({
              ...request,
              completion: value === anyValue ? null : (value as CompletionStatus),
            })
          }
        />
      )}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
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
      </div>
    </div>
  );
}
