/**
 * ListedStoryCard: one story in a shelf or a See all grid (stories S1-E5-01, S1-E5-09).
 *
 * It is the shared StoryCard (the drawn or automatic cover with the full title, the title as text
 * and a meta line) with the writer's name, the chapter count and an Ongoing or Completed pill.
 * The cover is chosen by the list (designsForRow()), so two neighbours never share an automatic
 * design (S1-E3-13).
 * Who uses it: DiscoverShelf and StoryGrid.
 */
import type { DrawnCoverChoice } from '@/components/covers/coverDesigns';
import { InfoPill } from '@/components/ui/InfoPill';
import { StoryCard } from '@/components/ui/StoryCard';

import type { ListedStory } from '../api/storyLists';
import { useDiscoveryTranslation } from '../registerDiscoveryTranslations';

/**
 * Renders the card.
 *
 * @param props.story - the story
 * @param props.cover - the cover this list gives it
 * @param props.isFluid - fill the grid column (See all) instead of 196 px (shelves)
 * @returns the card, one link to the story page
 */
export function ListedStoryCard(props: {
  story: ListedStory;
  cover: DrawnCoverChoice;
  /** True in the See all grid: the card fills its column. */
  isFluid?: boolean;
}) {
  const { story, cover, isFluid = false } = props;
  const { t } = useDiscoveryTranslation();
  return (
    <StoryCard
      title={story.title}
      metaLine={t('card.meta', { writer: story.writer.displayName, count: story.chapterCount })}
      cover={cover}
      href={`/s/${story.slug}`}
      isFluid={isFluid}
      pill={
        <InfoPill tone={story.completionStatus === 'completed' ? 'gold' : 'sage'}>
          {t(`status.${story.completionStatus}`, { ns: 'writing' })}
        </InfoPill>
      }
    />
  );
}
