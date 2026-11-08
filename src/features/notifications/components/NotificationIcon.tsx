/**
 * NotificationIcon: the round icon at the start of a notification row (story S1-E7-01; board
 * 6.2): an open book for stories, a speech bubble for replies, a person for follows and a shield
 * on dark plum for staff.
 *
 * A "You're now a Storyteller" row (IDEAS-3a) has the stories icon; the row names the rank in a
 * pill (bundle G4: no rank stickers).
 * Who uses it: NotificationRow. Decorative: the row's words say what it is, so the icon is hidden
 * from screen readers. Icons are SVG files (CLAUDE.md rule 16).
 */
import commentIcon from '@/assets/icons/comment.svg';
import openBookIcon from '@/assets/icons/open-book.svg';
import shieldIcon from '@/assets/icons/shield.svg';
import userIcon from '@/assets/icons/user.svg';

import type { NotificationCategory } from '../api/notifications';

/** Each category's picture and circle colour (the board's tints, as pill tokens). */
const iconFor: Record<NotificationCategory, { source: string; circle: string }> = {
  stories: { source: openBookIcon, circle: 'bg-(--pill-plum-bg)' },
  replies: { source: commentIcon, circle: 'bg-(--pill-sky-bg)' },
  follows: { source: userIcon, circle: 'bg-(--pill-sage-bg)' },
  staff: { source: shieldIcon, circle: 'bg-primary' },
};

/**
 * Renders the icon.
 *
 * @param props.category - which filter the notification belongs to
 * @returns the decorative circle with its icon
 */
export function NotificationIcon({ category }: { category: NotificationCategory }) {
  const { source, circle } = iconFor[category];
  return (
    <span
      aria-hidden="true"
      className={`inline-flex size-11 flex-none items-center justify-center rounded-full ${circle}`}
    >
      {category === 'staff' ? (
        <span className="inline-flex size-8 items-center justify-center rounded-full bg-on-primary">
          <img src={source} alt="" width={24} height={24} className="block size-6" />
        </span>
      ) : (
        <img src={source} alt="" width={24} height={24} className="block size-6" />
      )}
    </span>
  );
}
