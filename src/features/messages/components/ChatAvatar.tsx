/**
 * ChatAvatar: the small round picture beside a chat, the person's initials on plum with their
 * profile picture over it when they have one (story S1-E9-01; board Messages 5.5).
 *
 * Decorative: the name is always written beside it, so it is hidden from screen readers.
 * Who shows it: ChatListItem and ChatPanel. What it calls: AvatarImage (S1-E5-05).
 */
import { AvatarImage } from '@/features/avatars/components/AvatarImage';
import { initialsOf } from '@/features/people/lib/formatting';

/**
 * Renders the avatar.
 *
 * @param name - the display name, for the initials
 * @param handle - the username, for the picture
 * @returns a 44 px circle
 */
export function ChatAvatar({ name, handle }: { name: string; handle: string }) {
  return (
    <span aria-hidden="true" className="relative inline-flex size-11 flex-none">
      <span className="inline-flex size-full items-center justify-center rounded-full bg-[linear-gradient(140deg,#4D1B5E,#9A5BB8)] font-heading text-base font-extrabold text-white">
        {initialsOf(name)}
      </span>
      <span className="absolute inset-0 overflow-hidden rounded-full">
        <AvatarImage handle={handle} />
      </span>
    </span>
  );
}
