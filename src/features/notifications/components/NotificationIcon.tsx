/**
 * NotificationIcon: the round icon at the start of a notification row (story S1-E7-01; board
 * 6.2): an open book for stories, a speech bubble for replies, a person for follows and a shield
 * on dark plum for staff.
 *
 * A "You're now a Storyteller" row (IDEAS-3a) shows that rank's own sticker instead, the same
 * doodle the profile picture wears (board 6.1).
 * Who uses it: NotificationRow. Decorative: the row's words say what it is, so the icon is hidden
 * from screen readers. Icons are the board's doodle-set SVG files (CLAUDE.md rule 16).
 */
import commentIcon from '@/assets/icons/comment.svg';
import openBookIcon from '@/assets/icons/open-book.svg';
import shieldIcon from '@/assets/icons/shield.svg';
import userIcon from '@/assets/icons/user.svg';
import { Doodle } from '@/components/ui/Doodle';
import type { Enums } from '@/lib/database.types';

import { stickerFor } from '@/features/forums/lib/writerRanks';

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
 * @param props.writerRank - for a rank_reached row, the rank whose sticker to show
 * @returns the decorative circle with its icon
 */
export function NotificationIcon({
  category,
  writerRank = null,
}: {
  category: NotificationCategory;
  writerRank?: Enums<'writer_rank'> | null;
}) {
  const { source, circle } = iconFor[category];
  // A new rank shows its own sticker, on the stories tint (IDEAS-3a).
  if (writerRank !== null) {
    return (
      <span
        aria-hidden="true"
        data-testid="rank-sticker-icon"
        className={`inline-flex size-11 flex-none items-center justify-center rounded-full ${circle}`}
      >
        <Doodle
          name={stickerFor(writerRank)}
          kind="widget"
          on="The notification's icon"
          hideBelow="always"
          className="block size-8"
        />
      </span>
    );
  }
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
