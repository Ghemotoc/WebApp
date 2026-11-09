/**
 * ReaderLevelProgressBar: how far the reader is from the next level, "17 of 40 stories finished to
 * Story devourer" (bundle G7a; the Profile board, under the reading ladder). The same bar as the
 * writing rank's: 8 px on the tint, the words in 13 px. A Story devourer gets "<name> has reached
 * the top reading level." instead. Numbers use the reader's locale (DoD, internationalisation).
 * Who uses it: ReaderLevelPanel. What it calls: progressToNextReaderLevel() in ../lib/readerLevels.
 */
import type { ProfileReaderLevel } from '../api/readerLevel';
import { progressToNextReaderLevel } from '../lib/readerLevels';
import { usePeopleTranslation } from '../registerPeopleTranslations';

/** What the bar needs. */
export interface ReaderLevelProgressBarProps {
  reading: ProfileReaderLevel;
  /** The profile's display name, for the top-level line. */
  name: string;
}

/**
 * Renders the bar and its words.
 *
 * @returns the progress bar, or the top-level line
 */
export function ReaderLevelProgressBar({ reading, name }: ReaderLevelProgressBarProps) {
  const { t, i18n } = usePeopleTranslation();
  const progress = progressToNextReaderLevel(
    reading.level,
    reading.chaptersRead,
    reading.storiesFinished,
  );
  if (progress === null) {
    return <p className="m-0 text-[13px] text-meta">{t('readerLevel.top', { name })}</p>;
  }
  // Step 1: the share done, capped at 100 so a bar never overflows.
  const percent = Math.min(100, Math.floor((progress.have / progress.need) * 100));
  const nextName = t(`readerLevel.names.${progress.nextLevel}`);
  const numbers = new Intl.NumberFormat(i18n.language);
  const wordsKey =
    progress.unit === 'stories' ? 'readerLevel.progressStories' : 'readerLevel.progressChapters';
  return (
    <div className="flex flex-col gap-1.5">
      <div
        role="progressbar"
        aria-label={t('readerLevel.progressLabel', { level: nextName, percent })}
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-2 overflow-hidden rounded-full bg-tint"
      >
        <div className="h-full rounded-full bg-heading" style={{ width: `${percent}%` }} />
      </div>
      <p className="m-0 text-[13px] text-meta">
        {t(wordsKey, {
          count: progress.need,
          have: numbers.format(progress.have),
          need: numbers.format(progress.need),
          level: nextName,
        })}
      </p>
    </div>
  );
}
