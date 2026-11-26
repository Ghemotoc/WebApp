/**
 * CategoryTagsSection: "Category and tags" (story S1-E3-01; board NewStory 4.2, section 2).
 *
 * Board values: the category as choice chips with a coloured dot (Fiction #4D1B5E, Poetry
 * #2E4A8C, Essays #2F6B4F; decided 16 Oct 2026, Q52: fiction, poetry and nonfiction essays, no
 * journalism); then "Set in", up to five countries the story takes place in (CALM-9, board D02:
 * no longer a tag); then the genres, up to three bookshop genres picked by typing (S1-E3-01;
 * Robert, 26 Nov 2026); then the tag box with "n of 10 tags". The category stays the broad
 * choice; a genre sits beside it.
 * Who uses it: NewStoryPage (step 2 of the wizard) and StorySettingsPage.
 */
import { useTranslation } from 'react-i18next';

import { ChoiceChips } from '@/components/ui/ChoiceChips';

import type { StoryCategory } from '../api/stories';
import type { SetStoryAnswer, StoryAnswers, StoryFieldErrors } from '../hooks/storyAnswers';

import { FormSection } from './FormSection';
import { GenrePickerField } from './GenrePickerField';
import { SetInCountriesField } from './SetInCountriesField';
import { TagInput } from './TagInput';

/** The board's dot colour for each category, from the tokens (CALM-7a: no colours in a page). */
const categoryDots: Record<string, string> = {
  fiction: 'var(--category-fiction)',
  poetry: 'var(--category-poetry)',
  nonfiction_essays: 'var(--category-essays)',
};

/** What the section needs. */
export interface CategoryTagsSectionProps {
  answers: StoryAnswers;
  errors: StoryFieldErrors;
  categories: StoryCategory[];
  set: SetStoryAnswer;
}

/**
 * Renders the section.
 *
 * @returns the fieldset
 */
export function CategoryTagsSection({
  answers,
  errors,
  categories,
  set,
}: CategoryTagsSectionProps) {
  const { t } = useTranslation('writing');
  return (
    <FormSection legend={t('newStory.categoryAndTags')}>
      <ChoiceChips
        label={t('newStory.category')}
        options={categories.map((category) => ({
          value: category.slug,
          label: t(`categories.${category.slug}`, { defaultValue: category.slug }),
          dotColour: categoryDots[category.slug],
        }))}
        value={answers.categorySlug}
        onChange={(value) => set('categorySlug', value)}
        descriptionId={errors.categorySlug === undefined ? undefined : 'story-category-error'}
        description={errors.categorySlug === undefined ? undefined : t(errors.categorySlug)}
      />
      <GenrePickerField
        genreSlugs={answers.genreSlugs}
        onChange={(genreSlugs) => set('genreSlugs', genreSlugs)}
        rating={answers.rating}
        errorMessage={errors.genreSlugs === undefined ? undefined : t(errors.genreSlugs)}
      />
      <SetInCountriesField
        countries={answers.setInCountries}
        onChange={(countries) => set('setInCountries', countries)}
        errorMessage={errors.setInCountries === undefined ? undefined : t(errors.setInCountries)}
      />
      <TagInput
        tags={answers.tags}
        onChange={(tags) => set('tags', tags)}
        errorMessage={errors.tags === undefined ? undefined : t(errors.tags)}
      />
    </FormSection>
  );
}
