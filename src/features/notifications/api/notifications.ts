/**
 * In-app notifications (story S1-E7-01; board 6.2 Notifications).
 *
 * Who calls it: hooks/useNotifications.ts (the page), hooks/useUnreadNotificationCount.ts (the
 * bell) and hooks/useMarkNotificationsRead.ts.
 * What it calls next: my_notifications(), my_unread_notification_count() and
 * mark_notifications_read() (…_s1_e7_01_notifications.sql). The database decides what the reader
 * may see (blocks, ratings, moderation) and answers usernames, never a user ID (architecture 1.6).
 */
import type { Enums } from '@/lib/database.types';
import type { ParagraphLinkPlace } from '@/lib/paragraph-link';
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
  | 'teacher_badge_removed'
  | 'data_export_ready'
  | 'stories_export_ready'
  | 'reading_reminder'
  | 'story_finished'
  | 'space_join_request'
  | 'space_join_approved'
  | 'customisation_change_requested'
  | 'certificate_issued'
  | 'class_archived'
  | 'story_changed_by_staff'
  | 'data_request_confirm'
  | 'data_request_extended'
  | 'data_request_copy_ready'
  | 'picture_opened_by_staff'
  | 'landing_entries_open'
  | 'rank_reached'
  | 'space_handover_offered'
  | 'story_featured';

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

/** A moderator's request to change a signature or a space's banner (S1-E8-08). */
export interface NotificationChangeRequest {
  item: 'signature' | 'space_banner';
  reason: string;
  dueAt: string;
  /** False once it was changed in time or removed. */
  isOpen: boolean;
  /** The space, for a banner. */
  space: { slug: string; name: string } | null;
}

/**
 * What staff changed about the writer's story, and why (S1-E11-08): the changed fields (for
 * example "category_slug", "visibility"), their new values and the reason the writer reads. Never
 * which staff member made the change.
 */
export interface NotificationStaffChange {
  fields: string[];
  /** The new visibility ('shown' or 'hidden') when the change was to who can find it. */
  visibility: string | null;
  reasonCode: string;
  reasonText: string;
}

/** The data request a notice is about (S1-E11-09). */
export interface NotificationDataRequest {
  reference: string;
  deadline: string;
  extensionReason: string | null;
}

/** A landing page a notification is about, with its title in Romanian and English. */
export interface NotificationLandingPage {
  slug: string;
  titles: { ro: string; en: string };
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
  /**
   * Where the comment sits today: a paragraph's number, 'earlier' when the writer has since
   * changed it, or null for a comment on the whole chapter (IDEAS-1e).
   */
  commentPlace: ParagraphLinkPlace | null;
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
  /** The space a join request or approval is about, while the reader may see it (FORUMS-2c). */
  space: { slug: string; name: string } | null;
  /** What a moderator asked to change, for customisation_change_requested (S1-E8-08). */
  changeRequest: NotificationChangeRequest | null;
  /** What staff changed about the writer's story, for story_changed_by_staff (S1-E11-08). */
  staffChange: NotificationStaffChange | null;
  /**
   * The data request a notice is about (S1-E11-09; ADMIN-2c1): its reference, its deadline as
   * yyyy-mm-dd and, after an extension, why the team needs more time.
   */
  dataRequest: NotificationDataRequest | null;
  /**
   * The landing page whose entries opened, for landing_entries_open (S1-E11-14; CONTESTS-13a2b):
   * its address and its title in each language, or null once the page is archived.
   */
  landingPage: NotificationLandingPage | null;
  /**
   * For rank_reached (IDEAS-3a): the rank the writer reached, for its sticker, and their own
   * handle, for the link to their profile.
   */
  writerRank: Enums<'writer_rank'> | null;
  ownHandle: string | null;
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
  comment_place?: ParagraphLinkPlace | null;
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
  space?: { slug: string; name: string } | null;
  change_request?: {
    item: NotificationChangeRequest['item'];
    reason: string;
    due_at: string;
    is_open: boolean;
    space: { slug: string; name: string } | null;
  } | null;
  staff_change?: {
    fields: string[];
    after: Record<string, unknown>;
    reason_code: string;
    reason_text: string;
  } | null;
  data_request?: { reference: string; deadline: string; extension_reason: string | null } | null;
  landing_page?: { slug: string; title_ro: string | null; title_en: string | null } | null;
  writer_rank?: Enums<'writer_rank'> | null;
  own_handle?: string | null;
  is_required: boolean;
  is_read: boolean;
  at: string;
}

/**
 * A moderator's change request in the page's shape (S1-E8-08).
 *
 * @param row - the database's row
 * @returns the request, or null for other kinds
 */
function changeRequestOf(row: NotificationRow): NotificationChangeRequest | null {
  const request = row.change_request;
  if (request === null || request === undefined) return null;
  return {
    item: request.item,
    reason: request.reason,
    dueAt: request.due_at,
    isOpen: request.is_open,
    space: request.space,
  };
}

/**
 * A staff change in the page's shape (S1-E11-08).
 *
 * @param row - the database's row
 * @returns the change, or null for other kinds
 */
function staffChangeOf(row: NotificationRow): NotificationStaffChange | null {
  const change = row.staff_change;
  if (change === null || change === undefined) return null;
  const visibility = change.after['visibility'];
  return {
    fields: change.fields,
    visibility: typeof visibility === 'string' ? visibility : null,
    reasonCode: change.reason_code,
    reasonText: change.reason_text,
  };
}

/**
 * A landing page in the page's shape (CONTESTS-13a2b).
 *
 * @param row - the database's row
 * @returns the page, or null for other kinds and archived pages
 */
function landingPageOf(row: NotificationRow): NotificationLandingPage | null {
  const page = row.landing_page;
  if (page === null || page === undefined) return null;
  return { slug: page.slug, titles: { ro: page.title_ro ?? '', en: page.title_en ?? '' } };
}

/**
 * A data request in the page's shape (S1-E11-09).
 *
 * @param row - the database's row
 * @returns the request, or null for other kinds
 */
function dataRequestOf(row: NotificationRow): NotificationDataRequest | null {
  const request = row.data_request;
  if (request === null || request === undefined) return null;
  return {
    reference: request.reference,
    deadline: request.deadline,
    extensionReason: request.extension_reason,
  };
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
    commentPlace: row.comment_place ?? null,
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
    space: row.space ?? null,
    changeRequest: changeRequestOf(row),
    staffChange: staffChangeOf(row),
    dataRequest: dataRequestOf(row),
    landingPage: landingPageOf(row),
    writerRank: row.writer_rank ?? null,
    ownHandle: row.own_handle ?? null,
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
