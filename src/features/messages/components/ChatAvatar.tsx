/**
 * ChatAvatar: the small round picture beside a chat (story S1-E9-01; board Messages 5.5): the
 * shared PersonAvatar at 44 px, so chats match posts and comments (LOOK-7).
 *
 * Decorative: the name is always written beside it, so it is hidden from screen readers.
 * Who shows it: ChatListItem and ChatPanel. What it calls: PersonAvatar (AVATAR-1, LOOK-7).
 */
import { PersonAvatar } from '@/features/avatars/components/PersonAvatar';

/**
 * Renders the avatar.
 *
 * @param name - the display name, for the initials
 * @param handle - the username, for the picture
 * @returns a 44 px circle
 */
export function ChatAvatar({ name, handle }: { name: string; handle: string }) {
  return <PersonAvatar name={name} handle={handle} size="large" />;
}
