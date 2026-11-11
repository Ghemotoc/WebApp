/**
 * StaffRankingPlace: the story's place in its category on the staff story page, "#3 in Fantasy"
 * or "Not in the first 100" (story S1-E15-05, bundle ANALYTICS-1b).
 *
 * The same place readers see on the story page, from story_rank_place(), which staff who may view
 * stories always get. Who shows it: StaffStoryPage's details. What it calls: useRankingPlace.
 */
import { useTranslation } from 'react-i18next';

import { useRankingPlace } from '@/features/reading/hooks/useRankingPlace';

/**
 * Renders the place.
 *
 * @param props.storySlug - the story's address
 * @returns the text
 */
export function StaffRankingPlace({ storySlug }: { storySlug: string }) {
  const { t } = useTranslation('staff');
  const ranking = useRankingPlace(storySlug);
  if (ranking === null) return <>{t('stories.page.notRanked')}</>;
  const category = t(`categories.${ranking.categorySlug}`, {
    ns: 'writing',
    defaultValue: ranking.categorySlug,
  });
  return <>{t('stories.page.rankingPlace', { place: ranking.place, category })}</>;
}
