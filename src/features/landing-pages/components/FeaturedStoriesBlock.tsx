/**
 * FeaturedStoriesBlock: a landing page's Featured stories, one scrolling line of story cards
 * (story S1-E11-14 criterion 7; bundle CONTESTS-13a2a; CLAUDE.md rule 20).
 *
 * The cards come from the database already filtered: only stories every public list may show,
 * rated for the page's youngest readers, so a story hidden by moderation is gone at once. The
 * editor's preview has no cards (they are picked when the page is read), so it says so.
 * Who shows it: LandingBlockView. What it calls: Shelf and ListedStoryCard from Discover.
 */
import { designsForRow, resolveCoverChoice } from '@/components/covers/automaticCover';
import { Shelf } from '@/components/ui/Shelf';
import type { ListedStory } from '@/features/discovery/api/storyLists';
import { ListedStoryCard } from '@/features/discovery/components/ListedStoryCard';
import type { LandingBlock, LandingLanguage } from '@/schemas/landingPages';

import { wordsOf } from '../lib/blocks';
import { useLandingPageTranslation } from '../registerLandingPageTranslations';

/** What the block needs. */
interface FeaturedStoriesBlockProps {
  block: LandingBlock;
  language: LandingLanguage;
  /** The cards for this block; null in the editor's preview. */
  stories: ListedStory[] | null;
}

/**
 * The address of "View more": the tag's own list, or Discover for stories picked by hand. A
 * Featured block holds at most 12, so the card shows only if that ever changes.
 *
 * @returns the address
 */
function seeAllHrefOf(block: LandingBlock): string {
  const tag = block.tag ?? '';
  return block.mode === 'tag' && tag !== ''
    ? `/discover/t/${encodeURIComponent(tag)}`
    : '/discover';
}

/**
 * Renders the shelf, or a short note when there is nothing to show.
 *
 * @returns the section
 */
export function FeaturedStoriesBlock({ block, language, stories }: FeaturedStoriesBlockProps) {
  const { t } = useLandingPageTranslation();
  const heading = wordsOf(block, language, 'heading');
  const intro = wordsOf(block, language, 'intro');
  const cards = stories ?? [];
  const covers = designsForRow(cards);
  return (
    <div className="flex min-w-0 flex-col gap-3">
      {cards.length > 0 ? (
        <Shelf
          title={heading}
          seeAllHref={seeAllHrefOf(block)}
          items={cards.map((story, index) => ({
            key: story.slug,
            content: (
              <ListedStoryCard story={story} cover={covers[index] ?? resolveCoverChoice(story)} />
            ),
          }))}
        />
      ) : (
        <section className="flex flex-col gap-2">
          <h2 className="m-0 font-heading text-[26px] font-bold text-heading">{heading}</h2>
          <p className="m-0 text-sm text-meta">
            {stories === null ? t('featured.previewNote') : t('featured.none')}
          </p>
        </section>
      )}
      {intro !== '' && <p className="m-0 text-body">{intro}</p>}
    </div>
  );
}
