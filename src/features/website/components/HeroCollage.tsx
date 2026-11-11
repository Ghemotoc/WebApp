/**
 * HeroCollage: the wall of tilted story covers beside the home page's headline, with the gold
 * "Your rights" card (bundle LOOK-2, the design catch-up; board Website-Home, the
 * cover wall). Robert gave the go on 6 Nov 2026, 06:43 UTC.
 *
 * What it shows:
 *   - up to six covers from the public Trending list, in three staggered columns tilted by
 *     -3 degrees. Only All ages and 13+ stories, whoever is looking, because the cover wall is
 *     the site's first picture and must suit every visitor (brief LOOK-2). Nothing is invented:
 *     with no such stories the wall shows only the card;
 *   - the "Your rights" card, whose words come only from the CMS (rightsCard; CLAUDE.md rule 4).
 *     It is hidden while its title is empty.
 * Its two doodles went with bundle G4 (no doodles in the liquid glass design).
 *   - the reader comment card at the bottom left (HomeCommentCard, bundle GAPS-13): a real
 *     comment staff picked and whose reader agreed to show it; absent when there is none or
 *     the wall has no cover, and placed under the covers when they fill only one row.
 * The wall is at most 600 px wide, its width beside the headline on a desktop, so on a tablet,
 * where it moves under the headline, the covers keep their size instead of filling the screen.
 * Who uses it: HomeHero. What it calls: useStoryShelf('popular'), the same request as the
 * Trending shelf further down, so the browser asks the database once; wallStories() to pick the
 * stories; DrawnCover through designsForRow(), so two neighbours never share a design.
 */
import { useTranslation } from 'react-i18next';

import { designsForRow } from '@/components/covers/automaticCover';
import { DrawnCover } from '@/components/covers/DrawnCover';
import type { ListedStory, ListRequest } from '@/features/discovery/api/storyLists';
import { useStoryShelf } from '@/features/discovery/hooks/useStoryShelf';
import type { HomeRightsCard } from '@/schemas/websiteContent';

import { withBrand } from '../lib/brandText';
import { wallStories } from '../lib/wallStories';

import { HomeCommentCard } from './HomeCommentCard';

/** The public Trending list, exactly as the Trending shelf asks for it (one cached request). */
const trendingRequest: ListRequest = {
  kind: 'popular',
  key: null,
  categorySlug: null,
  completion: null,
  languageCode: null,
  sortOrder: null,
};

/** How many covers fill the wall's first row; a fourth starts the second. */
const coversInOneRow = 3;

/** Each column's push down from the top, so the three are staggered as on the board. */
const columnOffsets = ['mt-14', 'mt-0', 'mt-[104px]'] as const;

/**
 * The covers in three staggered columns.
 *
 * @returns the columns, or nothing when there is no story to show
 */
function CoverColumns({ stories }: { stories: ListedStory[] }) {
  const { t } = useTranslation();
  if (stories.length === 0) return null;
  // Step 1: one design per story, never the same as its neighbour (S1-E3-13), paired with
  // its story. designsForRow gives exactly one design per story, so no pair is dropped.
  const covers = designsForRow(stories);
  const tiles = stories.flatMap((story, index) => {
    const cover = covers[index];
    return cover === undefined ? [] : [{ story, cover, index }];
  });
  // Step 2: deal the tiles into three columns, left to right, top to bottom.
  const columns = [0, 1, 2].map((column) => tiles.filter((tile) => tile.index % 3 === column));
  const titles = stories.map((story) => story.title).join(', ');
  return (
    // One picture for screen readers, named by its titles, as on the board.
    <div
      role="img"
      aria-label={t('website.coverWall', { titles })}
      className="grid -rotate-3 grid-cols-3 gap-3 sm:gap-4"
    >
      {columns.map((column, columnIndex) => (
        <div
          key={columnOffsets[columnIndex]}
          className={`flex flex-col gap-3 sm:gap-4 ${columnOffsets[columnIndex]}`}
        >
          {column.map(({ story, cover }) => (
            <DrawnCover
              key={story.id}
              title={story.title}
              penName={story.writer.displayName}
              choice={cover}
              size="wall"
              isDecorative
              className="w-full shadow-card"
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * The gold card on the wall, in the CMS's words.
 *
 * @param card - the card's words from the CMS
 * @param isOverWall - true when covers are drawn, so the card sits over their top right corner
 * @returns the card, or nothing while its title is empty
 */
function RightsCard({
  card,
  isOverWall,
}: {
  card: HomeRightsCard | undefined;
  isOverWall: boolean;
}) {
  if (card === undefined || card.title.trim() === '') return null;
  // Over the covers the card floats at the wall's top right, as on the board. With no cover there
  // is nothing under it, so it stays in the page's flow at the right: floated, it gave the figure
  // no height and covered the next section's heading on phones and tablets (UX-QA).
  const placement = isOverWall ? 'absolute top-0 right-0' : 'relative ml-auto';
  return (
    <div
      className={`${placement} z-10 flex w-[210px] max-w-[46%] rotate-[5deg] flex-col gap-1 glass-band-tint rounded-[18px] bg-gold px-4 py-3.5 text-on-gold`}
    >
      {/* The eyebrow's type in the card's dark text: dark gold on gold would be unreadable. */}
      <p className="eyebrow-type m-0">{withBrand(card.eyebrow)}</p>
      <p className="m-0 font-heading text-lg leading-[1.05] font-extrabold">
        {withBrand(card.title)}
      </p>
      <p className="m-0 text-[13px] leading-snug">{withBrand(card.body)}</p>
    </div>
  );
}

/** What the wall needs. */
interface HeroCollageProps {
  rightsCard: HomeRightsCard | undefined;
}

/**
 * Renders the wall.
 *
 * @returns the figure with the covers and the two cards
 */
export function HeroCollage({ rightsCard }: HeroCollageProps) {
  const { shelf } = useStoryShelf(trendingRequest);
  const stories = wallStories(shelf?.stories ?? []);
  return (
    <figure className="relative mx-auto my-0 min-w-0 max-w-[600px] flex-[1_1_520px] pt-10 pb-6">
      <CoverColumns stories={stories} />
      <RightsCard card={rightsCard} isOverWall={stories.length > 0} />
      {/* On a wall of two rows the card sits over its bottom left corner, as on the board. Under
          a single row it goes below the covers, where it can't meet the other card on a phone;
          with no cover at all there is no wall to put it on. */}
      {stories.length > 0 && (
        <HomeCommentCard placement={stories.length > coversInOneRow ? 'onWall' : 'underWall'} />
      )}
    </figure>
  );
}
