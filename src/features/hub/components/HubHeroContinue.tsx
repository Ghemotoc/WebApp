/**
 * HubHeroContinue: the small "Continue reading" card on the right of Home's hero (user story 1.1,
 * board A01: the small cover on the left; on its right "Continue reading", the title, "inkwolf ·
 * chapter 14 of 15", the thread line and a quiet "Continue" button, beside the writing month card).
 *
 * It shows the story the reader had open last, the first one the Library lists, and opens the
 * reader at the place (the next chapter once the last one was finished). Hidden while nothing is
 * being read, so the writing month card takes the space.
 * Who shows it: HubHero. What it calls: useLibraryOverview (my_library()), DrawnCover,
 * StoryCoverArt and Meter.
 */
import { Link } from 'react-router';

import { resolveCoverChoice } from '@/components/covers/automaticCover';
import { DrawnCover } from '@/components/covers/DrawnCover';
import { buttonClassName } from '@/components/ui/buttonStyles';
import { Meter } from '@/components/ui/Meter';
import type { ContinueReadingItem } from '@/features/library/api/library';
import { useLibraryOverview } from '@/features/library/hooks/useLibraryOverview';
import { continueAddress } from '@/features/library/lib/places';
import { StoryCoverArt } from '@/features/pictures/components/StoryCoverArt';

import { useHubTranslation } from '../registerHubTranslations';

/**
 * The words under the title: the writer and the chapter, "of N" only once a last chapter is
 * marked (CALM-6), the same words as the Continue reading row.
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
 * Renders the card, or nothing while the Library loads or has no story in progress.
 *
 * @returns the card or null
 */
export function HubHeroContinue() {
  const { t } = useHubTranslation();
  const { overview } = useLibraryOverview();
  // Step 1: the story read last, if there is one.
  const item = overview?.continueReading[0] ?? null;
  if (item === null) return null;
  const line = placeLine(item, t);
  // Step 2: the small cover (it names nothing itself: the title sits beside it as text).
  const drawn = (
    <DrawnCover
      title={item.story.title}
      choice={resolveCoverChoice(item.story)}
      size="tile"
      isDecorative
      className="w-16"
    />
  );
  return (
    <section
      aria-labelledby="hub-hero-continue"
      className="box-surface flex h-full min-w-0 items-center gap-3 rounded-card p-4"
    >
      <StoryCoverArt story={item.story} drawn={drawn} className="w-16 shrink-0" />
      {/* Everything but the cover stacks in one column beside it (board A01). */}
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <h2 id="hub-hero-continue" className="m-0 type-label">
          {t('hub.continue.heading')}
        </h2>
        <p className="m-0 font-semibold break-words text-ink-heading">{item.story.title}</p>
        <p className="m-0 type-meta text-ink-muted">{line}</p>
        {/* Step 3: the thread line for the place, with the same words for screen readers. */}
        <Meter label={item.story.title} value={item.place.percent} valueText={line} />
        <Link
          to={continueAddress(item.story.slug, item.place)}
          aria-label={t('hub.continue.continueLabel', { title: item.story.title })}
          className={buttonClassName({ variant: 'secondary' }, 'self-stretch')}
        >
          {t('hub.continue.continue')}
        </Link>
      </div>
    </section>
  );
}
