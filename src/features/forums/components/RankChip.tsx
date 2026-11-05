/**
 * RankChip: the gold "Rank: Storyteller" pill (story S1-E8-09; board 6.1 beside the name, and
 * beside the author's name on each forum post, criterion 5).
 *
 * Board values: the gold information pill (#FBF3DA, #5C3F0E text, #D9B54A border, 24 px tall),
 * from the shared InfoPill. On a post the pill shows only the rank's name, to keep the header
 * short; "Rank:" is still read out by screen readers, so the pill never reads as a bare word.
 * Who uses it: ProfileRankChip, ForumPostCard and the story cards (ListedStoryCard, IDEAS-3a). It
 *   calls nothing; the rank comes in as a prop.
 * Why the wrapper is "relative": the screen-reader-only "Rank:" is absolutely positioned. Without
 *   a positioned ancestor it escaped a shelf's sideways scrolling, so a phone page with a row of
 *   ranked story cards scrolled sideways (bundle 17 CHECK, search at 390 px).
 */
import { InfoPill } from '@/components/ui/InfoPill';

import type { WriterRank } from '../lib/writerRanks';
import { useForumsTranslation } from '../registerForumsTranslations';

/** What the chip needs. */
export interface RankChipProps {
  rank: WriterRank;
  /** true on a post: the name alone shows, "Rank:" is for screen readers only. */
  isCompact?: boolean;
}

/**
 * Renders the pill.
 *
 * @returns the rank pill
 */
export function RankChip({ rank, isCompact = false }: RankChipProps) {
  const { t } = useForumsTranslation();
  const name = t(`rank.names.${rank}`);
  return (
    <span title={t('rank.chipTitle')} data-testid="rank-chip" className="relative inline-flex">
      <InfoPill tone="gold">
        {isCompact ? (
          <>
            <span className="sr-only">{t('rank.prefix')} </span>
            {name}
          </>
        ) : (
          t('rank.chip', { rank: name })
        )}
      </InfoPill>
    </span>
  );
}
