/**
 * StaffStoryFiltersBar: the Staff › Stories search and filters (bundle ADMIN-2, part a; story
 * S1-E11-07 criterion 2; board AdminStories 8.10).
 *
 * The search field, the status chips (All, Draft, Published, Hidden, Removed), drop-downs for
 * category, language, rating and where a story can be read, and two switches: Open reports and
 * Writers under 18. Each drop-down is only as wide as its longest option (DoD drop-down rule).
 * Who shows it: StaffStoriesPage. What it calls: useStoryFormOptions (the categories and
 * languages writers choose from) and the setFilters it is given.
 */
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Select, type SelectOption } from '@/components/ui/Select';
import { TextInput } from '@/components/ui/TextInput';
import { useStoryFormOptions } from '@/features/writing/hooks/useStoryFormOptions';

import {
  staffStoryAudiences,
  staffStoryStatuses,
  type StaffStoryFilters,
} from '../../api/staffStories';
import { useStaffStoryWords } from '../../hooks/useStaffStoryWords';
import { staffStoryRatings } from '../../lib/staffStoryFilters';

/** What the bar needs. */
interface StaffStoryFiltersBarProps {
  filters: StaffStoryFilters;
  setFilters: (next: StaffStoryFilters) => void;
}

/** The value a drop-down uses for "all". */
const everyValue = '';

/**
 * The search field. It searches on submit, not on every key, as the Users search does.
 *
 * @returns the form
 */
function StorySearchForm({ filters, setFilters }: StaffStoryFiltersBarProps) {
  const { t } = useTranslation('staff');
  const [text, setText] = useState(filters.searchText);

  /** Runs the search with what was typed, keeping the filters. */
  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFilters({ ...filters, searchText: text.trim() });
  }

  return (
    <form
      role="search"
      aria-label={t('stories.searchFormLabel')}
      onSubmit={handleSubmit}
      className="flex flex-wrap items-end gap-3"
    >
      <div className="w-full max-w-[560px]">
        <TextInput
          id="stories-search"
          label={t('stories.searchLabel')}
          hint={t('stories.searchHint')}
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
      </div>
      <Button type="submit">{t('stories.search')}</Button>
    </form>
  );
}

/**
 * The status chips: one pressed at a time, All when no status is chosen.
 *
 * @returns the chip group
 */
function StatusChips({ filters, setFilters }: StaffStoryFiltersBarProps) {
  const { t } = useTranslation('staff');
  const words = useStaffStoryWords();
  return (
    <div role="group" aria-label={t('stories.statusLabel')} className="flex flex-wrap gap-2">
      <Chip
        isPressed={filters.status === null}
        onPressedChange={() => setFilters({ ...filters, status: null })}
      >
        {t('stories.allStatuses')}
      </Chip>
      {staffStoryStatuses.map((status) => (
        <Chip
          key={status}
          isPressed={filters.status === status}
          onPressedChange={(isPressed) =>
            setFilters({ ...filters, status: isPressed ? status : null })
          }
        >
          {words.status(status)}
        </Chip>
      ))}
    </div>
  );
}

/**
 * The options of each drop-down, "all" first.
 *
 * @returns category, language, rating and audience options
 */
function useDropDownOptions() {
  const { t } = useTranslation('staff');
  const words = useStaffStoryWords();
  const { categories, languages } = useStoryFormOptions();
  const withAll = (allLabel: string, options: SelectOption[]) => [
    { value: everyValue, label: allLabel },
    ...options,
  ];
  return {
    categories: withAll(
      t('stories.allCategories'),
      categories.map((category) => ({
        value: category.slug,
        label: words.category(category.slug),
      })),
    ),
    languages: withAll(
      t('stories.allLanguages'),
      languages.map((language) => ({
        value: language.code,
        label: words.language(language.code),
        lang: language.code,
      })),
    ),
    ratings: withAll(
      t('stories.allRatings'),
      staffStoryRatings.map((rating) => ({ value: rating, label: words.rating(rating) })),
    ),
    audiences: withAll(
      t('stories.allAudiences'),
      staffStoryAudiences.map((audience) => ({ value: audience, label: words.audience(audience) })),
    ),
  };
}

/**
 * The four drop-downs.
 *
 * @returns the drop-downs
 */
function FilterDropDowns({ filters, setFilters }: StaffStoryFiltersBarProps) {
  const { t } = useTranslation('staff');
  const options = useDropDownOptions();
  // A drop-down's "all" value becomes null in the filters.
  const chosen = (value: string) => (value === everyValue ? null : value);
  return (
    <div className="flex flex-wrap gap-3">
      <Select
        id="stories-category"
        label={t('stories.categoryLabel')}
        options={options.categories}
        value={filters.categorySlug ?? everyValue}
        onChange={(value) => setFilters({ ...filters, categorySlug: chosen(value) })}
      />
      <Select
        id="stories-language"
        label={t('stories.languageLabel')}
        options={options.languages}
        value={filters.languageCode ?? everyValue}
        onChange={(value) => setFilters({ ...filters, languageCode: chosen(value) })}
      />
      <Select
        id="stories-rating"
        label={t('stories.ratingLabel')}
        options={options.ratings}
        value={filters.rating ?? everyValue}
        onChange={(value) =>
          setFilters({
            ...filters,
            rating: staffStoryRatings.find((rating) => rating === value) ?? null,
          })
        }
      />
      <Select
        id="stories-audience"
        label={t('stories.audienceLabel')}
        options={options.audiences}
        value={filters.readableBy ?? everyValue}
        onChange={(value) =>
          setFilters({
            ...filters,
            readableBy: staffStoryAudiences.find((audience) => audience === value) ?? null,
          })
        }
      />
    </div>
  );
}

/**
 * Renders the search and every filter.
 *
 * @returns the bar
 */
export function StaffStoryFiltersBar({ filters, setFilters }: StaffStoryFiltersBarProps) {
  const { t } = useTranslation('staff');
  return (
    <div className="flex flex-col gap-4">
      {/* Keyed by the searched text, so Back to an earlier search shows that text again. */}
      <StorySearchForm key={filters.searchText} filters={filters} setFilters={setFilters} />
      <div className="flex flex-wrap items-center gap-3">
        <StatusChips filters={filters} setFilters={setFilters} />
        <FilterDropDowns filters={filters} setFilters={setFilters} />
        <div className="flex flex-wrap gap-2">
          <Chip
            isPressed={filters.onlyOpenReports}
            onPressedChange={(isPressed) => setFilters({ ...filters, onlyOpenReports: isPressed })}
          >
            {t('stories.openReports')}
          </Chip>
          <Chip
            isPressed={filters.onlyMinorWriters}
            onPressedChange={(isPressed) => setFilters({ ...filters, onlyMinorWriters: isPressed })}
          >
            {t('stories.minorWriters')}
          </Chip>
        </div>
      </div>
    </div>
  );
}
