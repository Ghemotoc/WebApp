/**
 * ContinueReadingCard: one story to carry on with, in "Continue reading" (story S1-E4-03; board
 * New-Library, bundle CALM-7c).
 *
 * Board values: a 120 px cover beside the words, 24 px apart; the title as a subheading linking
 * to the story page; the meta line "by <writer> · chapter 14 of 15"; the 4 px thread line (at
 * most 360 px wide) for how far into the chapter; "You stopped halfway through chapter 14 on your
 * computer, yesterday."; the state in bold ("Chapter 15 is out", "Completed story"); then
 * Continue and the quiet Following. Continue is the main button only on the first story.
 * The thread line is drawn for sighted readers; its words are in the sentence under it, so the
 * line itself is hidden from screen readers.
 * Who uses it: ContinueReading. What it calls: FollowButton (follow or unfollow the story).
 */
import { Link } from 'react-router';

import { resolveCoverChoice } from '@/components/covers/automaticCover';
import { DrawnCover } from '@/components/covers/DrawnCover';
import { MetaLine } from '@/components/ui/MetaLine';
import { timeAgo } from '@/features/comments/lib/timeAgo';
import { FollowButton } from '@/features/people/components/FollowButton';
import { StoryCoverArt } from '@/features/pictures/components/StoryCoverArt';

import type { ContinueReadingItem } from '../api/library';
import { continueAddress, newChapterNumber, placeWithinChapter } from '../lib/places';
import { useLibraryTranslation } from '../registerLibraryTranslations';

/** The state in bold: what came out since, or that the story is complete; nothing otherwise. */
function StoryNews({ item }: { item: ContinueReadingItem }) {
  const { t } = useLibraryTranslation();
  const newNumber = newChapterNumber(item.place);
  // Step 1: pick the words; a story with neither news shows no line at all.
  let text = '';
  if (newNumber !== null) text = t('continue.nextOut', { number: newNumber });
  else if (item.story.completionStatus === 'completed') text = t('continue.completed');
  return <MetaLine className="mt-1" facts={[{ text, kind: 'state' }]} />;
}

/** The 120 px cover (the "tile" label keeps the full title on a small cover, DoD covers). */
function ContinueCover({ story }: { story: ContinueReadingItem['story'] }) {
  return (
    <StoryCoverArt
      story={story}
      className="w-[96px] shrink-0 self-start min-[600px]:w-[120px]"
      drawn={
        <DrawnCover
          title={story.title}
          choice={resolveCoverChoice(story)}
          size="tile"
          isDecorative
          className="w-[96px] shrink-0 min-[600px]:w-[120px]"
        />
      }
    />
  );
}

/** Continue (back to the reader's place) and the quiet Following for the story. */
function ContinueActions({ item, isFirst }: { item: ContinueReadingItem; isFirst: boolean }) {
  const { t } = useLibraryTranslation();
  const { story, place } = item;
  // Only the first story's Continue is the page's main button (handover Step 3, Library).
  const look = isFirst ? 'button-main' : 'button-glass';
  return (
    <div className="mt-3.5 flex flex-wrap items-start gap-2">
      <Link
        to={continueAddress(story.slug, place)}
        aria-label={t('continue.buttonLabel', { title: story.title })}
        className={`inline-flex h-11 items-center rounded-full ${look} px-5 text-sm font-semibold no-underline`}
      >
        {t('continue.button')}
      </Link>
      <FollowButton target={{ kind: 'story', slug: story.slug }} targetLabel={story.title} />
    </div>
  );
}

/** "chapter 14 of 15", or "chapter 14" while the writer has marked no last chapter (CALM-6). */
function useWhereText(place: ContinueReadingItem['place']): string {
  const { t } = useLibraryTranslation();
  if (place.lastChapterNumber === null)
    return t('continue.whereNumberOnly', { number: place.number });
  return t('continue.where', { number: place.number, total: place.lastChapterNumber });
}

/**
 * Renders the card.
 *
 * @param props.item - the story and the reader's place in it
 * @param props.isFirst - true for the first story, whose Continue is the main button
 * @returns the list item
 */
export function ContinueReadingCard({
  item,
  isFirst,
}: {
  item: ContinueReadingItem;
  isFirst: boolean;
}) {
  const { t, i18n } = useLibraryTranslation();
  const { story, place } = item;
  const where = useWhereText(place);
  return (
    <li className="flex items-start gap-4 min-[600px]:gap-6">
      <ContinueCover story={story} />
      <div className="flex min-w-0 flex-1 flex-col">
        <h3 className="m-0 type-subheading break-words text-heading">
          <Link to={`/s/${story.slug}`} className="text-inherit no-underline hover:underline">
            {story.title}
          </Link>
        </h3>
        <p className="m-0 mt-0.5 type-meta">
          {t('continue.by')}{' '}
          <Link
            to={`/u/${encodeURIComponent(story.writer.handle)}`}
            className="text-link underline"
          >
            {story.writer.displayName}
          </Link>
          {' · '}
          {where}
        </p>
        <div
          aria-hidden="true"
          className="mt-3 mb-2.5 h-1 w-full max-w-[360px] overflow-hidden rounded-full bg-(--hairline)"
        >
          <div className="h-full bg-(--thread)" style={{ width: `${place.percent}%` }} />
        </div>
        <p className="m-0 type-body text-body">
          {t('continue.stopped', {
            position: t(`continue.positions.${placeWithinChapter(place.percent)}`),
            number: place.number,
            device: t(`continue.devices.${place.deviceKind}`),
            when: timeAgo(place.savedAt, i18n.language),
          })}
        </p>
        <StoryNews item={item} />
        <ContinueActions item={item} isFirst={isFirst} />
      </div>
    </li>
  );
}
