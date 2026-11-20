/**
 * PersonAvatar: the one small round avatar used beside a person's name everywhere (bundle
 * LOOK-7: "one avatar style everywhere"; bundle CALM-3, the simplified design: Robert, 20 Nov
 * 2026, comments "need to be with the avatars"; design system Avatar/README.md).
 *
 * The person's initials on a plain flat circle in their colour (one of seven cover palette colours,
 * beadColours.ts; no glass, no gradient), with their drawn avatar over them when they have built
 * one (AVATAR-1). A deleted account (no username) keeps the initials only, coloured from the name.
 * Decorative: the name is always written beside it, so it is hidden from screen readers.
 * The large picture on a profile page is ProfileAvatar, in the same style.
 * Who shows it: comments and replies (paragraph comments too), forum posts, notifications, chats,
 * the account button, the Library's followed writers, writers in search, the writer dashboard's
 * latest comments and the Writers to follow cards. What it calls: useAvatarLook, AvatarImage.
 */
import { initialsOf } from '@/features/people/lib/formatting';
import { cn } from '@/lib/utils';

import { useAvatarLook } from '../hooks/useAvatarRecipe';
import { beadStyleFor } from '../lib/beadColours';

import { AvatarImage } from './AvatarImage';

/**
 * The sizes in use, with the initials' text size for each (design system Avatar/README.md:
 * 32 px in comments, 36 px in bars and lists, the initials in Inter 600 at 12 and 13 px).
 */
const sizeClasses = {
  small: 'size-8 text-[12px]',
  medium: 'size-9 text-[13px]',
  large: 'size-9 text-[13px]',
  xlarge: 'size-12 text-[17px]',
} as const;

/** What the avatar needs. */
export interface PersonAvatarProps {
  /** The pen name or username, for the initials. */
  name: string;
  /** The username, for the drawn avatar; null for a deleted account. */
  handle: string | null;
  /**
   * small 32 px (comments and replies), medium 36 px (lists, posts, notification rows),
   * large 36 px (the account button and chats, kept apart so the bars can change on their own),
   * xlarge 48 px (Writers to follow cards, LOOK-4c, until their page is redrawn in CALM-7).
   */
  size?: keyof typeof sizeClasses;
}

/**
 * Renders the avatar.
 *
 * @returns the round avatar, hidden from screen readers
 */
export function PersonAvatar({ name, handle, size = 'medium' }: PersonAvatarProps) {
  // The person's colour (the same read AvatarImage makes, so one request per person).
  const look = useAvatarLook(handle ?? '');
  const storedColour = look.data?.initialsColour ?? null;
  return (
    <span aria-hidden="true" className={cn('relative inline-flex flex-none', sizeClasses[size])}>
      {/* Step 1: the initials on their circle, always there underneath. */}
      <span
        data-avatar-bead
        style={beadStyleFor(handle ?? name, storedColour)}
        className="avatar-bead inline-flex size-full items-center justify-center rounded-full font-body font-semibold"
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
