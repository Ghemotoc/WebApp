/**
 * ChapterNavigation: the glass pill under the paper with Previous, the chapter dots and Next
 * (bundle CALM-5; design handover Step 3, "Reader on wide screens", point 5; design system
 * ReaderPage; board New-Reader).
 *
 * Nothing else goes in it: no progress bar, percentage, words, minutes, comments or likes
 * (Robert, 20 Nov 2026, 12:07 UTC). Each arrow is a link named for its chapter ("Previous
 * chapter: What Teo saw"); at the first or last chapter its place stays empty, so no control does
 * nothing. The dots are hidden from screen readers, which hear "Chapter 14 of 15" instead: the
 * current dot is a 20 px --thread pill, chapters before it --body and chapters after it
 * --control-border. A story with more than 15 chapters shows the 15 dots around the current one.
 * Who uses it: ChapterReaderPage. What it calls: chapterDots() for which dots to draw.
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { cn } from '@/lib/utils';

import type { ReaderChapter } from '../api/chapter';
import { chapterPlaceText } from '../lib/chapterPlace';
import { chapterDots, type ChapterDot } from '../lib/chapterDots';

import { BackIcon, ForwardIcon } from './ReaderIcons';

/** The round 44 px arrow links' classes. */
const arrowLink =
  'inline-flex size-11 shrink-0 items-center justify-center rounded-full text-ink-heading no-underline hover:bg-tint';

/** Each dot's look: where it stands against the chapter being read. */
const dotLook: Record<ChapterDot, string> = {
  read: 'w-2 bg-body',
  current: 'w-5 bg-thread',
  ahead: 'w-2 bg-control-border',
};

/** What the navigation needs. */
export interface ChapterNavigationProps {
  chapter: ReaderChapter;
  /** The previous chapter's title, when known, for the arrow's name. */
  previousTitle: string | null;
  /** The next chapter's title, when known. */
  nextTitle: string | null;
}

/**
 * One arrow's accessible name: with the chapter's title once known, else just the direction.
 *
 * @returns the name
 */
function useArrowName(direction: 'previous' | 'next', title: string | null): string {
  const { t } = useTranslation('reading');
  if (title === null || title === '') return t(`reader.${direction}Chapter`);
  return t(`reader.${direction}ChapterNamed`, { title });
}

/**
 * Renders the pill.
 *
 * @returns the navigation, or nothing for a story of one chapter
 */
export function ChapterNavigation({ chapter, previousTitle, nextTitle }: ChapterNavigationProps) {
  const { t } = useTranslation('reading');
  const storyAddress = `/s/${chapter.story.slug}`;
  const previousName = useArrowName('previous', previousTitle);
  const nextName = useArrowName('next', nextTitle);
  if (chapter.total < 2) return null;
  return (
    <nav
      aria-label={t('reader.chapterNavigation')}
      className="glass-pill mx-auto mt-6 flex w-full max-w-[760px] items-center gap-4 rounded-full px-3 py-3"
    >
      {chapter.previousCode !== null ? (
        <Link
          to={`${storyAddress}/${chapter.previousCode}`}
          aria-label={previousName}
          className={arrowLink}
        >
          <BackIcon />
        </Link>
      ) : (
        <span aria-hidden="true" className="size-11 shrink-0" />
      )}
      <div className="flex min-w-0 flex-1 justify-center">
        <span aria-hidden="true" className="flex items-center gap-2">
          {chapterDots(chapter.number, chapter.total).map((dot) => (
            <i key={dot.number} className={cn('block h-2 rounded-full', dotLook[dot.kind])} />
          ))}
        </span>
        <span className="sr-only">
          {chapterPlaceText(t, chapter.number, chapter.lastChapterNumber)}
        </span>
      </div>
      {chapter.nextCode !== null ? (
        <Link
          to={`${storyAddress}/${chapter.nextCode}`}
          aria-label={nextName}
          className={arrowLink}
        >
          <ForwardIcon />
        </Link>
      ) : (
        <span aria-hidden="true" className="size-11 shrink-0" />
      )}
    </nav>
  );
}
