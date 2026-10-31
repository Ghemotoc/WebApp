/**
 * In-app notifications (story S1-E7-01; board 6.2 Notifications).
 *
 * Who calls it: hooks/useNotifications.ts (the page), hooks/useUnreadNotificationCount.ts (the
 * bell) and hooks/useMarkNotificationsRead.ts.
 * What it calls next: my_notifications(), my_unread_notification_count() and
 * mark_notifications_read() (…_s1_e7_01_notifications.sql). The database decides what the reader
 * may see (blocks, ratings, moderation) and answers usernames, never a user ID (architecture 1.6).
 */
import type { AppSupabaseClient } from '@/lib/supabase';

/** What a notification is about (the database's notification_kind). */
export type NotificationKind =
  | 'new_chapter'
  | 'comment_on_chapter'
  | 'comment_reply'
  | 'comment_reactions'
  | 'new_follower'
  | 'moderation_decision'
  | 'report_outcome'
  | 'appeal_decided'
  | 'moderator_mail_reply'
  | 'tag_rejected'
  | 'age_check_decided'
  | 'age_check_18_invite'
  | 'parental_consent_agreed'
  | 'parental_consent_withdrawn'
  | 'login_method_added'
  | 'login_method_removed'
  | 'teacher_check_decided'
  | 'teacher_badge_removed';

/** The board's filter chips (All is every category). */
export type NotificationCategory = 'replies' | 'follows' | 'stories' | 'staff';

/** A moderation decision (the database's moderation_action). */
export type ModerationDecision =
  'no_action' | 'hide' | 'remove' | 'restrict' | 'warn' | 'suspend' | 'ban' | 'public_note';

/** What a report came to, as the reporter hears it: never someone else's sanction (S1-E10-04). */
export type ReportOutcome = 'removed' | 'acted' | 'no_action';

/** An appeal's outcome (S1-E10-07): upheld means the decision stands. */
export interface NotificationAppeal {
  reference: string;
  outcome: 'open' | 'upheld' | 'overturned';
  /** The statement of reasons the appeal was about, for the link to My reports. */
  statementReference: string;
}

/** A moderator mail thread the team answered (S1-E10-11). */
export interface NotificationMail {
  reference: string;
  subject: string;
}

/** One notification as the page draws it. */
export interface AppNotification {
  id: string;
  kind: NotificationKind;
  category: NotificationCategory;
  /** The newest two people, by username and display name. */
  actors: Array<{ handle: string; displayName: string }>;
  /** How many people in all (a grouped row counts each person once). */
  actorCount: number;
  story: { slug: string; title: string } | null;
  chapter: { code: string; title: string | null; position: number } | null;
  /** The first words of the comment, when it is still up. */
  commentExcerpt: string | null;
  decision: ModerationDecision | null;
  /** What a decision was about and where it is. */
  item: { itemType: string; reference: string; address: string | null } | null;
  /** A decision's statement of reasons (S1-E10-04): its reference and what was done. */
  statement: { reference: string; action: string } | null;
  /** A report's outcome and the report's reference, for report_outcome (S1-E10-04). */
  outcome: ReportOutcome | null;
  reportReference: string | null;
  /** An appeal's outcome, for appeal_decided (S1-E10-07). */
  appeal: NotificationAppeal | null;
  /** The thread the team answered, for moderator_mail_reply (S1-E10-11). */
  mail: NotificationMail | null;
  /** A moderation decision can't be switched off (criterion 4). */
  isRequired: boolean;
  isRead: boolean;
  /** The latest activity, as an ISO date. */
  at: string;
}

/** One page of the list with the counts for the badge and chips. */
export interface NotificationsPage {
  unread: number;
  counts: Record<'all' | NotificationCategory, number>;
  hasMore: boolean;
  notifications: AppNotification[];
}

/** One notification as the database answers it. */
interface NotificationRow {
  id: string;
  kind: NotificationKind;
  category: NotificationCategory;
  actors: Array<{ handle: string; display_name: string }>;
  actor_count: number;
  story: { slug: string; title: string } | null;
  chapter: { code: string; title: string | null; position: number } | null;
  comment_excerpt: string | null;
  decision: ModerationDecision | null;
  item: { item_type: string; reference: string; address: string | null } | null;
  statement: { reference: string; action: string } | null;
  outcome: ReportOutcome | null;
  report_reference: string | null;
  appeal?: {
    reference: string;
    outcome: NotificationAppeal['outcome'];
    statement_reference: string;
  } | null;
  mail?: { reference: string; subject: string } | null;
  is_required: boolean;
  is_read: boolean;
  at: string;
}

/**
 * An appeal's outcome in the page's shape.
 *
 * @param row - the notification as the database answered it
 * @returns the appeal, or null when the row isn't about one
 */
function appealOf(row: NotificationRow): NotificationAppeal | null {
  if (row.appeal === undefined || row.appeal === null) return null;
  return {
    reference: row.appeal.reference,
    outcome: row.appeal.outcome,
    statementReference: row.appeal.statement_reference,
  };
}

/**
 * Turns one row into the page's shape.
 *
 * @param row - the notification as the database answered it
 * @returns the notification
 */
function toNotification(row: NotificationRow): AppNotification {
  return {
    id: row.id,
    kind: row.kind,
    category: row.category,
    actors: row.actors.map((actor) => ({ handle: actor.handle, displayName: actor.display_name })),
    actorCount: row.actor_count,
    story: row.story,
    chapter: row.chapter,
    commentExcerpt: row.comment_excerpt,
    decision: row.decision,
    item:
      row.item === null
        ? null
        : {
            itemType: row.item.item_type,
            reference: row.item.reference,
            address: row.item.address,
          },
    statement: row.statement ?? null,
    outcome: row.outcome ?? null,
    reportReference: row.report_reference ?? null,
    appeal: appealOf(row),
    mail: row.mail ?? null,
    isRequired: row.is_required,
    isRead: row.is_read,
    at: row.at,
  };
}

/**
 * Reads one page of the signed-in person's notifications, newest activity first.
 *
 * @param client - the shared Supabase client
 * @param olderThan - null for the first page; the last notification's "at" for the next
 * @returns the page and the counts
 * Errors: throws with Supabase's message when the database can't be reached or refuses.
 */
export async function fetchNotifications(
  client: AppSupabaseClient,
  olderThan: string | null,
): Promise<NotificationsPage> {
  const { data, error } = await client.rpc(
    'my_notifications',
    olderThan === null ? {} : { older_than: olderThan },
  );
  if (error !== null) throw new Error(`Could not read the notifications: ${error.message}`);
  const answer = data as unknown as {
    unread: number;
    counts: NotificationsPage['counts'];
    has_more: boolean;
    notifications: NotificationRow[];
  };
  return {
    unread: answer.unread,
    counts: answer.counts,
    hasMore: answer.has_more,
    notifications: answer.notifications.map(toNotification),
  };
}

/**
 * Reads the number on the bell's badge.
 *
 * @param client - the shared Supabase client
 * @returns how many notifications are unread
 * Errors: throws with Supabase's message when the database can't be reached.
 */
export async function fetchUnreadNotificationCount(client: AppSupabaseClient): Promise<number> {
  const { data, error } = await client.rpc('my_unread_notification_count');
  if (error !== null) throw new Error(`Could not count the notifications: ${error.message}`);
  return data;
}

/**
 * Marks notifications as read.
 *
 * @param client - the shared Supabase client
 * @param notificationIds - the ones to mark, or null for all ("Mark all as read")
 * @returns how many are still unread
 * Errors: throws with Supabase's message when the database can't be reached or refuses.
 */
export async function markNotificationsRead(
  client: AppSupabaseClient,
  notificationIds: string[] | null,
): Promise<number> {
  const { data, error } = await client.rpc(
    'mark_notifications_read',
    notificationIds === null ? {} : { notification_ids: notificationIds },
  );
  if (error !== null) throw new Error(`Could not mark the notifications as read: ${error.message}`);
  return data;
}
