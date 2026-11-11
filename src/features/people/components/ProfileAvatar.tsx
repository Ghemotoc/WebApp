/**
 * ProfileAvatar: the round picture on the profile (story S1-E5-05; board 6.1).
 *
 * The person's initials on a large glass bead (bundle G3 COMPONENTS; the colour they picked, or
 * else the username's, beadColours.ts, the same as their small PersonAvatar; G11a), with their drawn avatar over
 * them when they have built one (AvatarImage). It is decorative: the name sits beside it as the
 * page's heading, so screen readers skip it. The initials sit in their own one-line box in the
 * circle's middle. The rank shows as a text pill beside the name, never as a sticker on the
 * picture (bundle G4; the liquid glass design has no doodles).
 * Who uses it: ProfileHeader.
 */
import { AvatarImage } from '@/features/avatars/components/AvatarImage';
import { useAvatarLook } from '@/features/avatars/hooks/useAvatarRecipe';
import { beadStyleFor } from '@/features/avatars/lib/beadColours';

import { initialsOf } from '../lib/formatting';

/**
 * Renders the circle.
 *
 * @param props.name - the pen name or username the initials come from
 * @param props.handle - the username, for the uploaded picture
 * @returns the avatar
 */
export function ProfileAvatar({ name, handle }: { name: string; handle: string }) {
  // The colour the person picked for their initials, if any.
  const look = useAvatarLook(handle);
  return (
    <span className="relative inline-flex size-[104px] flex-none sm:size-[136px]">
      <span
        aria-hidden="true"
        data-avatar-bead
        style={beadStyleFor(handle, look.data?.initialsColour ?? null)}
        className="avatar-bead inline-flex size-full items-center justify-center rounded-full font-heading text-[46px] font-extrabold sm:text-[60px]"
      >
        {/* The initials sit in their own box, one line high, so only the letters count as text. */}
        <span className="avatar-bead-initials">{initialsOf(name)}</span>
      </span>
      <span aria-hidden="true" className="absolute inset-0">
        <AvatarImage handle={handle} />
      </span>
    </span>
  );
}
