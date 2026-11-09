/**
 * NotificationIcon: the round icon at the start of a notification row (story S1-E7-01; board
 * Notifications in the liquid glass redesign, bundle G8d): an open book for stories, a speech
 * bubble for replies, a person for follows and a shield for staff, as plain line icons in a
 * 42 px glass circle.
 *
 * A "You're now a Storyteller" row (IDEAS-3a) has the stories icon; the row names the rank in a
 * pill (bundle G4: no rank stickers). Staff rows keep a plum circle so decisions stand out.
 * Who uses it: NotificationRow. Decorative: the row's words say what it is, so the icon is hidden
 * from screen readers. What it calls: ActionIcon.
 */
import { ActionIcon, type ActionIconName } from '@/components/icons/ActionIcon';

import type { NotificationCategory } from '../api/notifications';

/** The icon and the circle's colours for each kind of notification. */
const iconFor: Record<NotificationCategory, { name: ActionIconName; circle: string }> = {
  stories: { name: 'book', circle: 'border border-border bg-surface text-heading' },
  replies: { name: 'comment', circle: 'border border-border bg-surface text-heading' },
  follows: { name: 'person', circle: 'border border-border bg-surface text-heading' },
  staff: { name: 'shield', circle: 'bg-primary text-on-primary' },
};

/**
 * Renders the icon in its circle.
 *
 * @param props.category - the notification's kind
 * @returns the decorative circle
 */
export function NotificationIcon({ category }: { category: NotificationCategory }) {
  const { name, circle } = iconFor[category];
  return (
    <span
      aria-hidden="true"
      className={`inline-flex size-[42px] flex-none items-center justify-center rounded-full ${circle}`}
    >
      <ActionIcon name={name} size={18} />
    </span>
  );
}
