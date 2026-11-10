/**
 * ContinueReadingCard: one story to carry on with, in "Continue reading" (story S1-E4-03; board
 * 3.7 Library).
 *
 * Board values: a white card with the cover (the small "tile" size, so the full title still fits;
 * DoD covers), the title in Funnel Display, "by <writer> · Chapter 14 of 15", a progress line through
 * the chapter, "You stopped halfway through chapter 14 on your phone, yesterday", then either
 * "Chapter 15 is out" (sage) or "Completed story", and the Continue button.
 * Liquid glass look (bundle G7d2; board Library): a glass card with 28 px corners, a 96 px cover,
 * the progress line in the theme's accent, and a glass Contents link (the story page) beside the
 * solid Continue button.
 * The progress line is drawn for sighted readers; its words are in the sentence under it, so the
 * line itself is hidden from screen readers.
 * Who uses it: ContinueReading.
 */
import { Link } from 'react-router';

import { resolveCoverChoice } from '@/components/covers/automaticCover';
import { DrawnCover } from '@/components/covers/DrawnCover';
import { timeAgo } from '@/features/comments/lib/timeAgo';
import { StoryCoverArt } from '@/features/pictures/components/StoryCoverArt';

import type { ContinueReadingItem } from '../api/library';
import { continueAddress, newChapterNumber, placeWithinChapter } from '../lib/places';
import { useLibraryTranslation } from '../registerLibraryTranslations';

/** The line under the progress: what came out since, or that the story is complete. */
function StoryNews({ item }: { item: ContinueReadingItem }) {
  const { t } = useLibraryTranslation();
  const newNumber = newChapterNumber(item.place);
  if (newNumber !== null) {
    return (
      <p className="m-0 text-[13px] font-semibold text-(--success-text)">
        {t('continue.nextOut', { number: newNumber })}
      </p>
    );
  }
  if (item.story.completionStatus === 'completed') {
    return <p className="m-0 text-[13px] text-body">{t('continue.completed')}</p>;
  }
  return <span />;
}

/** The small cover: the "tile" size keeps the full title on a 96 px cover (DoD covers). */
function ContinueCover({ story }: { story: ContinueReadingItem['story'] }) {
  return (
    <StoryCoverArt
      story={story}
      className="w-[96px] shrink-0 self-start"
      drawn={
        <DrawnCover
          title={story.title}
          choice={resolveCoverChoice(story)}
          size="tile"
          isDecorative
          className="w-[96px] shrink-0"
        />
      }
    />
  );
}

/** Contents (the story page, glass) and Continue (back to the reader's place, solid). */
function ContinueLinks({ item }: { item: ContinueReadingItem }) {
  const { t } = useLibraryTranslation();
  const { story, place } = item;
  return (
    <div className="flex flex-wrap gap-2">
      <Link
        to={`/s/${story.slug}`}
        aria-label={t('continue.contentsLabel', { title: story.title })}
        className="inline-flex h-11 items-center rounded-full button-glass px-5 text-sm font-semibold no-underline"
      >
        {t('continue.contents')}
      </Link>
      <Link
        to={continueAddress(story.slug, place)}
        aria-label={t('continue.buttonLabel', { title: story.title })}
        className="inline-flex h-11 items-center rounded-full button-main px-5 text-sm font-semibold no-underline"
      >
        {t('continue.button')}
      </Link>
    </div>
  );
}

/**
 * Renders the card.
 *
 * @param props.item - the story and the reader's place in it
 * @returns the card
 */
export function ContinueReadingCard({ item }: { item: ContinueReadingItem }) {
  const { t, i18n } = useLibraryTranslation();
  const { story, place } = item;
  return (
    <article
      aria-labelledby={`continue-${story.slug}`}
      className="flex gap-4 glass-pill rounded-[28px] p-4 sm:gap-5 sm:p-5"
    >
      <ContinueCover story={story} />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <h3
          id={`continue-${story.slug}`}
          className="m-0 font-heading text-[22px] leading-tight font-bold break-words text-heading"
        >
          {story.title}
        </h3>
        <p className="m-0 text-[13px] text-meta">
          {t('continue.by')}{' '}
          <Link
            to={`/u/${encodeURIComponent(story.writer.handle)}`}
            className="text-link underline"
          >
            {story.writer.displayName}
          </Link>
          {' · '}
          {t('continue.where', { number: place.number, total: place.total })}
        </p>
        <div aria-hidden="true" className="h-1.5 w-full overflow-hidden rounded-full bg-tint">
          <div className="h-full rounded-full bg-accent" style={{ width: `${place.percent}%` }} />
        </div>
        <p className="m-0 text-[13px] leading-normal text-body">
          {t('continue.stopped', {
            position: t(`continue.positions.${placeWithinChapter(place.percent)}`),
            number: place.number,
            device: t(`continue.devices.${place.deviceKind}`),
            when: timeAgo(place.savedAt, i18n.language),
          })}
        </p>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          <StoryNews item={item} />
          <ContinueLinks item={item} />
        </div>
      </div>
    </article>
  );
}
