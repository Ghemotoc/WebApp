/**
 * ChapterBar: the glass bar above a chapter (story S1-E4-01a; board 3.5; liquid glass look from
 * bundle G7d, board WebReaderV1 and the rulebook's "Reader bar").
 *
 * Layout: "‹ <story title>" back to the story page on the left; "Chapter 2 of 4" centred (from
 * 1280 px, where the bar has room for it); on the right "Aa Reading settings" for a signed-in
 * reader (S1-E4-02, ReadingSettingsControl), then a navigation named "Chapters" with Contents,
 * Previous (both glass) and "Next chapter ›" (solid). Under them runs the progress line in the
 * theme's accent colour; it reaches 100% once the last line of the text is on screen, so it is
 * full by the time the reader is at the comments (rulebook). 44 px targets.
 * Previous and Next are left out at the first and last chapter, so no control does nothing.
 * On a phone the bar keeps only Back, the story name and Aa (rulebook, "On a phone, the reader's
 * top bar keeps only Back, the story name and Aa"): the chapter links move to the end of the
 * chapter, where ChapterEnd already offers the next one.
 * Who uses it: ChapterReaderPage. What it calls: ReadingSettingsControl; the rest are links.
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import type { ReaderChapter } from '../api/chapter';

import { ReadingSettingsControl } from './ReadingSettingsControl';
import { BackIcon, ContentsIcon, ForwardIcon } from './ReaderIcons';

/** The classes shared by the glass links. */
const glassLink =
  'inline-flex h-11 items-center gap-1.5 rounded-full button-glass pr-[18px] pl-3 text-[15px] font-semibold no-underline';

/** What the bar needs. */
export interface ChapterBarProps {
  chapter: ReaderChapter;
  /** How far through the text the reader is, 0 to 100. */
  progress: number;
  /** The text size that follows the device, or null to leave out Reading settings (visitors). */
  deviceSize: number | null;
}

/** Contents, Previous and Next chapter; from 768 px only (on a phone they sit under the text). */
function ChapterNavigation({ chapter }: { chapter: ReaderChapter }) {
  const { t } = useTranslation('reading');
  const storyAddress = `/s/${chapter.story.slug}`;
  return (
    <nav
      aria-label={t('reader.chaptersNav')}
      className="hidden flex-wrap justify-end gap-2 md:flex"
    >
      <Link to={storyAddress} className={glassLink}>
        <ContentsIcon />
        {t('reader.contents')}
      </Link>
      {chapter.previousCode !== null && (
        <Link to={`${storyAddress}/${chapter.previousCode}`} className={glassLink}>
          <BackIcon />
          {t('reader.previous')}
        </Link>
      )}
      {chapter.nextCode !== null && (
        <Link
          to={`${storyAddress}/${chapter.nextCode}`}
          className="inline-flex h-11 items-center gap-1.5 rounded-full button-main pr-3 pl-5 text-[15px] font-semibold no-underline"
        >
          {t('reader.next')}
          <ForwardIcon />
        </Link>
      )}
    </nav>
  );
}

/** The line under the bar that fills as the reader scrolls through the text. */
function ProgressLine({ progress }: { progress: number }) {
  const { t } = useTranslation('reading');
  return (
    <div
      role="progressbar"
      aria-label={t('reader.progress')}
      aria-valuenow={progress}
      aria-valuemin={0}
      aria-valuemax={100}
      className="mx-3 mt-2.5 h-1 overflow-hidden rounded-t-full bg-tint"
    >
      <div className="h-full rounded-full bg-accent" style={{ width: `${progress}%` }} />
    </div>
  );
}

/**
 * Renders the bar.
 *
 * @returns the glass bar with the links and the progress line
 */
export function ChapterBar({ chapter, progress, deviceSize }: ChapterBarProps) {
  const { t } = useTranslation('reading');
  return (
    <div className="glass-pill relative z-[2] rounded-[28px] px-2.5 pt-2.5">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2.5 xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
        <Link
          to={`/s/${chapter.story.slug}`}
          className="inline-flex min-h-11 min-w-0 items-center gap-1.5 justify-self-start rounded-full pr-[18px] pl-3 text-[15px] font-semibold break-words text-heading no-underline hover:underline"
        >
          <BackIcon />
          {/* The story's own language, so a screen reader pronounces the title right (WCAG 3.1.2). */}
          <span lang={chapter.story.languageCode}>{chapter.story.title}</span>
        </Link>
        {/* "Chapter 2 of 4" centred, with no chapter dots (rulebook, "Reader bar"). */}
        <p className="m-0 hidden text-[15px] whitespace-nowrap text-body xl:block">
          {t('reader.kicker', { number: chapter.number, total: chapter.total })}
        </p>
        <div className="flex items-center justify-end gap-2">
          {deviceSize !== null && (
            <ReadingSettingsControl deviceSize={deviceSize} chapterCode={chapter.code} />
          )}
          <ChapterNavigation chapter={chapter} />
        </div>
      </div>
      <ProgressLine progress={progress} />
    </div>
  );
}
