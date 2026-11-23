/**
 * ContinueCard: "Continue reading" in the Read page's side column, the reader's latest unfinished
 * story (story S1-E5-12, bundle LOOK-4b; since CALM-7c the simplified board New-Read).
 *
 * Board values: no card around it (Step 3: no cards around sections). The heading, then a row
 * with the cover (64 px, the "tile" size so the full title fits; DoD covers) beside the title as a
 * link, the writer, the meta line "Chapter 14 of 15 · **chapter 15 is out**" (the state only
 * when a newer chapter came out after the reader last read; "of N" only while the writer has
 * marked a last chapter, CALM-6), the 2 px thread line for how far into the chapter, and a quiet
 * Continue (the page's one main button is the hero's "Read the story"). The thread line is drawn
 * for sighted readers and its words sit in hidden text beside it.
 * Who shows it: ReadSideColumn. What it calls: the Library's continueAddress (where Continue
 * leads) and MetaLine.
 */
import { Link } from 'react-router';

import { resolveCoverChoice } from '@/components/covers/automaticCover';
import { DrawnCover } from '@/components/covers/DrawnCover';
import { MetaLine, type MetaFact } from '@/components/ui/MetaLine';
import { continueAddress } from '@/features/library/lib/places';
import { StoryCoverArt } from '@/features/pictures/components/StoryCoverArt';

import type { ContinueReadingCardData } from '../api/discoverCards';
import { useDiscoveryTranslation } from '../registerDiscoveryTranslations';

/** The 64 px cover, decorative: the title is the link beside it. */
function CardCover({ story }: { story: ContinueReadingCardData['story'] }) {
  return (
    <StoryCoverArt
      story={story}
      className="w-16 shrink-0 self-start"
      drawn={
        <DrawnCover
          title={story.title}
          choice={resolveCoverChoice(story)}
          size="tile"
          isDecorative
          className="w-16 shrink-0"
        />
      }
    />
  );
}

/** The 2 px thread line, with its words for screen readers. */
function ChapterProgress({ percent, number }: { percent: number; number: number }) {
  const { t } = useDiscoveryTranslation();
  return (
    <>
      <div aria-hidden="true" className="mt-1 h-0.5 w-full max-w-[220px] bg-(--hairline)">
        <div className="h-full bg-(--thread)" style={{ width: `${percent}%` }} />
      </div>
      <span className="sr-only">{t('cards.progress', { percent, number })}</span>
    </>
  );
}

/**
 * The meta line's facts: where the reader is, then the new chapter as a state.
 *
 * @param item - the story, the place and the new chapter's number
 * @param t - the discovery namespace's translate function
 * @returns the facts
 */
function placeFacts(
  item: ContinueReadingCardData,
  t: ReturnType<typeof useDiscoveryTranslation>['t'],
): MetaFact[] {
  const { place, newChapterNumber } = item;
  // Step 1: "Chapter 14 of 15", or "Chapter 14" while no last chapter is marked (CALM-6).
  const where =
    place.lastChapterNumber === null
      ? t('cards.continueWhereNumberOnly', { number: place.number })
      : t('cards.continueWhere', { number: place.number, total: place.lastChapterNumber });
  const facts: MetaFact[] = [{ text: where }];
  // Step 2: "chapter 15 is out" in bold when a newer chapter came out.
  if (newChapterNumber !== null) {
    facts.push({ text: t('cards.newChapter', { number: newChapterNumber }), kind: 'state' });
  }
  return facts;
}

/**
 * Renders the section.
 *
 * @param props.item - the story, the reader's place and the new chapter's number, if any
 * @returns the section
 */
export function ContinueCard({ item }: { item: ContinueReadingCardData }) {
  const { t } = useDiscoveryTranslation();
  const { story, place } = item;
  return (
    <section aria-labelledby="read-continue-heading" className="flex flex-col gap-3">
      <h2 id="read-continue-heading" className="m-0 type-subheading">
        {t('cards.continueEyebrow')}
      </h2>
      <div className="flex items-start gap-3">
        <CardCover story={story} />
        <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
          <Link
            to={`/s/${story.slug}`}
            className="font-semibold break-words text-ink-heading no-underline hover:underline"
          >
            {story.title}
          </Link>
          <span className="type-meta">{story.writer.displayName}</span>
          <MetaLine facts={placeFacts(item, t)} />
          <ChapterProgress percent={place.percent} number={place.number} />
          <Link
            to={continueAddress(story.slug, place)}
            aria-label={t('cards.continueLabel', { title: story.title })}
            className="mt-2 inline-flex h-11 items-center rounded-full button-glass px-4 font-semibold no-underline"
          >
            {t('cards.continueButton')}
          </Link>
        </div>
      </div>
    </section>
  );
}
