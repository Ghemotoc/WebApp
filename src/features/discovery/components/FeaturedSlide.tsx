/**
 * FeaturedSlide: one story in Featured this week (story S1-E5-10; board Discover, the big slider).
 *
 * The dark plum card holds the eyebrow, the title, the blurb, "Read the story", the byline and
 * chapter count, and on the right the story's cover in front of a tilted gold card. The cover is
 * decorative here (the title is the heading beside it), so it is hidden from screen readers.
 * Who shows it: FeaturedBand. What it calls: StoryCoverArt and DrawnCover, the same cover as on
 * every shelf.
 */
import { Link } from 'react-router';

import { resolveCoverChoice } from '@/components/covers/automaticCover';
import { DrawnCover } from '@/components/covers/DrawnCover';
import { StoryCoverArt } from '@/features/pictures/components/StoryCoverArt';

import type { ListedStory } from '../api/storyLists';
import { useDiscoveryTranslation } from '../registerDiscoveryTranslations';

/** What a slide needs. */
export interface FeaturedSlideProps {
  story: ListedStory;
  /** Its place in the band, from 1, and how many there are, for the slide's name. */
  position: number;
  count: number;
}

/**
 * The cover in front of a tilted gold card (board: "artBack" and "artFront").
 *
 * @returns the decorative cover pair
 */
function CoverPair({ story }: { story: ListedStory }) {
  const drawn = (
    <DrawnCover
      title={story.title}
      penName={story.writer.displayName}
      choice={resolveCoverChoice(story)}
      size="card"
      isDecorative
      className="w-full"
    />
  );
  return (
    <div
      aria-hidden="true"
      className="relative flex min-h-[260px] flex-[0_1_300px] items-center justify-center max-sm:hidden"
    >
      <span className="absolute h-[250px] w-[160px] translate-x-8 rotate-[8deg] rounded-[16px] bg-gold/80" />
      <span className="relative block w-[170px] -rotate-[4deg] shadow-[0_24px_40px_-20px_rgba(0,0,0,0.6)]">
        <StoryCoverArt story={story} drawn={drawn} className="w-[170px]" />
      </span>
    </div>
  );
}

/**
 * Renders the slide.
 *
 * @returns the slide group
 */
export function FeaturedSlide({ story, position, count }: FeaturedSlideProps) {
  const { t } = useDiscoveryTranslation();
  return (
    <div
      role="group"
      aria-roledescription={t('featured.slide')}
      aria-label={t('featured.slideLabel', { position, count, title: story.title })}
      className="flex flex-wrap items-center gap-8 px-[clamp(24px,4vw,56px)] pt-[clamp(28px,4vw,48px)] pb-24"
    >
      <div className="flex max-w-[640px] min-w-0 flex-[1_1_380px] flex-col gap-4">
        {/* The eyebrow's look, in gold so it reads on the dark card (about 9:1). */}
        <p className="eyebrow m-0 text-gold">{t('featured.eyebrow')}</p>
        <h2 className="m-0 font-heading text-[clamp(30px,4.4vw,52px)] leading-[1.02] font-extrabold tracking-[-0.02em] break-words text-on-featured">
          {story.title}
        </h2>
        {story.blurb !== '' && (
          <p className="m-0 text-[17px] leading-relaxed text-on-featured-soft">{story.blurb}</p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-4">
          <Link
            to={`/s/${story.slug}`}
            className="inline-flex min-h-12 items-center rounded-full bg-gold px-6 font-semibold text-on-gold no-underline hover:bg-gold/90"
          >
            {t('featured.readStory')}
          </Link>
          <span className="text-sm text-on-featured-soft">
            {t('card.meta', { writer: story.writer.displayName, count: story.chapterCount })}
          </span>
        </div>
      </div>
      <CoverPair story={story} />
    </div>
  );
}
