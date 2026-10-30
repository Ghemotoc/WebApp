/**
 * ChapterBar: the white bar above a chapter (story S1-E4-01a; board 3.5).
 *
 * Board values: "‹ <story title>" back to the story page; on the right a navigation named
 * "Chapters" with Contents (outlined, to the story page's chapter list), Previous (outlined) and
 * "Next chapter ›" (solid); under them the gold progress line. 44 px targets, 24 px radius card.
 * Previous and Next are left out at the first and last chapter, so no control does nothing.
 * After the story link comes "Reading settings" for a signed-in reader (S1-E4-02,
 * ReadingSettingsControl), as on the board.
 * Who uses it: ChapterReaderPage. What it calls: ReadingSettingsControl; the rest are links.
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import type { ReaderChapter } from '../api/chapter';

import { ReadingSettingsControl } from './ReadingSettingsControl';
import { BackIcon, ContentsIcon, ForwardIcon } from './ReaderIcons';

/** The classes shared by the outlined links. */
const outlinedLink =
  'inline-flex h-11 items-center gap-1.5 rounded-full border border-control-border bg-surface pr-[18px] pl-3 text-[15px] font-semibold text-heading no-underline hover:bg-tint';

/** What the bar needs. */
export interface ChapterBarProps {
  chapter: ReaderChapter;
  /** How far through the text the reader is, 0 to 100. */
  progress: number;
  /** The text size that follows the device, or null to leave out Reading settings (visitors). */
  deviceSize: number | null;
}

/** Contents, Previous and Next chapter. */
function ChapterNavigation({ chapter }: { chapter: ReaderChapter }) {
  const { t } = useTranslation('reading');
  const storyAddress = `/s/${chapter.story.slug}`;
  return (
    <nav aria-label={t('reader.chaptersNav')} className="ml-auto flex flex-wrap gap-2">
      <Link to={storyAddress} className={outlinedLink}>
        <ContentsIcon />
        {t('reader.contents')}
      </Link>
      {chapter.previousCode !== null && (
        <Link to={`${storyAddress}/${chapter.previousCode}`} className={outlinedLink}>
          <BackIcon />
          {t('reader.previous')}
        </Link>
      )}
      {chapter.nextCode !== null && (
        <Link
          to={`${storyAddress}/${chapter.nextCode}`}
          className="inline-flex h-11 items-center gap-1.5 rounded-full bg-primary pr-3 pl-5 text-[15px] font-semibold text-on-primary no-underline hover:opacity-90"
        >
          {t('reader.next')}
          <ForwardIcon />
        </Link>
      )}
    </nav>
  );
}

/**
 * Renders the bar.
 *
 * @returns the card with the links and the progress line
 */
export function ChapterBar({ chapter, progress, deviceSize }: ChapterBarProps) {
  const { t } = useTranslation('reading');
  return (
    <div className="relative z-[2] rounded-card border border-border bg-surface px-3 pt-3 shadow-card">
      <div className="flex flex-wrap items-center gap-2.5">
        <Link
          to={`/s/${chapter.story.slug}`}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-full pr-[18px] pl-3 text-[15px] font-semibold break-words text-heading no-underline hover:underline"
        >
          <BackIcon />
          {/* The story's own language, so a screen reader pronounces the title right (WCAG 3.1.2). */}
          <span lang={chapter.story.languageCode}>{chapter.story.title}</span>
        </Link>
        {deviceSize !== null && <ReadingSettingsControl deviceSize={deviceSize} />}
        <ChapterNavigation chapter={chapter} />
      </div>
      <div
        role="progressbar"
        aria-label={t('reader.progress')}
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
        className="mx-2 mt-3 h-1 overflow-hidden rounded-t-full bg-tint"
      >
        <div className="h-full rounded-full bg-gold" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}
