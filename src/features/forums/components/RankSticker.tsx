/**
 * RankSticker: the doodle sticker on the top edge of the profile picture, one per rank (story
 * S1-E8-09; board 6.1: "Each rank has its own sticker on your profile picture").
 *
 * A widget doodle that belongs to the avatar and hides on phones, as the board draws it. Before
 * the writer's first published chapter the avatar keeps the open-book doodle it had before.
 * Decorative only, like every doodle: the rank itself is in the pill and the rank card.
 * Who uses it: ProfileAvatar (people feature). What it calls: useProfileRank → profile_rank().
 */
import { Doodle } from '@/components/ui/Doodle';

import { useProfileRank } from '../hooks/useWriterRank';
import { stickerFor } from '../lib/writerRanks';

/**
 * Renders the sticker.
 *
 * @param props.handle - the profile's username
 * @returns the doodle
 */
export function RankSticker({ handle }: { handle: string }) {
  const rank = useProfileRank(handle).data ?? null;
  return (
    <Doodle
      name={rank === null ? 'open-book' : stickerFor(rank.rank)}
      kind="widget"
      on="The profile picture"
      hideBelow="phone"
      className="absolute -top-9 left-9 w-[62px] -rotate-12"
    />
  );
}
