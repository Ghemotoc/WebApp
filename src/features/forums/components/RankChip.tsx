/**
 * RankChip: a writer's rank as a plain badge, "Storyteller" (story S1-E8-09; board 6.1
 * above the pen name, and beside the author's name on each forum post, criterion 5).
 *
 * Look (DESIGN thread, 8 Nov 2026, 05:19 UTC; CALM-7a): the shared Badge with the rank's medal
 * icon and only the rank's name, never "Rank: …"; hovering says "Writing rank, from published
 * chapters and words", and screen readers hear "Writing rank:" first, so the badge never reads as
 * a bare word. The same badge on profiles, forum posts, story cards and notifications.
 * Who uses it: ProfileRankChip, ForumPostCard, the story cards (ListedStoryCard, IDEAS-3a) and
 *   NotificationRow. It calls nothing; the rank comes in as a prop.
 */
import { Badge } from '@/components/ui/Badge';

import type { WriterRank } from '../lib/writerRanks';
import { useForumsTranslation } from '../registerForumsTranslations';

/** What the chip needs. */
export interface RankChipProps {
  rank: WriterRank;
}

/** The board's medal: a circle on a ribbon, 14 px, in the text colour. */
function MedalIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="9" r="6" />
      <path d="M8.5 14L7 21l5-3 5 3-1.5-7" />
    </svg>
  );
}

/**
 * Renders the pill.
 *
 * @returns the rank pill
 */
export function RankChip({ rank }: RankChipProps) {
  const { t } = useForumsTranslation();
  return (
    <Badge
      icon={<MedalIcon />}
      title={t('rank.chipTitle')}
      hiddenPrefix={t('rank.prefix')}
      testId="rank-chip"
    >
      {t(`rank.names.${rank}`)}
    </Badge>
  );
}
