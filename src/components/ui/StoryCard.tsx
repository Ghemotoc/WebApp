/**
 * StoryCard: one story in a row of covers (story S1-E1-03; redrawn in bundle CALM-4).
 *
 * The rules (the simplified design, Robert, 20 Nov 2026; Shelf/README.md and BookCover/README.md):
 *   - The cover takes its width from its column: a fifth of the row on wide screens (Shelf), or the
 *     See all grid's column. It keeps its shape and draws its title in full (DoD covers).
 *   - Under every cover, whatever the cover shows: the title (Inter 600 15/20, the heading colour)
 *     and the meta line (the pen name, and anything the caller adds), so every story is named in
 *     text and a custom cover with small lettering still reads.
 *   - The whole card is one link. The drawn title is hidden from screen readers, because the real
 *     title is written right under it.
 *   - Continue reading adds a 2 px thread line under the cover with the progress, and the value in
 *     the link's name ("72% read").
 *   - A Library card whose story has a chapter out since the reader last read it shows a 12 px
 *     dark dot with a white ring at the cover's top right, the same in every theme because covers
 *     keep their colours; the caller says it in words in the meta line too (design books item 16,
 *     "Show what is inside").
 *   - The cover's paper label carries the writer's pen name under the title (the classic's author
 *     for a classic), as boards A04-Read, C01-Library and A08-SearchResults draw it (the
 *     gh-book__by line; Robert, 27 Nov 2026, 19:02 and 19:03 UTC: on every large cover, Home too).
 * Who uses it: rows on Read and Discover (ListedStoryCard), the Library, profiles and /design.
 */
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { DrawnCover } from '@/components/covers/DrawnCover';
import type { DrawnCoverChoice } from '@/components/covers/coverDesigns';

/** What a StoryCard needs. */
export interface StoryCardProps {
  title: string;
  /** For example "Ana Pop · 3.4k reads"; the caller formats it in the reader's language. */
  metaLine: string;
  cover: DrawnCoverChoice;
  href: string;
  /** An optional InfoPill such as "Chapter 15". */
  pill?: ReactNode;
  /**
   * Draws the cover in place of the drawn one, given the drawn one as its fall-back: an uploaded
   * cover passes StoryCoverArt here (S1-E10-05), so this shared card stays free of features.
   */
  wrapCover?: (drawnCover: ReactNode) => ReactNode;
  /** How much of the story the reader has read, 0 to 100, for Continue reading rows. */
  progressPercent?: number;
  /** True when a chapter came out since the reader last read: the dot on the cover (books 16). */
  hasNewChapter?: boolean;
  /**
   * The story's language ("ja"), set as `lang` on the title so screen readers and search engines
   * read it in that language (WCAG 3.1.2; S1-E3-01). Left out, the title takes the page's.
   */
  language?: string;
  /**
   * The name drawn on the cover under the title: the writer's pen name, or the author for a
   * classic (boards A04, C01, A08). Left out, the cover shows the title only.
   */
  coverPenName?: string;
}

/**
 * The 2 px progress line under a cover: the thread on its track. Decorative, because the link's
 * name carries the value.
 */
function ProgressLine({ percent }: { percent: number }) {
  const clamped = Math.min(100, Math.max(0, Math.round(percent)));
  return (
    <span aria-hidden="true" className="mt-2 block h-0.5 w-full bg-[var(--track)]">
      <span className="block h-full bg-thread" style={{ width: `${String(clamped)}%` }} />
    </span>
  );
}

/**
 * Renders the card as one link to the story.
 *
 * @returns the card
 */
export function StoryCard({
  title,
  metaLine,
  cover,
  href,
  pill,
  wrapCover,
  progressPercent,
  hasNewChapter = false,
  language,
  coverPenName,
}: StoryCardProps) {
  const { t } = useTranslation();
  // The drawn cover: decorative, because the title is repeated as text below. The pen name sits
  // on its label under the title (boards A04, C01, A08).
  const drawnCover = (
    <DrawnCover
      title={title}
      penName={coverPenName}
      choice={cover}
      size="shelf"
      isDecorative
      className="w-full"
    />
  );
  return (
    // min-w-0 with break-words on the title: a title that is one long word wraps inside the card
    // instead of running over the next one (GAPS-6 break test, 10 Nov 2026).
    <a href={href} className="flex w-full min-w-0 flex-col no-underline">
      <span className="relative block">
        {wrapCover === undefined ? drawnCover : wrapCover(drawnCover)}
        {/* The new-chapter dot: decorative, because the meta line says it in words. */}
        {hasNewChapter && (
          <span
            aria-hidden="true"
            data-new-chapter-dot
            className="absolute top-2 right-2 size-3 rounded-full bg-(--new-dot) ring-2 ring-(--new-dot-ring)"
          />
        )}
      </span>
      {progressPercent !== undefined && <ProgressLine percent={progressPercent} />}
      {pill !== undefined && <span className="mt-3">{pill}</span>}
      <span
        lang={language}
        className={`${pill === undefined ? 'mt-2' : 'mt-2'} type-label break-words text-ink-heading`}
      >
        {title}
      </span>
      <span className="type-meta break-words">{metaLine}</span>
      {progressPercent !== undefined && (
        <span className="sr-only">
          {t('shelf.percentRead', { percent: Math.round(progressPercent) })}
        </span>
      )}
    </a>
  );
}
