/**
 * ContinueCard: "Continue reading" on Discover, the reader's latest unfinished story (story
 * S1-E5-12, bundle LOOK-4b; board Discover, "Your dashboard").
 *
 * Board values (liquid glass board Discover, bundle G7): a glass card in the side column with the
 * eyebrow, then a row with the cover (64 px, the "tile" size so the full title fits; DoD covers)
 * beside the title, "by <writer> · Chapter 14 of 15" and a thin accent progress line through the
 * chapter, then "Chapter 15 is out" (sage) when a newer chapter came out after the reader last
 * read, and the full-width Continue button. The whole card is one link, as on the board, so it
 * holds no other link. The progress line is drawn for sighted readers and its words sit in hidden
 * text beside it.
 * Who shows it: DiscoverCards. What it calls: the Library's continueAddress (where Continue leads).
 */
import { Link } from 'react-router';

import { resolveCoverChoice } from '@/components/covers/automaticCover';
import { DrawnCover } from '@/components/covers/DrawnCover';
import { continueAddress } from '@/features/library/lib/places';
import { StoryCoverArt } from '@/features/pictures/components/StoryCoverArt';

import type { ContinueReadingCardData } from '../api/discoverCards';
import { useDiscoveryTranslation } from '../registerDiscoveryTranslations';

/** The 64 px cover. */
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

/** The progress line, with its words for screen readers. */
function ChapterProgress({ percent, number }: { percent: number; number: number }) {
  const { t } = useDiscoveryTranslation();
  return (
    <>
      <div aria-hidden="true" className="mt-1 h-[5px] w-full overflow-hidden rounded-full bg-tint">
        <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
      </div>
      <span className="sr-only">{t('cards.progress', { percent, number })}</span>
    </>
  );
}

/**
 * Renders the card.
 *
 * @param props.item - the story, the reader's place and the new chapter's number, if any
 * @returns the card, one link
 */
export function ContinueCard({ item }: { item: ContinueReadingCardData }) {
  const { t } = useDiscoveryTranslation();
  const { story, place, newChapterNumber } = item;
  return (
    <Link
      to={continueAddress(story.slug, place)}
      className="flex flex-col gap-3 rounded-[28px] border border-border bg-surface p-[18px] text-inherit no-underline shadow-card"
    >
      <span className="eyebrow">{t('cards.continueEyebrow')}</span>
      <div className="flex items-center gap-3">
        <CardCover story={story} />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="font-semibold break-words text-heading">{story.title}</span>
          <span className="text-[13px] text-body">
            {t('cards.continueWhere', {
              writer: story.writer.displayName,
              number: place.number,
              total: place.total,
            })}
          </span>
          <ChapterProgress percent={place.percent} number={place.number} />
          {newChapterNumber !== null && (
            <span className="text-[13px] font-semibold text-(--success-text)">
              {t('cards.newChapter', { number: newChapterNumber })}
            </span>
          )}
        </div>
      </div>
      <span className="inline-flex h-[46px] items-center justify-center rounded-full button-main px-[18px] font-semibold">
        {t('cards.continueButton')}
      </span>
    </Link>
  );
}
