/**
 * useRatingsIMayGive: which ratings the writer may give a story, by their age (bundle ADMIN-2,
 * part e1; Robert, 2 Nov 2026, 08:50).
 *
 * A writer under 16 may rate a story All ages or 13+ only; everyone older may give any rating
 * (writers aged 16 and 17 included, though only readers of 18 and over read an 18+ story). The
 * database refuses anything higher whatever the screen shows (the stories_rating_fits_writer
 * trigger); this only keeps the chips honest.
 * Who calls it: StoryLabelsSection. What it calls: age_band() for the signed-in writer.
 */
import { useQuery } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { storyRatings, type StoryRating } from '@/schemas/story';

/** The ratings a writer under 16 may give. */
const ratingsUnderSixteen: readonly StoryRating[] = ['all_ages', '13_plus'];

/**
 * Follows the writer's age group.
 *
 * @returns ratings, the ones the writer may pick, and isLimited, true for a writer under 16
 */
export function useRatingsIMayGive() {
  const ageBand = useQuery({
    queryKey: ['my-age-band'],
    staleTime: 60 * 60 * 1000,
    retry: false,
    queryFn: async () => {
      const { data, error } = await (await requireClient()).rpc('age_band');
      if (error !== null) throw new Error(`Could not read your age group: ${error.message}`);
      return data;
    },
  });
  // While it loads, or if it can't be read, every chip shows; the database still decides.
  const isLimited = ageBand.data === 'under_13' || ageBand.data === '13_to_15';
  return { ratings: isLimited ? ratingsUnderSixteen : storyRatings, isLimited };
}
