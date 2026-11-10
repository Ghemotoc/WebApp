/**
 * ListedStoryCard: one story in a shelf or a See all grid (stories S1-E5-01, S1-E5-09).
 *
 * It is the shared StoryCard (the drawn or automatic cover with the full title, the title as text
 * and a meta line) with the writer's name, the chapter count and an Ongoing or Completed pill.
 * The cover is chosen by the list (designsForRow()), so two neighbours never share an automatic
 * design (S1-E3-13). An uploaded cover shows through StoryCoverArt once it passes its check
 * (S1-E10-05). Beside the status pill sits the writer's gold rank pill (IDEAS-3a), when the
 * database sends one: never for a classic, a writer who blocked the reader or a private profile.
 * An "In the app only" pill shows when the writer chose it and the switch for it is on (GAPS-15;
 * Q4, 16 Oct 2026: the label shows wherever stories appear on the website).
 * Who uses it: DiscoverShelf and StoryGrid.
 */
import type { DrawnCoverChoice } from '@/components/covers/coverDesigns';
import { InfoPill } from '@/components/ui/InfoPill';
import { StoryCard } from '@/components/ui/StoryCard';
import { RankChip } from '@/features/forums/components/RankChip';
import { StoryCoverArt } from '@/features/pictures/components/StoryCoverArt';

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
      wrapCover={(drawn) => (
        <StoryCoverArt story={story} drawn={drawn} className={isFluid ? 'w-full' : 'w-[165px]'} />
      )}
      pill={
        <span className="flex flex-wrap gap-1.5">
          {/* Robert, 6 Nov 2026: only "Ongoing" shows as a pill; "Completed" is a filter. */}
          {story.completionStatus === 'ongoing' && (
            <InfoPill tone="sage">{t('status.ongoing', { ns: 'writing' })}</InfoPill>
          )}
          {story.appOnly && <InfoPill tone="plum">{t('card.appOnly')}</InfoPill>}
          {story.writer.rank !== null && <RankChip rank={story.writer.rank} />}
        </span>
      }
    />
  );
}
