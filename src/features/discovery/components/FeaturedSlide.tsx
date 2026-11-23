/**
 * FeaturedSlide: one story in Featured this week, the Read page's hero (story S1-E5-10; since
 * CALM-7c the simplified board New-Read, "Hero: today's featured carousel").
 *
 * Board values: the cover on the left (220 px from 640 px, a 140 px cover above the words on a
 * phone); on the right the meta line with the state first ("**New chapter** · Featured this
 * week", the state only when a chapter came out in the last seven days), the title, "by
 * <writer>" with the writer's name as a profile link, the facts as a second meta line (category,
 * rating, chapters), the blurb, then "Read the story" (the page's one main button) and "Add to
 * library" (quiet). The board's read count isn't in the list the band reads, so it is left out.
 * The cover is decorative here (the title is the heading beside it), so it is hidden from screen
 * readers.
 * Who shows it: FeaturedBand. What it calls: StoryCoverArt and DrawnCover (the cover every shelf
 * draws), MetaLine, lib/recentUpdates and FeaturedLibraryButton.
 */
import { Link } from 'react-router';

import { resolveCoverChoice } from '@/components/covers/automaticCover';
import { DrawnCover } from '@/components/covers/DrawnCover';
import { MetaLine, type MetaFact } from '@/components/ui/MetaLine';
import { StoryCoverArt } from '@/features/pictures/components/StoryCoverArt';

import type { ListedStory } from '../api/storyLists';
import { hadChapterThisWeek } from '../lib/recentUpdates';
import { useDiscoveryTranslation } from '../registerDiscoveryTranslations';

import { FeaturedLibraryButton } from './FeaturedLibraryButton';

/** What a slide needs. */
export interface FeaturedSlideProps {
  story: ListedStory;
  /** Its place in the band, from 1, and how many there are, for the slide's name. */
  position: number;
  count: number;
}

/**
 * The cover, the same drawing every shelf uses, so the whole title shows (DoD covers).
 *
 * @param props.story - the featured story
 * @returns the decorative cover
 */
function SlideCover({ story }: { story: ListedStory }) {
  const drawn = (
    <DrawnCover
      title={story.title}
      penName={story.writer.displayName}
      choice={resolveCoverChoice(story)}
      size="shelf"
      isDecorative
      className="w-full"
    />
  );
  return (
    <div aria-hidden="true" className="w-[140px] shrink-0 sm:w-[220px]">
      <StoryCoverArt story={story} drawn={drawn} className="w-full" />
    </div>
  );
}

/**
 * The two meta lines' facts: the state line above the title and the story's facts under the byline.
 *
 * @param story - the featured story
 * @param t - the discovery namespace's translate function
 * @returns the state facts and the story facts
 */
function slideFacts(
  story: ListedStory,
  t: ReturnType<typeof useDiscoveryTranslation>['t'],
): { stateFacts: MetaFact[]; storyFacts: MetaFact[] } {
  // Step 1: "New chapter" first, only when one came out this week; then the band's own name.
  const stateFacts: MetaFact[] = [];
  if (hadChapterThisWeek(story)) stateFacts.push({ text: t('featured.newChapter'), kind: 'state' });
  stateFacts.push({ text: t('featured.eyebrow') });
  // Step 2: the category, the rating and the chapter count, the way the story page writes them.
  const storyFacts: MetaFact[] = [
    {
      text: t(`categories.${story.categorySlug}`, {
        ns: 'writing',
        defaultValue: story.categorySlug,
      }),
    },
    { text: t(`rating.${story.rating}`, { ns: 'writing' }) },
    { text: t('featured.chapters', { count: story.chapterCount }) },
  ];
  return { stateFacts, storyFacts };
}

/**
 * Renders the slide.
 *
 * @returns the slide group
 */
export function FeaturedSlide({ story, position, count }: FeaturedSlideProps) {
  const { t } = useDiscoveryTranslation();
  const { stateFacts, storyFacts } = slideFacts(story, t);
  return (
    <div
      role="group"
      aria-roledescription={t('featured.slide')}
      aria-label={t('featured.slideLabel', { position, count, title: story.title })}
      className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8"
    >
      <SlideCover story={story} />
      <div className="flex min-w-0 flex-1 flex-col items-start gap-3">
        <MetaLine facts={stateFacts} />
        <h2 className="m-0 type-display break-words">{story.title}</h2>
        <p className="m-0 type-body text-ink-muted">
          {t('featured.by')}{' '}
          <Link
            to={`/u/${encodeURIComponent(story.writer.handle)}`}
            className="font-semibold text-link underline"
          >
            {story.writer.displayName}
          </Link>
        </p>
        <MetaLine facts={storyFacts} />
        {story.blurb !== '' && (
          <p className="m-0 max-w-[62ch] type-body text-ink-muted">{story.blurb}</p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <Link
            to={`/s/${story.slug}`}
            className="inline-flex h-11 items-center rounded-full button-main px-6 font-semibold no-underline"
          >
            {t('featured.readStory')}
          </Link>
          <FeaturedLibraryButton storySlug={story.slug} />
        </div>
      </div>
    </div>
  );
}
