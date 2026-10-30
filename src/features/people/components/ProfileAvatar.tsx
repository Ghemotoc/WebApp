/**
 * ProfileAvatar: the round picture on the profile (story S1-E5-05; board 6.1).
 *
 * The person's initials on the board's plum gradient, with their uploaded picture over them once
 * it has passed the picture check (S1-E10-05, AvatarImage; on one's own profile a newer picture
 * still in its check shows with a label). It is decorative: the name sits beside it as the page's heading, so screen readers
 * skip it. The open-book doodle sits on its top edge, as on the board, and hides on phones.
 * Who uses it: ProfileHeader.
 */
import { Doodle } from '@/components/ui/Doodle';
import { AvatarImage } from '@/features/pictures/components/AvatarImage';

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
        {initialsOf(name)}
      </span>
      <span aria-hidden="true" className="absolute inset-0">
        <AvatarImage handle={handle} />
      </span>
      <Doodle
        name="open-book"
        kind="widget"
        on="The profile picture"
        hideBelow="phone"
        className="absolute -top-9 left-9 w-[62px] -rotate-12"
      />
    </span>
  );
}
