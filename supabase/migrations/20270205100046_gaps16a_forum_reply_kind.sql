/*
 * Enum value for following a forum thread (bundle GAPS-16, part a; story S1-E8-02; board 5.2,
 * "Follow thread" in the thread's side column).
 * In its own file because Postgres can't use a new enum value in the same transaction that adds
 * it; the next migration (20270205100047) uses it in its functions and tests.
 * - notification_kind 'forum_reply': a thread a member follows has a new reply. Replies in the
 *   same thread within a day share one row ("Ana and 3 others replied in …").
 */
alter type public.notification_kind add value if not exists 'forum_reply';
