/**
 * ProfileRankChip: the rank pill next to the name on a writer's profile (story S1-E8-09;
 * board 6.1). Nothing shows before the writer's first published chapter, to a blocked reader or
 * when the profile keeps it private (profile_rank() answers null).
 * Who uses it: ProfileHeader (people feature). What it calls: useProfileRank → profile_rank().
 */
import { useProfileRank } from '../hooks/useWriterRank';

import { RankChip } from './RankChip';

/**
 * Renders the pill.
 *
 * @param props.handle - the profile's username
 * @returns the pill, or nothing when there is no rank to show
 */
export function ProfileRankChip({ handle }: { handle: string }) {
  const rank = useProfileRank(handle).data ?? null;
  if (rank === null) return null;
  return <RankChip rank={rank.rank} />;
}
