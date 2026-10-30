/**
 * StoryCoverArt: a story's cover, whatever its kind (story S1-E10-05).
 *
 * A drawn or automatic cover is the DrawnCover the caller passes. An uploaded cover is read from
 * the database and shown only once its check has passed (CLAUDE.md rule 19):
 * - passed or approved: the picture, at the same size and shape as a drawn cover;
 * - still in its check, for a reader: a plain box saying "Picture being checked";
 * - still in its check, for the writer: their picture with "Waiting for a check" or "Waiting for
 *   a person", so they know why readers don't see it yet;
 * - removed by a moderator, or not readable: the automatic cover the caller passes, so a card is
 *   never empty.
 * The picture is decorative, like a drawn cover: the title is always beside it as text.
 * Who uses it: StoryCard rows (ListedStoryCard, ProfileStories), StoryHeader, TeaserStoryCard
 * and WriterStoryCard. What it calls: useStoryCoverPicture.
 */
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/utils';

import { useStoryCoverPicture } from '../hooks/usePictures';

/** What it needs. */
export interface StoryCoverArtProps {
  story: { slug: string; coverKind: 'automatic' | 'drawn' | 'upload' };
  /** The drawn cover to show for drawn and automatic covers, and as the fall-back. */
  drawn: ReactNode;
  /** The box's width classes, the same as the drawn cover's (the shape is always 5:8). */
  className?: string;
}

/**
 * The box a picture or its placeholder sits in: the drawn cover's 5:8 shape and corners.
 *
 * @returns the box
 */
function CoverBox({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <span
      className={cn(
        'relative block aspect-[5/8] overflow-hidden rounded-[16px] border border-border bg-panel',
        className,
      )}
    >
      {children}
    </span>
  );
}

/**
 * The words for a picture still in its check: readers see one line, the writer sees which wait.
 *
 * @returns the label's translation key
 */
function waitingKey(state: string): string {
  return state === 'waiting_for_person' ? 'pictures.waitingForPerson' : 'pictures.waitingForCheck';
}

/**
 * Renders the cover.
 *
 * @returns the drawn cover, the uploaded picture, or the "being checked" box
 */
export function StoryCoverArt({ story, drawn, className }: StoryCoverArtProps) {
  const { t } = useTranslation();
  const isUpload = story.coverKind === 'upload';
  const picture = useStoryCoverPicture(story.slug, isUpload);
  // Step 1: drawn and automatic covers, and an upload that is loading, gone or unreadable.
  if (!isUpload || picture.data === undefined || picture.data === null) return <>{drawn}</>;
  const view = picture.data;
  if (view.state === 'removed') return <>{drawn}</>;
  // Step 2: a reader and a picture still in its check: only the plain box.
  if (view.url === null) {
    return (
      <CoverBox className={className}>
        <span className="flex size-full items-center justify-center p-3 text-center text-[13px] font-semibold text-meta">
          {t('pictures.beingChecked')}
        </span>
      </CoverBox>
    );
  }
  // Step 3: the picture; for the writer, with a label while it waits.
  return (
    <CoverBox className={className}>
      <img src={view.url} alt="" className="size-full object-cover" />
      {view.state !== 'visible' && (
        <span className="absolute inset-x-2 bottom-2 inline-flex h-6 items-center justify-center rounded-full border border-border bg-surface px-2 text-xs leading-none font-semibold text-heading">
          {t(waitingKey(view.state))}
        </span>
      )}
    </CoverBox>
  );
}
