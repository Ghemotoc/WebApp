/**
 * HubContinueReading: "Continue reading" on the Home page (bundle CALM-7c; since user story 1.1
 * board A01: a row of covers the full width, each with the thread line and "inkwolf · chapter 14
 * of 15", and "Open library" at the top right).
 *
 * The stories the reader has a place in, newest place first, as the Library lists them. Each
 * cover opens the reader at the place (the next chapter once the last one was finished).
 * Hidden while nothing is being read.
 * Who shows it: MemberHomePage. What it calls: useLibraryOverview (my_library()), Shelf and
 * StoryCard.
 */
import { Link } from 'react-router';

import { resolveCoverChoice } from '@/components/covers/automaticCover';
import { buttonClassName } from '@/components/ui/buttonStyles';
import { Shelf, type ShelfItem } from '@/components/ui/Shelf';
import { StoryCard } from '@/components/ui/StoryCard';
import type { ContinueReadingItem } from '@/features/library/api/library';
import { useLibraryOverview } from '@/features/library/hooks/useLibraryOverview';
import { continueAddress } from '@/features/library/lib/places';
import { StoryCoverArt } from '@/features/pictures/components/StoryCoverArt';

import { useHubTranslation } from '../registerHubTranslations';

/**
 * The words under a cover: the writer and the chapter, "of N" only once a last chapter is marked
 * (CALM-6).
 *
 * @param item - the story and the place
 * @param t - the hub namespace's translate function
 * @returns the line
 */
function placeLine(
  item: ContinueReadingItem,
  t: ReturnType<typeof useHubTranslation>['t'],
): string {
  const { story, place } = item;
  if (place.lastChapterNumber === null) {
    return t('hub.continue.placeNumberOnly', {
      writer: story.writer.displayName,
      number: place.number,
    });
  }
  return t('hub.continue.place', {
    writer: story.writer.displayName,
    number: place.number,
    total: place.lastChapterNumber,
  });
}

/**
 * Renders the row, or nothing while the Library loads or has no story in progress.
 *
 * @returns the row's section or null
 */
export function HubContinueReading() {
  const { t } = useHubTranslation();
  const { overview } = useLibraryOverview();
  if (overview === null || overview.continueReading.length === 0) return null;
  // One card per story: the cover, the 2 px thread line for the place, the title and the line.
  const items: ShelfItem[] = overview.continueReading.map((item) => ({
    key: item.story.slug,
    content: (
      <StoryCard
        title={item.story.title}
        metaLine={placeLine(item, t)}
        cover={resolveCoverChoice(item.story)}
        href={continueAddress(item.story.slug, item.place)}
        progressPercent={item.place.percent}
        wrapCover={(drawn) => <StoryCoverArt story={item.story} drawn={drawn} className="w-full" />}
      />
    ),
  }));
  return (
    <Shelf
      title={t('hub.continue.heading')}
      items={items}
      headerAction={
        <Link to="/library" className={buttonClassName({ variant: 'text' })}>
          {t('hub.continue.openLibrary')}
        </Link>
      }
    />
  );
}
