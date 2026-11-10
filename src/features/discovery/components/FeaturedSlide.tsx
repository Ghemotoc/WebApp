/**
 * FeaturedSlide: one story in Featured this week (story S1-E5-10; board Discover, the big slider).
 *
 * Board values (liquid glass board Discover, bundle G7): on the light glass card, the eyebrow, the
 * title in Funnel Display at 40 px, the blurb in the soft body colour, "Read the story" as the main
 * button with the byline and chapter count beside it, and on the right the story's cover, 210 px
 * wide and tilted a little, with a soft shadow, drawn at the shelf cards' size so the whole title
 * fits on its lines (DoD covers). The cover is decorative here (the title is the
 * heading beside it), so it is hidden from screen readers; it hides under 640 px, where the text
 * needs the width.
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
 * The tilted cover (board: the slide's cover, 210 by 300 px, turned 3 degrees).
 *
 * @returns the decorative cover
 */
function TiltedCover({ story }: { story: ListedStory }) {
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
    <div aria-hidden="true" className="flex flex-[0_0_210px] justify-center max-sm:hidden">
      <span className="block w-[210px] rotate-[3deg] overflow-hidden rounded-[22px] shadow-[0_30px_60px_rgba(20,10,30,0.3)]">
        <StoryCoverArt story={story} drawn={drawn} className="w-[210px]" />
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
      className="relative flex flex-wrap items-center gap-8"
    >
      <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-3">
        <p className="eyebrow m-0">{t('featured.eyebrow')}</p>
        <h2 className="m-0 font-heading text-[clamp(30px,3.4vw,40px)] leading-[1.02] font-bold break-words text-heading">
          {story.title}
        </h2>
        {story.blurb !== '' && (
          <p className="m-0 text-base leading-relaxed text-body">{story.blurb}</p>
        )}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-2">
          <Link
            to={`/s/${story.slug}`}
            className="inline-flex h-[50px] items-center rounded-full button-main px-6 font-semibold no-underline"
          >
            {t('featured.readStory')}
          </Link>
          <span className="text-sm text-body">
            {t('card.meta', { writer: story.writer.displayName, count: story.chapterCount })}
          </span>
        </div>
      </div>
      <TiltedCover story={story} />
    </div>
  );
}
