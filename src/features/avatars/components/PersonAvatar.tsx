/**
 * PersonAvatar: the one small round avatar used beside a person's name everywhere (bundle
 * LOOK-7: "one avatar style everywhere"; boards Thread 5.2, Story 3.4, Messages 5.5, Library 3.7).
 *
 * The person's initials on a glass bead (bundle G3 COMPONENTS: member avatars are 3D glass beads;
 * the bead's colour comes from the username, beadColours.ts), with their drawn avatar over them
 * when they have built one (AVATAR-1). A deleted account (no username) keeps the initials only,
 * coloured from the name.
 * Decorative: the name is always written beside it, so it is hidden from screen readers.
 * The large picture on a profile page is ProfileAvatar, in the same style.
 * Who shows it: forum posts, comments, chats, the Library's followed writers and the writer
 * dashboard's latest comments and the Writers to follow cards. What it calls: AvatarImage.
 */
import { initialsOf } from '@/features/people/lib/formatting';
import { cn } from '@/lib/utils';

import { beadStyleFor } from '../lib/beadColours';

import { AvatarImage } from './AvatarImage';

/**
 * The sizes in use, with the initials' text size for each: about 45% of the bead, so two initials
 * span more than half of it (Robert, 8 Nov 2026) and the widest pair ("WW") still clears the edge.
 */
const sizeClasses = {
  small: 'size-[34px] text-[15px]',
  medium: 'size-10 text-[18px]',
  large: 'size-11 text-[20px]',
  xlarge: 'size-12 text-[22px]',
} as const;

/** What the avatar needs. */
export interface PersonAvatarProps {
  /** The pen name or username, for the initials. */
  name: string;
  /** The username, for the drawn avatar; null for a deleted account. */
  handle: string | null;
  /**
   * small 34 px (replies), medium 40 px (posts, comments, rows), large 44 px (chats, top bar),
   * xlarge 48 px (Writers to follow cards, LOOK-4c).
   */
  size?: keyof typeof sizeClasses;
}

/**
 * Renders the avatar.
 *
 * @returns the round avatar, hidden from screen readers
 */
export function PersonAvatar({ name, handle, size = 'medium' }: PersonAvatarProps) {
  return (
    <span aria-hidden="true" className={cn('relative inline-flex flex-none', sizeClasses[size])}>
      {/* Step 1: the initials, always there underneath. */}
      <span
        data-avatar-bead
        style={beadStyleFor(handle ?? name)}
        className="avatar-bead inline-flex size-full items-center justify-center rounded-full font-heading font-extrabold"
      >
        <span className="avatar-bead-initials">{initialsOf(name)}</span>
      </span>
      {/* Step 2: the drawn avatar on top, once it has loaded (nothing when there is none). */}
      {handle !== null && (
        <span className="absolute inset-0 rounded-full">
          <AvatarImage handle={handle} />
        </span>
      )}
    </span>
  );
}
