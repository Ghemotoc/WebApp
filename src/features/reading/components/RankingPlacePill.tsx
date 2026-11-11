/**
 * RankingPlacePill: "#3 in Fantasy" in the story page's pill row (story S1-E15-05, bundle
 * ANALYTICS-1b; research doc "Research: reading analytics and suggestions").
 *
 * Shown only up to place 100 and only when the database gives a place (a story with no score,
 * one readers can't find in a list, or one the reader may not see gets none). A gold information
 * pill, like the other pills (DoD pill system).
 * Who shows it: StoryHeader's pill row, and the staff story page. What it calls: useRankingPlace.
 */
import { useTranslation } from 'react-i18next';

import { InfoPill } from '@/components/ui/InfoPill';

import { useRankingPlace } from '../hooks/useRankingPlace';

/**
 * Renders the pill.
 *
 * @param props.storySlug - the story's address
 * @returns the pill, or nothing
 */
export function RankingPlacePill({ storySlug }: { storySlug: string }) {
  const { t } = useTranslation('reading');
  const ranking = useRankingPlace(storySlug);
  if (ranking === null) return null;
  const category = t(`categories.${ranking.categorySlug}`, {
    ns: 'writing',
    defaultValue: ranking.categorySlug,
  });
  return (
    <InfoPill tone="gold">
      {t('storyPage.rankingPlace', { place: ranking.place, category })}
    </InfoPill>
  );
}
