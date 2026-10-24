/**
 * StoryLabelPills: the pills a story's labels add to its card, preview and page (story
 * S1-E3-06; boards NewStory 4.2, WriterDashboard 4.1 and Story 3.4).
 *
 * What it shows: the rating when it is 13+, 16+ or 18+ (All ages adds no pill: the story page's
 * label rows still say it), "Fan fiction" and "Parody" when ticked, the AI answer when AI was
 * used, and "AI-written, not disclosed" when staff added that label after confirmed reports
 * (Q24). Tones follow the pill system (DoD): information pills in pastel tints.
 * Who uses it: StoryPreviewAside and WriterStoryCard (src/features/writing/) and StoryHeader.
 */
import { useTranslation } from 'react-i18next';

import { InfoPill, type PillTone } from '@/components/ui/InfoPill';
import type { AiDisclosure, StoryRating } from '@/schemas/story';

/** The labels as every screen holds them. */
export interface StoryLabelValues {
  rating: StoryRating | null;
  isFanFiction: boolean;
  isParody: boolean;
  aiDisclosure: AiDisclosure | null;
  /** True once staff labelled the story "AI-written, not disclosed". */
  aiUndisclosedLabelled: boolean;
}

/** One hue per rating, so readers learn the colour: 13+ sky, 16+ gold, 18+ blush. */
const ratingTone: Record<StoryRating, PillTone> = {
  all_ages: 'sage',
  '13_plus': 'sky',
  '16_plus': 'gold',
  '18_plus': 'blush',
};

/**
 * Renders the pills; nothing when the story has no label to show.
 *
 * @returns the pills, each an InfoPill
 */
export function StoryLabelPills({ labels }: { labels: StoryLabelValues }) {
  const { t } = useTranslation('writing');
  const showsAi = labels.aiDisclosure !== null && labels.aiDisclosure !== 'no_ai';
  return (
    <>
      {labels.rating !== null && labels.rating !== 'all_ages' && (
        <InfoPill tone={ratingTone[labels.rating]}>{t(`rating.${labels.rating}`)}</InfoPill>
      )}
      {labels.isFanFiction && <InfoPill tone="neutral">{t('pills.fanFiction')}</InfoPill>}
      {labels.isParody && <InfoPill tone="neutral">{t('pills.parody')}</InfoPill>}
      {showsAi && labels.aiDisclosure !== null && (
        <InfoPill tone="sky">{t(`aiDisclosure.${labels.aiDisclosure}`)}</InfoPill>
      )}
      {labels.aiUndisclosedLabelled && (
        <InfoPill tone="blush">{t('aiDisclosure.undisclosed')}</InfoPill>
      )}
    </>
  );
}
