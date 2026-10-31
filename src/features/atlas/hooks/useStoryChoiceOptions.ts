/**
 * useStoryChoiceOptions: the genre and audience drop-downs' options (stories S1-E17-03 and
 * S1-E17-29), in the writer's language.
 *
 * The genre is the story's category and the audience its rating, the same lists as New story and
 * Story settings (S1-E3-01 and S1-E3-06), so both sides offer the same choices.
 * Who calls it: StoryDetailsSection and MarketingStoryFields. What it calls: useStoryFormOptions
 * for the categories; storyRatings for the ratings.
 */
import { useTranslation } from 'react-i18next';

import type { SelectOption } from '@/components/ui/Select';
import { useStoryFormOptions } from '@/features/writing/hooks/useStoryFormOptions';
import { storyRatings } from '@/schemas/story';

/**
 * Builds the two lists.
 *
 * @returns genreOptions (empty until the categories load) and audienceOptions
 */
export function useStoryChoiceOptions(): {
  genreOptions: SelectOption[];
  audienceOptions: SelectOption[];
} {
  const { t: tWriting } = useTranslation('writing');
  const { categories } = useStoryFormOptions();
  // Each genre's name comes from the writing feature's own words, with the slug as a fallback.
  const genreOptions = categories.map((category) => ({
    value: category.slug,
    label: tWriting(`categories.${category.slug}`, { defaultValue: category.slug }),
  }));
  // The four ratings, worded as in Story settings.
  const audienceOptions = storyRatings.map((rating) => ({
    value: rating,
    label: tWriting(`rating.${rating}`),
  }));
  return { genreOptions, audienceOptions };
}
