/**
 * RankProgressBar: how far the writer is from the next rank (story S1-E8-09; board 6.1, under
 * the ladder): an 8 px plum bar on the tint, then "41,200 of 100,000 words to Novelist" in 13 px.
 * A Novelist gets "<name> has reached the top rank." instead.
 * Numbers use the reader's locale (DoD, internationalisation).
 * Who uses it: RankPanel. What it calls: progressToNextRank() in ../lib/writerRanks.
 */
import type { ProfileRank } from '../api/writerRanks';
import { progressToNextRank } from '../lib/writerRanks';
import { useForumsTranslation } from '../registerForumsTranslations';

/** What the bar needs. */
export interface RankProgressBarProps {
  rank: ProfileRank;
  /** The profile's display name, for the top-rank line. */
  name: string;
}

/**
 * Renders the bar and its words.
 *
 * @returns the progress bar, or the top-rank line
 */
export function RankProgressBar({ rank, name }: RankProgressBarProps) {
  const { t, i18n } = useForumsTranslation();
  const progress = progressToNextRank(rank.rank, rank.chapters, rank.words);
  if (progress === null) {
    return <p className="m-0 text-[13px] text-meta">{t('rank.top', { name })}</p>;
  }
  // Step 1: the share done, capped at 100 so a bar never overflows.
  const percent = Math.min(100, Math.floor((progress.have / progress.need) * 100));
  const nextName = t(`rank.names.${progress.nextRank}`);
  const numbers = new Intl.NumberFormat(i18n.language);
  const wordsKey = progress.unit === 'words' ? 'rank.progressWords' : 'rank.progressChapters';
  return (
    <div className="flex flex-col gap-1.5">
      <div
        role="progressbar"
        aria-label={t('rank.progressLabel', { rank: nextName, percent })}
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-2 overflow-hidden rounded-full bg-tint"
      >
        <div className="h-full rounded-full bg-[#672786]" style={{ width: `${percent}%` }} />
      </div>
      <p className="m-0 text-[13px] text-meta">
        {t(wordsKey, {
          have: numbers.format(progress.have),
          need: numbers.format(progress.need),
          rank: nextName,
        })}
      </p>
    </div>
  );
}
