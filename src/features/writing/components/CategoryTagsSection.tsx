/**
 * CategoryTagsSection: "Category and tags" (story S1-E3-01; board NewStory 4.2, section 2).
 *
 * Board values: the category as choice chips with a coloured dot (Fiction #4D1B5E, Poetry
 * #2E4A8C, Essays #2F6B4F; decided 16 Oct 2026, Q52: fiction, poetry and nonfiction essays, no
 * journalism); the tag box with "n of 10 tags".
 * Who uses it: NewStoryPage.
 */
import { useTranslation } from 'react-i18next';

import { ChoiceChips } from '@/components/ui/ChoiceChips';

import type { StoryCategory } from '../api/stories';
import type { FieldErrors, NewStoryAnswers } from '../hooks/useNewStoryForm';

import { FormSection } from './FormSection';
import { TagInput } from './TagInput';

/** The board's dot colour for each category. */
const categoryDots: Record<string, string> = {
  fiction: '#4D1B5E',
  poetry: '#2E4A8C',
  nonfiction_essays: '#2F6B4F',
};

/** What the section needs. */
export interface CategoryTagsSectionProps {
  answers: NewStoryAnswers;
  errors: FieldErrors;
  categories: StoryCategory[];
  set: <Field extends keyof NewStoryAnswers>(field: Field, value: NewStoryAnswers[Field]) => void;
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
      <TagInput
        tags={answers.tags}
        onChange={(tags) => set('tags', tags)}
        errorMessage={errors.tags === undefined ? undefined : t(errors.tags)}
      />
    </FormSection>
  );
}
