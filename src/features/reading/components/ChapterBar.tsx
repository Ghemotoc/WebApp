/**
 * ChapterBar: the slim glass bar that floats over a chapter as the reader scrolls (story
 * S1-E4-01a; the simplified design, bundle CALM-5; design handover Step 2, "The chapter bar";
 * design system FocusBar; boards New-Reader and New-PhoneReader).
 *
 * Layout, five controls or fewer: Back (a round button named "Back to <story>"), the story's
 * title with the meta line "Chapter 14 of 15 · 3 min left" under it, centred, then Aa (Reading
 * settings, for a signed-in reader) and, from 768 px, a quiet "Next chapter". A story in several
 * languages keeps its "Read in" switch before Aa (TRANSLATE-1b). The title and the meta line end
 * in an ellipsis when long.
 * Time left (handover Step 4, points 11 and 12): while the reader keeps it "In the bar", the meta
 * line ends with the minutes and counts down as they scroll (minutesLeft() from
 * lib/readingTimeLeft.ts, the same as the pill), and drops them once the last line is on screen.
 * It is not a live region, so screen readers aren't interrupted. The minutes are the progress, so
 * there is no progress line, and Previous and Contents are gone: Previous lives in the chapter
 * navigation under the paper and Back leads to the story page with every chapter.
 * Where it sits: sticky, under the website's top bar from 1024 px; on phones and tablets it is
 * the only bar while reading (the shell draws no header of its own, useReaderOwnsHeader), 12 px
 * from each edge and clear of the notch.
 * Who uses it: ChapterReaderPage and MissingTranslationNotice. What it calls:
 * ReadingSettingsControl and ReadInSwitch; the rest are links.
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { usePageOwnsNarrowHeader } from '@/app/shell/pageHeaderContext';

import type { ReaderChapter } from '../api/chapter';
import { chapterPlaceText } from '../lib/chapterPlace';

import { LazyReadInSwitch } from './LazyReadInSwitch';
import { BackArrowIcon, ForwardArrowIcon } from './ReaderIcons';
import { ReadingSettingsControl, type ReadingSettingsControlProps } from './ReadingSettingsControl';

/** What the bar needs. */
export interface ChapterBarProps {
  chapter: ReaderChapter;
  /** The minutes left to show at the end of the meta line, or null to show none. */
  minutesLeft: number | null;
  /** Aa's state and what it does, or null to leave Aa out (visitors, a missing translation). */
  settings: ReadingSettingsControlProps | null;
}

/** The round 44 px quiet icon button's classes, shared by Back. */
const iconButton =
  'inline-flex size-11 shrink-0 items-center justify-center rounded-full text-heading no-underline hover:bg-tint';

/**
 * The meta line under the title: "Chapter 14 of 15", then " · 3 min left" while there are
 * minutes to show.
 *
 * @param chapter - the chapter being read
 * @param minutesLeft - the minutes left, or null
 * @returns the line's words
 */
function useMetaLine(chapter: ReaderChapter, minutesLeft: number | null): string {
  const { t } = useTranslation('reading');
  const where = chapterPlaceText(t, chapter.number, chapter.lastChapterNumber);
  if (minutesLeft === null) return where;
  return `${where} · ${t('reader.minutesLeft', { count: minutesLeft })}`;
}

/**
 * Renders the bar.
 *
 * @returns the floating glass bar
 */
export function ChapterBar({ chapter, minutesLeft, settings }: ChapterBarProps) {
  const { t } = useTranslation('reading');
  const storyAddress = `/s/${chapter.story.slug}`;
  const metaLine = useMetaLine(chapter, minutesLeft);
  // On phones and tablets this is the only bar while reading (handover Step 2).
  usePageOwnsNarrowHeader();
  return (
    <nav
      aria-label={t('reader.chapterBar')}
      data-testid="chapter-bar"
      className="tmc-chapter-bar glass-float sticky z-20 flex items-center gap-1 rounded-full p-1.5"
    >
      {/* Back to the story page, which lists every chapter. */}
      <Link
        to={storyAddress}
        aria-label={t('reader.backTo', { story: chapter.story.title })}
        className={iconButton}
      >
        <BackArrowIcon />
      </Link>
      {/* The title in the story's own language, so a screen reader says it right (WCAG 3.1.2). */}
      <p className="m-0 min-w-0 flex-1 text-center text-[15px] leading-5 font-semibold text-heading">
        <span lang={chapter.story.languageCode} className="block truncate">
          {chapter.story.title}
        </span>
        <span
          data-testid="chapter-bar-meta"
          className="block truncate text-[13px] leading-[18px] font-normal text-meta"
        >
          {metaLine}
        </span>
      </p>
      {/* TRANSLATE-1b: nothing for a story in one language (Robert, 16 Nov 2026). */}
      <LazyReadInSwitch editions={chapter.editions} chapterNumber={chapter.number} />
      {settings !== null && <ReadingSettingsControl {...settings} />}
      {/* A quiet Next chapter ends the bar from 768 px; phones keep three controls. */}
      {chapter.nextCode !== null && (
        <Link
          to={`${storyAddress}/${chapter.nextCode}`}
          className="hidden h-11 shrink-0 items-center gap-1.5 rounded-full button-glass px-4 text-[15px] font-semibold no-underline md:inline-flex"
        >
          {t('reader.next')}
          <ForwardArrowIcon />
        </Link>
      )}
    </nav>
  );
}
