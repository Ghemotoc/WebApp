/**
 * ProfileAvatar: the round picture on the profile (story S1-E5-05; board 6.1).
 *
 * The person's initials on the board's plum gradient, with their uploaded picture over them once
 * it has passed the picture check (S1-E10-05, AvatarImage; on one's own profile a newer picture
 * still in its check shows with a label). It is decorative: the name sits beside it as the page's heading, so screen readers
 * skip it. The rank's sticker sits on its top edge, as on the board, and hides on phones
 * (RankSticker, S1-E8-09). The initials sit in their own one-line box in the circle's middle, so
 * their text box never meets the sticker.
 * Who uses it: ProfileHeader.
 */
import { RankSticker } from '@/features/forums/components/RankSticker';
import { AvatarImage } from '@/features/avatars/components/AvatarImage';

import { initialsOf } from '../lib/formatting';

/**
 * Renders the circle.
 *
 * @param props.name - the pen name or username the initials come from
 * @param props.handle - the username, for the uploaded picture
 * @returns the avatar
 */
export function ProfileAvatar({ name, handle }: { name: string; handle: string }) {
  return (
    <span className="relative inline-flex size-[104px] flex-none sm:size-[136px]">
      <span
        aria-hidden="true"
        className="inline-flex size-full items-center justify-center rounded-full bg-[linear-gradient(140deg,#4D1B5E,#9A5BB8)] font-heading text-[44px] font-extrabold text-white sm:text-[56px]"
      >
        {/* The initials sit in their own box, one line high, so only the letters count as text. */}
        <span className="leading-none">{initialsOf(name)}</span>
      </span>
      <span aria-hidden="true" className="absolute inset-0">
        <AvatarImage handle={handle} />
      </span>
      {/* The rank's own sticker on the top edge (S1-E8-09), the open book before the first chapter. */}
      <RankSticker handle={handle} />
    </span>
  );
}
